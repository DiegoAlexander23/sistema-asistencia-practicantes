export async function enviarMensajeWhatsApp(telefono, texto) {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const apiVersion = process.env.WHATSAPP_API_VERSION;

    if (!token || !phoneNumberId || !apiVersion) {
        throw new Error("Faltan las credenciales de WhatsApp en el archivo .env");
    }

    const respuesta = await fetch(
        `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
        {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: telefono,
                type: "text",
                text: {
                    body: texto
                }
            })
        }
    );

    const resultado = await respuesta.json();

    if (!respuesta.ok) {
        throw new Error(
            `Error al enviar mensaje de WhatsApp: ${JSON.stringify(resultado)}`
        );
    }

    return resultado;
}
