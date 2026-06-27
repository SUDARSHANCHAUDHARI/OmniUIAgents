import { useState, type KeyboardEvent } from 'react'

interface Props {
  disabled: boolean
  streaming: boolean
  onSend: (text: string) => void
  onCancel: () => void
}

export function Composer({ disabled, streaming, onSend, onCancel }: Props) {
  const [text, setText] = useState('')

  function submit() {
    const trimmed = text.trim()
    if (!trimmed || streaming) return
    onSend(trimmed)
    setText('')
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="border-t border-zinc-800 p-3">
      <div className="mx-auto flex max-w-3xl items-end gap-2">
        <textarea
          rows={1}
          value={text}
          disabled={disabled}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Message…  (Enter to send, Shift+Enter for newline)"
          className="max-h-40 min-h-[44px] flex-1 resize-none rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-indigo-600"
        />
        {streaming ? (
          <button
            onClick={onCancel}
            className="h-[44px] shrink-0 rounded-xl border border-zinc-700 px-4 text-sm text-zinc-200 hover:bg-zinc-800"
          >
            Stop
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={!text.trim()}
            className="h-[44px] shrink-0 rounded-xl bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40"
          >
            Send
          </button>
        )}
      </div>
    </div>
  )
}
