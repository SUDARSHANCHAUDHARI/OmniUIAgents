import { describeBackend } from '../llm/describe'
import { useChatStore } from '../store/useChatStore'
import { Composer } from './Composer'
import { MessageList } from './MessageList'

interface Props {
  onNewChat: () => void
}

export function ChatView({ onNewChat }: Props) {
  const activeId = useChatStore((s) => s.activeId)
  const conversation = useChatStore((s) =>
    s.conversations.find((c) => c.id === s.activeId),
  )
  const messages = useChatStore((s) => (activeId ? (s.messages[activeId] ?? []) : []))
  const streaming = useChatStore((s) => (activeId ? !!s.streaming[activeId] : false))
  const send = useChatStore((s) => s.sendMessage)
  const cancel = useChatStore((s) => s.cancel)

  if (!conversation || !activeId) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center text-center">
        <p className="mb-4 text-zinc-400">No conversation selected.</p>
        <button
          onClick={onNewChat}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Start a new chat
        </button>
      </main>
    )
  }

  return (
    <main className="flex flex-1 flex-col">
      <header className="border-b border-zinc-800 px-5 py-3">
        <div className="truncate text-sm font-medium text-zinc-100">
          {conversation.title}
        </div>
        <div className="text-[11px] text-zinc-500">
          {describeBackend(conversation.backend)}
        </div>
      </header>

      <MessageList messages={messages} />

      <Composer
        disabled={false}
        streaming={streaming}
        onSend={(text) => void send(activeId, text)}
        onCancel={() => cancel(activeId)}
      />
    </main>
  )
}
