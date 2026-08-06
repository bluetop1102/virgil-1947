#!/usr/bin/env node
// 컴포넌트 매니페스트 검증기 — data/manifest/*.json 이 계약과 어긋나는 지점을 찾는다.
//
// 발견 사항은 두 계급으로 나뉜다:
//   MANIFEST — 매니페스트 자체의 결함. 이 파일들을 고쳐서 닫는다.
//   CONTRACT — 정본(E10 티켓 보드·계약 문서)의 결함. 매니페스트는 전사일 뿐이라
//              여기서 고칠 수 없다. docs/HANDOFF.md 큐로 보낸다.
//
// exit 0 = 발견 0. exit 1 = 발견 있음.

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
// --dir <경로> 는 변이 주입 검증(검사기 자신의 회귀 테스트)용이다. 기본은 정본 디렉터리.
const dirArg = process.argv.indexOf('--dir')
const MANIFEST_DIR = dirArg > -1 ? resolve(process.argv[dirArg + 1]) : join(ROOT, 'data/manifest')
const SCHEMA_PATH = join(ROOT, 'docs/design/manifest.schema.json')
const CASE_GRAPH = join(ROOT, 'docs/design/case-graph.json')
const ARCH_DOC = join(ROOT, 'docs/ARCHITECTURE.md')
const SHOTLIST = join(ROOT, 'src/core/shotlist.js')

const findings = []
const add = (rule, cls, id, msg) => findings.push({ rule, cls, id, msg })

// ─────────────────────────── JSON Schema (부분집합) ───────────────────────────
// 외부 의존 없이 스키마를 실제로 집행한다. 지원: type·required·properties·
// additionalProperties:false·items·enum·pattern·minItems·minLength·allOf(if/then).

function validate (schema, data, path, out) {
  if (schema.type === 'object') {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) {
      return out.push(`${path}: 객체여야 한다`)
    }
    for (const k of schema.required ?? []) {
      if (!(k in data)) out.push(`${path}: 필수 필드 누락 — ${k}`)
    }
    if (schema.additionalProperties === false) {
      for (const k of Object.keys(data)) {
        if (!(k in (schema.properties ?? {}))) out.push(`${path}: 스키마에 없는 필드 — ${k}`)
      }
    }
    for (const [k, sub] of Object.entries(schema.properties ?? {})) {
      if (k in data) validate(sub, data[k], `${path}.${k}`, out)
    }
  } else if (schema.type === 'array') {
    if (!Array.isArray(data)) return out.push(`${path}: 배열이어야 한다`)
    if (schema.minItems != null && data.length < schema.minItems) {
      out.push(`${path}: 최소 ${schema.minItems}개 필요 (현재 ${data.length})`)
    }
    if (schema.items) data.forEach((v, i) => validate(schema.items, v, `${path}[${i}]`, out))
  } else if (schema.type === 'string') {
    if (typeof data !== 'string') return out.push(`${path}: 문자열이어야 한다`)
    if (schema.minLength != null && data.length < schema.minLength) {
      out.push(`${path}: 빈 문자열 금지`)
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(data)) {
      out.push(`${path}: 형식 위반 — /${schema.pattern}/ 에 맞지 않는다 (${JSON.stringify(data)})`)
    }
  }
  if ('const' in schema && data !== schema.const) {
    out.push(`${path}: 고정값 위반 — ${JSON.stringify(data)} ≠ ${JSON.stringify(schema.const)}`)
  }
  if (schema.enum && !schema.enum.includes(data)) {
    out.push(`${path}: 허용값 밖 — ${JSON.stringify(data)} ∉ [${schema.enum.join(', ')}]`)
  }
  for (const sub of schema.allOf ?? []) {
    if (sub.if) {
      const probe = []
      validate({ type: 'object', ...sub.if }, data, path, probe)
      if (probe.length === 0 && sub.then) validate({ type: 'object', ...sub.then }, data, path, out)
    } else validate(sub, data, path, out)
  }
}

