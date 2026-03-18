import React, { useState, useEffect, useCallback } from 'react'
import './reportes.css'
import { formatCOP } from '../pos/ProductGrid'

// ── Selector de rango de fechas ──────────────────────────────────────────────
function fechaHoy() {
  return new Date().toLocaleDateString('en-CA')
}

function hace7Dias() {
  const d = new Date()
  d.setDate(d.getDate() - 6)
  return d.toLocaleDateString('en-CA')
}

const PERIODOS = [
  { id: 'hoy',   label: 'Hoy',       desde: fechaHoy(),   hasta: fechaHoy()   },
  { id: '7d',    label: '7 días',     desde: hace7Dias(),  hasta: fechaHoy()   },
  { id: 'mes',   label: 'Este mes',   desde: () => `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-01`, hasta: fechaHoy() },
]

export default function ReportesScreen() {
  const [periodo,    setPeriodo]    = useState('hoy')
  const [resumen,    setResumen]    = useState(null)
  const [topProds,   setTopProds]   = useState([])
  const [horasPico,  setHorasPico]  = useState([])
  const [cargando,   setCargando]   = useState(false)

  const p = PERIODOS.find(x => x.id === periodo) ?? PERIODOS[0]
  const desde = typeof p.desde === 'function' ? p.desde() : p.desde
  const hasta = p.hasta

  const cargarDatos = useCallback(async () => {
    setCargando(true)
    try {
      const [res, top, horas] = await Promise.all([
        window.electronAPI.reportes.resumenDiario(periodo === 'hoy' ? fechaHoy() : desde),
        window.electronAPI.reportes.productosMasVendidos(desde, hasta),
        window.electronAPI.reportes.horasPico(periodo === 'hoy' ? fechaHoy() : desde),
      ])
      setResumen(res)
      setTopProds(top.slice(0, 5))
      setHorasPico(horas)
    } catch (err) {
      console.error('[Reportes]', err)
    } finally {
      setCargando(false)
    }
  }, [periodo, desde, hasta])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  // Valor máximo para la barra de horas pico
  const maxVentasHora = Math.max(...horasPico.map(h => h.total_ventas), 1)
  const maxIngresosTop = Math.max(...topProds.map(p => p.total_ingresos), 1)

  return (
    <div className="reportes-screen">

      {/* ── Header + Selector de período ─────────────────────────────── */}
      <div className="reportes-header">
        <h2 className="reportes-titulo">📊 Reportes</h2>
        <div className="periodo-tabs">
          {PERIODOS.map(p => (
            <button
              key={p.id}
              className={`periodo-tab ${periodo === p.id ? 'active' : ''}`}
              onClick={() => setPeriodo(p.id)}
            >
              {p.label}
            </button>
          ))}
          <button className="periodo-tab refresh" onClick={cargarDatos} title="Actualizar">
            🔄
          </button>
        </div>
      </div>

      {cargando && <div className="reportes-cargando">⏳ Cargando datos...</div>}

      {/* ── Tarjetas resumen ──────────────────────────────────────────── */}
      {resumen && (
        <div className="reporte-stats">
          <ReporteCard icon="🛒" label="Total ventas"    valor={resumen.total_ventas}                color="var(--info)"    format="num" />
          <ReporteCard icon="💰" label="Ingresos totales" valor={resumen.ingresos_total}             color="var(--success)" format="cop" />
          <ReporteCard icon="💵" label="Efectivo"         valor={resumen.efectivo}                   color="var(--success)" format="cop" />
          <ReporteCard icon="📱" label="Nequi"            valor={resumen.nequi}                      color="#a855f7"        format="cop" />
          <ReporteCard icon="🔴" label="DaviPlata"        valor={resumen.daviplata}                  color="var(--danger)"  format="cop" />
          <ReporteCard icon="📈" label="Ticket promedio"
            valor={resumen.total_ventas > 0 ? resumen.ingresos_total / resumen.total_ventas : 0}
            color="var(--accent)" format="cop"
          />
        </div>
      )}

      <div className="reportes-grid">

        {/* ── Top 5 productos ────────────────────────────────────────── */}
        <div className="reporte-panel">
          <h3 className="panel-title">🏆 Top 5 productos más vendidos</h3>
          {topProds.length === 0
            ? <EmptyState msg="Sin ventas en este período" />
            : (
              <div className="top-productos-lista">
                {topProds.map((prod, i) => (
                  <div key={prod.id} className="top-prod-row">
                    <span className="top-pos">{i + 1}</span>
                    <div className="top-prod-info">
                      <span className="top-prod-nombre">{prod.nombre}</span>
                      <span className="top-prod-cat">{prod.categoria}</span>
                    </div>
                    <div className="top-prod-barra-wrap">
                      <div
                        className="top-prod-barra"
                        style={{ width: `${(prod.total_ingresos / maxIngresosTop) * 100}%` }}
                      />
                    </div>
                    <div className="top-prod-nums">
                      <span className="top-prod-cant">{prod.total_vendido} uds</span>
                      <span className="top-prod-ingreso">{formatCOP(prod.total_ingresos)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </div>

        {/* ── Horas pico ─────────────────────────────────────────────── */}
        <div className="reporte-panel">
          <h3 className="panel-title">⏰ Horas pico de ventas</h3>
          {horasPico.length === 0
            ? <EmptyState msg="Sin datos de horas para este período" />
            : (
              <div className="horas-pico-chart">
                {Array.from({ length: 24 }, (_, h) => {
                  const dato = horasPico.find(x => x.hora === h)
                  const ventas = dato?.total_ventas ?? 0
                  const altura = ventas > 0 ? Math.max(8, (ventas / maxVentasHora) * 100) : 0
                  const esAlta = ventas === maxVentasHora && ventas > 0

                  return (
                    <div key={h} className="hora-col" title={`${h}:00 — ${ventas} ventas`}>
                      <span className="hora-valor">{ventas > 0 ? ventas : ''}</span>
                      <div
                        className={`hora-barra ${esAlta ? 'pico' : ''}`}
                        style={{ height: `${altura}%` }}
                      />
                      {(h % 4 === 0) && (
                        <span className="hora-label">{h}h</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          }
        </div>

      </div>

      {/* ── Ingresos vs Egresos (sesiones del día) ───────────────────── */}
      <IngresosEgresos desde={desde} hasta={hasta} />

    </div>
  )
}

// ── Ingresos vs Egresos por sesiones ────────────────────────────────────────
function IngresosEgresos({ desde, hasta }) {
  const [datos, setDatos] = useState([])

  useEffect(() => {
    async function cargar() {
      try {
        const res = await window.electronAPI.reportes.resumenMensual(
          new Date(desde).getFullYear(),
          new Date(desde).getMonth() + 1
        )
        setDatos(res)
      } catch (err) {
        console.error('[IngEgr]', err)
      }
    }
    cargar()
  }, [desde, hasta])

  if (!datos.length) return null

  const maxVal = Math.max(...datos.map(d => d.total_ingresos), 1)

  return (
    <div className="reporte-panel">
      <h3 className="panel-title">📅 Ingresos diarios del mes</h3>
      <div className="ingresos-lista">
        {datos.map(d => (
          <div key={d.fecha} className="ingreso-fila">
            <span className="ingreso-fecha">
              {new Date(d.fecha + 'T12:00').toLocaleDateString('es-CO', {
                weekday: 'short', month: 'short', day: 'numeric',
              })}
            </span>
            <div className="ingreso-barra-wrap">
              <div
                className="ingreso-barra"
                style={{ width: `${(d.total_ingresos / maxVal) * 100}%` }}
              />
            </div>
            <span className="ingreso-ventas">{d.total_ventas} vtas</span>
            <span className="ingreso-total">{formatCOP(d.total_ingresos)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Componentes auxiliares ────────────────────────────────────────────────────
function ReporteCard({ icon, label, valor, color, format }) {
  const display = format === 'cop'
    ? formatCOP(valor ?? 0)
    : (valor ?? 0).toLocaleString('es-CO')

  return (
    <div className="reporte-card" style={{ '--rc-color': color }}>
      <span className="rc-icon">{icon}</span>
      <div>
        <div className="rc-label">{label}</div>
        <div className="rc-valor">{display}</div>
      </div>
    </div>
  )
}

function EmptyState({ msg }) {
  return (
    <div className="reportes-empty">
      <span>📭</span>
      <p>{msg}</p>
    </div>
  )
}
