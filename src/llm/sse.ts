/**
 * Reads a fetch streaming body and yields SSE `data:` payloads as strings.
 * Shared by the Anthropic and OpenAI direct-API adapters.
 */
export async function* readSse(
  body: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      if (signal?.aborted) return
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      // SSE events are separated by a blank line.
      let sep: number
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        const rawEvent = buffer.slice(0, sep)
        buffer = buffer.slice(sep + 2)
        for (const line of rawEvent.split('\n')) {
          const trimmed = line.trimStart()
          if (trimmed.startsWith('data:')) {
            yield trimmed.slice(5).trim()
          }
        }
      }
    }
  } finally {
    reader.cancel().catch(() => {})
  }
}