// ─────────────────────────── 문서 유틸 ───────────────────────────

const docCache = new Map()
function headingsOf (relPath) {
  if (docCache.has(relPath)) return docCache.get(relPath)
  const abs = join(ROOT, relPath)
  let set = null
  if (existsSync(abs)) {
    set = new Set()
    let fence = false
    for (const line of readFileSync(abs, 'utf8').split('\n')) {
      if (/^\s*```/.test(line)) { fence = !fence; continue }
      if (fence) continue
      const m = /^#{1,6}\s+(.*?)\s*$/.exec(line)
      if (m) set.add(m[1])
    }
  }
  docCache.set(relPath, set)
  return set
}

function sectionBody (relPath, heading) {
  const abs = join(ROOT, relPath)
  if (!existsSync(abs)) return null
  const lines = readFileSync(abs, 'utf8').split('\n')
  let fence = false, start = -1, level = 0
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*```/.test(lines[i])) { fence = !fence; continue }
    if (fence) continue
    const m = /^(#{1,6})\s+(.*?)\s*$/.exec(lines[i])
    if (!m) continue
    if (start < 0) {
      if (m[2] === heading) { start = i; level = m[1].length }
    } else if (m[1].length <= level) {
      return lines.slice(start, i).join('\n').replace(/\s+$/, '')
    }
  }
  return start < 0 ? null : lines.slice(start).join('\n').replace(/\s+$/, '')
}

// ARCHITECTURE §5 표에서 이벤트 어휘를 뽑는다 — 첫 칸의 백틱 토큰만.
function eventVocabulary () {
  const body = sectionBody('docs/ARCHITECTURE.md', '5. 이벤트 버스 계약')
  if (!body) throw new Error('ARCHITECTURE.md §5 이벤트 버스 계약 절을 찾지 못했다')
  const vocab = new Set()
  for (const line of body.split('\n')) {
    if (!line.trimStart().startsWith('|')) continue
    const first = line.split('|')[1] ?? ''
    for (const m of first.matchAll(/`([a-z][a-zA-Z0-9]*(?::[a-zA-Z0-9]+)?)`/g)) vocab.add(m[1])
  }
  return vocab
}

function caseGraphIds () {
  const g = JSON.parse(readFileSync(CASE_GRAPH, 'utf8'))
  const ids = new Set()
  for (const v of Object.values(g)) {
    if (Array.isArray(v)) {
      for (const e of v) {
        if (typeof e === 'string') ids.add(e)
        else if (e && typeof e.id === 'string') ids.add(e.id)
      }
    } else if (v && typeof v === 'object') {
      for (const k of Object.keys(v)) ids.add(k)
    }
  }
  return ids
}

function shotlistNames () {
  const src = readFileSync(SHOTLIST, 'utf8')
  const names = new Set()
  for (const m of src.matchAll(/^\s{2}'([a-z0-9-]+)':/gm)) names.add(m[1])
  return names
}

// ─────────────────────────── 명령 실행 가능성 ───────────────────────────

const SYSTEM_BINS = new Set([
  'grep', 'test', 'ls', 'cat', 'git', 'sed', 'awk', 'rm', 'mkdir', 'echo', 'diff',
  'printf', 'chmod', 'cp', 'mv', 'touch', 'head', 'tail', 'wc', 'sort', 'true'
])

function commandTargets (cmd) {
  // &&·||·; 로 나뉜 각 구획의 진입점을 뽑는다.
  return cmd.split(/&&|\|\||;/).map(s => s.trim()).filter(Boolean).map(seg => {
    const argv = seg.split(/\s+/).filter(t => !/^[A-Z_][A-Z0-9_]*=/.test(t))
    if (argv.length === 0) return { kind: 'empty', raw: seg }
    if (argv[0] === 'node') return { kind: 'script', path: argv[1], raw: seg }
    if (argv[0] === 'npm' && argv[1] === 'run') return { kind: 'npm', name: argv[2], raw: seg }
    if (SYSTEM_BINS.has(argv[0])) return { kind: 'system', name: argv[0], raw: seg }
    return { kind: 'unknown', name: argv[0], raw: seg }
  })
}

// ─────────────────────────── 적재 ───────────────────────────

const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'))
const files = readdirSync(MANIFEST_DIR).filter(f => f.endsWith('.json')).sort()
const tickets = []
for (const f of files) {
  let t
  try { t = JSON.parse(readFileSync(join(MANIFEST_DIR, f), 'utf8')) }
  catch (e) { add('R0', 'MANIFEST', f, `JSON 파싱 실패 — ${e.message}`); continue }
  const errs = []
  validate(schema, t, t.id ?? f, errs)
  for (const e of errs) add('R0', 'MANIFEST', t.id ?? f, e)
  if (t.id && f !== `${t.id}.json`) add('R0', 'MANIFEST', t.id, `파일명 불일치 — ${f} ≠ ${t.id}.json`)
  tickets.push(t)
}
const byId = new Map(tickets.map(t => [t.id, t]))

// ─────────────────────────── R5 depends — 먼저(다른 규칙이 쓴다) ───────────────────────────

for (const t of tickets) {
  for (const d of t.depends) {
    if (!byId.has(d)) add('R5', 'MANIFEST', t.id, `depends 미해결 — ${d} 티켓이 매니페스트에 없다`)
  }
}

const reach = new Map()   // id → 전이적으로 도달하는 선행 티켓 집합
function reaches (id, seen = new Set()) {
  if (reach.has(id)) return reach.get(id)
  if (seen.has(id)) return new Set()          // 순환 — 아래 R5가 따로 잡는다
  seen.add(id)
  const acc = new Set()
  for (const d of byId.get(id)?.depends ?? []) {
    if (!byId.has(d)) continue
    acc.add(d)
    for (const x of reaches(d, seen)) acc.add(x)
  }
  reach.set(id, acc)
  return acc
}
for (const t of tickets) reaches(t.id)

// 위상 정렬 (Kahn) — 실패하면 순환이다.
const indeg = new Map(tickets.map(t => [t.id, 0]))
for (const t of tickets) for (const d of t.depends) if (byId.has(d)) indeg.set(t.id, indeg.get(t.id) + 1)
const queue = tickets.filter(t => indeg.get(t.id) === 0).map(t => t.id).sort()
const order = []
while (queue.length) {
  const id = queue.shift()
  order.push(id)
  for (const t of tickets) {
    if (!t.depends.includes(id)) continue
    indeg.set(t.id, indeg.get(t.id) - 1)
    if (indeg.get(t.id) === 0) { queue.push(t.id); queue.sort() }
  }
}
if (order.length !== tickets.length) {
  const stuck = tickets.filter(t => !order.includes(t.id)).map(t => t.id)
  add('R5', 'CONTRACT', stuck.join(','), `depends 순환 — 위상 정렬 불가. 미해결 티켓: ${stuck.join(' ')}`)
}

// ─────────────────────────── R1 소유 파일 배타성 ───────────────────────────

const owners = new Map()  // path → [{id, scope, section}]
for (const t of tickets) {
  for (const o of t.owner_files) {
    if (!owners.has(o.path)) owners.set(o.path, [])
    owners.get(o.path).push({ id: t.id, scope: o.scope, section: o.section })
  }
}
const shared = []
for (const [path, list] of owners) {
  if (list.length < 2) continue
  shared.push({ path, list })
  const fileOwners = list.filter(o => o.scope === 'file')
  if (fileOwners.length > 1) {
    add('R1', 'CONTRACT', fileOwners.map(o => o.id).join(','),
      `${path} 을 둘 이상의 티켓이 파일 전체로 소유한다 — 배타 소유 위반`)
  }
  const sections = list.filter(o => o.scope === 'section').map(o => o.section)
  if (new Set(sections).size !== sections.length) {
    add('R1', 'CONTRACT', list.map(o => o.id).join(','), `${path} 의 section 소유자가 같은 구역명을 쓴다 — 구역이 겹친다`)
  }
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i].id, b = list[j].id
      if (reaches(a).has(b) || reaches(b).has(a)) continue
      add('R1', 'CONTRACT', `${a},${b}`,
        `${path} 을 ${a}·${b} 가 함께 소유하는데 depends 그래프에 전순서가 없다 — 동시 편집이 가능한 구조다. 한쪽에 depends 1줄을 추가하거나 소유에서 빼야 한다`)
    }
  }
}

