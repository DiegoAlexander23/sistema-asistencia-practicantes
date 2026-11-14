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

            3. horario:
            El practicante pregunta por sus días u horas de trabajo,
            pide ver su horario o pregunta si le toca asistir hoy o mañana.

            4. justificacion:
            El practicante avisa que NO podrá asistir un día, o explica
            por qué faltó (examen, cita médica, enfermedad, trámite, etc.).
            Llegar tarde o estar en camino NO es una justificación.

            5. otro:
            Saludos, agradecimientos, conversaciones generales
            y cualquier mensaje que no indique una entrada o salida
            ni consulte su horario.

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
            entrada, salida, horario, justificacion u otro.
        `
    });

    return respuesta.text.trim().toLowerCase();
}
export async function extraerJustificacion(texto, fechaHoy, diaHoy) {
    const respuesta = await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",
        config: { responseMimeType: "application/json" },
        contents: `
            Hoy es ${diaHoy} ${fechaHoy} (zona horaria America/Lima).

            Un practicante envió este mensaje justificando una ausencia:
            "${texto}"

            Devuelve SOLO un JSON con este formato:
            {"fecha": "AAAA-MM-DD" o null, "motivo": "resumen corto"}

            Reglas:
            - Convierte "hoy", "mañana", "ayer", "el viernes", etc. a una fecha real
              tomando como referencia la fecha de hoy.
            - Si dice un día de la semana sin más ("el viernes"), usa el próximo
              que llegue; si dice "el viernes pasado", usa el anterior.
            - Si no se puede saber de qué día habla, "fecha" debe ser null.
            - "motivo" en máximo 12 palabras.
        `
    });

    const limpio = respuesta.text.replace(/```json|```/g, "").trim();
    return JSON.parse(limpio);
}