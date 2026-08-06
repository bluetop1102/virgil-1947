import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, extname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DISPLAY_NAME = String.fromCodePoint(0xc138, 0xc2e4)
const SOURCE_EXTENSIONS = new Set(['.js', '.mjs', '.html'])
const CODE_EXTENSIONS = new Set(['.js', '.mjs'])

const RULES = {
  material: 'materials-outside-factory',
  light: 'lights-outside-atmosphere',
  deterministic: 'random-clock-direct-call',
  lines: 'max-500-lines',
  display: 'display-name'
}

const MATERIAL_PATTERN = new RegExp(
  '\\bnew\\s+THREE\\s*\\.\\s*Mesh[$\\w]*Material\\s*\\(',
  'g'
)
const LIGHT_PATTERN = new RegExp(
  '\\bnew\\s+THREE\\s*\\.\\s*[$\\w]*Light\\s*\\(',
  'g'
)
const DIRECT_CALL_PATTERNS = [
  ['Math', 'random'],
  ['Date', 'now'],
  ['performance', 'now']
].map(([owner, method]) => ({
  label: `${owner}.${method}`,
  pattern: new RegExp(`\\b${owner}\\s*\\.\\s*${method}\\s*\\(`, 'g')
}))

function normalizePath(path) {
  return path.split(sep).join('/')
}

function physicalLineCount(source) {
  if (source.length === 0) return 0
  const newlines = source.match(/\n/g)?.length ?? 0
  return newlines + (source.endsWith('\n') ? 0 : 1)
}

function lineAt(source, offset) {
  let line = 1
  for (let index = 0; index < offset; index += 1) {
    if (source[index] === '\n') line += 1
  }
  return line
}

function stripComments(source) {
  const chars = [...source]
  let state = 'code'

  for (let index = 0; index < chars.length; index += 1) {
    const char = chars[index]
    const next = chars[index + 1]

    if (state === 'line-comment') {
      if (char === '\n') state = 'code'
      else chars[index] = ' '
      continue
    }

    if (state === 'block-comment') {
      if (char === '*' && next === '/') {
        chars[index] = ' '
        chars[index + 1] = ' '
        index += 1
        state = 'code'
      } else if (char !== '\n') {
        chars[index] = ' '
      }
      continue
    }

    if (state === 'html-comment') {
      if (source.startsWith('-->', index)) {
        chars[index] = ' '
        chars[index + 1] = ' '
        chars[index + 2] = ' '
        index += 2
        state = 'code'
      } else if (char !== '\n') {
        chars[index] = ' '
      }
      continue
    }

    if (state === 'single' || state === 'double' || state === 'template') {
      const delimiter = state === 'single' ? "'" : state === 'double' ? '"' : '`'
      if (char === '\\') {
        index += 1
      } else if (char === delimiter) {
        state = 'code'
      }
      continue
    }

    if (source.startsWith('<!--', index)) {
      chars[index] = ' '
      chars[index + 1] = ' '
      chars[index + 2] = ' '
      chars[index + 3] = ' '
      index += 3
      state = 'html-comment'
    } else if (char === '/' && next === '/') {
      chars[index] = ' '
      chars[index + 1] = ' '
      index += 1
      state = 'line-comment'
    } else if (char === '/' && next === '*') {
      chars[index] = ' '
      chars[index + 1] = ' '
      index += 1
      state = 'block-comment'
    } else if (char === "'") {
      state = 'single'
    } else if (char === '"') {
      state = 'double'
    } else if (char === '`') {
      state = 'template'
    }
  }

  return chars.join('')
}

function findPattern(source, pattern) {
  const offsets = []
  pattern.lastIndex = 0
  for (let match = pattern.exec(source); match; match = pattern.exec(source)) {
    offsets.push(match.index)
  }
  return offsets
}

function findJsDisplay(source, baseOffset = 0) {
  const offsets = []
  let state = 'code'

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    if (state === 'single' || state === 'double' || state === 'template') {
      const delimiter = state === 'single' ? "'" : state === 'double' ? '"' : '`'
      if (source.startsWith(DISPLAY_NAME, index)) offsets.push(baseOffset + index)
      if (char === '\\') index += 1
      else if (char === delimiter) state = 'code'
    } else if (char === "'") {
      state = 'single'
    } else if (char === '"') {
      state = 'double'
    } else if (char === '`') {
      state = 'template'
    }
  }

  return offsets
}

