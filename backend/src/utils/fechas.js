const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

// Devuelve { fecha: "2026-11-13", dia: "Viernes" } en hora de Lima
export function hoyEnLima(ahora = new Date()) {
    const fecha = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Lima"
    }).format(ahora); // formato YYYY-MM-DD

    const diaIndice = new Date(`${fecha}T00:00:00Z`).getUTCDay();

    return { fecha, dia: DIAS[diaIndice] };
}
// Devuelve "2026-11-13 20:55:00" en hora de Lima, para comparar en SQL
export function ahoraEnLimaSQL(ahora = new Date()) {
    const partes = new Intl.DateTimeFormat("sv-SE", {
        timeZone: "America/Lima",
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
        hour12: false
    }).format(ahora);

    return partes; // "YYYY-MM-DD HH:MM:SS"
}