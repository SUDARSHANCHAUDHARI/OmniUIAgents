import type { CliAgentId } from './shared/ipc'

export type ProviderKind = 'anthropic' | 'openai' | 'ollama'
export type BackendKind = 'direct' | 'cli'

export type Role = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  id: string
  role: Role
  content: string
  createdAt: number
  /** True while the assistant message is still streaming. */
  pending?: boolean
  error?: boolean
}

/** Describes which engine a conversation talks to. */
export interface Backend {
  kind: BackendKind
  /** Set when kind === 'direct'. */
  provider?: ProviderKind
  /** Set when kind === 'cli'. */
  cliAgentId?: CliAgentId
  model?: string
}

export interface Conversation {
  id: string
  title: string
  backend: Backend
  /** Provider/CLI session id used to continue the conversation. */
  sessionRef?: string
  createdAt: number
  updatedAt: number
}

export interface ProviderConfig {
  apiKey: string
  defaultModel: string
  /** Base URL for self-hosted/OpenAI-compatible providers (e.g. Ollama). */
  baseUrl?: string
}

export interface Settings {
  providers: Record<ProviderKind, ProviderConfig>
}
