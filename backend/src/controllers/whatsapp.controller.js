
import pool from "../config/database.js";
import { clasificarMensaje } from "../services/clasificador.js";
import { enviarMensajeWhatsApp } from "../services/whatsapp.js";    

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

async function registrarAsistencia(practicante, mensaje, categoria) {
    const fecha = new Date(
        Number(mensaje.timestamp) * 1000 - 5 * 60 * 60 * 1000
    );

    const fechaHora = fecha.toISOString().slice(0, 19).replace("T", " ");

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

        const categoria = await clasificarMensaje(texto);

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
