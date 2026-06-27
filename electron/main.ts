import { app, BrowserWindow, ipcMain } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { IPC, type CliEvent, type CliStartRequest } from '../src/shared/ipc'
import { cancelRun, detectAgents, runAgent } from './cli-agents'
import { FileStore } from './store'

let store: FileStore

function resolvePreload(): string {
  // The bundler may emit .mjs or .js depending on config; accept either.
  const candidates = ['preload.mjs', 'preload.js'].map((f) => path.join(__dirname, f))
  return candidates.find((c) => fs.existsSync(c)) ?? candidates[1]
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 760,
    minHeight: 480,
    backgroundColor: '#09090b',
    webPreferences: {
      preload: resolvePreload(),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const devUrl = process.env.VITE_DEV_SERVER_URL
  if (devUrl) {
    win.loadURL(devUrl)
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  return win
}

function registerIpc() {
  const userData = app.getPath('userData')
  store = new FileStore(userData)

  ipcMain.handle(IPC.cliList, () => detectAgents())

  ipcMain.handle(IPC.cliStart, async (event, req: CliStartRequest) => {
    const sender = event.sender
    await runAgent(req, userData, (e: CliEvent) => {
      if (!sender.isDestroyed()) sender.send(IPC.cliEvent, e)
    })
  })

  ipcMain.handle(IPC.cliCancel, (_e, runId: string) => cancelRun(runId))

  ipcMain.handle(IPC.storeGet, (_e, key: string) => store.get(key))
  ipcMain.handle(IPC.storeSet, (_e, key: string, value: unknown) => store.set(key, value))
}

app.whenReady().then(() => {
  registerIpc()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
