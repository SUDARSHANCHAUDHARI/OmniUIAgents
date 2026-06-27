import { useEffect, useState } from 'react'
import { ChatView } from './components/ChatView'
import { NewChatModal } from './components/NewChatModal'
import { SettingsModal } from './components/SettingsModal'
import { Sidebar } from './components/Sidebar'
import { useChatStore } from './store/useChatStore'
import { useSettingsStore } from './store/useSettingsStore'

export default function App() {
  const loadChats = useChatStore((s) => s.load)
  const loadSettings = useSettingsStore((s) => s.load)
  const [showSettings, setShowSettings] = useState(false)
  const [showNewChat, setShowNewChat] = useState(false)

  useEffect(() => {
    void loadSettings()
    void loadChats()
  }, [loadChats, loadSettings])

  return (
    <div className="flex h-full text-zinc-200">
      <Sidebar
        onNewChat={() => setShowNewChat(true)}
        onOpenSettings={() => setShowSettings(true)}
      />
      <ChatView onNewChat={() => setShowNewChat(true)} />

      {showNewChat && <NewChatModal onClose={() => setShowNewChat(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  )
}
