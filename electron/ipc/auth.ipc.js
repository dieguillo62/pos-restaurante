const { ipcMain, app } = require('electron')
const bcryptjs = require('bcryptjs')
const { getDatabase } = require('../database/connection')

// ── Helper: registrar en log de auditoría ─────────────────────────────────────
function registrarLog(db, userId, username, action, details = '') {
  try {
    db.prepare(
      'INSERT INTO logs (user_id, username, action, details) VALUES (?, ?, ?, ?)'
    ).run(userId ?? null, username ?? 'sistema', action, details)
  } catch (err) {
    console.error('[LOG] Error al registrar:', err.message)
  }
}

// ── Helper: verificar rol mínimo ──────────────────────────────────────────────
function esAdmin(db, userId) {
  const user = db.prepare("SELECT role FROM users WHERE id = ? AND activo = 1").get(userId)
  return user?.role === 'admin'
}

function registerAuthHandlers() {

  // ── auth:listarUsuarios ── para la pantalla de login (sin datos sensibles)
  ipcMain.handle('auth:listarUsuarios', () => {
    const db = getDatabase()
    return db.prepare(
      "SELECT id, username, role FROM users WHERE activo = 1 ORDER BY role DESC, username ASC"
    ).all()
  })

  // ── auth:loginPin ── autenticación por PIN
  ipcMain.handle('auth:loginPin', (_, { userId, pin }) => {
    const db = getDatabase()

    const user = db.prepare(
      'SELECT id, username, pin, role FROM users WHERE id = ? AND activo = 1'
    ).get(userId)

    if (!user) return { success: false, mensaje: 'Usuario no encontrado.' }
    if (user.pin !== String(pin).trim()) {
      registrarLog(db, userId, user.username, 'LOGIN_FALLIDO', 'PIN incorrecto')
      return { success: false, mensaje: 'PIN incorrecto.' }
    }

    registrarLog(db, user.id, user.username, 'LOGIN', 'Inicio de sesión exitoso')
    return {
      success: true,
      user: { id: user.id, username: user.username, role: user.role },
    }
  })

  // ── auth:loginPassword ── login por contraseña (acceso admin desde Config)
  ipcMain.handle('auth:loginPassword', (_, { username, password }) => {
    const db = getDatabase()

    const user = db.prepare(
      'SELECT * FROM users WHERE username = ? AND activo = 1'
    ).get(username)

    if (!user) return { success: false, mensaje: 'Usuario no encontrado.' }

    const ok = bcryptjs.compareSync(password, user.password_hash)
    if (!ok) {
      registrarLog(db, user.id, username, 'LOGIN_FALLIDO', 'Contraseña incorrecta')
      return { success: false, mensaje: 'Contraseña incorrecta.' }
    }

    registrarLog(db, user.id, user.username, 'LOGIN_PASSWORD', 'Login con contraseña')
    return {
      success: true,
      user: { id: user.id, username: user.username, role: user.role },
    }
  })

  // ── auth:verificarAdminPin ── override puntual (acción restringida)
  // Permite que un admin autorice UNA acción sin cambiar la sesión activa
  ipcMain.handle('auth:verificarAdminPin', (_, { pin }) => {
    const db = getDatabase()

    const admin = db.prepare(
      "SELECT id, username FROM users WHERE role = 'admin' AND pin = ? AND activo = 1"
    ).get(String(pin).trim())

    if (!admin) return { success: false, mensaje: 'PIN de administrador incorrecto.' }

    return { success: true, adminUsername: admin.username }
  })

  // ── auth:logout ──────────────────────────────────────────────────
  ipcMain.handle('auth:logout', (_, { userId, username }) => {
    const db = getDatabase()
    registrarLog(db, userId, username, 'LOGOUT', 'Cierre de sesión')
    return { success: true }
  })

  // ── auth:cerrarApp ── cierre seguro desde React ──────────────────
  ipcMain.handle('auth:cerrarApp', (_, { userId, username }) => {
    const db = getDatabase()
    registrarLog(db, userId, username, 'APP_CERRADA', 'Cierre de aplicación')
    setTimeout(() => app.quit(), 300)
    return { success: true }
  })

  // ── auth:logs ── historial de auditoría (solo admin) ─────────────
  ipcMain.handle('auth:logs', (_, { userId, limit = 100 }) => {
    const db = getDatabase()

    if (!esAdmin(db, userId)) {
      return { success: false, mensaje: 'No autorizado.' }
    }

    const logs = db.prepare(`
      SELECT * FROM logs
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(limit)

    return { success: true, logs }
  })

  // ── auth:crearUsuario ── solo admin ──────────────────────────────
  ipcMain.handle('auth:crearUsuario', (_, { solicitanteId, username, password, pin, role }) => {
    const db = getDatabase()

    if (!esAdmin(db, solicitanteId)) {
      return { success: false, mensaje: 'Solo un administrador puede crear usuarios.' }
    }

    if (!username?.trim() || !password || !pin) {
      return { success: false, mensaje: 'Todos los campos son obligatorios.' }
    }

    try {
      const hash = bcryptjs.hashSync(password, 10)
      const res  = db.prepare(
        'INSERT INTO users (username, password_hash, pin, role) VALUES (?, ?, ?, ?)'
      ).run(username.trim(), hash, String(pin).trim(), role || 'user')

      const solicitante = db.prepare('SELECT username FROM users WHERE id = ?').get(solicitanteId)
      registrarLog(db, solicitanteId, solicitante?.username, 'CREAR_USUARIO',
        `Creó usuario "${username}" con rol "${role}"`)

      return { success: true, id: res.lastInsertRowid }
    } catch (err) {
      if (err.message.includes('UNIQUE')) {
        return { success: false, mensaje: `El usuario "${username}" ya existe.` }
      }
      return { success: false, mensaje: err.message }
    }
  })

  // ── auth:registrarAccion ── log desde frontend ────────────────────
  ipcMain.handle('auth:registrarAccion', (_, { userId, username, action, details }) => {
    const db = getDatabase()
    registrarLog(db, userId, username, action, details)
    return { success: true }
  })

  console.log('[IPC] ✅ Auth handlers registrados.')
}

module.exports = { registerAuthHandlers, registrarLog, esAdmin }
