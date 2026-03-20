const path = require('path')
const { app } = require('electron')

/** @type {import('better-sqlite3').Database | null} */
let db = null

function getDatabase() {
  if (!db) throw new Error('[DB] Base de datos no inicializada.')
  return db
}

function initializeDatabase() {
  const Database = require('better-sqlite3')

  const dbPath = app.isPackaged
    ? path.join(app.getPath('userData'), 'pos-restaurante.db')
    : path.join(__dirname, '../../pos-restaurante.dev.db')

  db = new Database(dbPath)

  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.pragma('synchronous = NORMAL')
  db.pragma('cache_size = -10000')

  // Migración 001 — esquema base
  const { runMigrations } = require('./migrations/001_schema_base')
  runMigrations(db)

  // Migración 002 — usuarios y logs  ← NUEVA
  const { runMigration002 } = require('./migrations/002_users_logs')
  runMigration002(db)

  console.log(`[DB] ✅ Inicializada en: ${dbPath}`)
  return db
}

function closeDatabase() {
  if (db && db.open) {
    db.close()
    db = null
    console.log('[DB] Conexión cerrada.')
  }
}

module.exports = { getDatabase, initializeDatabase, closeDatabase }
