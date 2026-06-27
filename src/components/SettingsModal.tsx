import { useEffect, useState } from 'react'
import { electronAPI, isDesktop } from '../capabilities'
import { PROVIDERS } from '../llm/registry'
import type { DetectedAgent } from '../shared/ipc'
import { useSettingsStore } from '../store/useSettingsStore'
import type { ProviderKind } from '../types'
import { Modal } from './Modal'

interface Props {
  onClose: () => void
}

export function SettingsModal({ onClose }: Props) {
  const settings = useSettingsStore((s) => s.settings)
  const setApiKey = useSettingsStore((s) => s.setApiKey)
  const setBaseUrl = useSettingsStore((s) => s.setBaseUrl)
  const [detected, setDetected] = useState<DetectedAgent[]>([])

  useEffect(() => {
    if (isDesktop && electronAPI) {
      electronAPI.cli.list().then(setDetected).catch(() => setDetected([]))
    }
  }, [])

  return (
    <Modal title="Settings" onClose={onClose}>
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
        Providers · stored locally on this device
      </h3>
      <div className="space-y-3">
        {(Object.keys(PROVIDERS) as ProviderKind[]).map((p) => {
          const info = PROVIDERS[p]
          return (
            <label key={p} className="block">
              <span className="mb-1 block text-sm text-zinc-300">{info.label}</span>
              {info.keyless ? (
                <input
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={info.defaultBaseUrl}
                  value={settings.providers[p].baseUrl ?? ''}
                  onChange={(e) => void setBaseUrl(p, e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-indigo-600"
                />
              ) : (
                <input
                  type="password"
                  autoComplete="off"
                  placeholder={p === 'anthropic' ? 'sk-ant-…' : 'sk-…'}
                  value={settings.providers[p].apiKey}
                  onChange={(e) => void setApiKey(p, e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-indigo-600"
                />
              )}
            </label>
          )
        })}
      </div>

      <h3 className="mb-2 mt-5 text-xs font-medium uppercase tracking-wide text-zinc-500">
        Local CLI agents
      </h3>
      {!isDesktop ? (
        <p className="text-xs text-zinc-500">
          CLI agents are available only in the desktop app.
        </p>
      ) : detected.length === 0 ? (
        <p className="text-xs text-zinc-500">No CLI agents detected on PATH.</p>
      ) : (
        <div className="space-y-2">
          {detected.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2"
            >
              <div>
                <div className="text-sm text-zinc-100">{d.name}</div>
                <div className="text-[11px] text-zinc-500">
                  {d.available ? (d.path ?? 'detected') : 'not installed'}
                </div>
              </div>
              <span
                className={`text-[11px] ${
                  d.available ? 'text-emerald-400' : 'text-zinc-600'
                }`}
              >
                {d.available ? d.version ?? 'ready' : '—'}
              </span>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
