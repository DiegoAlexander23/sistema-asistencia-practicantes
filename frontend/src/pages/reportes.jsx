import { useEffect, useState } from "react";
import { obtenerPracticantes } from "../services/practicantesService";
import { obtenerReporte } from "../services/reportesService";
import "./style/reportes.css";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

const COLORES = {
    puntuales: "#3b82f6",
    tardanzas: "#f59e0b",
    faltas: "#f43f5e",
    justificadas: "#94a3b8",
};

function Reportes() {
    const [practicantes, setPracticantes] = useState([]);
    const [fechaInicio, setFechaInicio] = useState("");
    const [fechaFin, setFechaFin] = useState("");
    const [practicanteId, setPracticanteId] = useState("");
    const [reporte, setReporte] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        obtenerPracticantes().then(setPracticantes).catch(console.error);
    }, []);

    useEffect(() => {
        const cargar = async () => {
            try {
                setCargando(true);
                setError("");
                setReporte(
                    await obtenerReporte({
                        inicio: fechaInicio,
                        fin: fechaFin,
                        practicante: practicanteId,
                    })
                );
            } catch (err) {
                console.error(err);
                setReporte(null);
                setError("No se pudo cargar el reporte.");
            } finally {
                setCargando(false);
            }
        };
        cargar();
    }, [fechaInicio, fechaFin, practicanteId]);

    const t = reporte?.totales;
    const filas = (reporte?.practicantes ?? []).filter((p) => p.programados > 0);

    const evaluables = t ? t.puntuales + t.tardanzas + t.faltas : 0;
    const pctAsistencia =
        evaluables > 0
            ? Math.round(((t.puntuales + t.tardanzas) / evaluables) * 100)
            : null;

    const datosDona = t
        ? [
              { estado: "Puntuales", cantidad: t.puntuales, color: COLORES.puntuales },
              { estado: "Tardanzas", cantidad: t.tardanzas, color: COLORES.tardanzas },
              { estado: "Faltas", cantidad: t.faltas, color: COLORES.faltas },
              { estado: "Justificadas", cantidad: t.justificadas, color: COLORES.justificadas },
          ].filter((d) => d.cantidad > 0)
        : [];

    const totalDona = datosDona.reduce((suma, d) => suma + d.cantidad, 0);

    if (!reporte && cargando) {
        return <div className="reportes"><p>Cargando reportes...</p></div>;
    }

    return (
        <main className="reportes">
            <header className="reportes-header">
                <div>
                    <h1>Reportes</h1>
                    <p>
                        Asistencia según el horario de cada practicante
                        {reporte ? ` (del ${reporte.rango.inicio} al ${reporte.rango.fin}).` : "."}
                    </p>
                </div>
            </header>

            {error && <p className="reportes-error">{error}</p>}

            <section className="reportes-filtros">
                <label>
                    Desde
                    <input type="date" value={fechaInicio} max={fechaFin || undefined}
                        onChange={(e) => setFechaInicio(e.target.value)} />
                </label>

                <label>
                    Hasta
                    <input type="date" value={fechaFin} min={fechaInicio || undefined}
                        onChange={(e) => setFechaFin(e.target.value)} />
                </label>

                <label>
                    Practicante
                    <select value={practicanteId} onChange={(e) => setPracticanteId(e.target.value)}>
                        <option value="">Todos los practicantes</option>
                        {practicantes.map((p) => (
                            <option key={p.id} value={String(p.id)}>
                                {p.nombre} {p.apellido}
                            </option>
                        ))}
                    </select>
                </label>

                <button type="button" onClick={() => {
                    setFechaInicio(""); setFechaFin(""); setPracticanteId("");
                }}>
                    Limpiar filtros
                </button>
            </section>

            <section className="reportes-tarjetas">
                <article className="reporte-card"><span>Días programados</span><strong>{t ? t.programados : "—"}</strong></article>
                <article className="reporte-card"><span>Puntuales</span><strong>{t ? t.puntuales : "—"}</strong></article>
                <article className="reporte-card"><span>Tardanzas</span><strong>{t ? t.tardanzas : "—"}</strong></article>
                <article className="reporte-card"><span>Faltas</span><strong>{t ? t.faltas : "—"}</strong></article>
                <article className="reporte-card"><span>Justificadas</span><strong>{t ? t.justificadas : "—"}</strong></article>
                <article className="reporte-card"><span>Asistencia</span><strong>{pctAsistencia === null ? "—" : `${pctAsistencia}%`}</strong></article>
            </section>

            <section className="reportes-graficos-conjuntos">
                <section className="reportes-grafico reportes-grafico-dona">
                    <div className="reportes-grafico-header">
                        <h2>Asistencia general</h2>
                        <p>Distribución de las jornadas ya terminadas.</p>
                    </div>

                    <div className="reportes-dona-contenedor">
                        {totalDona === 0 ? (
                            <p className="reportes-vs-vacio">No hay jornadas terminadas en este período.</p>
                        ) : (
                            <>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={datosDona} dataKey="cantidad" nameKey="estado"
                                            innerRadius="62%" outerRadius="88%" paddingAngle={2} stroke="none">
                                            {datosDona.map((d) => (
                                                <Cell key={d.estado} fill={d.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(v, n) => [`${v} jornadas`, n]} />
                                    </PieChart>
                                </ResponsiveContainer>

                                <div className="reportes-dona-centro">
                                    <strong>{pctAsistencia === null ? "—" : `${pctAsistencia}%`}</strong>
                                    <span>Asistencia</span>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="reportes-leyenda reportes-leyenda-dona">
                        {datosDona.map((d) => (
                            <span key={d.estado}>
                                <i style={{ background: d.color, display: "inline-block", width: 8, height: 8, borderRadius: "50%", marginRight: 6 }} />
                                {d.estado} ({d.cantidad})
                            </span>
                        ))}
                    </div>
                </section>

                <section className="reportes-grafico reportes-grafico-practicantes">
                    <div className="reportes-grafico-header">
                        <h2>Jornadas por practicante</h2>
                        <p>Comparación durante el período seleccionado.</p><br />
                    </div>

                    <div className="reportes-barras-practicantes">
                        {filas.filter((p) => p.puntuales + p.tardanzas + p.faltas + p.justificadas > 0).length === 0 ? (
                            <p>No hay jornadas terminadas para comparar.</p>
                        ) : (
                            filas
                                .filter((p) => p.puntuales + p.tardanzas + p.faltas + p.justificadas > 0)
                                .map((p) => {
                                    const total = p.puntuales + p.tardanzas + p.faltas + p.justificadas;
                                    const tramos = [
                                        ["puntuales", p.puntuales],
                                        ["tardanzas", p.tardanzas],
                                        ["faltas", p.faltas],
                                        ["justificadas", p.justificadas],
                                    ];

                                    return (
                                        <div className="reportes-fila-practicante" key={p.id}>
                                            <span className="reportes-nombre-practicante">{p.nombre}</span>

                                            <div className="reportes-barra-practicante" role="img"
                                                aria-label={`${p.nombre}: ${p.puntuales} puntuales, ${p.tardanzas} tardanzas, ${p.faltas} faltas`}>
                                                {tramos.map(([clave, cantidad]) => (
                                                    <div key={clave} style={{
                                                        width: `${(cantidad / total) * 100}%`,
                                                        height: "100%",
                                                        background: COLORES[clave],
                                                    }} />
                                                ))}
                                            </div>

                                            <span className="reportes-total-practicante">{total}</span>
                                        </div>
                                    );
                                })
                        )}
                    </div>
                </section>
            </section><br />

            <section className="reportes-tabla">
                <h2>Detalle por practicante</h2>
                <p className="reportes-descripcion">
                    Solo cuentan los días que cada practicante debía asistir.
                </p>

                {filas.length === 0 ? (
                    <p>No hay datos para estos filtros.</p>
                ) : (
                    <div className="reportes-tabla-contenedor">
                        <table>
                            <thead>
                                <tr>
                                    <th>Practicante</th>
                                    <th>Programados</th>
                                    <th>Puntuales</th>
                                    <th>Tardanzas</th>
                                    <th>Min. tarde</th>
                                    <th>Faltas</th>
                                    <th>Justificadas</th>
                                    <th>Pendientes</th>
                                    <th>Asistencia</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filas.map((p) => (
                                    <tr key={p.id}>
                                        <td>{p.nombre} {p.apellido}</td>
                                        <td>{p.programados}</td>
                                        <td>{p.puntuales}</td>
                                        <td>{p.tardanzas}</td>
                                        <td>{p.minutos_tarde}</td>
                                        <td>{p.faltas}</td>
                                        <td>{p.justificadas}</td>
                                        <td>{p.pendientes}</td>
                                        <td>
                                            {p.porcentaje_asistencia === null
                                                ? "—"
                                                : `${p.porcentaje_asistencia}%`}
                                        </td>
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

export default Reportes;