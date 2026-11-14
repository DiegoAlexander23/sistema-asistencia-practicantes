import { apiFetch } from "./api.js";

const API_URL = "http://localhost:8080/api/justificaciones";

export async function obtenerJustificaciones(estado = "pendiente") {
    const respuesta = await apiFetch(`${API_URL}?estado=${estado}`);

    if (!respuesta.ok) {
        throw new Error("Error al obtener las justificaciones");
    }

    return await respuesta.json();
}

async function resolver(id, accion) {
    const respuesta = await apiFetch(`${API_URL}/${id}/${accion}`, {
        method: "PATCH"
    });

    const data = await respuesta.json();

    if (!respuesta.ok) {
        throw new Error(data.mensaje || "No se pudo resolver la justificación");
    }

    return data;
}

export const aprobarJustificacion = (id) => resolver(id, "aprobar");
export const rechazarJustificacion = (id) => resolver(id, "rechazar");