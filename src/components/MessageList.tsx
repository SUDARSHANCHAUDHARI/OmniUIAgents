import { useEffect, useRef } from 'react'
import type { ChatMessage } from '../types'
import { MessageBubble } from './MessageBubble'

interface Props {
  messages: ChatMessage[]
}

export function MessageList({ messages }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4">
      {messages.length === 0 ? (
        <p className="mt-10 text-center text-sm text-zinc-500">
          Send a message to start the conversation.
        </p>
      ) : (
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
