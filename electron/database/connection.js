const fs = require('fs');
const path = require('path')
const { app } = require('electron')

/** @type {import('better-sqlite3').Database | null} */
let db = null

function getDatabase() {
  if (!db) {
    throw new Error('[DB] Base de datos no inicializada. Llama initializeDatabase() primero.')
  }
  return db
}

function initializeDatabase() {
  const Database = require('better-sqlite3')

  const dbPath = app.isPackaged
    ? path.join(app.getPath('userData'), 'pos-restaurante.db')
    : path.join(__dirname, '../../pos-restaurante.dev.db')

  if (app.isPackaged) {
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
  }

  db = new Database(dbPath, {
    // verbose: (msg) => console.log('[SQL]', msg),
  })

  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.pragma('synchronous = NORMAL')
  db.pragma('cache_size = -10000')

  const { runMigrations } = require('./migrations/001_schema_base')
  runMigrations(db)

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
