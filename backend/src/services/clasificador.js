import { clasificarConGemini } from "./gemini.js";

const categoriasValidas = [
    "entrada",
    "salida",
    "otro"
];

export async function clasificarMensaje(texto) {
    const categoria = await clasificarConGemini(texto);

    if (!categoriasValidas.includes(categoria)) {
        throw new Error(`Categoría no válida: ${categoria}`);
    }

    return categoria;
}