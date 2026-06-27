import type { Conversation, ChatMessage, Settings } from '../types'

/**
 * Persistence boundary. The renderer never knows whether it is talking to
 * IndexedDB (web) or the Electron file store (desktop).
 */
export interface StorageAdapter {
  loadConversations(): Promise<Conversation[]>
  saveConversations(conversations: Conversation[]): Promise<void>
  loadMessages(conversationId: string): Promise<ChatMessage[]>
  saveMessages(conversationId: string, messages: ChatMessage[]): Promise<void>
  loadSettings(): Promise<Settings | null>
  saveSettings(settings: Settings): Promise<void>
}

export const KEYS = {
  conversations: 'conversations',
  settings: 'settings',
  messages: (id: string) => `messages:${id}`,
}
