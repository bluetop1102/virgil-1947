#!/usr/bin/env node
// 티켓 → 자기완결 발사문(패킷) 생성기.
//
//   node tools/packet-gen.mjs T-P1-01      → packets/PACKET-T-P1-01.md
//   node tools/packet-gen.mjs --all        → 전 티켓
//
// 계약: 패킷을 받은 에이전트는 **패킷 밖 문서를 열지 않고** 질문 0으로 완성할 수 있어야 한다.
// 그래서 consumes 가 가리키는 절의 원문, inputs 의 case-graph 노드, 이벤트 행, 샷 정의,
// 공통 규약(안전·하네스·반환 형식)을 전부 인라인한다. 질문이 나오면 에이전트가 아니라
// 이 생성기(또는 매니페스트)를 고친다.

import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const MANIFEST_DIR = join(ROOT, 'data/manifest')
const OUT_DIR = join(ROOT, 'packets')

// 페이즈별 goal 계약 상한 — 발사문 2종(PROMPT-build-p0/p1)의 중단 조건을 티켓 수로 나눈 몫.
const BUDGET = {
  P0: { tickets: 5, rounds: 10, tokens: 5_000_000, src: 'PROMPT-build-p0.md' },
  P1: { tickets: 10, rounds: 14, tokens: 15_000_000, src: 'PROMPT-build-p1.md' }
}

// 모든 패킷에 붙는 공통 절 — consumes 에 이미 있으면 중복 인라인하지 않는다.
const COMMON = [
  ['AGENTS.md', '안전 규칙'],
  ['AGENTS.md', '명령'],
  ['AGENTS.md', '샷 하네스 규약 (병렬 작업 중 필수)'],
  ['docs/ARCHITECTURE.md', '10. 결정론'],
  ['docs/ARCHITECTURE.md', '11. 코드 스타일'],
  ['docs/design/E9-gates.md', '3. goal 계약 형식 (전 구현 Phase 공통 — 중단 조건 없는 goal 루프 금지)'],
  ['docs/HANDOFF.md', '형식']
]

// ─────────────────────────── 문서 절 추출 ───────────────────────────

// 본문과 함께 **상위 제목 사슬**을 돌려준다. 감사(--audit)가 "E10 §2 를 인라인했는가"를
// 판정하려면 그 하위 절만 실린 경우도 해결로 쳐야 하기 때문이다.
function section (relPath, heading) {
  const abs = join(ROOT, relPath)
  if (!existsSync(abs)) return null
  const lines = readFileSync(abs, 'utf8').split('\n')
  const stack = []
  let fence = false, start = -1, level = 0, chain = []
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*```/.test(lines[i])) { fence = !fence; continue }
    if (fence) continue
    const m = /^(#{1,6})\s+(.*?)\s*$/.exec(lines[i])
    if (!m) continue
    const lv = m[1].length
    if (start < 0) {
      while (stack.length && stack[stack.length - 1].lv >= lv) stack.pop()
      if (m[2] === heading) {
        start = i + 1; level = lv
        chain = stack.map(s => s.text)
      } else stack.push({ lv, text: m[2] })
    } else if (lv <= level) {
      return { body: lines.slice(start, i).join('\n').trim(), chain }
    }
  }
  return start < 0 ? null : { body: lines.slice(start).join('\n').trim(), chain }
}

const sectionBody = (relPath, heading) => section(relPath, heading)?.body ?? null

// 인라인 인용은 원문 제목 줄을 버리고 본문만 넣는다 — 패킷 자체의 제목 층위와 섞이면 안 된다.
function quote (relPath, heading) {
  const s = section(relPath, heading)
  if (s === null) {
    return `> **인용 실패** — \`${relPath}\` 에서 "${heading}" 절을 찾지 못했다.\n> 이 패킷은 불완전하다. 생성기를 고치기 전에 사용하지 마라.`
  }
  const path = [heading, ...s.chain].join(' ⊂ ')
  return `<!-- 원문: ${relPath} § ${path} -->\n${s.body}`
}

// ─────────────────────────── 데이터 인라인 ───────────────────────────

const graph = JSON.parse(readFileSync(join(ROOT, 'docs/design/case-graph.json'), 'utf8'))

