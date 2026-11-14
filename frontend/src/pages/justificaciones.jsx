import { useEffect, useState } from "react";
import {
    obtenerJustificaciones,
    aprobarJustificacion,
    rechazarJustificacion
} from "../services/justificacionesService";
import "./style/justificaciones.css";

const ESTADOS = [
    { id: "pendiente", nombre: "Pendientes" },
    { id: "aprobada", nombre: "Aprobadas" },
    { id: "rechazada", nombre: "Rechazadas" }
];

function formatearFecha(fecha) {
    const [anio, mes, dia] = String(fecha).split("-");
    return anio && mes && dia ? `${dia}/${mes}/${anio}` : fecha;
}

function Justificaciones() {
    const [estado, setEstado] = useState("pendiente");
    const [lista, setLista] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [procesando, setProcesando] = useState(null);

    const cargar = async (estadoActual) => {
        try {
            setCargando(true);
            setError("");
            setLista(await obtenerJustificaciones(estadoActual));
        } catch (err) {
            console.error(err);
            setError("No se pudieron cargar las justificaciones.");
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargar(estado);
    }, [estado]);

    const resolver = async (item, accion) => {
        if (accion === "rechazar") {
            const seguro = window.confirm(
                `¿Rechazar la justificación de ${item.nombre} ${item.apellido}?`
            );
            if (!seguro) return;
        }

        try {
            setProcesando(item.id);
            setError("");

            if (accion === "aprobar") await aprobarJustificacion(item.id);
            else await rechazarJustificacion(item.id);

            await cargar(estado);
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setProcesando(null);
        }
    };

    return (
        <main className="just">
            <header className="just-header">
                <h1>Justificaciones</h1>
                <p>Revisa las ausencias que los practicantes justificaron por WhatsApp.</p>
            </header>

            <div className="just-tabs">
                {ESTADOS.map((e) => (
                    <button
                        key={e.id}
                        type="button"
                        className={estado === e.id ? "just-tab activo" : "just-tab"}
                        onClick={() => setEstado(e.id)}
                    >
                        {e.nombre}
                    </button>
                ))}
            </div>

            {error && <p className="just-error">{error}</p>}

            <section className="just-panel">
                {cargando ? (
                    <p className="just-vacio">Cargando...</p>
                ) : lista.length === 0 ? (
                    <p className="just-vacio">No hay justificaciones en esta sección.</p>
                ) : (
                    <div className="just-tabla-contenedor">
                        <table>
                            <thead>
                                <tr>
                                    <th>Practicante</th>
                                    <th>Fecha justificada</th>
                                    <th>Motivo</th>
                                    <th>Mensaje original</th>
                                    {estado === "pendiente" && <th>Acción</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {lista.map((j) => (
                                    <tr key={j.id}>
                                        <td>{j.nombre} {j.apellido}</td>
                                        <td>{formatearFecha(j.fecha)}</td>
                                        <td>{j.motivo}</td>
                                        <td className="just-original">{j.mensaje_original}</td>
                                        {estado === "pendiente" && (
                                            <td>
                                                <div className="just-acciones">
                                                    <button
                                                        type="button"
                                                        className="just-aprobar"
                                                        disabled={procesando === j.id}
                                                        onClick={() => resolver(j, "aprobar")}
                                                    >
                                                        Aprobar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="just-rechazar"
                                                        disabled={procesando === j.id}
                                                        onClick={() => resolver(j, "rechazar")}
                                                    >
                                                        Rechazar
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </main>
    );
}

export default Justificaciones;