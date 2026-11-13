import express from 'express';
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import practicantesRoutes from "./routes/practicantes.routes.js";
import horariosRoutes from "./routes/horarios.routes.js";
import asistenciasRoutes from "./routes/asistencias.routes.js";
import whatsappRoutes from "./routes/whatsapp.routes.js";
import { verificarToken } from "./middleware/auth.middleware.js";

const app = express();

app.use(cors({
    origin: "http://localhost:5173"
}));

app.use(express.json());

app.use("/api/auth", authRoutes);

app.use("/api/practicantes", verificarToken, practicantesRoutes);
app.use("/api/horarios", verificarToken, horariosRoutes);
app.use("/api/asistencias", verificarToken, asistenciasRoutes);

app.use("/api/whatsapp", whatsappRoutes);

export default app;
