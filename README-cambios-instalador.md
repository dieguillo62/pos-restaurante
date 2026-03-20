# README-cambios-instalador


## 📝 Bitácora de Cambios: Optimizando el Instalador de POS Restaurante

Este documento resume las modificaciones críticas realizadas para asegurar que la aplicación React + Electron + SQLite se compile, instale y ejecute correctamente en entornos de producción (Windows).

## 🚀 1. Scripts del Proyecto (package.json)

Se optimizaron los comandos de automatización para garantizar limpiezas profundas y compilaciones seguras de módulos nativos.

clean:all: Comando basado en PowerShell para eliminar residuos de compilaciones anteriores, datos de usuario y rastro de instalaciones previas.

rebuild:sqlite: Automatiza la reconstrucción de better-sqlite3 para la versión específica de Electron.

build: Se encadenaron las tareas: Reconstrucción de SQLite ➔ Build de React (Vite) ➔ Empaquetado final.

JSON
"scripts": {
  "build": "npm run rebuild:sqlite && npm run build:react && electron-builder",
  "clean:all": "powershell -Command \"Remove-Item -Recurse -Force dist, release, $env:APPDATA\\pos-restaurante, $env:LOCALAPPDATA\\Programs\\pos-restaurante -ErrorAction SilentlyContinue\""
}

## 📦 2. Configuración de Construcción (build en package.json)

Se ajustó la configuración de electron-builder para manejar módulos nativos y mejorar la experiencia de usuario.

asarUnpack: Se forzó la extracción de better-sqlite3 del paquete comprimido ASAR. Sin esto, la base de datos no puede ejecutarse en producción.

Configuración NSIS:

Se desactivó oneClick para permitir un asistente de instalación clásico.

Se habilitó la creación de accesos directos en el escritorio y menú de inicio.

Permisos: Se estableció requestedExecutionLevel: "asInvoker" para evitar bloqueos innecesarios de Windows Defender.

## 🧠 3. Proceso Principal (main.js)

Se corrigieron errores lógicos y de rutas que causaban "pantallas negras" o fallos en el arranque.

Carga de Archivos: Se implementó una lógica de ruta doble para encontrar el index.html de Vite, ya sea en modo desarrollo o dentro del paquete ASAR de producción.

Manejo de Errores: Se añadieron bloques try-catch con dialog.showErrorBox en la inicialización de la base de datos y los handlers de IPC para que, si algo falla, el usuario reciba un mensaje claro en lugar de un cierre silencioso.

Estructura de Funciones: Se corrigió el anidamiento de llaves {} que impedía que app.whenReady() se ejecutara correctamente.

## 🛠️ 4. Solución de Problemas (Troubleshooting)

Si el programa presenta fallos en el equipo del cliente, seguir este protocolo:

Consola de Desarrollador: En la aplicación abierta, presionar Ctrl + Shift + I para ver errores de carga de archivos (JS/CSS).

Ejecución vía Terminal: Ejecutar el .exe desde PowerShell (.\'POS Restaurante.exe') para capturar errores de Node.js que no se muestran en la interfaz.

Rutas de Datos: La base de datos se localiza siempre en %APPDATA%/pos-restaurante/, independiente de la carpeta de instalación.

## 🏁 5. Flujo de Trabajo Recomendado para el Equipo

Para generar una nueva versión limpia:

Ejecutar npm run clean:all.

Asegurarse de que el icono en resources/icon.ico sea válido.

Ejecutar npm run build.

El instalador final se encontrará en la carpeta release/ con el nombre POS Restaurante Setup X.X.X.exe.

Nota: No es necesario enviar toda la carpeta release, solo el archivo Setup es el que requiere el cliente final.