# OmniUIAgents

A local multi-agent AI hub. Chat with AI through two paths:

- **Path 1 — Direct API (BYOK):** paste your own Anthropic or OpenAI key, or point at a keyless local **Ollama** server; calls go straight to the provider. Works in the **browser and desktop**. Keys stay on your device.
- **Path 2 — Local CLI agents:** drive `claude` (Claude Code), `codex`, and `opencode` that are already installed and logged in on your machine — using *their* auth (e.g. a Claude subscription), no API key needed. **Desktop only.**

One shared React renderer powers both the web app and the Electron desktop app. The UI detects its capabilities: CLI agents light up only in the desktop build.

## Table of Contents

- [Stack](#stack)
- [Develop](#develop)
- [How it works](#how-it-works)
- [Scope (v1)](#scope-v1)
- [Notes / not-for-production](#notes--not-for-production)
- [License](#license)
- [About](#about)

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

## License

[MIT](./LICENSE) © 2026 Sudarshan Chaudhari (SudarshanTechLabs)

---

## About

I'm Sudarshan Chaudhari, a Senior Quality Engineer, Test Automation specialist, and AI systems builder based in Bangkok, Thailand.

I have 13+ years of experience in software quality engineering, working across SaaS, fintech, gaming, web, mobile, cloud, and digital signage platforms. My background combines hands-on test automation with QA leadership, test strategy, CI/CD, release quality, production investigation, and cross-platform validation.

Alongside my professional QA career, I run [SudarshanTechLabs](https://sudarshantechlabs.com/), my independent engineering and product lab where I design, build, test, and ship software across Android, web, AI, cybersecurity, developer tooling, and cross-platform applications.

### What I work on

- ⚙️ **Quality Engineering & Test Automation** — Playwright, Selenium, Cypress, Appium, API testing, automation frameworks, end-to-end testing, CI/CD, release gates, GitHub Actions, risk-based testing, and production validation
- 🤖 **AI Systems & Automation** — AI agents, multi-agent orchestration, MCP servers, AI-assisted QA, prompt tooling, developer workflows, automation systems, and Claude Code plugins
- 📱 **Mobile & Cross-Platform Applications** — Android applications built with Kotlin and Jetpack Compose, Google Play releases, automated build and publishing pipelines, and cross-platform development spanning iOS, web, Windows, and macOS
- 🌐 **Web Applications & Platforms** — Full-stack applications using Next.js, TypeScript, Firebase, Cloudflare, REST APIs, and modern web infrastructure
- 🛠️ **Developer Tooling & CLI Engineering** — Rust, Python, TypeScript, CLI utilities, multi-repository tooling, build automation, release tooling, and engineering productivity systems
- 🛡️ **Cybersecurity & Observability** — Threat detection, log analysis, security auditing, vulnerability assessment, monitoring, and security-focused developer tools
- 📺 **Digital Signage & Device Platforms** — Content validation, playback testing, device compatibility, production investigation, monitoring, and QA across diverse hardware and operating-system environments

My work sits at the intersection of quality engineering, automation, AI, and software development. I approach products with a QA mindset from the beginning: understanding failure modes, designing for testability, automating repetitive work, and building release confidence into the engineering process.

Through SudarshanTechLabs, I also build products and tools from idea to production, covering architecture, development, testing, CI/CD, release automation, monitoring, and ongoing maintenance.

🌐 [sudarshantechlabs.com](https://sudarshantechlabs.com/) · 💼 [LinkedIn](https://linkedin.com/in/sudarshan-chaudhari) · 🐙 [GitHub](https://github.com/SUDARSHANCHAUDHARI) · ✉️ [sunny.sudarshan@gmail.com](mailto:sunny.sudarshan@gmail.com)
