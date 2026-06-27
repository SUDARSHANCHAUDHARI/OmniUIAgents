import { execFile, spawn, type ChildProcess } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import type { CliAgentId, CliEvent, CliStartRequest, DetectedAgent } from '../src/shared/ipc'
import { resolveShellPath } from './shell-path'

const AGENTS: { id: CliAgentId; name: string; bin: string }[] = [
  { id: 'claude', name: 'Claude Code', bin: 'claude' },
  { id: 'codex', name: 'Codex', bin: 'codex' },
  { id: 'opencode', name: 'OpenCode', bin: 'opencode' },
]

const running = new Map<string, ChildProcess>()

async function env(): Promise<NodeJS.ProcessEnv> {
  return { ...process.env, PATH: await resolveShellPath() }
}

function workspaceDir(userDataDir: string): string {
  const dir = path.join(userDataDir, 'workspace')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

/** Detect which agents are installed and grab their versions. */
export async function detectAgents(): Promise<DetectedAgent[]> {
  const e = await env()
  return Promise.all(
    AGENTS.map(
      (a) =>
        new Promise<DetectedAgent>((resolve) => {
          execFile(a.bin, ['--version'], { env: e, timeout: 5000 }, (err, stdout) => {
            if (err) {
              resolve({ id: a.id, name: a.name, available: false })
              return
            }
            const which = process.platform === 'win32' ? 'where' : 'which'
            execFile(which, [a.bin], { env: e, timeout: 3000 }, (_e, wout) => {
              resolve({
                id: a.id,
                name: a.name,
                available: true,
                version: stdout.trim().split('\n')[0] || undefined,
                path: wout.trim().split('\n')[0] || undefined,
              })
            })
          })
        }),
    ),
  )
}

/** Spawn an agent and stream events back via `emit`. */
export async function runAgent(
  req: CliStartRequest,
  userDataDir: string,
  emit: (e: CliEvent) => void,
): Promise<void> {
  const cwd = workspaceDir(userDataDir)
  const e = await env()
  const { bin, args } = buildCommand(req)

  let child: ChildProcess
  try {
    child = spawn(bin, args, { cwd, env: e })
  } catch (err) {
    emit({ runId: req.runId, type: 'error', message: String(err) })
    return
  }
  running.set(req.runId, child)
  child.stdin?.end() // never block on stdin

  let stdout = ''
  let stderr = ''
  let streamed = false
  let sentSession = false
  let finished = false

  const parser = createParser(req.agentId)
  const finish = (ev?: CliEvent) => {
    if (finished) return
    finished = true
    running.delete(req.runId)
    if (ev) emit(ev)
    else emit({ runId: req.runId, type: 'done' })
  }

  const handleLine = (line: string) => {
    const trimmed = line.trim()
    if (!trimmed) return
    let obj: any
    try {
      obj = JSON.parse(trimmed)
    } catch {
      return // CLIs interleave non-JSON log lines; ignore them
    }
    const parsed = parser(obj)
    if (parsed.session && !sentSession) {
      sentSession = true
      emit({ runId: req.runId, type: 'session', sessionRef: parsed.session })
    }
    if (parsed.chunk) {
      streamed = true
      emit({ runId: req.runId, type: 'chunk', text: parsed.chunk })
    }
    if (parsed.errored) {
      finish({ runId: req.runId, type: 'error', message: parsed.final || 'Agent error' })
    } else if (parsed.done) {
      // If nothing streamed, fall back to the final message text.
      if (!streamed && parsed.final) {
        emit({ runId: req.runId, type: 'chunk', text: parsed.final })
      }
      finish()
    }
  }

  child.stdout?.on('data', (d: Buffer) => {
    stdout += d.toString()
    let nl: number
    while ((nl = stdout.indexOf('\n')) !== -1) {
      const line = stdout.slice(0, nl)
      stdout = stdout.slice(nl + 1)
      handleLine(line)
    }
  })
  child.stderr?.on('data', (d: Buffer) => {
    stderr += d.toString()
  })

  child.on('error', (err) =>
    finish({ runId: req.runId, type: 'error', message: err.message }),
  )
  child.on('close', (code) => {
    if (stdout.trim()) handleLine(stdout) // flush trailing partial line
    if (finished) return
    if (code === 0) finish()
    else
      finish({
        runId: req.runId,
        type: 'error',
        message: stderr.trim().split('\n').slice(-3).join('\n') || `Exited with code ${code}`,
      })
  })
}

export function cancelRun(runId: string): void {
  const child = running.get(runId)
  if (child) {
    child.kill('SIGTERM')
    running.delete(runId)
  }
}

// --- command construction ------------------------------------------------

function buildCommand(req: CliStartRequest): { bin: string; args: string[] } {
  if (req.agentId === 'claude') {
    const args = [
      '-p',
      req.prompt,
      '--output-format',
      'stream-json',
      '--verbose',
      '--include-partial-messages',
      // v1 is a chat hub: no file/Bash tools, so -p runs without permission prompts.
      '--tools',
      '',
    ]
    if (req.model) args.push('--model', req.model)
    if (req.sessionRef) args.push('--resume', req.sessionRef)
    return { bin: 'claude', args }
  }

  if (req.agentId === 'opencode') {
    const args = ['run', req.prompt, '--format', 'json']
    if (req.model) args.push('-m', req.model)
    if (req.sessionRef) args.push('-s', req.sessionRef)
    return { bin: 'opencode', args }
  }

  // codex
  const base = ['exec', '--json', '--skip-git-repo-check']
  if (req.model) base.push('-m', req.model)
  const args = req.sessionRef
    ? ['exec', 'resume', req.sessionRef, '--json', '--skip-git-repo-check', req.prompt]
    : [...base, req.prompt]
  return { bin: 'codex', args }
}

// --- per-agent line parsing ----------------------------------------------

interface Parsed {
  chunk?: string
  session?: string
  done?: boolean
  errored?: boolean
  final?: string
}

type LineParser = (obj: any) => Parsed

/** A parser per run. Most are stateless; opencode needs per-part state. */
function createParser(agentId: CliAgentId): LineParser {
  if (agentId === 'claude') return parseClaudeLine
  if (agentId === 'codex') return parseCodexLine
  return createOpencodeParser()
}

function parseClaudeLine(obj: any): Parsed {
  const out: Parsed = {}
  if (obj.session_id) out.session = obj.session_id

  if (
    obj.type === 'stream_event' &&
    obj.event?.type === 'content_block_delta' &&
    obj.event?.delta?.type === 'text_delta'
  ) {
    out.chunk = obj.event.delta.text
  } else if (obj.type === 'result') {
    out.done = true
    out.final = typeof obj.result === 'string' ? obj.result : undefined
    out.errored = obj.is_error === true
  }
  return out
}

function parseCodexLine(obj: any): Parsed {
  // codex exec --json shapes vary by version; handle defensively.
  const out: Parsed = {}
  const m = obj.msg ?? obj
  const type = m.type

  if (m.session_id) out.session = m.session_id
  else if (obj.session_id) out.session = obj.session_id

  if (type === 'agent_message_delta' && typeof m.delta === 'string') {
    out.chunk = m.delta
  } else if (type === 'agent_message' && typeof m.message === 'string') {
    out.final = m.message // fallback when no deltas were emitted
  } else if (type === 'error') {
    out.errored = true
    out.done = true
    out.final = m.message ?? 'Codex error'
  } else if (type === 'task_complete' || type === 'turn_complete') {
    out.done = true
  }
  return out
}

/**
 * OpenCode `run --format json` emits text parts whose `text` is cumulative,
 * so we diff per part id to recover deltas. Completion is detected via process
 * exit (handled by the close handler). Schema varies by version — defensive.
 */
function createOpencodeParser(): LineParser {
  const lastText = new Map<string, string>()
  return (obj: any): Parsed => {
    const out: Parsed = {}

    const session =
      obj.sessionID ??
      obj.properties?.sessionID ??
      obj.properties?.info?.id ??
      obj.info?.sessionID
    if (typeof session === 'string') out.session = session

    const part = obj.properties?.part ?? obj.part
    if (part?.type === 'text' && typeof part.text === 'string') {
      const id = String(part.id ?? 'text')
      const prev = lastText.get(id) ?? ''
      const next: string = part.text
      const delta = next.startsWith(prev) ? next.slice(prev.length) : next
      lastText.set(id, next)
      if (delta) out.chunk = delta
    }

    const type: string = obj.type ?? ''
    if (type.includes('error')) {
      out.errored = true
      out.done = true
      out.final = obj.properties?.message ?? obj.message ?? 'OpenCode error'
    }
    return out
  }
}