// ─────────────────────────── R2 consumes § 좌표 실재 ───────────────────────────

for (const t of tickets) {
  for (const cns of t.consumes) {
    const hs = headingsOf(cns.doc)
    if (hs === null) { add('R2', 'MANIFEST', t.id, `consumes 문서 없음 — ${cns.doc} (${cns.label})`); continue }
    if (!hs.has(cns.heading)) {
      add('R2', 'MANIFEST', t.id, `consumes § 좌표 실재하지 않음 — ${cns.doc} 에 제목 "${cns.heading}" 없음 (${cns.label})`)
    }
  }
}

// ─────────────────────────── R3 inputs 해결 ───────────────────────────

const cgIds = caseGraphIds()
for (const t of tickets) {
  for (const ref of t.inputs) {
    if (ref.startsWith('cg:')) {
      const id = ref.slice(3)
      if (!cgIds.has(id)) add('R3', 'MANIFEST', t.id, `inputs case-graph id 미해결 — ${id}`)
    } else {
      const rest = ref.slice(4)
      const i = rest.indexOf('§')
      const doc = rest.slice(0, i), heading = rest.slice(i + 1)
      const hs = headingsOf(doc)
      if (hs === null) add('R3', 'MANIFEST', t.id, `inputs 문서 없음 — ${doc}`)
      else if (!hs.has(heading)) add('R3', 'MANIFEST', t.id, `inputs § 좌표 실재하지 않음 — ${doc} § ${heading}`)
    }
  }
}

