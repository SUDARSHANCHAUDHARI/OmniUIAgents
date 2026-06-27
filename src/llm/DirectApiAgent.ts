import type { ProviderKind } from '../types'
import type { AgentRuntime, RunHandle, SendOptions } from './AgentRuntime'
import { readSse } from './sse'

/**
 * Path 1: direct HTTP calls to a provider with a user-supplied key (BYOK).
 * Works in both the browser and Electron. Keys never leave the client.
 */
export class DirectApiAgent implements AgentRuntime {
  constructor(
    private readonly provider: ProviderKind,
    private readonly apiKey: string,
    private readonly model: string,
    /** Base URL for OpenAI-compatible local providers (Ollama). */
    private readonly baseUrl?: string,
  ) {}

  send(opts: SendOptions): RunHandle {
    const controller = new AbortController()
    const signal = opts.signal ?? controller.signal

    const run =
      this.provider === 'anthropic'
        ? this.streamAnthropic(opts, signal)
        : this.streamOpenAICompatible(opts, signal)

    run.catch((err: unknown) => {
      if (signal.aborted) return
      opts.onError(err instanceof Error ? err.message : String(err))
    })

    return { cancel: () => controller.abort() }
  }

  private async streamAnthropic(opts: SendOptions, signal: AbortSignal) {
    const system = opts.messages.find((m) => m.role === 'system')?.content
    const messages = opts.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }))

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: opts.model ?? this.model,
        max_tokens: 4096,
        stream: true,
        ...(system ? { system } : {}),
        messages,
      }),
    })

    if (!res.ok || !res.body) throw new Error(await errorText(res))

    for await (const data of readSse(res.body, signal)) {
      if (!data) continue
      let evt: any
      try {
        evt = JSON.parse(data)
      } catch {
        continue
      }
      if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
        opts.onChunk(evt.delta.text)
      } else if (evt.type === 'message_stop') {
        break
      } else if (evt.type === 'error') {
        throw new Error(evt.error?.message ?? 'Anthropic stream error')
      }
    }
    opts.onDone()
  }

  /** Shared path for OpenAI and any OpenAI-compatible server (Ollama). */
  private async streamOpenAICompatible(opts: SendOptions, signal: AbortSignal) {
    const messages = opts.messages.map((m) => ({ role: m.role, content: m.content }))

    const isOllama = this.provider === 'ollama'
    const base = isOllama
      ? (this.baseUrl ?? 'http://localhost:11434').replace(/\/$/, '')
      : 'https://api.openai.com'
    const url = `${base}/v1/chat/completions`

    const headers: Record<string, string> = { 'content-type': 'application/json' }
    if (!isOllama) headers.authorization = `Bearer ${this.apiKey}`

    const res = await fetch(url, {
      method: 'POST',
      signal,
      headers,
      body: JSON.stringify({
        model: opts.model ?? this.model,
        stream: true,
        messages,
      }),
    })

    if (!res.ok || !res.body) throw new Error(await errorText(res))

    for await (const data of readSse(res.body, signal)) {
      if (!data || data === '[DONE]') continue
      let evt: any
      try {
        evt = JSON.parse(data)
      } catch {
        continue
      }
      const delta = evt.choices?.[0]?.delta?.content
      if (typeof delta === 'string') opts.onChunk(delta)
    }
    opts.onDone()
  }
}

async function errorText(res: Response): Promise<string> {
  try {
    const body = await res.text()
    return `HTTP ${res.status}: ${body.slice(0, 500)}`
  } catch {
    return `HTTP ${res.status}`
  }
}
