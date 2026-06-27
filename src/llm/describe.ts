import type { Backend } from '../types'
import { CLI_AGENTS, PROVIDERS } from './registry'

/** Short human label for a conversation's backend, e.g. "Claude Code · sonnet". */
export function describeBackend(backend: Backend): string {
  if (backend.kind === 'cli' && backend.cliAgentId) {
    const agent = CLI_AGENTS[backend.cliAgentId]
    return backend.model ? `${agent.label} · ${backend.model}` : agent.label
  }
  if (backend.kind === 'direct' && backend.provider) {
    const provider = PROVIDERS[backend.provider]
    return `${provider.label}${backend.model ? ` · ${backend.model}` : ''}`
  }
  return 'Unknown'
}
