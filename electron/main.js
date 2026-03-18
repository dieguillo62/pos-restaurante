const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')

const IS_DEV = !app.isPackaged;


let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: 'POS Restaurante',
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  mainWindow.setMenuBarVisibility(false)

  if (IS_DEV) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, 'index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  try {
    const { initializeDatabase } = require('./database/connection')
    initializeDatabase()
  } catch (err) {
    dialog.showErrorBox(
      'Error al iniciar la base de datos',
      `No se pudo inicializar SQLite.\n\n${err.message}\n\nAsegúrate de haber ejecutado:\nnpm run rebuild:sqlite`
    )
    app.quit()
    return
  }

  const { registerAllHandlers } = require('./ipc')
  registerAllHandlers()

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    const { closeDatabase } = require('./database/connection')
    closeDatabase()
    app.quit()
  }
})

app.on('before-quit', () => {
  try {
    const { closeDatabase } = require('./database/connection')
    closeDatabase()
  } catch (_) { }
})

app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event, url) => {
    const allowedOrigins = ['http://localhost:5173']
    const { origin } = new URL(url)
    if (!allowedOrigins.includes(origin) && !url.startsWith('file://')) {
      event.preventDefault()
    }
  })
})
