
import jwt from "jsonwebtoken";

export function verificarToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            mensaje: "Token de acceso requerido"
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const usuario = jwt.verify(token, process.env.JWT_SECRET);

        req.user = usuario;

        next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            mensaje: "Token inválido o expirado"
        });
    }
}
