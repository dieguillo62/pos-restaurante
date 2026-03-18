import React, { useState, useEffect, useCallback } from 'react'
import ProductGrid  from './ProductGrid'
import Cart         from './Cart'
import PaymentPanel from './PaymentPanel'
import './pos.css'

// ── Datos de demostración (se reemplazan con la BD en Parte 3) ─────────────
const DEMO_CATEGORIAS = [
  { id: 1, nombre: 'Platos',    color: '#f97316', icon: '🍽️' },
  { id: 2, nombre: 'Bebidas',   color: '#3b82f6', icon: '🥤' },
  { id: 3, nombre: 'Postres',   color: '#ec4899', icon: '🍮' },
  { id: 4, nombre: 'Entradas',  color: '#10b981', icon: '🥗' },
]

const DEMO_PRODUCTOS = [
  { id: 1,  nombre: 'Bandeja Paisa',       precio: 22000, categoria_id: 1, gestiona_stock: 0 },
  { id: 2,  nombre: 'Sancocho de Gallina', precio: 18000, categoria_id: 1, gestiona_stock: 0 },
  { id: 3,  nombre: 'Sobrebarriga',        precio: 20000, categoria_id: 1, gestiona_stock: 0 },
  { id: 4,  nombre: 'Arroz con Pollo',     precio: 16000, categoria_id: 1, gestiona_stock: 0 },
  { id: 5,  nombre: 'Chuleta Valluna',     precio: 24000, categoria_id: 1, gestiona_stock: 0 },
  { id: 6,  nombre: 'Frijolada',           precio: 14000, categoria_id: 1, gestiona_stock: 0 },

  { id: 7,  nombre: 'Gaseosa',             precio: 3500,  categoria_id: 2, gestiona_stock: 1, cantidad_actual: 24 },
  { id: 8,  nombre: 'Agua Cristal',        precio: 2500,  categoria_id: 2, gestiona_stock: 1, cantidad_actual: 30 },
  { id: 9,  nombre: 'Cerveza Club Colombia',precio: 5000, categoria_id: 2, gestiona_stock: 1, cantidad_actual: 6 },
  { id: 10, nombre: 'Jugo Natural',        precio: 6000,  categoria_id: 2, gestiona_stock: 1, cantidad_actual: 8 },
  { id: 11, nombre: 'Limonada de Coco',    precio: 7000,  categoria_id: 2, gestiona_stock: 1, cantidad_actual: 5 },
  { id: 12, nombre: 'Pony Malta',          precio: 4000,  categoria_id: 2, gestiona_stock: 1, cantidad_actual: 2 },

  { id: 13, nombre: 'Flan de Caramelo',    precio: 5000,  categoria_id: 3, gestiona_stock: 0 },
  { id: 14, nombre: 'Arroz con Leche',     precio: 4500,  categoria_id: 3, gestiona_stock: 0 },
  { id: 15, nombre: 'Torta de Chocolate',  precio: 6000,  categoria_id: 3, gestiona_stock: 0 },
  { id: 16, nombre: 'Tres Leches',         precio: 5500,  categoria_id: 3, gestiona_stock: 0 },

  { id: 17, nombre: 'Patacones',           precio: 5000,  categoria_id: 4, gestiona_stock: 0 },
  { id: 18, nombre: 'Empanadas (3 und)',   precio: 6000,  categoria_id: 4, gestiona_stock: 0 },
  { id: 19, nombre: 'Chorizo',             precio: 7000,  categoria_id: 4, gestiona_stock: 0 },
  { id: 20, nombre: 'Caldo de Costilla',   precio: 8000,  categoria_id: 4, gestiona_stock: 0 },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function calcularTotalCarrito(carrito) {
  return carrito.reduce((acc, item) => acc + item.subtotal, 0)
}

export default function POSScreen({ cajaActiva }) {
  const [categorias,      setCategorias]      = useState(DEMO_CATEGORIAS)
  const [productos,       setProductos]       = useState(DEMO_PRODUCTOS)
  const [categoriaActiva, setCategoriaActiva] = useState(null)   // null = todas
  const [carrito,         setCarrito]         = useState([])
  const [modalPago,       setModalPago]       = useState(false)
  const [cargando,        setCargando]        = useState(false)

  // ── Cargar datos reales al montar (si Electron está disponible) ───────────
  useEffect(() => {
    async function cargarDatos() {
      if (!window.electronAPI) return
      try {
        const [cats, prods] = await Promise.all([
          window.electronAPI.categorias.listar(),
          window.electronAPI.productos.listar(),
        ])
        if (cats.length)  setCategorias(cats)
        if (prods.length) setProductos(prods)
      } catch (err) {
        console.warn('[POS] Usando datos de demo:', err.message)
      }
    }
    cargarDatos()
  }, [])

  // ── Productos filtrados por categoría ────────────────────────────────────
  const productosFiltrados = categoriaActiva
    ? productos.filter(p => p.categoria_id === categoriaActiva)
    : productos

  // ── Operaciones del carrito ───────────────────────────────────────────────
  const agregarAlCarrito = useCallback((producto) => {
    setCarrito(prev => {
      const existe = prev.find(i => i.producto_id === producto.id)
      if (existe) {
        return prev.map(i =>
          i.producto_id === producto.id
            ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * i.precio_unitario }
            : i
        )
      }
      return [...prev, {
        producto_id:     producto.id,
        nombre:          producto.nombre,
        precio_unitario: producto.precio,
        cantidad:        1,
        subtotal:        producto.precio,
      }]
    })
  }, [])

  const cambiarCantidad = useCallback((producto_id, delta) => {
    setCarrito(prev => {
      return prev
        .map(i => {
          if (i.producto_id !== producto_id) return i
          const nuevaCantidad = i.cantidad + delta
          if (nuevaCantidad <= 0) return null
          return { ...i, cantidad: nuevaCantidad, subtotal: nuevaCantidad * i.precio_unitario }
        })
        .filter(Boolean)
    })
  }, [])

  const eliminarDelCarrito = useCallback((producto_id) => {
    setCarrito(prev => prev.filter(i => i.producto_id !== producto_id))
  }, [])

  const limpiarCarrito = useCallback(() => setCarrito([]), [])

  // ── Confirmar venta ───────────────────────────────────────────────────────
  const confirmarVenta = useCallback(async (metodoPago) => {
    if (!cajaActiva) {
      alert('⚠️ Debes abrir la caja antes de registrar ventas.')
      return
    }
    if (!carrito.length) return

    setCargando(true)
    try {
      const total = calcularTotalCarrito(carrito)

      if (window.electronAPI) {
        const venta = await window.electronAPI.ventas.crear({
          items:      carrito,
          metodo_pago: metodoPago,
          total,
          sesion_id: cajaActiva.id,
        })
        await window.electronAPI.print.recibo(venta.id)
      }

      limpiarCarrito()
      setModalPago(false)
    } catch (err) {
      alert(`Error al registrar la venta:\n${err.message}`)
    } finally {
      setCargando(false)
    }
  }, [carrito, cajaActiva, limpiarCarrito])

  const total = calcularTotalCarrito(carrito)

  return (
    <div className="pos-screen">

      {/* ── Panel izquierdo: Categorías + Productos ─────────────────── */}
      <div className="pos-left">
        <ProductGrid
          categorias={categorias}
          productos={productosFiltrados}
          categoriaActiva={categoriaActiva}
          onCategoriaChange={setCategoriaActiva}
          onAgregar={agregarAlCarrito}
          carrito={carrito}
        />
      </div>

      {/* ── Panel derecho: Carrito ───────────────────────────────────── */}
      <div className="pos-right">
        <Cart
          carrito={carrito}
          total={total}
          onCambiarCantidad={cambiarCantidad}
          onEliminar={eliminarDelCarrito}
          onLimpiar={limpiarCarrito}
          onCobrar={() => setModalPago(true)}
          cajaActiva={cajaActiva}
        />
      </div>

      {/* ── Modal de pago ───────────────────────────────────────────── */}
      {modalPago && (
        <PaymentPanel
          total={total}
          carrito={carrito}
          cargando={cargando}
          onConfirmar={confirmarVenta}
          onCerrar={() => setModalPago(false)}
        />
      )}
    </div>
  )
}
