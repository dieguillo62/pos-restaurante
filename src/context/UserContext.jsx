import React, { createContext, useContext, useState, useCallback } from 'react'

/**
 * UserContext — Estado global de autenticación
 *
 * Uso:
 *   const { user, login, logout } = useUser()
 *   user = { id, username, role }  | null si no autenticado
 */

const UserContext = createContext(null)

export function UserProvider({ children }) {
  const [user, setUser] = useState(null)

  const login = useCallback((userData) => {
    setUser(userData)
  }, [])

  const logout = useCallback(async () => {
    if (user && window.electronAPI) {
      await window.electronAPI.auth.logout(user.id, user.username)
    }
    setUser(null)
  }, [user])

  // Cierre seguro: caja → logout → cerrar app
  const cerrarAppSeguro = useCallback(async (cajaActiva, cerrarCaja) => {
    try {
      // 1. Cerrar caja si está abierta
      if (cajaActiva?.id && cerrarCaja) {
        await cerrarCaja(cajaActiva.id)
      }
      // 2. Logout
      if (user && window.electronAPI) {
        await window.electronAPI.auth.cerrarApp(user.id, user.username)
      }
      // 3. La app se cierra desde el main process
    } catch (err) {
      console.error('[Auth] Error en cierre seguro:', err)
    }
  }, [user])

  return (
    <UserContext.Provider value={{ user, login, logout, cerrarAppSeguro }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser debe usarse dentro de <UserProvider>')
  return ctx
}

export default UserContext
