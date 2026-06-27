import type { ElectronAPI } from './shared/ipc'

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

/** Present only inside the Electron shell; undefined in the browser. */
export const electronAPI: ElectronAPI | undefined =
  typeof window !== 'undefined' ? window.electronAPI : undefined

/** True when running as the desktop app (Path 2 / CLI agents are available). */
export const isDesktop = !!electronAPI
