import React, { useState } from 'react'
import './auth.css'

const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓']

/**
 * PinPad — teclado numérico táctil para ingreso de PIN
 *
 * Props:
 *   onConfirm (pin: string) => void
 *   onCancel  () => void  (opcional)
 *   cargando  bool
 *   error     string | null
 *   maxLength número (default 4)
 */
export default function PinPad({
  onConfirm,
  onCancel,
  cargando = false,
  error = null,
  maxLength = 4,
  titulo = 'Ingresa tu PIN',
}) {
  const [pin, setPin] = useState('')

  function presionar(tecla) {
    if (cargando) return

    if (tecla === '⌫') {
      setPin(p => p.slice(0, -1))
      return
    }
    if (tecla === '✓') {
      if (pin.length > 0) onConfirm(pin)
      return
    }
    if (pin.length < maxLength) {
      const nuevo = pin + tecla
      setPin(nuevo)
      // Auto-confirmar cuando se completa el PIN
      if (nuevo.length === maxLength) {
        setTimeout(() => onConfirm(nuevo), 120)
      }
    }
  }

  return (
    <div className="pinpad-wrapper">
      <p className="pinpad-titulo">{titulo}</p>

      {/* Indicador visual de dígitos */}
      <div className="pinpad-dots">
        {Array.from({ length: maxLength }).map((_, i) => (
          <div
            key={i}
            className={`pin-dot ${i < pin.length ? 'filled' : ''} ${error ? 'error' : ''}`}
          />
        ))}
      </div>

      {/* Mensaje de error */}
      {error && <p className="pinpad-error">{error}</p>}

      {/* Grid de teclas */}
      <div className="pinpad-grid">
        {TECLAS.map(tecla => (
          <button
            key={tecla}
            className={`pinpad-key
              ${tecla === '⌫' ? 'key-back' : ''}
              ${tecla === '✓' ? 'key-ok' : ''}
              ${cargando ? 'key-disabled' : ''}
            `}
            onClick={() => presionar(tecla)}
            disabled={cargando}
          >
            {cargando && tecla === '✓' ? '⏳' : tecla}
          </button>
        ))}
      </div>

      {onCancel && (
        <button className="pinpad-cancelar" onClick={onCancel} disabled={cargando}>
          Cancelar
        </button>
      )}
    </div>
  )
}