function graphNode (id) {
  for (const [group, v] of Object.entries(graph)) {
    if (!Array.isArray(v)) continue
    const hit = v.find(e => e && typeof e === 'object' && e.id === id)
    if (hit) return { group, node: hit }
  }
  return null
}

function eventRow (name) {
  const body = sectionBody('docs/ARCHITECTURE.md', '5. 이벤트 버스 계약')
  if (!body) return null
  for (const line of body.split('\n')) {
    if (!line.trimStart().startsWith('|')) continue
    const first = line.split('|')[1] ?? ''
    if (new RegExp('`' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '`').test(first)) return line.trim()
  }
  return null
}

const shotSrc = readFileSync(join(ROOT, 'src/core/shotlist.js'), 'utf8')
function shotDef (name) {
  const m = new RegExp(`^\\s*'${name}':.*$`, 'm').exec(shotSrc)
  return m ? m[0].trim() : null
}

// ─────────────────────────── 좌표 해소 ───────────────────────────
// 인용한 원문이 또 다른 절을 가리키면 읽는 사람은 결국 문서를 열게 된다. 그 지점을 찾아
// 생성기가 스스로 닫는다 — 자기완결은 선언이 아니라 이 닫힘의 결과다.

const DOC_OF = {
  ARCH: 'docs/ARCHITECTURE.md', ARCHITECTURE: 'docs/ARCHITECTURE.md',
  STORY: 'docs/STORY.md', 'MASTER-PLAN': 'docs/MASTER-PLAN.md',
  'AAA-RUBRIC': 'docs/AAA-RUBRIC.md', 'AGENTS.md': 'AGENTS.md', RESUME: 'docs/RESUME.md'
}
const COORD = /\b(E\d{1,2}|ARCHITECTURE|ARCH|STORY|MASTER-PLAN|AAA-RUBRIC|AGENTS\.md|RESUME)(?:\s+v2)?\s*§\s*([^\s,.)\]·|—]+)/g

// E<n> 토큰 → 실파일. 디렉터리를 읽어 맞춘다(접미사를 하드코딩하지 않는다).
const E_DOC = new Map()
for (const f of readdirSync(join(ROOT, 'docs/design'))) {
  const m = /^E(\d{1,2})-.*\.md$/.exec(f)
  if (m) E_DOC.set(Number(m[1]), `docs/design/${f}`)
}

const headCache = new Map()
function headingsOf (relPath) {
  if (headCache.has(relPath)) return headCache.get(relPath)
  const abs = join(ROOT, relPath)
  const list = []
  if (existsSync(abs)) {
    let fence = false
    for (const line of readFileSync(abs, 'utf8').split('\n')) {
      if (/^\s*```/.test(line)) { fence = !fence; continue }
      if (fence) continue
      const m = /^#{1,6}\s+(.*?)\s*$/.exec(line)
      if (m) list.push(m[1])
    }
  }
  headCache.set(relPath, list)
  return list
}

// "§6.5" → "6.5 조명 계약 (…)". 번호 좌표만 해소한다 — "§첫 30초" 같은 서술형은 사람 몫이다.
function resolveHeading (doc, sec) {
  const heads = headingsOf(doc)
  if (/^\d/.test(sec)) {
    const re = new RegExp('^' + sec.replace(/\./g, '\\.') + '\\.?\\s')
    return heads.find(h => re.test(h)) ?? null
  }
  // 서술형 좌표(§첫 30초 · §기계 게이트). 제목 자체 또는 번호를 뗀 제목이 그 말로 시작하면 그 절이다.
  return heads.find(h => h.startsWith(sec) || h.replace(/^\d+(\.\d+)*\.?\s*/, '').startsWith(sec)) ?? null
}

function coordsIn (md) {
  const inlined = new Map()
  for (const m of md.matchAll(/<!-- 원문: (.+?) § (.+?) -->/g)) {
    if (!inlined.has(m[1])) inlined.set(m[1], [])
    inlined.get(m[1]).push(...m[2].split(' ⊂ '))   // 인라인된 절 + 그 상위 절 전부가 해결로 친다
  }
  const out = new Map()
  for (const m of md.matchAll(COORD)) {
    const tok = m[1]
    // "§6/§6.5" → 6 · "§1의"·"§2가" 조사 · "§4**" 볼드 기호를 떼어낸 뒤 비교한다.
    let sec = m[2].split('/')[0].replace(/[*_`]/g, '').replace(/[.·]+$/, '')
    if (/^\d/.test(sec)) sec = /^[0-9]+(?:\.[0-9]+)*/.exec(sec)[0]
    if (!sec) continue
    const doc = /^E\d/.test(tok) ? E_DOC.get(Number(tok.slice(1))) : DOC_OF[tok]
    if (!doc) continue
    const heads = inlined.get(doc) ?? []
    if (heads.some(h => h.startsWith(sec) || h.replace(/^\d+(\.\d+)?\.?\s*/, '').startsWith(sec))) continue
    const key = `${tok} §${sec}`
    if (!out.has(key)) out.set(key, { tok, sec, doc, label: key, n: 0 })
    out.get(key).n++
  }
  return [...out.values()]
}

