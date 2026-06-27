import { electronAPI, isDesktop } from '../capabilities'
import type { ChatMessage, Conversation, Settings } from '../types'
import { idbGet, idbSet } from './idb'
import { KEYS, type StorageAdapter } from './StorageAdapter'

/** Web: persist to IndexedDB. */
class IndexedDbStorage implements StorageAdapter {
  loadConversations() {
    return idbGet<Conversation[]>(KEYS.conversations).then((v) => v ?? [])
  }
  saveConversations(conversations: Conversation[]) {
    return idbSet(KEYS.conversations, conversations)
  }
  loadMessages(id: string) {
    return idbGet<ChatMessage[]>(KEYS.messages(id)).then((v) => v ?? [])
  }
  saveMessages(id: string, messages: ChatMessage[]) {
    return idbSet(KEYS.messages(id), messages)
  }
  loadSettings() {
    return idbGet<Settings>(KEYS.settings)
  }
  saveSettings(settings: Settings) {
    return idbSet(KEYS.settings, settings)
  }
}

/** Desktop: persist through the Electron main process file store. */
class ElectronStorage implements StorageAdapter {
  private get store() {
    return electronAPI!.store
  }
  loadConversations() {
    return this.store.get<Conversation[]>(KEYS.conversations).then((v) => v ?? [])
  }
  saveConversations(conversations: Conversation[]) {
    return this.store.set(KEYS.conversations, conversations)
  }
  loadMessages(id: string) {
    return this.store.get<ChatMessage[]>(KEYS.messages(id)).then((v) => v ?? [])
  }
  saveMessages(id: string, messages: ChatMessage[]) {
    return this.store.set(KEYS.messages(id), messages)
  }
  loadSettings() {
    return this.store.get<Settings>(KEYS.settings)
  }
  saveSettings(settings: Settings) {
    return this.store.set(KEYS.settings, settings)
  }
}

export const storage: StorageAdapter = isDesktop
  ? new ElectronStorage()
  : new IndexedDbStorage()