function findHtmlDisplay(source) {
  const offsets = []
  let index = 0
  let scriptMode = false

  while (index < source.length) {
    if (scriptMode) {
      const close = source.toLowerCase().indexOf('</script', index)
      const end = close === -1 ? source.length : close
      offsets.push(...findJsDisplay(source.slice(index, end), index))
      index = end
      scriptMode = false
      continue
    }

    if (source[index] !== '<') {
      if (source.startsWith(DISPLAY_NAME, index)) offsets.push(index)
      index += 1
      continue
    }

    const start = index
    let quote = null
    index += 1
    for (; index < source.length; index += 1) {
      const char = source[index]
      if (quote) {
        if (source.startsWith(DISPLAY_NAME, index)) offsets.push(index)
        if (char === '\\') index += 1
        else if (char === quote) quote = null
      } else if (char === "'" || char === '"') {
        quote = char
      } else if (char === '>') {
        break
      }
    }
    const tag = source.slice(start, Math.min(index + 1, source.length))
    if (/^<script(?:\s|>)/i.test(tag)) scriptMode = true
    index += 1
  }

  return offsets
}

function allowedDisplayLines(source) {
  const allowed = new Set()
  const marker = 'lint-allow: display-name'
  let state = 'code'
  let line = 1

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    const next = source[index + 1]

    if (char === '\n') {
      line += 1
      if (state === 'line-comment') state = 'code'
      continue
    }

    if (state === 'line-comment') {
      if (source.startsWith(marker, index)) allowed.add(line)
      continue
    }

    if (state === 'block-comment') {
      if (source.startsWith(marker, index)) allowed.add(line)
      if (char === '*' && next === '/') {
        index += 1
        state = 'code'
      }
      continue
    }

    if (state === 'html-comment') {
      if (source.startsWith(marker, index)) allowed.add(line)
      if (source.startsWith('-->', index)) {
        index += 2
        state = 'code'
      }
      continue
    }

    if (state === 'single' || state === 'double' || state === 'template') {
      const delimiter = state === 'single' ? "'" : state === 'double' ? '"' : '`'
      if (char === '\\') index += 1
      else if (char === delimiter) state = 'code'
      continue
    }

    if (source.startsWith('<!--', index)) {
      index += 3
      state = 'html-comment'
    } else if (char === '/' && next === '/') {
      index += 1
      state = 'line-comment'
    } else if (char === '/' && next === '*') {
      index += 1
      state = 'block-comment'
    } else if (char === "'") {
      state = 'single'
    } else if (char === '"') {
      state = 'double'
    } else if (char === '`') {
      state = 'template'
    }
  }
  return allowed
}

function violation(rule, path, line, message) {
  return { rule, path, line, message }
}

function lintFile(file) {
  const path = normalizePath(file.path)
  const extension = extname(path)
  if (!SOURCE_EXTENSIONS.has(extension)) return []

  const findings = []
  const source = file.source
  const sanitized = stripComments(source)
  const addPatternFindings = (rule, pattern, message) => {
    for (const offset of findPattern(sanitized, pattern)) {
      findings.push(violation(rule, path, lineAt(sanitized, offset), message))
    }
  }

  if (CODE_EXTENSIONS.has(extension)) {
    const lines = physicalLineCount(source)
    if (lines > 500) {
      findings.push(violation(RULES.lines, path, 501, `${lines} physical lines`))
    }
  }

  if (!path.startsWith('src/materials/')) {
    addPatternFindings(RULES.material, MATERIAL_PATTERN, 'direct mesh material construction')
  }

  const lightFactory = path === 'src/world/atmosphere.js' || path.startsWith('src/world/atmo/')
  if (!lightFactory) {
    addPatternFindings(RULES.light, LIGHT_PATTERN, 'direct light construction')
  }

  for (const direct of DIRECT_CALL_PATTERNS) {
    addPatternFindings(RULES.deterministic, direct.pattern, `${direct.label} direct call`)
  }

  const displayOffsets = extension === '.html'
    ? findHtmlDisplay(sanitized)
    : findJsDisplay(sanitized)
  const allowedLines = allowedDisplayLines(source)
  for (const offset of displayOffsets) {
    const line = lineAt(sanitized, offset)
    if (!allowedLines.has(line)) {
      findings.push(violation(RULES.display, path, line, 'legacy display name literal'))
    }
  }

  return findings
}

function lintFiles(files) {
  return files.flatMap(lintFile)
}

function printFindings(findings) {
  for (const finding of findings) {
    console.error(`${finding.rule} ${finding.path}:${finding.line} ${finding.message}`)
  }
}

function walk(directory) {
  const paths = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) paths.push(...walk(path))
    else if (entry.isFile() && SOURCE_EXTENSIONS.has(extname(entry.name))) paths.push(path)
  }
  return paths
}

function allFiles() {
  const paths = [...walk(join(ROOT, 'src')), ...walk(join(ROOT, 'tools')), join(ROOT, 'index.html')]
  return paths.map(path => ({
    path: normalizePath(relative(ROOT, path)),
    source: readFileSync(path, 'utf8')
  }))
}

