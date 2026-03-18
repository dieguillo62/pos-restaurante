# POS Restaurante

Sistema POS local para restaurantes pequeños en Colombia.
Stack: Electron + React + SQLite (better-sqlite3)

---

## Requisitos previos

- Node.js >= 18
- npm >= 9

---

## Instalación y ejecución

```bash
# 1. Instalar dependencias
npm install

npm install --save-dev @electron/rebuild

# 2. ⚠️ OBLIGATORIO: reconstruir better-sqlite3 para tu versión de Electron
npm run rebuild:sqlite no usar

usar este 
├── npx @electron/rebuild -f -w better-sqlite3 --module-dir . --electron-version 31.0.0

# 3. Iniciar en modo desarrollo
npm run dev
```

## Build de producción

```bash
npm run build:react   # Compila React → dist/
npm run build         # Empaqueta con electron-builder → release/
```

---

## Estructura del proyecto

```
pos-restaurante/
├── electron/
│   ├── main.js                          Proceso principal de Electron
│   ├── preload.js                       Bridge seguro (contextBridge)
│   ├── database/
│   │   ├── connection.js                Singleton SQLite
│   │   └── migrations/
│   │       └── 001_schema_base.js       Esquema completo + datos iniciales
│   └── ipc/
│       └── index.js                     Todos los handlers IPC
├── src/
│   ├── main.jsx                         Entry point React
│   ├── App.jsx                          Componente raíz + navegación
│   └── index.css                        Estilos globales
├── index.html
├── vite.config.mjs
└── package.json
```

---

## Módulos IPC disponibles

| Canal | Acción |
|---|---|
| `productos:listar` | Lista productos activos con categoría y stock |
| `productos:crear` | Crea producto (crea registro de stock automático si aplica) |
| `ventas:crear` | Registra venta + descuenta stock + retorna datos para impresión |
| `ventas:anular` | Anula venta + revierte stock |
| `caja:abrir` | Abre sesión de caja (valida que no haya otra activa) |
| `caja:cerrar` | Cierra sesión y calcula monto final |
| `caja:registrarEgreso` | Registra gasto durante el turno |
| `reportes:resumenDiario` | Totales del día por método de pago |
| `reportes:productosMasVendidos` | Ranking de productos por período |
| `reportes:horasPico` | Ventas agrupadas por hora |
| `print:recibo` | Prepara datos para impresora térmica (integrar en Parte 3) |

---

## Notas importantes

- La base de datos en desarrollo se crea en la raíz del proyecto: `pos-restaurante.dev.db`
- En producción se guarda en `userData` del sistema operativo
- El stock solo aplica a productos con `gestiona_stock = true` (bebidas)
- Solo puede haber UNA sesión de caja abierta a la vez
- La impresión térmica se completa en la Parte 3 del proyecto
