import React, { useState, useEffect } from 'react'
import '../caja/caja.css'

const CAMPOS = [
  { clave: 'nombre_negocio', label: 'Nombre del negocio', tipo: 'text', placeholder: 'Match Crunch' },
  { clave: 'nit', label: 'NIT', tipo: 'text', placeholder: '000000000-0' },
  { clave: 'direccion', label: 'Dirección', tipo: 'text', placeholder: 'Rotonda Chicala' },
  { clave: 'telefono', label: 'Teléfono', tipo: 'text', placeholder: '300 000 0000' },
  { clave: 'ciudad', label: 'Ciudad', tipo: 'text', placeholder: 'Bogotá' },
  { clave: 'mensaje_recibo', label: 'Mensaje en recibo', tipo: 'text', placeholder: '¡Gracias!' },
  { clave: 'impresora_puerto', label: 'Puerto impresora', tipo: 'text', placeholder: 'COM3 o /dev/usb/lp0' },
  { clave: 'impresora_tipo', label: 'Tipo impresora', tipo: 'select', opciones: ['usb', 'serial', 'network'] },
]

export default function ConfigScreen() {
  const [valores, setValores] = useState({})
  const [guardado, setGuardado] = useState(false)
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    async function cargar() {
      try {
        const config = await window.electronAPI.config.obtenerTodos()
        setValores(config)
      } catch (err) {
        console.error('[Config]', err)
      }
    }
    cargar()
  }, [])

  async function handleGuardar() {
    setCargando(true)
    try {
      await Promise.all(
        CAMPOS.map(c =>
          window.electronAPI.config.guardar(c.clave, valores[c.clave] ?? '')
        )
      )
      setGuardado(true)
      setTimeout(() => setGuardado(false), 2500)
    } catch (err) {
      alert(`Error al guardar:\n${err.message}`)
    } finally {
      setCargando(false)
    }
  }

  function handleChange(clave, valor) {
    setValores(prev => ({ ...prev, [clave]: valor }))
  }

  return (
    <div style={{ padding: 24, maxWidth: 600, margin: '0 auto', overflow: 'auto', height: '100%' }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>⚙️ Configuración</h2>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 24 }}>
        Datos del negocio y configuración de impresora
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {CAMPOS.map(campo => (
          <div key={campo.clave}>
            <label className="form-label">{campo.label}</label>
            {campo.tipo === 'select' ? (
              <select
                className="form-input"
                value={valores[campo.clave] ?? ''}
                onChange={e => handleChange(campo.clave, e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                {campo.opciones.map(op => (
                  <option key={op} value={op}>{op}</option>
                ))}
              </select>
            ) : (
              <input
                className="form-input"
                type={campo.tipo}
                placeholder={campo.placeholder}
                value={valores[campo.clave] ?? ''}
                onChange={e => handleChange(campo.clave, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>

      <button
        onClick={handleGuardar}
        disabled={cargando}
        style={{
          marginTop: 24,
          width: '100%',
          padding: '16px',
          background: guardado ? 'var(--success)' : 'var(--accent)',
          color: 'white',
          border: 'none',
          borderRadius: 'var(--radius)',
          fontSize: 15,
          fontWeight: 800,
          cursor: cargando ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
          transition: 'background .2s',
          opacity: cargando ? .6 : 1,
        }}
      >
        {cargando ? '⏳ Guardando...' : guardado ? '✅ ¡Guardado!' : '💾 Guardar cambios'}
      </button>
    </div>
  )
}
