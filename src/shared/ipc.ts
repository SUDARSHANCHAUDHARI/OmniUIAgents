// Single source of truth for the renderer <-> Electron-main contract.
// Imported by both the renderer (capabilities, CliAgent) and the Electron
// main/preload so the two sides can never drift.

export type CliAgentId = 'claude' | 'codex' | 'opencode'

export interface DetectedAgent {
  id: CliAgentId
  name: string
  available: boolean
  path?: string
  version?: string
  /** Whether the CLI looks authenticated (best-effort; not always knowable). */
  authed?: boolean
}

export interface CliStartRequest {
  runId: string
  agentId: CliAgentId
  /** The latest user message. CLI agents keep their own history via sessionRef. */
  prompt: string
  model?: string
  /** Session id from a previous turn, used to resume the conversation. */
  sessionRef?: string
}

export type CliEvent =
  | { runId: string; type: 'chunk'; text: string }
  | { runId: string; type: 'session'; sessionRef: string }
  | { runId: string; type: 'done' }
  | { runId: string; type: 'error'; message: string }

export interface ElectronAPI {
  readonly isDesktop: true
  cli: {
    list(): Promise<DetectedAgent[]>
    start(req: CliStartRequest): Promise<void>
    cancel(runId: string): Promise<void>
    /** Subscribe to streaming events. Returns an unsubscribe function. */
    onEvent(cb: (e: CliEvent) => void): () => void
  }
  store: {
    get<T>(key: string): Promise<T | null>
    set(key: string, value: unknown): Promise<void>
  }
}

export const IPC = {
  cliList: 'cli:list',
  cliStart: 'cli:start',
  cliCancel: 'cli:cancel',
  cliEvent: 'cli:event',
  storeGet: 'store:get',
  storeSet: 'store:set',
} as const
