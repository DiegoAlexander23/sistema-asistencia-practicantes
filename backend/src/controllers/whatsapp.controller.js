
import pool from "../config/database.js";
import { clasificarMensaje } from "../services/clasificador.js";
import { enviarMensajeWhatsApp } from "../services/whatsapp.js";  
import { ahoraEnLimaSQL, hoyEnLima } from "../utils/fechas.js";
import { extraerJustificacion } from "../services/gemini.js";

function normalizarTelefono(telefono) {
    const digitos = telefono.replace(/\D/g, "");

    if (digitos.startsWith("51") && digitos.length === 11) {
        return digitos.slice(2);
    }

    return digitos;
}

const mensajesRespuesta = {
    entrada_registrada: "Tu entrada ha sido registrada correctamente.",
    salida_registrada: "Tu salida ha sido registrada correctamente.",
    entrada_duplicada: "Tu entrada ya fue registrada anteriormente hoy.",
    salida_duplicada: "Tu salida ya fue registrada anteriormente hoy.",
    salida_sin_entrada: "No se pudo registrar tu salida porque no tienes una entrada registrada hoy.",
    entrada_despues_salida: "No se puede registrar otra entrada porque ya registraste tu salida hoy."
};
async function actualizarJornada(conexion, practicanteId, fechaHora, categoria) {
    const fecha = fechaHora.slice(0, 10);

    const [jornadas] = await conexion.query(
        `SELECT id, entrada_prog, salida_prog, estado, estado_salida
         FROM jornadas
         WHERE id_practicante = ? AND fecha = ?
         FOR UPDATE`,
        [practicanteId, fecha]
    );

    if (jornadas.length === 0) return;

    const jornada = jornadas[0];

    const marca = Date.parse(`${fechaHora.replace(" ", "T")}Z`);

    if (categoria === "entrada") {
        if (!["pendiente", "falta"].includes(jornada.estado)) return;

        const [cfg] = await conexion.query(
            "SELECT valor FROM configuracion WHERE clave = 'tolerancia_minutos'"
        );
        const tolerancia = cfg.length ? Number(cfg[0].valor) : 5;

        const programada = Date.parse(`${fecha}T${jornada.entrada_prog}Z`);
        const diferencia = Math.floor((marca - programada) / 60000);

        const esPuntual = diferencia <= tolerancia;

        await conexion.query(
            `UPDATE jornadas
             SET entrada_real = ?, estado = ?, minutos_tarde = ?
             WHERE id = ?`,
            [
                fechaHora,
                esPuntual ? "puntual" : "tarde",
                esPuntual ? 0 : diferencia,
                jornada.id
            ]
        );
    }

    if (categoria === "salida") {
        const programada = Date.parse(`${fecha}T${jornada.salida_prog}Z`);
        const anticipada = marca < programada;

        await conexion.query(
            `UPDATE jornadas
             SET salida_real = ?, estado_salida = ?
             WHERE id = ?`,
            [fechaHora, anticipada ? "anticipada" : "normal", jornada.id]
        );
    }
}
function recortarHora(hora) {
    return String(hora).slice(0, 5);
}

async function textoHorario(practicanteId) {
    const [filas] = await pool.query(
        `SELECT dia_semana, hora_entrada, hora_salida
         FROM horarios
         WHERE practicante_id = ?
         ORDER BY FIELD(dia_semana,
            'Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo')`,
        [practicanteId]
    );

    if (filas.length === 0) {
        return "Aún no tienes un horario registrado. Consulta con tu supervisor.";
    }

    const lineas = filas.map(
        (f) => `${f.dia_semana}: ${recortarHora(f.hora_entrada)} - ${recortarHora(f.hora_salida)}`
    );

    const hoy = hoyEnLima().dia;
    const deHoy = filas.find((f) => f.dia_semana === hoy);

    const textoHoy = deHoy
        ? `Hoy (${hoy}) te toca de ${recortarHora(deHoy.hora_entrada)} a ${recortarHora(deHoy.hora_salida)}.`
        : `Hoy (${hoy}) no te toca asistir.`;

    return `Tu horario:\n${lineas.join("\n")}\n\n${textoHoy}`;
}
function esFechaReal(fecha) {
    return (
        /^\d{4}-\d{2}-\d{2}$/.test(fecha) &&
        new Date(`${fecha}T00:00:00Z`).toISOString().slice(0, 10) === fecha
    );
}

