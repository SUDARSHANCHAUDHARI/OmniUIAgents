import type { ChatMessage } from '../types'

export interface SendOptions {
  /** Full conversation history (direct API uses all; CLI uses the last user turn). */
  messages: ChatMessage[]
  model?: string
  /** Provider/CLI session id for multi-turn continuity. */
  sessionRef?: string
  signal?: AbortSignal
  onChunk: (text: string) => void
  /** Fired when the backend reports a session id to resume next turn. */
  onSessionRef?: (ref: string) => void
  onDone: () => void
  onError: (message: string) => void
}

export interface RunHandle {
  cancel(): void
}

/** Common interface over both Path 1 (direct API) and Path 2 (CLI agent). */
export interface AgentRuntime {
  send(opts: SendOptions): RunHandle
}

export function lastUserMessage(messages: ChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') return messages[i].content
  }
  return ''
}
