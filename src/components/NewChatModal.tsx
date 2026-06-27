import { useEffect, useMemo, useState } from 'react'
import { electronAPI, isDesktop } from '../capabilities'
import { CLI_AGENTS, PROVIDERS } from '../llm/registry'
import type { DetectedAgent } from '../shared/ipc'
import { useChatStore } from '../store/useChatStore'
import { useSettingsStore } from '../store/useSettingsStore'
import type { Backend } from '../types'
import { Modal } from './Modal'

interface Props {
  onClose: () => void
}

export function NewChatModal({ onClose }: Props) {
  const create = useChatStore((s) => s.createConversation)
  const settings = useSettingsStore((s) => s.settings)
  const [detected, setDetected] = useState<DetectedAgent[]>([])

  useEffect(() => {
    if (isDesktop && electronAPI) {
      electronAPI.cli.list().then(setDetected).catch(() => setDetected([]))
    }
  }, [])

  const options = useMemo(() => {
    const direct: { backend: Backend; label: string; sub: string; ready: boolean }[] =
      (Object.keys(PROVIDERS) as (keyof typeof PROVIDERS)[]).map((p) => {
        const info = PROVIDERS[p]
        const cfg = settings.providers[p]
        const ready = info.keyless ? !!(cfg.baseUrl || info.defaultBaseUrl) : !!cfg.apiKey
        return {
          backend: { kind: 'direct' as const, provider: p, model: info.defaultModel },
          label: info.label,
          sub: info.keyless
            ? `Local · ${cfg.baseUrl || info.defaultBaseUrl}`
            : ready
              ? 'API key set'
              : 'Needs API key (Settings)',
          ready,
        }
      })

    const cli = (Object.keys(CLI_AGENTS) as (keyof typeof CLI_AGENTS)[]).map((id) => {
      const found = detected.find((d) => d.id === id)
      const available = isDesktop && !!found?.available
      return {
        backend: {
          kind: 'cli' as const,
          cliAgentId: id,
          model: CLI_AGENTS[id].defaultModel,
        },
        label: CLI_AGENTS[id].label,
        sub: !isDesktop
          ? 'Desktop app only'
          : available
            ? `Detected${found?.version ? ` · ${found.version}` : ''}`
            : 'Not installed',
        ready: available,
      }
    })

    return { direct, cli }
  }, [detected, settings])

  async function pick(backend: Backend) {
    await create(backend)
    onClose()
  }

  return (
    <Modal title="New chat" onClose={onClose}>
      <Section title="Direct API · bring your own key">
        {options.direct.map((o) => (
          <OptionRow key={o.label} {...o} onPick={() => void pick(o.backend)} />
        ))}
      </Section>

      <Section title="Local CLI agents · uses the CLI's own login">
        {options.cli.map((o) => (
          <OptionRow key={o.label} {...o} onPick={() => void pick(o.backend)} />
        ))}
      </Section>
    </Modal>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function OptionRow({
  label,
  sub,
  ready,
  onPick,
}: {
  label: string
  sub: string
  ready: boolean
  onPick: () => void
}) {
  return (
    <button
      onClick={onPick}
      className="flex w-full items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-left hover:border-indigo-600 hover:bg-zinc-800"
    >
      <div>
        <div className="text-sm text-zinc-100">{label}</div>
        <div className="text-[11px] text-zinc-500">{sub}</div>
      </div>
      <span
        className={`ml-3 h-2 w-2 shrink-0 rounded-full ${
          ready ? 'bg-emerald-500' : 'bg-zinc-600'
        }`}
        title={ready ? 'Ready' : 'Not ready'}
      />
    </button>
  )
}
