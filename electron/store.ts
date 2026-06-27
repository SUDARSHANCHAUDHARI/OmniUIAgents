import fs from 'node:fs'
import path from 'node:path'

/**
 * Tiny JSON-file key-value store kept in the app's userData dir.
 * StorageAdapter on the renderer side hides this behind the same interface as
 * the web IndexedDB store. Swap for SQLite later without touching the renderer.
 */
export class FileStore {
  private file: string
  private data: Record<string, unknown> = {}

  constructor(userDataDir: string) {
    this.file = path.join(userDataDir, 'store.json')
    try {
      this.data = JSON.parse(fs.readFileSync(this.file, 'utf8'))
    } catch {
      this.data = {}
    }
  }

  get<T>(key: string): T | null {
    return (this.data[key] as T) ?? null
  }

  set(key: string, value: unknown): void {
    this.data[key] = value
    fs.writeFileSync(this.file, JSON.stringify(this.data), 'utf8')
  }
}
