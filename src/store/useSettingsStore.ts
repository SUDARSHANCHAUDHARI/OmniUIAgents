import { create } from 'zustand'
import { PROVIDERS } from '../llm/registry'
import { storage } from '../storage'
import type { ProviderKind, Settings } from '../types'

function defaultSettings(): Settings {
  return {
    providers: {
      anthropic: { apiKey: '', defaultModel: PROVIDERS.anthropic.defaultModel },
      openai: { apiKey: '', defaultModel: PROVIDERS.openai.defaultModel },
      ollama: {
        apiKey: '',
        defaultModel: PROVIDERS.ollama.defaultModel,
        baseUrl: PROVIDERS.ollama.defaultBaseUrl,
      },
    },
  }
}

interface SettingsState {
  settings: Settings
  loaded: boolean
  load: () => Promise<void>
  setApiKey: (provider: ProviderKind, apiKey: string) => Promise<void>
  setBaseUrl: (provider: ProviderKind, baseUrl: string) => Promise<void>
  setDefaultModel: (provider: ProviderKind, model: string) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: defaultSettings(),
  loaded: false,

  async load() {
    const saved = await storage.loadSettings()
    // Merge with defaults so providers added in newer versions always exist.
    const base = defaultSettings()
    const settings: Settings = saved
      ? { providers: { ...base.providers, ...saved.providers } }
      : base
    set({ settings, loaded: true })
  },

  setApiKey: (provider, apiKey) => patchProvider(set, get, provider, { apiKey }),
  setBaseUrl: (provider, baseUrl) => patchProvider(set, get, provider, { baseUrl }),
  setDefaultModel: (provider, model) =>
    patchProvider(set, get, provider, { defaultModel: model }),
}))

async function patchProvider(
  set: (s: Partial<SettingsState>) => void,
  get: () => SettingsState,
  provider: ProviderKind,
  patch: Partial<Settings['providers'][ProviderKind]>,
) {
  const settings = get().settings
  const next: Settings = {
    ...settings,
    providers: {
      ...settings.providers,
      [provider]: { ...settings.providers[provider], ...patch },
    },
  }
  set({ settings: next })
  await storage.saveSettings(next)
}
