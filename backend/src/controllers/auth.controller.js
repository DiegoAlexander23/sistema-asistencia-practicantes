import bcrypt from "bcrypt";
import pool from "../config/database.js";
import jwt from "jsonwebtoken";

export const login = async (req, res) => {
    try {
        const { email, clave } = req.body;

        if (!email || !clave) {
            return res.status(400).json({
                success: false,
                mensaje: "Usuario y contraseña son obligatorios"
            });
        }

        const [rows] = await pool.execute(
            "SELECT id, usuario, contrasena FROM usuarios WHERE usuario = ? LIMIT 1",
            [email]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                mensaje: "Usuario o contraseña incorrectos"
            });
        }

        const usuario = rows[0];

        const contraseñaCorrecta = await bcrypt.compare(
            clave,
            usuario.contrasena
        );

        if (!contraseñaCorrecta) {
            return res.status(401).json({
                success: false,
                mensaje: "Usuario o contraseña incorrectos"
            });
        }
        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET no está configurado");
        }
        const token = jwt.sign(
            {
                id: usuario.id,
                usuario: usuario.usuario
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "8h"
            }
        );
        return res.status(200).json({
            success: true,
            mensaje: "Inicio de sesión correcto",
            token,
            usuario: {
                id: usuario.id,
                usuario: usuario.usuario
            }
        });

    } catch (error) {
        console.error("Error en login:", error);

        return res.status(500).json({
            success: false,
            mensaje: "Error interno del servidor"
        });
    }
};
