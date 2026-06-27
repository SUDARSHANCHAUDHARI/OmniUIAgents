import { execFile } from 'node:child_process'
import os from 'node:os'

/**
 * GUI Electron apps don't inherit the login shell's PATH, so CLIs installed in
 * /opt/homebrew/bin, ~/.local/bin, etc. are invisible. Resolve the real PATH
 * once by asking the user's login shell, and merge in common fallbacks.
 */
let cached: string | null = null

const FALLBACKS = [
  '/opt/homebrew/bin',
  '/usr/local/bin',
  '/usr/bin',
  '/bin',
  `${os.homedir()}/.local/bin`,
  `${os.homedir()}/.bun/bin`,
  `${os.homedir()}/.opencode/bin`,
]

export async function resolveShellPath(): Promise<string> {
  if (cached) return cached

  const current = process.env.PATH ?? ''
  const merged = new Set(current.split(':').filter(Boolean))

  if (process.platform !== 'win32') {
    try {
      const shell = process.env.SHELL || '/bin/zsh'
      const out = await new Promise<string>((resolve, reject) => {
        execFile(shell, ['-lic', 'echo -n "$PATH"'], { timeout: 4000 }, (err, stdout) =>
          err ? reject(err) : resolve(stdout),
        )
      })
      for (const p of out.trim().split(':')) if (p) merged.add(p)
    } catch {
      // Fall back to the static list below.
    }
  }

  for (const p of FALLBACKS) merged.add(p)
  cached = [...merged].join(':')
  return cached
}
