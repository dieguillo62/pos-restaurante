import React, { useState } from 'react'
import { useUser } from '../../context/UserContext'
import AdminOverlay from '../auth/AdminOverlay'

/**
 * Protected — Guard de autorización por rol
 *
 * Uso básico (solo renderiza si el rol coincide):
 *   <Protected role="admin">
 *     <BtnEliminarProducto />
 *   </Protected>
 *
 * Uso con override (muestra el contenido tras PIN admin):
 *   <Protected role="admin" override accion="Cambiar precio del producto">
 *     <BtnCambiarPrecio />
 *   </Protected>
 *
 * Props:
 *   role     'admin' | 'user'    — rol mínimo requerido
 *   override bool                — si true, usuario sin permisos puede solicitar PIN admin
 *   accion   string              — descripción para el modal de override
 *   fallback ReactNode           — qué mostrar si no tiene permisos (default: nada)
 *   children ReactNode
 */
export default function Protected({
  role = 'admin',
  override = false,
  accion = 'Acción restringida',
  fallback = null,
  children,
}) {
  const { user } = useUser()
  const [mostrarOverride, setMostrarOverride] = useState(false)
  const [autorizado, setAutorizado] = useState(false)

  // Sin usuario autenticado → nada
  if (!user) return null

  const tienePermiso = role === 'user' || user.role === 'admin' || autorizado

  if (tienePermiso) {
    return <>{children}</>
  }

  // Sin permiso + override disponible → botón que abre el modal
  if (override) {
    return (
      <>
        {/* Renderiza el fallback o un botón genérico de "solicitar acceso" */}
        <div onClick={() => setMostrarOverride(true)} style={{ cursor: 'pointer' }}>
          {fallback ?? (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 11, color: 'var(--text-muted)', fontWeight: 700,
              padding: '4px 10px', border: '1.5px dashed var(--border)',
              borderRadius: 6, cursor: 'pointer',
            }}>
              🔒 Requiere admin
            </span>
          )}
        </div>

        {mostrarOverride && (
          <AdminOverlay
            accion={accion}
            onAutorizado={() => {
              setAutorizado(true)
              setMostrarOverride(false)
            }}
            onCancelar={() => setMostrarOverride(false)}
          />
        )}
      </>
    )
  }

  // Sin permiso y sin override → fallback o nada
  return fallback ? <>{fallback}</> : null
}
