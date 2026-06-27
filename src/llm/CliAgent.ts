import { electronAPI } from '../capabilities'
import type { CliAgentId } from '../shared/ipc'
import { lastUserMessage, type AgentRuntime, type RunHandle, type SendOptions } from './AgentRuntime'

let counter = 0
const newRunId = () => `run-${Date.now()}-${counter++}`

/**
 * Path 2: drives a local CLI agent (Claude Code, Codex) through the Electron
 * main process. Desktop only. The CLI owns its own auth and conversation
 * history; we resume via sessionRef. Throws if used in the browser.
 */
export class CliAgent implements AgentRuntime {
  constructor(private readonly agentId: CliAgentId) {}

  send(opts: SendOptions): RunHandle {
    const api = electronAPI
    if (!api) {
      opts.onError('CLI agents are only available in the desktop app.')
      return { cancel: () => {} }
    }

    const runId = newRunId()
    const unsubscribe = api.cli.onEvent((e) => {
      if (e.runId !== runId) return
      switch (e.type) {
        case 'chunk':
          opts.onChunk(e.text)
          break
        case 'session':
          opts.onSessionRef?.(e.sessionRef)
          break
        case 'done':
          unsubscribe()
          opts.onDone()
          break
        case 'error':
          unsubscribe()
          opts.onError(e.message)
          break
      }
    })

    api.cli
      .start({
        runId,
        agentId: this.agentId,
        prompt: lastUserMessage(opts.messages),
        model: opts.model,
        sessionRef: opts.sessionRef,
      })
      .catch((err: unknown) => {
        unsubscribe()
        opts.onError(err instanceof Error ? err.message : String(err))
      })

    return {
      cancel: () => {
        unsubscribe()
        api.cli.cancel(runId).catch(() => {})
      },
    }
  }
}
