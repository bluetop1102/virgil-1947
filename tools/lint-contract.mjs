import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, extname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runSelfTest } from './lint-contract-selftest.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const DISPLAY_NAME = String.fromCodePoint(0xc138, 0xc2e4)
// E9 §2 개정(2026-08-07 답신): 영문 표출 변형 CECIL 도 대소문자 무시로 검사한다 —
// 문자열 리터럴·HTML 텍스트 한정. 코드 식별자는 원천 비검사: 매치 전후가 영숫자·_ 면
// 식별자 토큰(CECIL_POM·__CECIL__ 등 — 셰이더 소스 리터럴 포함)으로 보고 제외한다.
// kebab 키('cecil-wear' 등)는 식별자 문맥이 아니므로 검출되며 lint-allow 로 명시 제외한다.
const DISPLAY_LATIN = ['ce', 'cil'].join('')
const IDENT_CHAR = /[A-Za-z0-9_]/
const SOURCE_EXTENSIONS = new Set(['.js', '.mjs', '.html'])
const CODE_EXTENSIONS = new Set(['.js', '.mjs'])

function matchesDisplay(source, index) {
  if (source.startsWith(DISPLAY_NAME, index)) return true
  if (source.slice(index, index + DISPLAY_LATIN.length).toLowerCase() !== DISPLAY_LATIN) return false
  const before = index > 0 ? source[index - 1] : ''
  const after = source[index + DISPLAY_LATIN.length] ?? ''
  return !(IDENT_CHAR.test(before) || IDENT_CHAR.test(after))
}

export const RULES = {
  material: 'materials-outside-factory',
  light: 'lights-outside-atmosphere',
  deterministic: 'random-clock-direct-call',
  lines: 'max-500-lines',
  display: 'display-name'
}

// E9 §2 개정(2026-08-07 #29 답신): 패턴 규칙의 lint-allow 는 **주석 단독으로 성립하지
// 않는다**. ARCH §6.5 승인 예외 절이 등재한 좌표·수량과 아래 표가 같아야 하고(2중 결박),
// 등재 밖 파일의 주석이나 파일별 등재 수 초과는 그 자체가 위반이다. 랜덤/시계 규칙은
// lint-allow 불허(결정론 계약에 예외 없음)이므로 여기에 넣지 않는다.
const PATTERN_ALLOW = {
  [RULES.light]: {
    marker: 'lint-allow: light-direct',
    registered: { 'src/world/props.js': 3, 'src/world/testbed.js': 1 }   // 폐집합 · 총 4
  },
  [RULES.material]: {
    marker: 'lint-allow: material-direct',
    registered: {}                                                       // 계약 등재 0건
  }
}

const MATERIAL_PATTERN = new RegExp(
  '\\bnew\\s+THREE\\s*\\.\\s*Mesh[$\\w]*Material\\s*\\(',
  'g'
)
const LIGHT_PATTERN = new RegExp(
  '\\bnew\\s+THREE\\s*\\.\\s*[$\\w]*Light\\s*\\(',
  'g'
)
export const DIRECT_CALL_PATTERNS = [
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
      if (matchesDisplay(source, index)) offsets.push(baseOffset + index)
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
      if (matchesDisplay(source, index)) offsets.push(index)
      index += 1
      continue
    }

    const start = index
    let quote = null
    index += 1
    for (; index < source.length; index += 1) {
      const char = source[index]
      if (quote) {
        if (matchesDisplay(source, index)) offsets.push(index)
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

function allowedDisplayLines(source, marker = 'lint-allow: display-name') {
  const allowed = new Set()
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
    const allow = PATTERN_ALLOW[rule]
    const allowedLines = allow ? allowedDisplayLines(source, allow.marker) : new Set()
    const quota = allow ? (allow.registered[path] ?? 0) : 0
    let suppressed = 0
    for (const offset of findPattern(sanitized, pattern)) {
      const line = lineAt(sanitized, offset)
      if (allowedLines.has(line) && suppressed < quota) {
        suppressed += 1
        continue
      }
      findings.push(violation(rule, path, line, message))
    }
    // 등재 밖 주석·등재 수 초과 주석은 예외가 아니라 위반이다 — 2중 결박의 계약 측.
    if (allowedLines.size > quota) {
      findings.push(violation(rule, path, Math.min(...allowedLines),
        `unregistered ${allow.marker} — 계약 등재 ${quota}건, 주석 ${allowedLines.size}건 (ARCH §6.5)`))
    }
  }

  if (CODE_EXTENSIONS.has(extension)) {
    const lines = physicalLineCount(source)
    if (lines > 500) {
      findings.push(violation(RULES.lines, path, 501, `${lines} physical lines`))
    }
  }

  // E9 §2 개정(2026-08-07 답신 (a)): 패턴 3규칙(재질·광원·랜덤/시계)은 게임 코드
  // (src/** + index.html) 한정 — 하네스(tools/**)의 계측·픽스처는 결정론 계약 밖.
  // 표출·500줄 규칙은 tools 포함 유지.
  const patternScope = path === 'index.html' || path.startsWith('src/')

  if (patternScope && !path.startsWith('src/materials/')) {
    addPatternFindings(RULES.material, MATERIAL_PATTERN, 'direct mesh material construction')
  }

  const lightFactory = path === 'src/world/atmosphere.js' || path.startsWith('src/world/atmo/')
  if (patternScope && !lightFactory) {
    addPatternFindings(RULES.light, LIGHT_PATTERN, 'direct light construction')
  }

  if (patternScope) {
    for (const direct of DIRECT_CALL_PATTERNS) {
      addPatternFindings(RULES.deterministic, direct.pattern, `${direct.label} direct call`)
    }
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

export function lintFiles(files) {
  return files.flatMap(lintFile)
}

export function printFindings(findings) {
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
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
  )
  const paths = output.split('\n').filter(Boolean).filter(path => {
    const normalized = normalizePath(path)
    const inScope = normalized === 'index.html' ||
      normalized.startsWith('src/') || normalized.startsWith('tools/')
    return inScope && SOURCE_EXTENSIONS.has(extname(normalized))
  })

  return paths.map(path => ({
    path: normalizePath(path),
    source: execFileSync('git', ['show', `:${path}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  }))
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
