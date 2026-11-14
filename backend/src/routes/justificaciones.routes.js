import express from "express";
import {
    listarJustificaciones,
    aprobarJustificacion,
    rechazarJustificacion
} from "../controllers/justificaciones.controller.js";

const router = express.Router();

router.get("/", listarJustificaciones);
router.patch("/:id/aprobar", aprobarJustificacion);
router.patch("/:id/rechazar", rechazarJustificacion);

export default router;