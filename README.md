# OmniUIAgents

A local multi-agent AI hub. Chat with AI through two paths:

- **Path 1 — Direct API (BYOK):** paste your own Anthropic or OpenAI key, or point at a keyless local **Ollama** server; calls go straight to the provider. Works in the **browser and desktop**. Keys stay on your device.
- **Path 2 — Local CLI agents:** drive `claude` (Claude Code), `codex`, and `opencode` that are already installed and logged in on your machine — using *their* auth (e.g. a Claude subscription), no API key needed. **Desktop only.**

One shared React renderer powers both the web app and the Electron desktop app. The UI detects its capabilities: CLI agents light up only in the desktop build.

## Stack

React 19 · TypeScript (strict) · Vite · Tailwind v4 · Zustand · Electron · pnpm

## Develop

```bash
pnpm install

pnpm dev        # web app in the browser (Path 1 only)
pnpm desktop    # Electron desktop app (Path 1 + Path 2)

pnpm typecheck  # tsc --noEmit
pnpm build      # web production build
```

## How it works

```
src/
  components/   chat UI, sidebar, modals
  llm/          AgentRuntime interface + DirectApiAgent / CliAgent + factory
  storage/      StorageAdapter -> IndexedDB (web) / Electron file store (desktop)
  store/        zustand state (chat + settings)
  shared/ipc.ts renderer <-> electron-main contract (single source of truth)
electron/       main process, preload, CLI spawning, file store
```

- A conversation is bound to a **backend** (`direct` or `cli`); the chat UI is identical for both.
- **Direct** backends stream provider SSE over `fetch`.
- **CLI** backends run headlessly — `claude -p ... --output-format stream-json`, `codex exec --json`, and `opencode run --format json` — and stream parsed events to the UI over IPC. No PTY/native modules.
- Multi-turn continuity for CLI agents uses each CLI's own session id (`--resume` / `codex exec resume` / `opencode -s`).

## Scope (v1)

In: dual-path chat, multiple conversations, BYOK settings, local persistence, web + desktop.

Not yet: multi-agent team mode, document generation, scheduled tasks, MCP, chat-platform integrations, in-app file ops. CLI agents run **chat-only** (tools disabled) in v1.

## Notes / not-for-production

- In the **web** build, BYOK keys live client-side and calls go direct to providers (Anthropic needs the direct-browser-access header). Fine for local/personal use; a real product would proxy through a backend.
- Desktop persistence is a JSON file store for now; the `StorageAdapter` seam lets it become SQLite without renderer changes.

## Author

**Sudarshan Chaudhari** — [SudarshanTechLabs](https://github.com/SUDARSHANCHAUDHARI)

## License

[MIT](./LICENSE) © 2026 Sudarshan Chaudhari (SudarshanTechLabs)
