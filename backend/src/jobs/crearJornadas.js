import cron from "node-cron";
import pool from "../config/database.js";
import { hoyEnLima } from "../utils/fechas.js";

export async function crearJornadasDelDia(fechaParam, diaParam) {
    const hoy = hoyEnLima();
    const fecha = fechaParam ?? hoy.fecha;
    const dia = diaParam ?? hoy.dia;

    const [resultado] = await pool.query(
        `INSERT IGNORE INTO jornadas
            (id_practicante, fecha, entrada_prog, salida_prog, estado)
         SELECT p.id, ?, h.hora_entrada, h.hora_salida,
                IF(EXISTS(
                    SELECT 1 FROM justificaciones j
                    WHERE j.id_practicante = p.id
                      AND j.fecha = ?
                      AND j.estado = 'aprobada'
                ), 'justificada', 'pendiente')
         FROM practicantes p
         INNER JOIN horarios h ON h.practicante_id = p.id
         WHERE p.estado = 'Activo'
           AND h.dia_semana = ?
           AND (p.fecha_inicio IS NULL OR p.fecha_inicio <= ?)
           AND (p.fecha_fin IS NULL OR p.fecha_fin >= ?)`,
        [fecha, fecha, dia, fecha, fecha]
    );

    console.log(`[jornadas] ${fecha} (${dia}): ${resultado.affectedRows} creadas`);
    return resultado.affectedRows;
}

export function iniciarJobCrearJornadas() {
    crearJornadasDelDia().catch((e) =>
        console.error("[jornadas] error al arrancar:", e.message)
    );
    cron.schedule(
        "5 0 * * *",
        () => {
            crearJornadasDelDia().catch((e) =>
                console.error("[jornadas] error en cron:", e.message)
            );
        },
        { timezone: "America/Lima" }
    );
}