import type { Backend, Settings } from '../types'
import type { AgentRuntime } from './AgentRuntime'
import { CliAgent } from './CliAgent'
import { DirectApiAgent } from './DirectApiAgent'
import { PROVIDERS } from './registry'

export class RuntimeError extends Error {}

/** Builds the right backend for a conversation, or throws a user-facing reason. */
export function createRuntime(backend: Backend, settings: Settings): AgentRuntime {
  if (backend.kind === 'cli') {
    if (!backend.cliAgentId) throw new RuntimeError('No CLI agent selected.')
    return new CliAgent(backend.cliAgentId)
  }

  const provider = backend.provider
  if (!provider) throw new RuntimeError('No provider selected.')

  const info = PROVIDERS[provider]
  const cfg = settings.providers[provider]

  if (info.keyless) {
    const baseUrl = cfg?.baseUrl || info.defaultBaseUrl
    if (!baseUrl) {
      throw new RuntimeError(`No base URL set for ${info.label}. Add one in Settings.`)
    }
    return new DirectApiAgent(
      provider,
      '',
      backend.model ?? cfg?.defaultModel ?? info.defaultModel,
      baseUrl,
    )
  }

  if (!cfg?.apiKey) {
    throw new RuntimeError(`No API key set for ${info.label}. Add one in Settings.`)
  }

  return new DirectApiAgent(
    provider,
    cfg.apiKey,
    backend.model ?? cfg.defaultModel ?? info.defaultModel,
  )
}
