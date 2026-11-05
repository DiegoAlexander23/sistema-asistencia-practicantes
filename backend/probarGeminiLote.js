
import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const mensaje = "me estoy largando";

async function probarGemini() {


    try {
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
                preguntas sobre horarios y mensajes que no indiquen
                una entrada o salida.

                REGLAS IMPORTANTES:
                - Estar en camino no significa haber llegado.
                - Considera el significado completo del mensaje.
                - No confundas una pregunta con una marcación.
                - Una despedida por sí sola no significa que terminó la jornada.
                - "Gracias, nos vemos mañana" corresponde a otro.
                - "Ya terminé mi jornada, hasta mañana" corresponde a salida.

                Devuelve únicamente una categoría válida:
                entrada, salida u otro.

                Mensaje: "${mensaje}"
            `
        });

        const categoria = respuesta.text.trim().toLowerCase();

        console.log("Mensaje:", mensaje);
        console.log("Categoría:", categoria.toUpperCase());

    } catch (error) {
        console.error("Error al clasificar:", error);
    }
}

probarGemini();
 