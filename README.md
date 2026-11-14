# Sistema de asistencia de practicantes — Electrotop Perú S.A.C.

Sistema que registra la asistencia de practicantes mediante mensajes de WhatsApp,
interpretados con IA, y calcula automáticamente puntualidad, tardanzas y faltas
según el horario de cada practicante.

## Funcionalidades

- Registro de entrada y salida por WhatsApp en lenguaje natural ("ya llegué", "me retiro").
- Clasificación del mensaje con IA (Google Gemini): entrada, salida u otro.
- Horarios por practicante, con días y horas distintos.
- Cálculo automático de puntual, tardanza y falta, con tolerancia configurable.
- Detección de faltas sin que llegue ningún mensaje (tareas programadas).
- Dashboard web: inicio, practicantes, horarios, historial y reportes.
- Login con contraseñas cifradas (bcrypt) y sesiones JWT.
- Validación de la firma de Meta en el webhook.

## Arquitectura

```
Practicante → WhatsApp → Meta Cloud API → Webhook (Express)
                                              │
                                  Gemini: ¿entrada, salida u otro?
                                              │
                         MySQL: asistencias (log) + jornadas (resumen por día)
                                              ▲
                     node-cron: crea jornadas (00:05) y cierra faltas (cada 10 min)
                                              │
                                  Dashboard React ← API REST (JWT)
```

## Cómo se calculan las faltas

Una falta es la ausencia de un mensaje, así que no puede detectarse esperando mensajes.
El sistema genera de antemano lo que debería pasar:

1. **00:05**: crea una fila en `jornadas` por cada practicante activo que tenga horario ese día.
   Los días sin horario nunca generan jornada, por lo tanto nunca son falta.
2. **Al llegar un mensaje** de entrada o salida: se guarda en `asistencias` y se actualiza
   la jornada (`puntual` o `tarde`, minutos de tardanza, salida normal o anticipada).
3. **Cada 10 minutos**: las jornadas `pendiente` sin entrada cuyo turno ya terminó
   (más un margen) pasan a `falta`.

Si el practicante escribe después de que se marcó la falta, la jornada se corrige sola.

## Base de datos

| Tabla | Función |
|---|---|
| `practicantes` | Datos del practicante, estado y periodo de prácticas |
| `horarios` | Días y horas de entrada/salida por practicante |
| `asistencias` | Log de cada mensaje de entrada/salida recibido |
| `jornadas` | Un registro por día esperado, con estado final |
| `configuracion` | Reglas editables (tolerancia, margen de cierre de faltas) |
| `usuarios` | Acceso al dashboard |

## Instalación

Requisitos: Node.js 20+, MySQL/MariaDB, cuenta de WhatsApp Cloud API y clave de Gemini.

1. Importar la base de datos desde `database/schema.sql`.
2. Backend:
   ```bash
   cd backend
   npm install
   npm run dev
   ```
3. Frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Variables de entorno (`backend/.env`)

```
DB_HOST=
DB_PORT=
DB_USER=
DB_PASSWORD=
DB_NAME=
JWT_SECRET=
GEMINI_API_KEY=
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_API_VERSION=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_APP_SECRET=
FRONTEND_URL=http://localhost:5173
```

## Endpoints principales

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/login` | Inicio de sesión |
| GET | `/api/practicantes` | Lista de practicantes |
| GET | `/api/horarios` | Horarios |
| GET | `/api/asistencias` | Historial de marcaciones |
| GET | `/api/reportes?inicio=&fin=&practicante=` | Reporte con puntuales, tardanzas y faltas |
| GET/POST | `/api/whatsapp/webhook` | Webhook de Meta |

## Limitaciones y mejoras futuras

- Validación de ubicación al marcar (radio alrededor de la oficina).
- QR dinámico para reforzar la verificación de presencia.
- Justificaciones de ausencias con aprobación del supervisor.
- Aviso al supervisor por WhatsApp cuando ocurre una falta.
- Exportación de reportes a Excel o PDF.