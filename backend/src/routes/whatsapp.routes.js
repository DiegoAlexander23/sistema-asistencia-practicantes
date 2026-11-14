import express from "express";
import { verificarFirmaMeta } from "../middleware/whatsappFirma.middleware.js";
import {
    verificarWebhook,
    recibirMensaje
} from "../controllers/whatsapp.controller.js";

const router = express.Router();

router.get("/webhook", verificarWebhook);
router.post("/webhook", verificarFirmaMeta, recibirMensaje);

export default router;
