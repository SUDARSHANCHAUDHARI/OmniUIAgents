import { create } from 'zustand'
import { createRuntime, RuntimeError } from '../llm/createRuntime'
import type { RunHandle } from '../llm/AgentRuntime'
import { storage } from '../storage'
import type { Backend, ChatMessage, Conversation } from '../types'
import { useSettingsStore } from './useSettingsStore'

// Run handles are live objects, never persisted — keep them out of state.
const runHandles = new Map<string, RunHandle>()

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`

function titleFrom(text: string): string {
  const t = text.trim().replace(/\s+/g, ' ')
  return t.length > 40 ? `${t.slice(0, 40)}…` : t || 'New chat'
}

interface ChatState {
  conversations: Conversation[]
  activeId: string | null
  messages: Record<string, ChatMessage[]>
  streaming: Record<string, boolean>
  loaded: boolean

  load: () => Promise<void>
  createConversation: (backend: Backend) => Promise<string>
  selectConversation: (id: string) => Promise<void>
  deleteConversation: (id: string) => Promise<void>
  sendMessage: (id: string, text: string) => Promise<void>
  cancel: (id: string) => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeId: null,
  messages: {},
  streaming: {},
  loaded: false,

  async load() {
    const conversations = await storage.loadConversations()
    conversations.sort((a, b) => b.updatedAt - a.updatedAt)
    const activeId = conversations[0]?.id ?? null
    set({ conversations, activeId, loaded: true })
    if (activeId) await get().selectConversation(activeId)
  },

  async createConversation(backend) {
    const now = Date.now()
    const conv: Conversation = {
      id: uid(),
      title: 'New chat',
      backend,
      createdAt: now,
      updatedAt: now,
    }
    const conversations = [conv, ...get().conversations]
    set({
      conversations,
      activeId: conv.id,
      messages: { ...get().messages, [conv.id]: [] },
    })
    await storage.saveConversations(conversations)
    return conv.id
  },

  async selectConversation(id) {
    set({ activeId: id })
    if (!get().messages[id]) {
      const messages = await storage.loadMessages(id)
      set((s) => ({ messages: { ...s.messages, [id]: messages } }))
    }
  },

  async deleteConversation(id) {
    get().cancel(id)
    const conversations = get().conversations.filter((c) => c.id !== id)
    const { [id]: _removed, ...messages } = get().messages
    const activeId =
      get().activeId === id ? (conversations[0]?.id ?? null) : get().activeId
    set({ conversations, messages, activeId })
    await storage.saveConversations(conversations)
    if (activeId && get().activeId === activeId) await get().selectConversation(activeId)
  },

  async sendMessage(id, text) {
    const conv = get().conversations.find((c) => c.id === id)
    if (!conv || get().streaming[id]) return

    const settings = useSettingsStore.getState().settings

    let runtime
    try {
      runtime = createRuntime(conv.backend, settings)
    } catch (err) {
      const message =
        err instanceof RuntimeError ? err.message : 'Failed to start agent.'
      appendMessage(set, get, id, {
        id: uid(),
        role: 'assistant',
        content: message,
        createdAt: Date.now(),
        error: true,
      })
      return
    }

    const userMsg: ChatMessage = {
      id: uid(),
      role: 'user',
      content: text,
      createdAt: Date.now(),
    }
    const assistantMsg: ChatMessage = {
      id: uid(),
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
      pending: true,
    }

    const history = [...(get().messages[id] ?? []), userMsg]
    set((s) => ({
      messages: { ...s.messages, [id]: [...history, assistantMsg] },
      streaming: { ...s.streaming, [id]: true },
    }))

    // Name the conversation from its first user message.
    if (conv.title === 'New chat') {
      patchConversation(set, id, { title: titleFrom(text) })
    }
    await persistConversation(get, id)
    await storage.saveMessages(id, get().messages[id])

    const finish = async () => {
      set((s) => ({ streaming: { ...s.streaming, [id]: false } }))
      runHandles.delete(id)
      await persistConversation(get, id)
      await storage.saveMessages(id, get().messages[id])
    }

    const handle = runtime.send({
      messages: history,
      model: conv.backend.model,
      sessionRef: conv.sessionRef,
      onChunk: (chunk) =>
        patchMessage(set, id, assistantMsg.id, (m) => ({
          content: m.content + chunk,
        })),
      onSessionRef: (ref) => patchConversation(set, id, { sessionRef: ref }),
      onDone: () => {
        patchMessage(set, id, assistantMsg.id, () => ({ pending: false }))
        void finish()
      },
      onError: (message) => {
        patchMessage(set, id, assistantMsg.id, (m) => ({
          content: m.content || message,
          pending: false,
          error: true,
        }))
        void finish()
      },
    })

    runHandles.set(id, handle)
  },

  cancel(id) {
    runHandles.get(id)?.cancel()
    runHandles.delete(id)
    set((s) => ({ streaming: { ...s.streaming, [id]: false } }))
    set((s) => ({
      messages: {
        ...s.messages,
        [id]: (s.messages[id] ?? []).map((m) =>
          m.pending ? { ...m, pending: false } : m,
        ),
      },
    }))
    void storage.saveMessages(id, get().messages[id] ?? [])
  },
}))

// --- helpers -------------------------------------------------------------

type Set = (fn: (s: ChatState) => Partial<ChatState>) => void
type Get = () => ChatState

function appendMessage(set: Set, get: Get, id: string, msg: ChatMessage) {
  const list = [...(get().messages[id] ?? []), msg]
  set((s) => ({ messages: { ...s.messages, [id]: list } }))
  void storage.saveMessages(id, list)
}

function patchMessage(
  set: Set,
  id: string,
  msgId: string,
  patch: (m: ChatMessage) => Partial<ChatMessage>,
) {
  set((s) => ({
    messages: {
      ...s.messages,
      [id]: (s.messages[id] ?? []).map((m) =>
        m.id === msgId ? { ...m, ...patch(m) } : m,
      ),
    },
  }))
}

function patchConversation(set: Set, id: string, patch: Partial<Conversation>) {
  set((s) => ({
    conversations: s.conversations.map((c) =>
      c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c,
    ),
  }))
}

async function persistConversation(get: Get, _id: string) {
  await storage.saveConversations(get().conversations)
}
