import { execFileSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const MARKER = '# virgil-contract-lint managed'
const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim()
const hookPath = resolve(root, execFileSync(
  'git',
  ['rev-parse', '--git-path', 'hooks/pre-commit'],
  { cwd: root, encoding: 'utf8' }
).trim())

if (existsSync(hookPath) && !readFileSync(hookPath, 'utf8').includes(MARKER)) {
  console.error(`install-hooks REFUSED: unmanaged hook exists at ${hookPath}`)
  process.exitCode = 1
} else {
  const hook = `#!/bin/sh
${MARKER}
repo_root=$(git rev-parse --show-toplevel) || exit 1
exec node "$repo_root/tools/lint-contract.mjs" --staged
`
  mkdirSync(dirname(hookPath), { recursive: true })
  writeFileSync(hookPath, hook, { encoding: 'utf8', mode: 0o755 })
  chmodSync(hookPath, 0o755)
  console.log(`install-hooks PASS: ${hookPath}`)
}