// ─────────────────────────── R4 이벤트 어휘 ───────────────────────────

const vocab = eventVocabulary()
for (const t of tickets) {
  for (const [dir, list] of [['emit', t.events.emit], ['listen', t.events.listen]]) {
    for (const ev of list) {
      if (!vocab.has(ev)) add('R4', 'MANIFEST', t.id, `${dir} 이벤트가 ARCH §5 어휘에 없다 — ${ev}`)
    }
  }
}

// ─────────────────────────── R6 acceptance 실행 가능성 ───────────────────────────

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
const producedBy = new Map()
for (const t of tickets) for (const o of t.owner_files) if (!producedBy.has(o.path)) producedBy.set(o.path, t.id)

const pending = []
for (const t of tickets) {
  for (const a of t.acceptance) {
    for (const tgt of commandTargets(a.cmd)) {
      if (tgt.kind === 'system') continue
      if (tgt.kind === 'npm') {
        if (!(tgt.name in (pkg.scripts ?? {}))) add('R6', 'MANIFEST', t.id, `acceptance npm 스크립트 없음 — npm run ${tgt.name}`)
        continue
      }
      if (tgt.kind === 'unknown') { add('R6', 'MANIFEST', t.id, `acceptance 진입점을 해석할 수 없다 — "${tgt.raw}"`); continue }
      if (tgt.kind === 'empty') { add('R6', 'MANIFEST', t.id, `acceptance 빈 명령 구획 — "${a.cmd}"`); continue }
      const p = tgt.path
      if (!p) { add('R6', 'MANIFEST', t.id, `acceptance node 명령에 스크립트 경로가 없다 — "${tgt.raw}"`); continue }
      const abs = join(ROOT, p)
      if (existsSync(abs) && statSync(abs).isFile()) continue
      if (producedBy.has(p)) { pending.push({ id: t.id, path: p, by: producedBy.get(p) }); continue }
      add('R6', 'MANIFEST', t.id, `acceptance 명령이 존재하지도, 어떤 티켓이 산출하지도 않는 스크립트를 부른다 — ${p}`)
    }
  }
}