function diasDeDiferencia(fecha, referencia) {
    return Math.round(
        (Date.parse(`${fecha}T00:00:00Z`) - Date.parse(`${referencia}T00:00:00Z`)) / 86400000
    );
}

async function registrarJustificacion(practicante, texto) {
    const hoy = hoyEnLima();

    let datos;
    try {
        datos = await extraerJustificacion(texto, hoy.fecha, hoy.dia);
    } catch (error) {
        console.error("No se pudo extraer la justificación:", error.message);
        return "No pude entender la justificación. Escríbela indicando el día, por ejemplo: «mañana no puedo ir, tengo examen».";
    }

    if (!datos.fecha || !esFechaReal(datos.fecha)) {
        return "¿Para qué día es la justificación? Escríbela indicando la fecha o el día.";
    }

    const diferencia = diasDeDiferencia(datos.fecha, hoy.fecha);

    if (diferencia < -7) {
        return "Solo se pueden justificar ausencias de los últimos 7 días. Consulta con tu supervisor.";
    }
    if (diferencia > 60) {
        return "Esa fecha está demasiado lejos. Consulta con tu supervisor.";
    }

    try {
        await pool.query(
            `INSERT INTO justificaciones
             (id_practicante, fecha, motivo, mensaje_original)
             VALUES (?, ?, ?, ?)`,
            [practicante.id, datos.fecha, datos.motivo || texto, texto]
        );
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return `Ya existe una justificación tuya para el ${datos.fecha}.`;
        }
        throw error;
    }

    return `Registré tu justificación para el ${datos.fecha} (motivo: ${datos.motivo || "no indicado"}). Tu supervisor la revisará.`;
}
async function registrarAsistencia(practicante, mensaje, categoria) {
    const fechaHora = ahoraEnLimaSQL(new Date(Number(mensaje.timestamp) * 1000));

    const conexion = await pool.getConnection();

    try {
        await conexion.beginTransaction();

        await conexion.query(
            "SELECT id FROM practicantes WHERE id = ? FOR UPDATE",
            [practicante.id]
        );

        const [existentes] = await conexion.query(
            `SELECT id FROM asistencias
             WHERE id_practicante = ?
             AND DATE(fecha_hora_mensaje) = DATE(?)
             AND tipo = ?
             LIMIT 1`,
            [practicante.id, fechaHora, categoria]
        );

        if (existentes.length > 0) {
            await conexion.commit();

            console.log(
                `Ya existe una ${categoria} para este practicante hoy.`
            );

            return `${categoria}_duplicada`;
        }

        if (categoria === "salida") {
            const [entradas] = await conexion.query(
                `SELECT id FROM asistencias
                 WHERE id_practicante = ?
                 AND DATE(fecha_hora_mensaje) = DATE(?)
                 AND tipo = 'entrada'
                 LIMIT 1`,
                [practicante.id, fechaHora]
            );

            if (entradas.length === 0) {
                await conexion.commit();

                console.log("Salida rechazada: no existe una entrada previa hoy.");

                return "salida_sin_entrada";
            }
        }

        if (categoria === "entrada") {
            const [salidas] = await conexion.query(
                `SELECT id FROM asistencias
                 WHERE id_practicante = ?
                 AND DATE(fecha_hora_mensaje) = DATE(?)
                 AND tipo = 'salida'
                 LIMIT 1`,
                [practicante.id, fechaHora]
            );

            if (salidas.length > 0) {
                await conexion.commit();

                console.log("Entrada rechazada: ya existe una salida hoy.");

                return "entrada_despues_salida";
            }
        }

        await conexion.query(
            `INSERT INTO asistencias
            (id_practicante, fecha_hora_mensaje, tipo, mensaje_original, id_mensaje_whatsapp)
            VALUES (?, ?, ?, ?, ?)`,
            [
                practicante.id,
                fechaHora,
                categoria,
                mensaje.text.body,
                mensaje.id
            ]
        );

        await actualizarJornada(conexion, practicante.id, fechaHora, categoria);

        await conexion.commit();

        return `${categoria}_registrada`;

    } catch (error) {
        await conexion.rollback();
        throw error;

    } finally {
        conexion.release();
    }
}

