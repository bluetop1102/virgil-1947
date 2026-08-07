// 심문 unlocks 반영 경로 게이트 — 생산자가 아니라 **소비자까지** 본다.
//   node tools/test-unlocks.mjs
//
// 왜 이 파일이 필요한가: T-P1-04 배터리는 interrogation.js 가 evidence:granted 를 "발화하는지"만
// 확인했고 전건 통과했다. 그런데 저장소 어디에도 그 이벤트의 구독자가 없어서, 실제로는 심문으로
// 얻은 증거가 플레이어 보유 목록에 들어오지 않았다(실측: 발화 후 state.has('pressure-log') = false).
// 발신만 보는 검사는 이 계열을 원리적으로 못 잡는다.
//
// 소유 규약: 이 파일은 **발주 세션(회수·통합)** 소유다. 구현 티켓에 넘기지 않는다 — 구현자가
// 자기 판정 도구를 함께 소유하면 구현을 약화해도 같은 명령이 통과한다(독립 검토 2026-08-07).
//
// 검사 강도의 한계를 명시한다: gameplay/evidence.js 는 import.meta.glob(Vite 전용)을 써서 순수
// Node 로 적재할 수 없다. 그래서 배선은 **정적 검사**로, 중복 수집·단일 발신자는 상태층
// **런타임 검사**로 본다. 실제 브라우저 런타임 확인은 tools/playthrough.mjs(T-P1-06) 몫이다.

import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { EventBus } from '../src/core/bus.js'
import { GameState } from '../src/core/state.js'
import * as SCRIPT from '../src/narrative/script.js'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = p => readFileSync(join(ROOT, p), 'utf8')

let pass = 0
const fails = []
const ok = (c, m) => { if (c) pass++; else fails.push(m) }

const CONSUMER = 'src/gameplay/evidence.js'
const consumer = read(CONSUMER)

// ── U1. evidence:granted 에 구독자가 있다 ──────────────────────────────────
// E5 [구현]·ARCH §5 v2.3: gameplay/evidence.js 가 구독해 수집을 확정한다.
const SUB = /\.\s*on\s*\(\s*['"`]evidence:granted['"`]/
ok(SUB.test(consumer), `U1 ${CONSUMER} 가 evidence:granted 를 구독한다 (E5 [구현] unlocks 반영 경로)`)

// ── U2. 구독 핸들러가 실제로 수집을 확정한다 ───────────────────────────────
// 이름만 구독하고 아무것도 안 하는 우회를 막는다 — 핸들러가 grant( 를 호출해야 한다.
{
  const at = consumer.search(SUB)
  const body = at >= 0 ? consumer.slice(at, at + 400) : ''
  ok(/grant\s*\(/.test(body), 'U2 evidence:granted 핸들러가 grant() 로 수집을 확정한다')
}

// ── U3. 수집 발신자는 gameplay 하나다 (ARCH §5 evidence:collected 단일 발신자) ──
{
  const emitters = []
  for (const p of ['src/core/state.js', CONSUMER, 'src/narrative/interrogation.js']) {
    if (/\.\s*emit\s*\(\s*['"`]evidence:collected['"`]/.test(read(p))) emitters.push(p)
  }
  ok(emitters.length === 1, `U3 evidence:collected 발신 지점 1곳 (실제 ${emitters.length}: ${emitters.join(', ')})`)
}

// ── U4. 상태층이 중복 수집을 막는다 ────────────────────────────────────────
{
  const bus = new EventBus()
  const state = new GameState(bus)
  const seen = []
  bus.on('evidence:collected', p => seen.push(p.id))
  const def = { id: 'pressure-log', kind: 'doc' }
  ok(state.addEvidence(def) === true, 'U4a 최초 수집은 성립한다')
  ok(state.addEvidence(def) === false, 'U4b 같은 증거의 재수집은 거절된다')
  ok(seen.filter(id => id === 'pressure-log').length === 1, 'U4c evidence:collected 는 정확히 1회')
  ok(state.has('pressure-log'), 'U4d 수집 후 보유 성립')
}

// ── U5. 심문이 지급·출현시키는 전 증거가 레지스트리에 실재한다 ─────────────
// 구 배터리(8855ada)에서 사라진 교차 검증의 복원분 — script 쪽 grants/spawns 참조 무결성.
// factcheck S0 는 case-graph.json 내부만 보므로 이 경계는 그쪽이 덮지 않는다.
{
  const missing = []
  for (const [npc, d] of Object.entries(SCRIPT.INTERROGATIONS)) {
    for (const s of d.statements ?? []) {
      const branches = [s.onTruth, s.onDoubt, s.onLieCorrect, s.onLieWrong,
        ...Object.values(s.lieVariants ?? {}), ...Object.values(s.wrongVariants ?? {})]
      for (const b of branches) {
        for (const g of b?.grants ?? []) if (!SCRIPT.EVIDENCE[g]) missing.push(`${npc}.${s.id} grants ${g}`)
        for (const g of b?.spawns ?? []) if (!SCRIPT.EVIDENCE[g]) missing.push(`${npc}.${s.id} spawns ${g}`)
      }
      for (const e of s.evidence ?? []) if (!SCRIPT.EVIDENCE[e]) missing.push(`${npc}.${s.id} evidence ${e}`)
      for (const k of Object.keys(s.lieVariants ?? {})) {
        if (!(s.evidence ?? []).includes(k)) missing.push(`${npc}.${s.id} lieVariants ${k} 가 정답 증거가 아니다`)
      }
      for (const k of Object.keys(s.wrongVariants ?? {})) {
        if ((s.evidence ?? []).includes(k)) missing.push(`${npc}.${s.id} wrongVariants ${k} 가 정답 증거다`)
      }
    }
  }
  ok(missing.length === 0, `U5 script grants/spawns/variant 참조 전건 정합 — 위반 ${missing.join(' · ')}`)
}

// ── U6. QA 하네스가 관찰형 증거를 획득할 수 있다 ───────────────────────────
// evidence._onInteract 는 mode==='observe' 를 명시적으로 거절하고("관찰형은 집히지 않는다"),
// 실제 획득은 매 프레임 onFocus → gaze 누적으로만 일어난다. QA 모드는 player 의 조준
// 레이캐스트를 돌리지 않으므로, qa.interact 만으로는 observe 증거 7종(keyrack·flask·
// footprints·sink-trap·hatch-lock·wrench·shoes = 전 증거 14종의 절반)이 원리적으로
// 도달 불가다. 완주 봇이 "증거 4종 획득"을 만족할 수 없다(T-P1-06 §10.1 반환).
{
  const player = read('src/gameplay/player.js')
  const at = player.indexOf('qa: {')
  const surface = at >= 0 ? player.slice(at, at + 700) : ''
  const hasObserveEntry = /\bobserve\s*:/.test(surface) ||
    /_qaObserve|onFocus|gaze/.test(player.slice(player.indexOf('_qaInteract'), player.indexOf('_qaInteract') + 700))
  ok(hasObserveEntry,
    'U6 qa 하네스에 관찰형 증거 획득 경로가 있다 — qa.observe(id) 진입점이거나 _qaInteract 가 onFocus/gaze 를 구동한다')
}

console.log(`unlocks 반영 경로: ${pass} passed, ${fails.length} failed`)
for (const f of fails) console.log(`  FAIL  ${f}`)
process.exit(fails.length ? 1 : 0)
