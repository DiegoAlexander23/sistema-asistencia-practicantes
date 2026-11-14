import crypto from "crypto";

export function verificarFirmaMeta(req, res, next) {
    const secreto = process.env.WHATSAPP_APP_SECRET;

    if (!secreto) {
        console.warn("[webhook] WHATSAPP_APP_SECRET no configurado: firma sin validar");
        return next();
    }

    const firmaRecibida = req.get("x-hub-signature-256");

    if (!firmaRecibida || !req.rawBody) {
        console.warn("[webhook] Petición sin firma. Rechazada.");
        return res.sendStatus(401);
    }

    const firmaEsperada =
        "sha256=" +
        crypto.createHmac("sha256", secreto).update(req.rawBody).digest("hex");

    const a = Buffer.from(firmaRecibida);
    const b = Buffer.from(firmaEsperada);

    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        console.warn("[webhook] Firma inválida. Rechazada.");
        return res.sendStatus(401);
    }

    next();
}