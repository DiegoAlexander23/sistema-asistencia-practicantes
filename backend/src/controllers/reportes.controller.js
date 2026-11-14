import pool from "../config/database.js";
import { hoyEnLima } from "../utils/fechas.js";

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

export const obtenerReporte = async (req, res) => {
    try {
        const hoy = hoyEnLima().fecha;

        // Por defecto: desde el día 1 del mes actual hasta hoy
        const inicio = req.query.inicio || `${hoy.slice(0, 8)}01`;
        const fin = req.query.fin || hoy;
        const practicanteId = req.query.practicante || null;

        if (!FORMATO_FECHA.test(inicio) || !FORMATO_FECHA.test(fin)) {
            return res.status(400).json({
                mensaje: "Las fechas deben tener formato AAAA-MM-DD"
            });
        }

        const [filas] = await pool.query(
            `SELECT
                p.id,
                p.nombre,
                p.apellido,
                p.area,
                COUNT(j.id)                          AS programados,
                SUM(j.estado = 'puntual')            AS puntuales,
                SUM(j.estado = 'tarde')              AS tardanzas,
                SUM(j.estado = 'falta')              AS faltas,
                SUM(j.estado = 'justificada')        AS justificadas,
                SUM(j.estado = 'pendiente')          AS pendientes,
                COALESCE(SUM(j.minutos_tarde), 0)    AS minutos_tarde,
                SUM(j.estado_salida = 'anticipada')  AS salidas_anticipadas
             FROM practicantes p
             LEFT JOIN jornadas j
                ON j.id_practicante = p.id
               AND j.fecha BETWEEN ? AND ?
             WHERE (? IS NULL OR p.id = ?)
             GROUP BY p.id
             ORDER BY faltas DESC, tardanzas DESC, p.nombre`,
            [inicio, fin, practicanteId, practicanteId]
        );

        const practicantes = filas.map((f) => {
            const n = (v) => Number(v) || 0;

            const puntuales = n(f.puntuales);
            const tardanzas = n(f.tardanzas);
            const faltas = n(f.faltas);
            const justificadas = n(f.justificadas);
            const pendientes = n(f.pendientes);

            const evaluables = puntuales + tardanzas + faltas;

            return {
                id: f.id,
                nombre: f.nombre,
                apellido: f.apellido,
                area: f.area,
                programados: n(f.programados),
                puntuales,
                tardanzas,
                faltas,
                justificadas,
                pendientes,
                minutos_tarde: n(f.minutos_tarde),
                salidas_anticipadas: n(f.salidas_anticipadas),
                porcentaje_asistencia: evaluables > 0
                    ? Math.round(((puntuales + tardanzas) / evaluables) * 100)
                    : null
            };
        });

        const suma = (campo) =>
            practicantes.reduce((total, p) => total + p[campo], 0);

        res.json({
            rango: { inicio, fin },
            totales: {
                programados: suma("programados"),
                puntuales: suma("puntuales"),
                tardanzas: suma("tardanzas"),
                faltas: suma("faltas"),
                justificadas: suma("justificadas"),
                pendientes: suma("pendientes"),
                minutos_tarde: suma("minutos_tarde")
            },
            practicantes
        });
    } catch (error) {
        console.error("Error al generar el reporte:", error);
        res.status(500).json({ mensaje: "Error al generar el reporte" });
    }
};