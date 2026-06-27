import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ChatMessage } from '../types'

interface Props {
  message: ChatMessage
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-indigo-600 text-white'
            : message.error
              ? 'border border-red-900 bg-red-950/50 text-red-200'
              : 'bg-zinc-800 text-zinc-100'
        }`}
      >
        {isUser ? (
          <span className="whitespace-pre-wrap">{message.content}</span>
        ) : message.content ? (
          <div className="prose-omni">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        ) : message.pending ? (
          <span className="inline-flex gap-1 text-zinc-400">
            <Dot /> <Dot /> <Dot />
          </span>
        ) : null}
        {message.pending && message.content && (
          <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-zinc-400 align-middle" />
        )}
      </div>
    </div>
  )
}

function Dot() {
  return <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
}
