
import express from "express";

import {
    verificarWebhook,
    recibirMensaje
} from "../controllers/whatsapp.controller.js";

const router = express.Router();

router.get("/webhook", verificarWebhook);
router.post("/webhook", recibirMensaje);

export default router;
