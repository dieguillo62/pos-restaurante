# README — Cambios y configuración en Windows

## ⚠️ Problema con `npm run rebuild:sqlite` en Windows

El comando original del README **no funciona en Windows** con Electron 31.
`electron-rebuild@3.2.9` es incompatible con versiones modernas de Electron.

---

## ✅ Solución — Pasos correctos para Windows

### Requisitos previos

- Node.js 18 (usar nvm para instalarlo)
- Visual Studio Build Tools 2022 con workload **"Desarrollo de escritorio con C++"**
- npm >= 9

```powershell
# Instalar nvm para Windows
winget install CoreyButler.NVMforWindows

# Instalar y usar Node 18
nvm install 18
nvm use 18

# Verificar versión
node --version  # debe mostrar v18.x.x
```

---

### Instalación

```powershell
# 1. Instalar dependencias
npm install

# 2. Instalar la versión moderna de electron-rebuild
npm install --save-dev @electron/rebuild

# 3. ⚠️ USAR ESTE COMANDO en lugar de npm run rebuild:sqlite
npx @electron/rebuild -f -w better-sqlite3 --module-dir . --electron-version 31.0.0

# 4. Iniciar en modo desarrollo
npm run dev
```

---

## ❌ Comando que NO funciona en Windows

```powershell
# NO usar esto en Windows con Electron 31
npm run rebuild:sqlite
```

## ✅ Comando correcto para Windows

```powershell
npx @electron/rebuild -f -w better-sqlite3 --module-dir . --electron-version 31.0.0
```

---

## 📝 Notas

- En **Mac/Linux** el comando original `npm run rebuild:sqlite` puede seguir funcionando.
- En **Windows** siempre usar el comando con `@electron/rebuild` indicando la versión de Electron.
- Si se actualiza la versión de Electron en `package.json`, actualizar también el número en el comando anterior.
