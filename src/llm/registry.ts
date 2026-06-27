import type { CliAgentId } from '../shared/ipc'
import type { ProviderKind } from '../types'

export interface ProviderInfo {
  label: string
  models: string[]
  defaultModel: string
  /** True for keyless local providers (Ollama): configured by base URL, not an API key. */
  keyless?: boolean
  /** Default base URL for local/OpenAI-compatible providers. */
  defaultBaseUrl?: string
}

/** Direct-API providers (Path 1, BYOK). Work in both web and desktop. */
export const PROVIDERS: Record<ProviderKind, ProviderInfo> = {
  anthropic: {
    label: 'Anthropic (Claude)',
    models: ['claude-sonnet-4-6', 'claude-opus-4-8', 'claude-haiku-4-5-20251001'],
    defaultModel: 'claude-sonnet-4-6',
  },
  openai: {
    label: 'OpenAI',
    models: ['gpt-4o', 'gpt-4o-mini', 'o4-mini'],
    defaultModel: 'gpt-4o',
  },
  ollama: {
    label: 'Ollama (local)',
    models: ['qwen3:8b', 'qwen2.5-coder:7b', 'gemma4:12b', 'deepseek-r1:14b'],
    defaultModel: 'qwen3:8b',
    keyless: true,
    defaultBaseUrl: 'http://localhost:11434',
  },
}

export interface CliAgentInfo {
  label: string
  /** Model aliases the CLI accepts via --model / -m. Empty = use CLI default. */
  models: string[]
  defaultModel?: string
}

/** Local CLI agents (Path 2). Desktop only. Auth lives in the CLI itself. */
export const CLI_AGENTS: Record<CliAgentId, CliAgentInfo> = {
  claude: {
    label: 'Claude Code',
    models: ['sonnet', 'opus', 'haiku'],
    defaultModel: 'sonnet',
  },
  codex: {
    label: 'Codex',
    models: [],
  },
  opencode: {
    // Model format is provider/model, e.g. "ollama/qwen3:8b" or "anthropic/claude-sonnet-4-6".
    label: 'OpenCode',
    models: [],
  },
}
