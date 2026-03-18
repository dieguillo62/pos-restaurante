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

    const insCategoria = db.prepare(
      'INSERT OR IGNORE INTO categorias (id, nombre, orden, color) VALUES (?, ?, ?, ?)'
    )
    insCategoria.run(1, 'Platos',   1, '#f97316')
    insCategoria.run(2, 'Bebidas',  2, '#3b82f6')
    insCategoria.run(3, 'Postres',  3, '#ec4899')
    insCategoria.run(4, 'Entradas', 4, '#10b981')

    const insConfig = db.prepare(
      'INSERT OR IGNORE INTO configuracion (clave, valor) VALUES (?, ?)'
    )
    insConfig.run('nombre_negocio',   'Mi Restaurante')
    insConfig.run('nit',              '000000000-0')
    insConfig.run('direccion',        'Dirección del negocio')
    insConfig.run('telefono',         '300 000 0000')
    insConfig.run('ciudad',           'Colombia')
    insConfig.run('moneda',           'COP')
    insConfig.run('impresora_puerto', '')
    insConfig.run('impresora_tipo',   'usb')
    insConfig.run('mensaje_recibo',   '¡Gracias por su visita!')

    db.prepare('INSERT INTO _migraciones (nombre) VALUES (?)').run('001_schema_base')
    console.log('[DB] ✅ Migración 001_schema_base aplicada correctamente.')
  })

  aplicar()
}

module.exports = { runMigrations }
