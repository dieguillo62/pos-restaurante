



<details>
  <summary>Haz clic para ver implementar la impresión real</summary>

# implementar la impresión real
* idea a implementar

const { PosPrinter } = require('electron-pos-printer');

// ... dentro de ipcMain.handle('print:recibo' ...
    const dataToPrint = [
        { type: 'text', value: config.nombre_restaurante || 'MI POS', style: { fontWeight: "700", textAlign: 'center', fontSize: "18px" } },
        { type: 'text', value: `Ticket: #00${ventaId}`, style: { textAlign: 'center' } },
        { type: 'table', 
          tableHeader: ['Cant', 'Producto', 'Total'],
          tableBody: items.map(i => [i.cantidad, i.producto_nombre, `$${i.subtotal}`]),
          tableFooter: ['-', 'TOTAL', `$${venta.total}`]
        }
    ];

    try {
        await PosPrinter.print(dataToPrint, {
            printerName: config.impresora_nombre || 'POS-80', // Nombre en Windows
            silent: true,
            preview: false // Si pones true, abre una ventana para ver el ticket antes
        });
        return { success: true, mensaje: 'Impreso correctamente' };
    } catch (err) {
        return { success: false, mensaje: err.message };
    }

## 2. Cómo ver "cómo se ve el recibo" (Prueba visual)

Crea un componente "TicketPreview": En React, diseña un div con fondo blanco y ancho de 300px (aprox. 80mm).

Usa los datos que ya devuelve tu IPC: Tu función ya devuelve { venta, items, config }. Pasa esos datos a tu componente de React.

</details>


---


# implementar migración de datos

 - script de "migración de datos" por si en el futuro necesitas cambiar la estructura de la base de datos sin borrar las ventas del cliente.


---



<details>
  <summary>Haz clic para ver implementar permisos, loLogin y logout</summary>


 # implementar permisos, loLogin y logout

 ## perimisos

 - existiran dos tipos de credenciales de permisos

 1) administrador: puede realizar modificacion dentro de la app (puede añadir productor y cambiar precios ETC..)

 por lo tanto tendremos que hacer un rework dee toda la app y cuando se relice el loLogin se verifique:
 
 1) si fue como administrador o como usuario
 2) si fue como administrador que se abiliten las opciones de:

 -


 ### loLogin
 - en el loLogin deven existir dos credenciales de login
 1) administrador: puede realizar modificacion dentro de la app (puede añadir productor y cambiar precios ETC..)
 2) usuario: puede hacer uso de la app de forma normal, SIN tener aceso a las funciones de administrador

 ### logout
 - en el logout, Siempre que se cierre la caja y se realice el logout tine que pasar lo siguiente en el orden de:
 
 1) se cierre la caja
 2) se cierra secion  "logout automatico" 
 3) la aplicaion se cierra

</details>

---

---

🛡️ Roadmap: Implementación de Roles y Seguridad POS
Este documento detalla la hoja de ruta para la integración del sistema de Autenticación (Login), Autorización (Roles) y el flujo de Cierre de Sesión Seguro en la aplicación.

1. Visión General de la Idea
El objetivo es transformar la aplicación en un sistema multiusuario donde el acceso a funciones críticas esté restringido. El sistema diferenciará entre dos perfiles:

- Administrador: Control total. Gestión de productos, añadir productor, Quitar productos, precios.

- Usuario (Cajero/Mesero): Operación diaria. Toma de pedidos y cobros, sin acceso a configuraciones de negocio o alteración de precios.

El "Flujo de Salida Blindado"
Para garantizar la integridad del dinero, el proceso de salida debe ser lineal y obligatorio:

Cierre de Caja: Registro de ingresos/egresos del turno.

Logout: Destrucción de la sesión activa.

Cierre de App: Finalización del proceso de Electron para asegurar el equipo.



2. Hoja de Ruta de Implementación

- Fase 1: Infraestructura y Base de Datos (Backend)
Nueva Tabla users: Crear tabla en SQLite con campos: id, username, password_hash (encriptado con Bcrypt), pin (4-6 dígitos), y role (admin/user).

Seguridad de Datos: Implementar bcryptjs para que las contraseñas no sean legibles si el archivo .db es extraído.

Middlewares de IPC: Los procesos de Electron deben verificar el rol del usuario antes de ejecutar acciones sensibles (ej. deleteProduct).

- Fase 2: Experiencia de Usuario (Frontend)
Login por PIN: Implementar un teclado numérico táctil en la interfaz de inicio para un acceso rápido (ideal para el ritmo de un restaurante).

Rework de Interfaz (Conditional Rendering):

Uso de HOCs (Higher Order Components) o Context API en React para envolver componentes protegidos.

Ejemplo: El botón "Añadir Producto" solo se renderiza si user.role === 'admin'.

- Fase 3: El Ciclo de Cierre (Logout Automático)
Trigger de Cierre: Crear una función centralizada que encadene las tres acciones:

Ejecutar función de arqueo de caja.

Limpiar el estado de Zustand/Redux.

Enviar señal a Electron (app.quit()) solo tras confirmar el éxito de los pasos anteriores.

3. Sugerencias y Puntos de Vista Estratégicos
Para que esta implementación sea de nivel profesional, considerar los siguientes puntos:

A. Gestión de "Anulaciones"
Punto de vista: Un mesero no debe poder borrar un pedido ya enviado a cocina.

Sugerencia: Si un usuario intenta borrar un ítem, la app debe solicitar momentáneamente el PIN del Administrador para autorizar esa acción específica sin cerrar la sesión del usuario actual.

B. Estética del Login
Punto de vista: Un login tradicional de "Usuario y Contraseña" es lento.

Sugerencia: Usar tarjetas visuales con el nombre de los empleados. El empleado hace clic en su nombre e ingresa su PIN. Esto reduce errores y agiliza la fila de clientes.

C. Registro de Auditoría (Logs)
Sugerencia: Crear una tabla logs donde se guarde quién hizo qué.

Ejemplo: "Usuario 'Juan' cambió precio de 'Cerveza' de $5000 a $4000".

Esto permite al administrador revisar movimientos sospechosos al final de la semana.

4. Resumen de Permisos por Rol
Acción,Usuario,Administrador
Crear Pedidos,✅,✅
Realizar Cobros,✅,✅
Añadir/Editar Productos,❌,✅
Cambiar Precios,❌,✅
Ver Reportes de Utilidad,✅,✅
Anular Ventas Cerradas,❌,✅

[!IMPORTANT]
Próximo Hito: Definir el esquema de la tabla de usuarios y crear el primer usuario "Maestro" (Admin) por defecto para no quedar bloqueados fuera de la app tras el primer build.