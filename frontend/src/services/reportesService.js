import { apiFetch } from "./api.js";

const API_URL = "http://localhost:8080/api/reportes";

export async function obtenerReporte({ inicio, fin, practicante } = {}) {
    const params = new URLSearchParams();

    if (inicio) params.set("inicio", inicio);
    if (fin) params.set("fin", fin);
    if (practicante) params.set("practicante", practicante);

    const respuesta = await apiFetch(`${API_URL}?${params.toString()}`);

    if (!respuesta.ok) {
        throw new Error("Error al obtener el reporte");
    }

    return await respuesta.json();
}