// ─────────────────────────── 패킷 조립 ───────────────────────────

function packet (t, byId) {
  const phase = t.id.slice(2, 4)
  const b = BUDGET[phase]
  const perTicket = Math.round(b.tokens / b.tickets / 10_000) * 10_000
  const perRounds = Math.max(1, Math.floor(b.rounds / b.tickets))
  const seen = new Set()
  const L = []
  const w = (...xs) => L.push(...xs)

  w(`# 패킷 ${t.id} — ${t.title}`, '')
  w('> 이 문서 하나로 완결된다. **패킷 밖 문서를 열지 마라** — 필요한 계약 원문·데이터·규약은',
    '> 전부 아래에 인라인돼 있다. 그래도 질문이 생기면 그건 이 패킷의 결함이니,',
    '> 추측해서 진행하지 말고 §10 반환 형식의 `CONTRACT_CHANGE_REQUEST` 로 되돌려라.',
    `> 자동 생성물 — 손으로 고치지 않는다. 원천: \`data/manifest/${t.id}.json\` · 생성기: \`tools/packet-gen.mjs\``, '')

  // 1. goal 계약
  w('## 1. goal 계약', '')
  w('```')
  w(`/goal ${t.title} — ${t.id}`)
  w(`통과 조건: §8 수용 기준 ${t.acceptance.length}건 중 실행 가능한 전건 통과 · 콘솔 에러·경고 0 · §9 금지 사항 위반 0`)
  w('           (§8 이 "도구 부재 시 건너뛴다"고 명시한 항목은 실행 불가로 보고 통과 계수에서 뺀다)')
  w(`중단 조건: 라운드 상한 ${perRounds}회 · 서브에이전트 토큰 상한 ${(perTicket / 10000).toLocaleString('ko-KR')}만`)
  w(`           (${b.src} 의 ${phase} 전체 상한 ${b.rounds}회·${b.tokens / 10000}만을 티켓 ${b.tickets}장으로 나눈 몫)`)
  w('           상한 도달 시 라운드 경계에서 끊고 §10 형식으로 인수인계한다. 중단 조건 없는 루프 금지.')
  w('```', '')
  w(`- **타입**: ${t.type} · **배정 모델**: ${t.model} · **상태**: ${t.status}`)
  w('- **라운드 규율**: 단일 담당 · 단일 목표 · 사전 기준선 → 사후 기계 게이트 · 라운드 단위 커밋.')
  w('  회귀면 롤백한다. 판 갱신은 개선일 때만.', '')

  // 2. 소유 파일
  w('## 2. 소유 파일 (배타)', '')
  w('이 목록 밖의 파일은 **읽기만** 한다. 남의 파일을 고쳐야 하면 §10.1 형식으로 반환한다 —',
    '"그 담당이 지금 안 보인다"는 안전 신호가 아니다.', '')
  for (const o of t.owner_files) {
    const scope = o.scope === 'file' ? '파일 전체' : `**구역 한정** — ${o.section} (이 구역 밖은 남의 것이다)`
    w(`- \`${o.path}\` — ${scope}${o.state === 'new' ? ' · 신설' : ''}`)
  }
  w('')

  // 3. 선행 의존
  w('## 3. 선행 의존', '')
  if (t.depends.length === 0) w('없다. 다른 티켓의 산출을 기다리지 않는다.', '')
  else {
    w('아래 티켓의 산출이 이미 트리에 있다고 전제한다. 없으면 착수하지 말고 반환하라.', '')
    for (const d of t.depends) {
      const dep = byId.get(d)
      w(`- \`${d}\` — ${dep ? dep.title : '(매니페스트에 없음)'}${dep ? ` · 상태 ${dep.status}` : ''}`)
    }
    w('')
  }

  // 4. 소비 계약 원문
  w('## 4. 소비 계약 — 원문 인라인', '')
  t.consumes.forEach((cns, i) => {
    seen.add(`${cns.doc} ${cns.heading}`)
    w(`### 4.${i + 1} ${cns.label}`, '')
    if (cns.why) w(`*왜 읽는가: ${cns.why}*`, '')
    w(quote(cns.doc, cns.heading, cns.label), '')
  })

  // 5. 입력 데이터
  w('## 5. 입력 데이터', '')
  if (t.inputs.length === 0) w('데이터 입력 없음.', '')
  else {
    const cg = t.inputs.filter(r => r.startsWith('cg:'))
    const docs = t.inputs.filter(r => r.startsWith('doc:'))
    if (cg.length) {
      w('### 5.1 case-graph 노드 (`docs/design/case-graph.json` 발췌 — 이 값이 정본이다)', '')
      w('```json')
      for (const ref of cg) {
        const hit = graphNode(ref.slice(3))
        w(hit ? `// ${hit.group}\n${JSON.stringify(hit.node, null, 2)}` : `// 미해결: ${ref}`)
      }
      w('```', '')
      w('그래프가 틀렸다고 판단되면 고치지 말고 §10.1 로 반환한다 — case-graph 는 E3 소유다.', '')
    }
    docs.forEach((ref, i) => {
      const rest = ref.slice(4)
      const k = rest.indexOf('§')
      const doc = rest.slice(0, k), heading = rest.slice(k + 1)
      if (seen.has(`${doc} ${heading}`)) return
      seen.add(`${doc} ${heading}`)
      w(`### 5.${cg.length ? 2 : 1}.${i + 1} ${doc} § ${heading}`, '')
      w(quote(doc, heading), '')
    })
  }

  // 6. 이벤트
  w('## 6. 이벤트 계약', '')
  const evs = [...new Set([...t.events.emit, ...t.events.listen])]
  if (evs.length === 0) {
    w('이 티켓은 버스를 발화하지도 구독하지도 않는다. 새 이벤트 이름을 만들지 마라 —',
      '필요하면 §10.1 로 반환한다.', '')
  } else {
    w(`- **발화(emit)**: ${t.events.emit.length ? t.events.emit.map(e => `\`${e}\``).join(' · ') : '없음'}`)
    w(`- **구독(listen)**: ${t.events.listen.length ? t.events.listen.map(e => `\`${e}\``).join(' · ') : '없음'}`, '')
    w('ARCHITECTURE §5 표의 해당 행 (payload·발신자 정본):', '')
    w('| 이벤트 | payload | 발신 |')
    w('|---|---|---|')
    for (const e of evs) w(eventRow(e) ?? `| \`${e}\` | — | **표에 없음 — 패킷 결함** |`)
    w('')
    w('표에 없는 이벤트 이름을 새로 만들지 않는다. 발신 방향(누가 쏘는가)도 표가 정본이다.', '')
  }

  // 7. 샷
  w('## 7. 샷', '')
  if (t.shots.length === 0) {
    w('이 티켓은 샷 엔트리를 쓰지 않는다(로그·배터리로 판정). `core/shotlist.js` 를 건드리지 마라.', '')
  } else {
    for (const s of t.shots) {
      if (s.state === 'existing') {
        w(`- \`${s.name}\` — **기존 엔트리, 수정 금지. 촬영만 한다.**${s.note ? ` ${s.note}` : ''}`)
        const def = shotDef(s.name)
        if (def) w(`  \`\`\`js\n  ${def}\n  \`\`\``)
      } else {
        w(`- \`${s.name}\` — **신설**. \`core/shotlist.js\` 에 엔트리를 **추가**한다(기존 엔트리 수정 금지).${s.note ? ` ${s.note}` : ''}`)
      }
    }
    w('')
    w('촬영은 반드시 `--out shots/<자기이름>` 로 분리한다 — 기본 출력은 공유라 report.json 이 서로 덮인다.',
      '`SHOT_PORT=<고유번호>` 로 포트 충돌을 피한다. GPU 락 대기 로그는 정상이니 죽이지 말고 기다린다.', '')
  }

  // 8. 수용 기준
  w('## 8. 수용 기준 (기계 판정 — 실행 가능한 전건 통과가 완료 조건)', '')
  w('형용사로 자평하지 않는다. 아래 명령을 실제로 돌리고 출력을 결과 보고에 붙인다.', '')
  w('**판정 3분류**: 각 항목은 **통과 · 미통과 · 대기** 중 하나로 보고한다. "도구 부재 시 건너뛴다"고')
  w('적힌 항목이 실제로 도구 부재로 실행 불가였다면 그것은 **대기**다 — 통과도 면제도 아니며, 회수 세션이')
  w('통합 시점에 실행해 최종 판정한다. 대기 항목이 있어도 §1 goal 계약의 통과 조건은 충족된다.', '')
  w('**착수 전 확인**: 자기 수용 기준에 `tools/lint-contract.mjs` 가 있다면 착수 전에')
  w('`node tools/lint-contract.mjs --staged` 로 자기 수정 대상 파일이 이미 통과하는지 본다.')
  w('기존 위반이 있으면 그것은 선행 결박이므로 §10.1 로 반환하지 말고 §10.2 보고에 적어 회수 세션에 넘긴다.', '')
  if (t.owner_files.some(o => o.state === 'new')) {
    w('**신규 산출 티켓 주의**: "전체 스캔에 자기 파일 행 0건" 류 조건은 **파일을 만들지 않아도 문언상')
    w('통과한다**. 신규 소유 파일은 실재해야 완료다 — 보고에 `test -f <경로>` 출력을 함께 붙인다.', '')
  }
  t.acceptance.forEach((a, i) => {
    w(`**A${i + 1}.**`, '', '```bash', a.cmd, '```', `→ ${a.expect}`, '')
  })

  // 9. 금지 사항
  w('## 9. 금지 사항', '')
  w('### 9.1 이 티켓 고유', '')
  for (const f of t.forbidden) w(`- ${f}`)
  w('')
  w('### 9.2 전역 (프로젝트 전체 불변)', '')
  seen.add('AGENTS.md 안전 규칙')   // §11 COMMON 이 같은 절을 다시 붙이지 않게
  w(quote('AGENTS.md', '안전 규칙'), '')

  // 10. 반환 형식
  w('## 10. 반환 형식', '')
  w('### 10.1 계약 변경이 필요할 때', '')
  w('코드를 고치지 말고 `docs/HANDOFF.md` **하단에 항목을 추가**한다(남의 항목 수정·삭제 금지).',
    '그리고 자기 소유분만 진행한다. 형식:', '')
  w(quote('docs/HANDOFF.md', '형식'), '')
  w('')
  w('### 10.2 결과 보고', '')
  w('- 수용 기준 A1~A' + t.acceptance.length + ' 각각의 **실제 명령 출력**을 붙인다. 요약 서술로 대체하지 않는다.')
  w('  도구 부재로 **대기** 처리한 항목은 부재를 증명하는 출력(MODULE_NOT_FOUND 등)을 그대로 붙인다 —')
  w('  실행 자체를 생략하지 않는다. §8 의 판정 3분류를 항목마다 명시한다.')
  w('- 커밋은 자기 소유 파일만, 라운드 단위로. squash·force push 금지 — 커밋 이력 자체가 제출물이다.')
  w('- 중단했다면 무엇이 남았는지·다음 담당이 어디서 이어받는지를 적는다.', '')

  // 11. 공통 규약
  w('## 11. 공통 규약 (전 패킷 공통 — 인라인)', '')
  let n = 0
  for (const [doc, heading] of COMMON) {
    if (seen.has(`${doc} ${heading}`)) continue
    seen.add(`${doc} ${heading}`)
    n++
    w(`### 11.${n} ${doc} § ${heading}`, '')
    w(quote(doc, heading), '')
  }

  // 12. 부록 — 본문 인용문이 가리키는 절을 닫는다. 2라운드까지(부록이 또 가리키는 것까지).
  let md = L.join('\n')
  for (let round = 0; round < 8; round++) {
    const add = []
    for (const c of coordsIn(md)) {
      const h = resolveHeading(c.doc, c.sec)
      if (!h) continue
      const key = `${c.doc} ${h}`
      if (seen.has(key)) continue
      seen.add(key)
      add.push({ ...c, heading: h })
    }
    if (add.length === 0) break
    const A = []
    if (round === 0) {
      A.push('', '## 12. 부록 A — 본문이 직접 가리키는 계약 절', '',
        '§1~§11 이 가리키는 절이다. **이 티켓과 직접 관계가 있다.**', '')
    } else if (round === 1) {
      A.push('', '## 13. 부록 B — 부록 A 가 다시 가리키는 절 (참고)', '',
        '자기완결을 닫기 위한 2차 인라인이다. 대부분 이 티켓과 직접 관계가 없다 —',
        '**읽을 필요는 없고, 본문에서 좌표를 만났을 때 여기서 찾으면 된다.**', '')
    }
    for (const a of add.sort((x, y) => y.n - x.n)) {
      A.push(`### ${a.label} — ${a.heading}`, '', quote(a.doc, a.heading), '')
    }
    md += '\n' + A.join('\n')
  }
  return md.replace(/\n{3,}/g, '\n\n') + '\n'
}

