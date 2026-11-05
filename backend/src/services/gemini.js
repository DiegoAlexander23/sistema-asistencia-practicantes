import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

export async function clasificarConGemini(texto) {

    const respuesta = await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: `
            Eres un clasificador de mensajes de asistencia de practicantes.

            Clasifica el mensaje en UNA sola categoría:

            1. entrada:
            El practicante comunica que llegó al trabajo,
            que ya está en la tienda o que comienza su jornada.

            2. salida:
            El practicante comunica que terminó su jornada,
            que se retira o que está saliendo del trabajo.

            3. otro:
            Saludos, agradecimientos, conversaciones generales,
            preguntas sobre horarios y cualquier mensaje
            que no indique una entrada o salida.

            IMPORTANTE:
            - Estar en camino no significa haber llegado.
            - Considera el significado completo del mensaje.
            - No confundas una pregunta con una marcación.
            - criterio estricto.
            REGLA IMPORTANTE:
No clasifiques un mensaje como "salida" únicamente porque contenga
una despedida, agradecimiento o referencia al día siguiente.

Ejemplos:
- "Gracias, nos vemos mañana" → otro
- "Hasta mañana, que tengan buena tarde" → otro
- "Muchas gracias, hasta luego" → otro
- "Ya terminé mi jornada, hasta mañana" → salida
- "Ya acabé mis actividades y me retiro" → salida

Para clasificar como "salida", el mensaje debe comunicar
que el practicante terminó su jornada o se está retirando
del trabajo. No basta con una despedida.  

            Mensaje: "${texto}"

            Devuelve únicamente una categoría válida:
            entrada, salida u otro.
        `
    });

    return respuesta.text.trim().toLowerCase();
}