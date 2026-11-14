import pool from "../config/database.js";
import { enviarMensajeWhatsApp } from "../services/whatsapp.js";

export const listarJustificaciones = async (req, res) => {
    try {
        const estado = req.query.estado || "pendiente";
        const filtrar = ["pendiente", "aprobada", "rechazada"].includes(estado);

        const [filas] = await pool.query(
            `SELECT j.id, j.id_practicante, p.nombre, p.apellido, p.telefono,
                    DATE_FORMAT(j.fecha, '%Y-%m-%d') AS fecha,
                    j.motivo, j.mensaje_original, j.estado, j.creado_en
             FROM justificaciones j
             INNER JOIN practicantes p ON p.id = j.id_practicante
             ${filtrar ? "WHERE j.estado = ?" : ""}
             ORDER BY j.creado_en DESC`,
            filtrar ? [estado] : []
        );

        res.json(filas);
    } catch (error) {
        console.error("Error al listar justificaciones:", error);
        res.status(500).json({ mensaje: "Error al obtener las justificaciones" });
    }
};

async function resolver(req, res, nuevoEstado) {
    const conexion = await pool.getConnection();
    let aviso = null;

    try {
        await conexion.beginTransaction();

        const [datos] = await conexion.query(
            `SELECT j.id, DATE_FORMAT(j.fecha, '%Y-%m-%d') AS fecha, p.telefono
             FROM justificaciones j
             INNER JOIN practicantes p ON p.id = j.id_practicante
             WHERE j.id = ? AND j.estado = 'pendiente'
             FOR UPDATE`,
            [req.params.id]
        );

        if (datos.length === 0) {
            await conexion.rollback();
            return res.status(404).json({
                mensaje: "La justificación no existe o ya fue resuelta"
            });
        }

        await conexion.query(
            `UPDATE justificaciones
             SET estado = ?, revisado_por = ?, resuelto_en = NOW()
             WHERE id = ?`,
            [nuevoEstado, req.user.id, req.params.id]
        );

        if (nuevoEstado === "aprobada") {
            await conexion.query(
                `UPDATE jornadas jr
                 INNER JOIN justificaciones j
                    ON j.id_practicante = jr.id_practicante AND j.fecha = jr.fecha
                 SET jr.estado = 'justificada'
                 WHERE j.id = ? AND jr.estado IN ('pendiente', 'falta')`,
                [req.params.id]
            );
        }

        await conexion.commit();

        aviso = {
            telefono: datos[0].telefono,
            texto: nuevoEstado === "aprobada"
                ? `Tu justificación del ${datos[0].fecha} fue aprobada.`
                : `Tu justificación del ${datos[0].fecha} fue rechazada. Consulta con tu supervisor.`
        };

        res.json({ success: true, estado: nuevoEstado });
    } catch (error) {
        await conexion.rollback();
        console.error("Error al resolver justificación:", error);
        res.status(500).json({ mensaje: "Error al resolver la justificación" });
    } finally {
        conexion.release();
    }

    if (aviso) {                 
        try {
            await enviarMensajeWhatsApp(aviso.telefono, aviso.texto);
        } catch (error) {
            console.error("No se pudo avisar al practicante:", error.message);
        }
    }
}

export const aprobarJustificacion = (req, res) => resolver(req, res, "aprobada");
export const rechazarJustificacion = (req, res) => resolver(req, res, "rechazada");