// ─────────────────────────── 자기완결 감사 ───────────────────────────
// 무질문 테스트(신선한 에이전트 실투입)의 기계적 대체 측정이다. 사람이 판정하는 게이트를
// 대신하지는 못하지만, "패킷을 읽다가 밖으로 나가야 하는 지점"을 전부 열거해 준다.
// 생성기가 §12 부록으로 번호 좌표를 자동으로 닫으므로, 여기 남는 것은 대부분
// 서술형 좌표(§첫 30초 등)와 해소 대상이 아닌 문서(MASTER-PLAN 등)다.

function audit (ids) {
  let total = 0
  console.log('패킷 자기완결 감사 — 인라인되지 않은 § 좌표(= 밖으로 나가야 하는 지점)\n')
  for (const id of ids) {
    const md = readFileSync(join(OUT_DIR, `PACKET-${id}.md`), 'utf8')
    const leaks = coordsIn(md).sort((a, b) => b.n - a.n)
    total += leaks.length
    const desc = leaks.map(l => `${l.label}${l.n > 1 ? `×${l.n}` : ''}`).join(' · ')
    console.log(`  ${String(leaks.length).padStart(2)} 건  ${id}${desc ? '  — ' + desc : ''}`)
  }
  console.log(`\n총 ${total}건.`)
  return total
}

