
import pool from "../config/database.js";

export const obtenerAsistencias = async (req, res) => {
    try {
        const [asistencias] = await pool.query(`
            SELECT
                a.id,
                a.id_practicante,
                p.nombre,
                p.apellido,
                a.fecha_hora_mensaje,
                a.tipo,
                a.mensaje_original,
                CASE
                    WHEN j.id IS NULL THEN 'Pendiente'
                    WHEN a.tipo = 'entrada' THEN
                        CASE j.estado
                            WHEN 'puntual' THEN 'Puntual'
                            WHEN 'tarde'   THEN 'Tardanza'
                            ELSE 'Pendiente'
                        END
                    WHEN a.tipo = 'salida' THEN
                        CASE j.estado_salida
                            WHEN 'anticipada' THEN 'Anticipada'
                            WHEN 'normal'     THEN 'Normal'
                            ELSE 'Pendiente'
                        END
                    ELSE 'Pendiente'
                END AS estado
            FROM asistencias a
            INNER JOIN practicantes p ON p.id = a.id_practicante
            LEFT JOIN jornadas j
                ON j.id_practicante = a.id_practicante
               AND j.fecha = DATE(a.fecha_hora_mensaje)
            ORDER BY a.fecha_hora_mensaje DESC
        `);

        res.json(asistencias);
    }catch (error) {
    console.error("Error al consultar asistencias:", error);

    res.status(500).json({
        mensaje: "Error al obtener el historial de asistencias",
        detalle: error.message,
        codigo: error.code
    });
}
};
 