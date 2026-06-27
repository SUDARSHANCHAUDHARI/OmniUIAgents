import { describeBackend } from '../llm/describe'
import { useChatStore } from '../store/useChatStore'

interface Props {
  onNewChat: () => void
  onOpenSettings: () => void
}

export function Sidebar({ onNewChat, onOpenSettings }: Props) {
  const conversations = useChatStore((s) => s.conversations)
  const activeId = useChatStore((s) => s.activeId)
  const select = useChatStore((s) => s.selectConversation)
  const remove = useChatStore((s) => s.deleteConversation)

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900/60">
      <div className="flex items-center justify-between p-3">
        <span className="text-sm font-semibold tracking-tight text-zinc-100">
          OmniUIAgents
        </span>
        <button
          onClick={onOpenSettings}
          title="Settings"
          className="rounded-md px-2 py-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
        >
          ⚙
        </button>
      </div>

      <div className="px-3 pb-2">
        <button
          onClick={onNewChat}
          className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          + New chat
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        {conversations.length === 0 && (
          <p className="px-2 py-4 text-xs text-zinc-500">No conversations yet.</p>
        )}
        {conversations.map((c) => (
          <div
            key={c.id}
            className={`group flex cursor-pointer items-center justify-between rounded-md px-2 py-2 text-sm ${
              c.id === activeId
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-300 hover:bg-zinc-800/60'
            }`}
            onClick={() => void select(c.id)}
          >
            <div className="min-w-0">
              <div className="truncate">{c.title}</div>
              <div className="truncate text-[11px] text-zinc-500">
                {describeBackend(c.backend)}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                void remove(c.id)
              }}
              title="Delete"
              className="ml-2 hidden shrink-0 rounded px-1 text-zinc-500 hover:text-red-400 group-hover:block"
            >
              ✕
            </button>
          </div>
        ))}
      </nav>
    </aside>
  )
}
