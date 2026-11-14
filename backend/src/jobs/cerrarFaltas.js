import cron from "node-cron";
import pool from "../config/database.js";
import { ahoraEnLimaSQL } from "../utils/fechas.js";

async function leerConfig(clave, porDefecto) {
    const [filas] = await pool.query(
        "SELECT valor FROM configuracion WHERE clave = ?",
        [clave]
    );
    return filas.length ? Number(filas[0].valor) : porDefecto;
}

export async function cerrarFaltas() {
    const ahora = ahoraEnLimaSQL();
    const margen = await leerConfig("minutos_cierre_falta", 30);

    const [faltas] = await pool.query(
        `UPDATE jornadas
         SET estado = 'falta'
         WHERE estado = 'pendiente'
           AND entrada_real IS NULL
           AND TIMESTAMP(fecha, salida_prog) + INTERVAL ? MINUTE < ?`,
        [margen, ahora]
    );

    const [salidas] = await pool.query(
        `UPDATE jornadas
         SET estado_salida = 'no_registrada'
         WHERE entrada_real IS NOT NULL
           AND salida_real IS NULL
           AND estado_salida = 'pendiente'
           AND TIMESTAMP(fecha, salida_prog) + INTERVAL ? MINUTE < ?`,
        [margen, ahora]
    );

    if (faltas.affectedRows || salidas.affectedRows) {
        console.log(
            `[faltas] ${ahora}: ${faltas.affectedRows} faltas, ` +
            `${salidas.affectedRows} salidas sin registrar`
        );
    }
}

export function iniciarJobCerrarFaltas() {
    const ejecutar = () =>
        cerrarFaltas().catch((e) =>
            console.error("[faltas] error:", e.message)
        );

    ejecutar();

    cron.schedule("*/10 * * * *", ejecutar, { timezone: "America/Lima" });
}