function stagedFiles() {
  const output = execFileSync(
    'git',
    ['diff', '--cached', '--name-only', '--diff-filter=ACM', '--no-renames'],
    { cwd: ROOT, encoding: 'utf8' }
  )
  const paths = output.split('\n').filter(Boolean).filter(path => {
    const normalized = normalizePath(path)
    const inScope = normalized === 'index.html' ||
      normalized.startsWith('src/') || normalized.startsWith('tools/')
    return inScope && SOURCE_EXTENSIONS.has(extname(normalized))
  })

  return paths.map(path => ({
    path: normalizePath(path),
    source: execFileSync('git', ['show', `:${path}`], { cwd: ROOT, encoding: 'utf8' })
  }))
}

function runSelfTest() {
  const directMaterial = ['new THREE', 'MeshStandardMaterial()'].join('.')
  const directLight = ['new THREE', 'PointLight()'].join('.')
  const directCalls = DIRECT_CALL_PATTERNS
    .map(({ label }) => `${label}()`)
    .join('\n')
  const cases = [
    {
      name: 'material',
      expected: RULES.material,
      files: [{ path: 'src/world/material-fixture.js', source: directMaterial }]
    },
    {
      name: 'light',
      expected: RULES.light,
      files: [{ path: 'src/world/light-fixture.js', source: directLight }]
    },
    {
      name: 'random-clock',
      expected: RULES.deterministic,
      files: [{ path: 'tools/time-fixture.mjs', source: directCalls }]
    },
    {
      name: 'line-count',
      expected: RULES.lines,
      files: [{
        path: 'tools/long-fixture.mjs',
        source: Array.from({ length: 501 }, (_, index) => `export const n${index} = ${index}`).join('\n')
      }]
    },
    {
      name: 'display-name-index',
      expected: RULES.display,
      files: [{ path: 'index.html', source: `<main>${DISPLAY_NAME}</main>` }]
    }
  ]

  let failed = false
  for (const fixture of cases) {
    const findings = lintFiles(fixture.files)
    const simulatedExit = findings.length === 0 ? 0 : 1
    printFindings(findings)
    const valid = simulatedExit === 1 && findings.some(item =>
      item.rule === fixture.expected && item.path && item.line > 0
    )
    console.log(`SELF-TEST ${valid ? 'PASS' : 'FAIL'} ${fixture.name} exit ${simulatedExit}`)
    if (!valid) failed = true
  }

  const allowedDisplay = `const hotel = '${DISPLAY_NAME}' // lint-allow: display-name`
  const commentOnly = `// ${directMaterial}\n/* ${directLight}\n${directCalls} */`
  const clean = lintFiles([
    { path: 'src/materials/allowed.js', source: directMaterial },
    { path: 'src/world/atmosphere.js', source: directLight },
    { path: 'src/world/atmo/allowed.js', source: directLight },
    { path: 'src/ui/allowed.js', source: allowedDisplay },
    { path: 'tools/comments.mjs', source: commentOnly },
    { path: 'tools/short.mjs', source: Array(500).fill('export {}').join('\n') }
  ])
  const cleanExit = clean.length === 0 ? 0 : 1
  printFindings(clean)
  console.log(`SELF-TEST ${cleanExit === 0 ? 'PASS' : 'FAIL'} clean exit ${cleanExit}`)
  if (cleanExit !== 0) failed = true

  const stringBypass = lintFiles([{
    path: 'src/ui/not-allowed.js',
    source: `const marker = 'lint-allow: display-name'; const hotel = '${DISPLAY_NAME}'`
  }])
  const bypassBlocked = stringBypass.some(item => item.rule === RULES.display)
  console.log(`SELF-TEST ${bypassBlocked ? 'PASS' : 'FAIL'} display-allow-comment-only exit ${bypassBlocked ? 1 : 0}`)
  if (!bypassBlocked) failed = true

  if (failed) process.exitCode = 1
}

function run(files) {
  const findings = lintFiles(files)
  if (findings.length > 0) {
    printFindings(findings)
    console.error(`contract-lint FAIL (${findings.length} violations)`)
    process.exitCode = 1
  } else {
    console.log(`contract-lint PASS (${files.length} files)`)
  }
}

const args = process.argv.slice(2)
if (args.length === 0) run(allFiles())
else if (args.length === 1 && args[0] === '--staged') run(stagedFiles())
else if (args.length === 1 && args[0] === '--self-test') runSelfTest()
else {
  console.error('usage: node tools/lint-contract.mjs [--staged|--self-test]')
  process.exitCode = 2
}
