/**
 * Migración 002 — Usuarios, roles y logs de auditoría
 * Se ejecuta automáticamente si no ha sido aplicada.
 */
function runMigration002(db) {
  const yaAplicada = db
    .prepare("SELECT id FROM _migraciones WHERE nombre = '002_users_logs'")
    .get()

  if (yaAplicada) {
    console.log('[DB] Migración 002_users_logs ya aplicada — omitiendo.')
    return
  }

  const aplicar = db.transaction(() => {

    // ── Tabla de usuarios ──────────────────────────────────────────
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        username      TEXT    NOT NULL UNIQUE,
        password_hash TEXT    NOT NULL,
        pin           TEXT    NOT NULL,
        role          TEXT    NOT NULL CHECK(role IN ('admin', 'user')),
        activo        INTEGER DEFAULT 1,
        created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // ── Tabla de logs de auditoría ─────────────────────────────────
    db.exec(`
      CREATE TABLE IF NOT EXISTS logs (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id    INTEGER,
        username   TEXT,
        action     TEXT    NOT NULL,
        details    TEXT,
        timestamp  DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `)

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_logs_user      ON logs(user_id);
    `)

    // ── Usuario admin inicial ──────────────────────────────────────
    // ⚠️ CRÍTICO: crea el admin para no quedar bloqueado
    // password: admin123  →  hash bcryptjs con saltRounds=10
    // Generado offline para no depender de bcryptjs en la migración
    const bcryptjs = require('bcryptjs')
    const passwordHash = bcryptjs.hashSync('admin123', 10)

    db.prepare(`
      INSERT OR IGNORE INTO users (username, password_hash, pin, role)
      VALUES ('admin', ?, '1234', 'admin')
    `).run(passwordHash)

    db.prepare(`
      INSERT OR IGNORE INTO users (username, password_hash, pin, role)
      VALUES ('cajero', ?, '0000', 'user')
    `).run(bcryptjs.hashSync('cajero123', 10))

    db.prepare("INSERT INTO _migraciones (nombre) VALUES ('002_users_logs')").run()
    console.log('[DB] ✅ Migración 002_users_logs aplicada. Admin: pin=1234')
  })

  aplicar()
}

module.exports = { runMigration002 }