// ─────────────────────────── R7 샷 엔트리 ───────────────────────────

const shots = shotlistNames()
const newShots = new Map()
for (const t of tickets) {
  for (const s of t.shots) {
    if (s.state === 'existing' && !shots.has(s.name)) {
      add('R7', 'MANIFEST', t.id, `existing 샷 엔트리가 core/shotlist.js 에 없다 — ${s.name}`)
    }
    if (s.state === 'new') {
      if (shots.has(s.name)) {
        add('R7', 'MANIFEST', t.id, `new 샷 엔트리가 이미 존재한다 — ${s.name} (기존 엔트리 수정은 금지, 추가만 허용)`)
      }
      if (newShots.has(s.name)) {
        add('R7', 'CONTRACT', `${newShots.get(s.name)},${t.id}`, `두 티켓이 같은 샷 엔트리를 신설한다 — ${s.name}`)
      } else newShots.set(s.name, t.id)
    }
  }
}

// ─────────────────────────── 보고 ───────────────────────────

const RULES = {
  R0: '스키마 정합',
  R1: '소유 파일 배타성 (교차 중복 0)',
  R2: 'consumes § 좌표 실재',
  R3: 'inputs 해결 (case-graph·문서)',
  R4: '이벤트 어휘 (ARCH §5)',
  R5: 'depends 해결·순환 0',
  R6: 'acceptance 명령 실행 가능',
  R7: '샷 엔트리 (추가만)'
}

console.log(`매니페스트 검증 — 티켓 ${tickets.length}장 (${MANIFEST_DIR.replace(ROOT + '/', '')})\n`)
for (const [rule, name] of Object.entries(RULES)) {
  const hits = findings.filter(f => f.rule === rule)
  console.log(`  ${hits.length === 0 ? 'PASS' : 'FAIL'}  ${rule} ${name}${hits.length ? ` — ${hits.length}건` : ''}`)
}

if (shared.length) {
  console.log('\n소유 파일 공유 현황 (전순서가 서면 정상):')
  for (const { path, list } of shared) {
    const desc = list.map(o => `${o.id}(${o.scope === 'file' ? '파일' : `§${o.section}`})`).join(' · ')
    const ordered = list.every((a, i) => list.every((b, j) => i === j || reaches(a.id).has(b.id) || reaches(b.id).has(a.id)))
    console.log(`  ${ordered ? '순서 있음' : '순서 없음'}  ${path} ← ${desc}`)
  }
}

if (pending.length) {
  console.log('\nacceptance 보류 (아직 없는 도구를 부른다 — 산출 티켓 완료 후 실행 가능):')
  for (const p of [...new Set(pending.map(x => `${x.id} → ${x.path} (산출: ${x.by})`))]) console.log(`  ${p}`)
}

if (order.length === tickets.length) {
  console.log(`\n위상 정렬 (순환 0):\n  ${order.join(' → ')}`)
}

if (findings.length) {
  console.log(`\n발견 ${findings.length}건:`)
  for (const f of findings) {
    console.log(`\n  [${f.cls}] ${f.rule} · ${f.id}`)
    console.log(`    ${f.msg}`)
  }
  const contract = findings.filter(f => f.cls === 'CONTRACT').length
  if (contract) {
    console.log(`\n  CONTRACT ${contract}건은 정본(E10 티켓 보드·계약 문서)의 결함이다 — 매니페스트에서 고칠 수 없다.`)
    console.log('  docs/HANDOFF.md 큐에 올리고 소유자의 수정 후 재실행한다.')
  }
} else {
  console.log('\n발견 0 — 매니페스트가 계약과 정합한다.')
}

process.exit(findings.length ? 1 : 0)