export function verificarWebhook(req, res) {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
        console.log("Webhook de WhatsApp verificado");
        return res.status(200).send(challenge);
    }

    return res.sendStatus(403);
}

export async function recibirMensaje(req, res) {
    try {
        const entry = req.body.entry?.[0];
        const change = entry?.changes?.[0];
        const value = change?.value;

        const mensaje = value?.messages?.[0];

        if (!mensaje) {
            console.log("Notificación recibida, pero no contiene mensajes.");
            return res.sendStatus(200);
        }

        const texto = mensaje.text?.body;

        if (typeof texto !== "string" || !texto.trim()) {
            console.log("El mensaje recibido no es de texto.");
            return res.sendStatus(200);
        }

        const [mensajesExistentes] = await pool.query(
            `SELECT id FROM asistencias
            WHERE id_mensaje_whatsapp = ?
            LIMIT 1`,
            [mensaje.id]
        );

        if (mensajesExistentes.length > 0) {
            console.log("Mensaje de WhatsApp ya procesado. Se ignora.");
            return res.sendStatus(200);
        }

        const telefono = mensaje.from;
        const telefonoNacional = normalizarTelefono(telefono);

        const [practicantes] = await pool.query(
            `SELECT id, nombre, apellido, telefono
             FROM practicantes
             WHERE telefono = ?`,
            [telefonoNacional]
        );

        if (practicantes.length === 0) {
            console.log("No se encontró ningún practicante con ese teléfono.");
            return res.sendStatus(200);
        }

        const practicante = practicantes[0];

        console.log("Practicante identificado:");
        console.log("ID:", practicante.id);
        console.log("Nombre:", practicante.nombre, practicante.apellido);

        console.log("Mensaje de WhatsApp recibido:");
        console.log("Texto:", texto);
        console.log("ID del mensaje:", mensaje.id);
        console.log("Fecha:", mensaje.timestamp);   

        let categoria;

        try {
            categoria = await clasificarMensaje(texto);
        } catch (error) {
            console.error("No se pudo clasificar el mensaje:", error.message);

            try {
                await enviarMensajeWhatsApp(
                    telefono,
                    "No pude procesar tu mensaje en este momento. Inténtalo de nuevo en unos minutos."
                );
            } catch (e) {
                console.error("No se pudo avisar al practicante:", e.message);
            }

            return res.sendStatus(200);
        }

        console.log("Categoría detectada:", categoria);

        if (categoria === "otro") {
            console.log("El mensaje no corresponde a una marcación de asistencia.");

        } else if (categoria === "entrada" || categoria === "salida") {
            console.log("Marcación de asistencia identificada:", categoria);

            const resultado = await registrarAsistencia(
                practicante,
                mensaje,
                categoria
            );

            console.log("Resultado de la marcación:", resultado);

            const textoRespuesta = mensajesRespuesta[resultado];

            if (textoRespuesta) {
                try {
                    await enviarMensajeWhatsApp(telefono, textoRespuesta);
                    console.log("Respuesta enviada por WhatsApp.");
                } catch (error) {
                    console.error("No se pudo enviar la respuesta por WhatsApp:", error);
                }
            }
        } else if (categoria === "justificacion") {
            try {
                const respuestaJust = await registrarJustificacion(practicante, texto);
                await enviarMensajeWhatsApp(telefono, respuestaJust);
            } catch (error) {
                console.error("Error al registrar justificación:", error.message);
            }

        } else if (categoria === "horario") {
            try {
                const respuestaHorario = await textoHorario(practicante.id);
                await enviarMensajeWhatsApp(telefono, respuestaHorario);
                console.log("Horario enviado por WhatsApp.");
            } catch (error) {
                console.error("No se pudo enviar el horario:", error.message);
            }

        } else {
            console.log("El clasificador devolvió una categoría desconocida.");
        }

        return res.sendStatus(200);

    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            console.log("El mensaje ya fue registrado. Se ignora el duplicado.");
            return res.sendStatus(200);
        }

        console.error("Error al procesar el mensaje:", error);
        return res.sendStatus(500);
    }
}
