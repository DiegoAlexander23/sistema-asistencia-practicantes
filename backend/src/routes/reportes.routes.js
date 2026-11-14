import express from "express";
import { obtenerReporte } from "../controllers/reportes.controller.js";

const router = express.Router();

router.get("/", obtenerReporte);

export default router;