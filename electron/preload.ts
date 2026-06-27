import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type CliEvent, type CliStartRequest, type ElectronAPI } from '../src/shared/ipc'

const api: ElectronAPI = {
  isDesktop: true,
  cli: {
    list: () => ipcRenderer.invoke(IPC.cliList),
    start: (req: CliStartRequest) => ipcRenderer.invoke(IPC.cliStart, req),
    cancel: (runId: string) => ipcRenderer.invoke(IPC.cliCancel, runId),
    onEvent: (cb: (e: CliEvent) => void) => {
      const listener = (_evt: unknown, payload: CliEvent) => cb(payload)
      ipcRenderer.on(IPC.cliEvent, listener)
      return () => ipcRenderer.removeListener(IPC.cliEvent, listener)
    },
  },
  store: {
    get: (key: string) => ipcRenderer.invoke(IPC.storeGet, key),
    set: (key: string, value: unknown) => ipcRenderer.invoke(IPC.storeSet, key, value),
  },
}

contextBridge.exposeInMainWorld('electronAPI', api)
