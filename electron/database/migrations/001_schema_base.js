function runMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migraciones (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre      TEXT    NOT NULL UNIQUE,
      aplicada_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  const yaAplicada = db
    .prepare('SELECT id FROM _migraciones WHERE nombre = ?')
    .get('001_schema_base')

  if (yaAplicada) {
    console.log('[DB] Migración 001_schema_base ya aplicada — omitiendo.')
    return
  }

  const aplicar = db.transaction(() => {

    db.exec(`
      CREATE TABLE IF NOT EXISTS categorias (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre     TEXT    NOT NULL,
        orden      INTEGER DEFAULT 0,
        color      TEXT    DEFAULT '#6366f1',
        activo     INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    db.exec(`
      CREATE TABLE IF NOT EXISTS productos (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre         TEXT    NOT NULL,
        precio         REAL    NOT NULL CHECK(precio >= 0),
        categoria_id   INTEGER NOT NULL,
        gestiona_stock INTEGER DEFAULT 0,
        activo         INTEGER DEFAULT 1,
        imagen_path    TEXT,
        created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (categoria_id) REFERENCES categorias(id)
      )
    `)

    db.exec(`
      CREATE TABLE IF NOT EXISTS stock (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        producto_id     INTEGER NOT NULL UNIQUE,
        cantidad_actual REAL    DEFAULT 0,
        unidad          TEXT    DEFAULT 'unidad',
        alerta_minimo   INTEGER DEFAULT 5,
        updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (producto_id) REFERENCES productos(id)
      )
    `)

    db.exec(`
      CREATE TABLE IF NOT EXISTS movimientos_stock (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        producto_id   INTEGER NOT NULL,
        tipo          TEXT    NOT NULL CHECK(tipo IN ('venta', 'ajuste_manual', 'entrada')),
        cantidad      REAL    NOT NULL,
        referencia_id INTEGER,
        nota          TEXT,
        created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (producto_id) REFERENCES productos(id)
      )
    `)

    db.exec(`
      CREATE TABLE IF NOT EXISTS sesiones_caja (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        monto_apertura  REAL    NOT NULL CHECK(monto_apertura >= 0),
        monto_cierre    REAL,
        abierta_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
        cerrada_at      DATETIME,
        estado          TEXT    DEFAULT 'abierta' CHECK(estado IN ('abierta', 'cerrada'))
      )
    `)

    db.exec(`
      CREATE TABLE IF NOT EXISTS movimientos_caja (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        sesion_id   INTEGER NOT NULL,
        tipo        TEXT    NOT NULL CHECK(tipo IN ('egreso', 'ingreso')),
        monto       REAL    NOT NULL CHECK(monto > 0),
        descripcion TEXT    NOT NULL,
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sesion_id) REFERENCES sesiones_caja(id)
      )
    `)

    db.exec(`
      CREATE TABLE IF NOT EXISTS ventas (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        total       REAL    NOT NULL CHECK(total >= 0),
        metodo_pago TEXT    NOT NULL CHECK(metodo_pago IN ('efectivo', 'nequi', 'daviplata')),
        sesion_id   INTEGER NOT NULL,
        estado      TEXT    DEFAULT 'completada' CHECK(estado IN ('completada', 'anulada')),
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sesion_id) REFERENCES sesiones_caja(id)
      )
    `)

    db.exec(`
      CREATE TABLE IF NOT EXISTS venta_items (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        venta_id         INTEGER NOT NULL,
        producto_id      INTEGER NOT NULL,
        cantidad         INTEGER NOT NULL CHECK(cantidad > 0),
        precio_unitario  REAL    NOT NULL,
        subtotal         REAL    NOT NULL,
        FOREIGN KEY (venta_id)    REFERENCES ventas(id),
        FOREIGN KEY (producto_id) REFERENCES productos(id)
      )
    `)

    db.exec(`
      CREATE TABLE IF NOT EXISTS configuracion (
        clave TEXT PRIMARY KEY,
        valor TEXT NOT NULL
      )
    `)

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_ventas_created_at   ON ventas(created_at);
      CREATE INDEX IF NOT EXISTS idx_ventas_sesion        ON ventas(sesion_id);
      CREATE INDEX IF NOT EXISTS idx_ventas_estado        ON ventas(estado);
      CREATE INDEX IF NOT EXISTS idx_venta_items_venta    ON venta_items(venta_id);
      CREATE INDEX IF NOT EXISTS idx_venta_items_producto ON venta_items(producto_id);
      CREATE INDEX IF NOT EXISTS idx_productos_categoria  ON productos(categoria_id);
      CREATE INDEX IF NOT EXISTS idx_productos_activo     ON productos(activo);
      CREATE INDEX IF NOT EXISTS idx_mov_stock_producto   ON movimientos_stock(producto_id);
    `)

    // ── Categorías ────────────────────────────────────────────────────────
    const insCategoria = db.prepare(
      'INSERT OR IGNORE INTO categorias (id, nombre, orden, color) VALUES (?, ?, ?, ?)'
    )
    insCategoria.run(1, 'Platos', 1, '#f97316')
    insCategoria.run(2, 'Bebidas', 2, '#3b82f6')
    insCategoria.run(3, 'Postres', 3, '#ec4899')
    insCategoria.run(4, 'Entradas', 4, '#10b981')

    // ── Productos demo ────────────────────────────────────────────────────
    // ⚠️ IDs fijos para que coincidan con los datos de demo de POSScreen.jsx
    const insProd = db.prepare(`
      INSERT OR IGNORE INTO productos (id, nombre, precio, categoria_id, gestiona_stock)
      VALUES (?, ?, ?, ?, ?)
    `)

    // Platos (categoria_id = 1)
    insProd.run(1, 'Bandeja Paisa', 22000, 1, 0)
    insProd.run(2, 'Sancocho de Gallina', 18000, 1, 0)
    insProd.run(3, 'Sobrebarriga', 20000, 1, 0)
    insProd.run(4, 'Arroz con Pollo', 16000, 1, 0)
    insProd.run(5, 'Chuleta Valluna', 24000, 1, 0)
    insProd.run(6, 'Frijolada', 14000, 1, 0)

    // Bebidas (categoria_id = 2) — gestiona_stock = 1
    insProd.run(7, 'Gaseosa', 3500, 2, 1)
    insProd.run(8, 'Agua Cristal', 2500, 2, 1)
    insProd.run(9, 'Cerveza Club Colombia', 5000, 2, 1)
    insProd.run(10, 'Jugo Natural', 6000, 2, 1)
    insProd.run(11, 'Limonada de Coco', 7000, 2, 1)
    insProd.run(12, 'Pony Malta', 4000, 2, 1)

    // Postres (categoria_id = 3)
    insProd.run(13, 'Flan de Caramelo', 5000, 3, 0)
    insProd.run(14, 'Arroz con Leche', 4500, 3, 0)
    insProd.run(15, 'Torta de Chocolate', 6000, 3, 0)
    insProd.run(16, 'Tres Leches', 5500, 3, 0)

    // Entradas (categoria_id = 4)
    insProd.run(17, 'Patacones', 5000, 4, 0)
    insProd.run(18, 'Empanadas (3 und)', 6000, 4, 0)
    insProd.run(19, 'Chorizo', 7000, 4, 0)
    insProd.run(20, 'Caldo de Costilla', 8000, 4, 0)

    // ── Stock inicial para bebidas ─────────────────────────────────────────
    const insStock = db.prepare(`
      INSERT OR IGNORE INTO stock (producto_id, cantidad_actual, alerta_minimo, unidad)
      VALUES (?, ?, ?, 'unidad')
    `)
    insStock.run(7, 24, 5)   // Gaseosa
    insStock.run(8, 30, 5)   // Agua Cristal
    insStock.run(9, 6, 3)   // Cerveza
    insStock.run(10, 8, 4)   // Jugo Natural
    insStock.run(11, 5, 3)   // Limonada de Coco
    insStock.run(12, 2, 3)   // Pony Malta  ← stock bajo al arrancar (demo)

    // ── Configuración ─────────────────────────────────────────────────────
    const insConfig = db.prepare(
      'INSERT OR IGNORE INTO configuracion (clave, valor) VALUES (?, ?)'
    )
    insConfig.run('nombre_negocio', 'Mi Restaurante')
    insConfig.run('nit', '000000000-0')
    insConfig.run('direccion', 'Dirección del negocio')
    insConfig.run('telefono', '300 000 0000')
    insConfig.run('ciudad', 'Colombia')
    insConfig.run('moneda', 'COP')
    insConfig.run('impresora_puerto', '')
    insConfig.run('impresora_tipo', 'usb')
    insConfig.run('mensaje_recibo', '¡Gracias por su visita!')

    db.prepare('INSERT INTO _migraciones (nombre) VALUES (?)').run('001_schema_base')
    console.log('[DB] ✅ Migración 001_schema_base aplicada correctamente.')
  })

  aplicar()
}

module.exports = { runMigrations }