// ─────────────────────────── 실행 ───────────────────────────

const files = readdirSync(MANIFEST_DIR).filter(f => f.endsWith('.json')).sort()
const tickets = files.map(f => JSON.parse(readFileSync(join(MANIFEST_DIR, f), 'utf8')))
const byId = new Map(tickets.map(t => [t.id, t]))

const args = process.argv.slice(2)
const targets = args.includes('--all') ? tickets.map(t => t.id) : args.filter(a => !a.startsWith('--'))

if (targets.length === 0 && !args.includes('--audit')) {
  console.error('사용법: node tools/packet-gen.mjs <ticket-id> [...] | --all [--audit]')
  console.error(`티켓: ${tickets.map(t => t.id).join(' ')}`)
  process.exit(2)
}

if (args.includes('--audit') && targets.length === 0) {
  audit(tickets.map(t => t.id))
  process.exit(0)
}

mkdirSync(OUT_DIR, { recursive: true })
let bad = 0
for (const id of targets) {
  const t = byId.get(id)
  if (!t) { console.error(`알 수 없는 티켓 — ${id}`); bad++; continue }
  const md = packet(t, byId)
  const out = join(OUT_DIR, `PACKET-${id}.md`)
  writeFileSync(out, md)
  const misses = (md.match(/인용 실패/g) ?? []).length
  if (misses) bad++
  console.log(`${out.replace(ROOT + '/', '')}  ${md.split('\n').length}줄` +
    (misses ? `  ⚠ 인용 실패 ${misses}건 — 패킷 불완전` : ''))
}
process.exit(bad ? 1 : 0)
