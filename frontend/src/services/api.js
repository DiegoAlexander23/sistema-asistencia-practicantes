export async function apiFetch(url, opciones = {}) {
    const token = localStorage.getItem("token");

    const headers = {
        ...opciones.headers
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    return fetch(url, {
        ...opciones,
        headers
    });
}
