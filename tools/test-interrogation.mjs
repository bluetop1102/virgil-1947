// 심문·증거판 로직 헤드리스 검증. three/WebGL 없이 순수 규칙만 돌린다.
//   node tools/test-interrogation.mjs
// 실 데이터(src/narrative/script.js) 전 인물 × 전 진술 × 3선택 × 증거 조합을 STORY.md 4절 점수표와 대조한다.
import { EventBus } from '../src/core/bus.js'
import { GameState } from '../src/core/state.js'
import { Interrogation, judge, branch, maxScore, CHOICES } from '../src/narrative/interrogation.js'
import { Deduction } from '../src/narrative/deduction.js'
import * as SCRIPT from '../src/narrative/script.js'
import { fakeCamera, fresh, pump, driveTo, walk, FLAGS } from './interrogation-harness.mjs'

const I = SCRIPT.INTERROGATIONS
let pass = 0
const fails = []
const ok = (c, m) => { if (c) pass++; else fails.push(m) }
const eq = (a, b, m) => ok(a === b, `${m} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`)

const ALL_EVIDENCE = Object.keys(SCRIPT.EVIDENCE)

// ── 1. 점수표 (STORY 4-2) ───────────────────────────────────────────
function testTable () {
  eq(judge(true, 'TRUTH').delta, 1, '진실+TRUTH = +1')
  eq(judge(true, 'TRUTH').correct, true, '진실+TRUTH는 정답')
  eq(judge(true, 'DOUBT').delta, -1, '진실+DOUBT = -1')
  eq(judge(true, 'LIE', 'register', ['register']).delta, -2, '진실+LIE = -2 (증거 무관)')
  eq(judge(true, 'LIE', 'register', ['register']).burn, true, '진실+LIE = 소각')
  eq(judge(false, 'TRUTH').delta, 0, '거짓+TRUTH = 0')
  eq(judge(false, 'TRUTH').burn, false, '거짓+TRUTH는 소각 아님')
  eq(judge(false, 'DOUBT').delta, 0.5, '거짓+DOUBT = +0.5')
  eq(judge(false, 'LIE', 'register', ['register']).delta, 2, '거짓+LIE+정답 = +2')
  eq(judge(false, 'LIE', 'register', ['register']).burn, false, '거짓+LIE+정답은 소각 아님')
  eq(judge(false, 'LIE', 'flask', ['register']).delta, -2, '거짓+LIE+오답 = -2')
  eq(judge(false, 'LIE', 'flask', ['register']).burn, true, '거짓+LIE+오답 = 소각')
  eq(judge(false, 'LIE', null, ['register']).delta, -2, '거짓+LIE+무증거 = -2')
}

// ── 2. script.js 데이터 정합성 ──────────────────────────────────────
function testData () {
  for (const [npc, d] of Object.entries(I)) {
    ok(!!SCRIPT.CHARACTERS[npc], `${npc} CHARACTERS 항목 존재`)
    for (const s of d.statements || []) {
      const tag = `${npc}.${s.id}`
      eq(s.correct === 'TRUTH', !!s.truth, `${tag} correct와 truth 일치`)
      ok(!!s.text, `${tag} 진술 대사 존재`)
      ok(!!s.onTruth && !!s.onDoubt && !!s.onLieWrong, `${tag} 3선택 분기 전부 존재`)
      if (!s.truth) {
        ok((s.evidence || []).length > 0, `${tag} 거짓 진술은 정답 증거를 가진다`)
        ok(!!s.onLieCorrect, `${tag} 거짓 진술은 onLieCorrect를 가진다`)
      }
      for (const e of s.evidence || []) ok(!!SCRIPT.EVIDENCE[e], `${tag} 정답 증거 ${e}가 EVIDENCE에 있다`)
      for (const k of Object.keys(s.lieVariants || {})) ok((s.evidence || []).indexOf(k) >= 0, `${tag} lieVariants ${k}는 정답 증거다`)
      for (const k of Object.keys(s.wrongVariants || {})) ok((s.evidence || []).indexOf(k) < 0, `${tag} wrongVariants ${k}는 정답 증거가 아니다`)
      for (const b of [s.onTruth, s.onDoubt, s.onLieCorrect, s.onLieWrong, ...Object.values(s.lieVariants || {}), ...Object.values(s.wrongVariants || {})]) {
        if (!b) continue
        for (const g of b.grants || []) ok(!!SCRIPT.EVIDENCE[g], `${tag} grants ${g}가 EVIDENCE에 있다`)
        for (const g of b.spawns || []) ok(!!SCRIPT.EVIDENCE[g], `${tag} spawns ${g}가 EVIDENCE에 있다`)
      }
      ok(!s.onLieWrong || s.onLieWrong.burn === true, `${tag} onLieWrong은 소각이다`)
    }
  }
}

// ── 3. 전 인물 × 전 진술 × 3선택 × 증거 조합 ────────────────────────
async function testMatrix () {
  let combos = 0
  for (const npc of Object.keys(I)) {
    for (const st of I[npc].statements || []) {
      const correct = st.evidence || []
      const wrongs = [...Object.keys(st.wrongVariants || {}), ...ALL_EVIDENCE.filter(e => correct.indexOf(e) < 0)]
      for (const choice of CHOICES) {
        const picks = choice === 'LIE' ? [...correct, ...[...new Set(wrongs)].slice(0, 3)] : [null]
        for (const pick of picks) {
          combos++
          const ctx = await driveTo(npc, st.id, { evidence: pick ? [pick] : [] })
          if (!ctx) { fails.push(`${npc}.${st.id} 진술에 도달 실패`); continue }
          const tag = `${npc}.${st.id} ${choice}${pick ? '+' + pick : ''}`
          const before = ctx.state.npc(npc).score
          const mark = ctx.events.length
          const want = judge(!!st.truth, choice, pick, correct)

          if (choice === 'LIE') {
            ok(ctx.m.choose('LIE'), `${tag} LIE 진입`)
            eq(ctx.m.phase, 'evidence', `${tag} 증거 선택 모드`)
            ok(ctx.m.present(pick), `${tag} 보유 증거 제시`)
          } else {
            ok(ctx.m.choose(choice), `${tag} 선택 수락`)
          }
          pump(ctx.m)

          const rec = ctx.state.npc(npc)
          eq(rec.score - before, want.delta, `${tag} 점수`)
          eq(rec.burned.indexOf(st.id) >= 0, want.burn, `${tag} 소각`)
          const v = ctx.events.filter(e => e.type === 'interrogation:verdict').pop()
          eq(v?.payload.correct, want.correct, `${tag} verdict.correct`)
          eq(v?.payload.choice, choice, `${tag} verdict.choice`)
          if (pick) {
            const p = ctx.events.filter(e => e.type === 'evidence:presented').pop()
            eq(p?.payload.id, pick, `${tag} evidence:presented`)
            eq(p?.payload.correct, want.correct, `${tag} evidence:presented.correct`)
          }

          // 분기 대사가 원문 그대로 자막으로 나간다
          const react = branch(st, want.beat, pick)
          const said = ctx.events.slice(mark).filter(e => e.type === 'subtitle').map(e => e.payload.text)
          if (react?.text) ok(said.indexOf(react.text) >= 0, `${tag} NPC 응답 원문 자막`)
          if (react?.detective) ok(said.indexOf(react.detective) >= 0, `${tag} 형사 대사 원문 자막`)
          ok(said.every(t => t !== react?.action), `${tag} 지문(action)은 자막에 쓰지 않는다`)

          // 소각이면 그 진술의 정보는 어떤 경로로도 들어오지 않는다
          if (want.burn) {
            const all = [st.onTruth, st.onDoubt, st.onLieCorrect, ...Object.values(st.lieVariants || {})]
            for (const b of all) {
              for (const g of b?.grants || []) ok(!ctx.state.has(g), `${tag} 소각 시 ${g} 미지급`)
              for (const g of b?.spawns || []) ok(!ctx.state.is(`spawn:${g}`), `${tag} 소각 시 ${g} 미출현`)
            }
          } else if (react) {
            for (const g of react.grants || []) ok(ctx.state.has(g), `${tag} ${g} 지급`)
            for (const g of react.spawns || []) ok(ctx.state.is(`spawn:${g}`), `${tag} ${g} 출현`)
            for (const f of react.flags || []) ok(ctx.state.is(f), `${tag} 플래그 ${f}`)
          }
        }
      }
    }
  }
  console.log(`  매트릭스 ${combos}조합`)
}

// ── 4. 소각 영구성 ──────────────────────────────────────────────────
async function testBurnPermanence () {
  const ctx = await driveTo('deitch', 'S2', { evidence: ['flask'] })
  ctx.m.choose('LIE'); ctx.m.present('flask'); pump(ctx.m)
  ok(ctx.state.npc('deitch').burned.indexOf('S2') >= 0, '소각 기록')
  walk(ctx)
  ok(!ctx.m.isActive() || ctx.m.phase === 'idle', '심문 종료')

  ctx.state.setAct(2)
  ctx.m.start('deitch')
  pump(ctx.m)
  const seen = walk(ctx)
  ok(seen.indexOf('S2') < 0, '재심문에서 소각된 진술은 다시 나오지 않는다')
  ok(!ctx.state.is('deitch-recanted'), '소각된 진술의 정보는 영구 소실')

  // S4 오답 소각 → 2막 재심문 불가 (STORY 5.1)
  const b = await driveTo('deitch', 'S4', { evidence: ['flask'] })
  b.m.choose('LIE'); b.m.present('flask'); pump(b.m)
  ok(b.state.npc('deitch').burned.indexOf('S4') >= 0, 'S4 오답은 소각')
  ok(b.state.npc('deitch').reopen.indexOf('S4') < 0, '소각된 S4는 재심문 개방되지 않는다')
  walk(b)
  b.state.setAct(2)
  b.state.addEvidence({ id: 'roofkey', kind: 'object', title: '옥상 열쇠' })
  b.m.start('deitch'); pump(b.m)
  ok(walk(b).indexOf('S4') < 0, '소각 후에는 2막에서도 S4가 열리지 않는다')
}

// ── 5. 증거 결박 (루브릭 N4) ────────────────────────────────────────
async function testEvidenceBinding () {
  const a = await driveTo('deitch', 'S2', { evidence: ['flask'] })
  const before = a.state.npc('deitch').score
  a.m.choose('LIE')
  eq(a.m.present('register'), false, '미획득 증거는 제시 불가')
  eq(a.m.phase, 'evidence', '미획득 제시 후에도 증거 대기 유지')
  eq(a.state.npc('deitch').score, before, '미획득 제시는 점수 변동 없음')
  ok(!a.events.some(e => e.type === 'evidence:presented' && e.payload.id === 'register'), '미획득 증거는 이벤트도 없음')
  ok(!a.state.is('deitch-recanted'), '미획득 증거로는 자백을 열 수 없다')
  eq(a.m.present('flask'), true, '보유 증거는 제시 가능')

  const b = await driveTo('deitch', 'S2')
  eq(b.m.choose('LIE'), false, '증거 0개면 LIE 선택 자체가 불가')
  eq(b.m.phase, 'choice', 'LIE 실패 후 선택 단계 유지')
  eq(b.m.getState().canLie, false, 'getState.canLie=false')
  eq(b.m.present('register'), false, '선택 단계에서는 제시 불가')

  const c = await driveTo('deitch', 'S2', { evidence: ['register'] })
  c.m.choose('LIE')
  eq(c.m.cancel(), true, '증거 선택 취소 가능')
  eq(c.m.phase, 'choice', '취소하면 선택 단계로 복귀')
}

// ── 6. 재심문 개방 (다이치 S4: keyrack → roofkey) ───────────────────
async function testReopen () {
  const r = await driveTo('deitch', 'S4', { evidence: ['keyrack'] })
  r.m.choose('LIE'); r.m.present('keyrack'); pump(r.m)
  ok(r.state.is('deitch-partial'), 'keyrack은 부분 성공')
  ok(r.state.npc('deitch').reopen.indexOf('S4') >= 0, '부분 성공은 2막 재심문 개방')
  walk(r)
  r.state.setAct(2)
  r.state.addEvidence({ id: 'roofkey', kind: 'object', title: '옥상 열쇠' })
  r.m.start('deitch'); pump(r.m)
  let guard = 0
  while (r.m.cur && r.m.cur.id !== 'S4' && guard++ < 40) { r.m.choose('TRUTH'); pump(r.m) }
  eq(r.m.cur?.id, 'S4', '재심문에서 S4 재등장')
  r.m.choose('LIE'); r.m.present('roofkey'); pump(r.m)
  ok(r.state.is('deitch-confession'), '2막 roofkey로 자백')
  ok(r.state.npc('deitch').reopen.indexOf('S4') < 0, '자백 후에는 더 열리지 않는다')
}

// ── 7. requires 게이트 ──────────────────────────────────────────────
async function testRequires () {
  const a = await fresh()
  a.m.start('ruiz'); pump(a.m)
  ok(walk(a).indexOf('S3') < 0, 'requires 미충족 진술은 등장하지 않는다')

  const b = await fresh({ evidence: ['pressure-log'] })
  b.m.start('ruiz'); pump(b.m)
  let guard = 0
  while (b.m.cur && b.m.cur.id !== 'S2' && guard++ < 40) { b.m.choose('TRUTH'); pump(b.m) }
  b.m.choose('LIE'); b.m.present('pressure-log'); pump(b.m)
  ok(b.state.is('two-voices'), 'S2 정답으로 two-voices 획득')
  ok(b.state.is('spawn:footprints'), 'footprints가 월드에 출현 예약')

  // GAMEPLAY evidence 모듈이 있으면 그쪽에 위임한다 — grant(id, source) 시그니처
  const calls = []
  const c = await fresh({ mods: { evidence: { grant: (id, src) => calls.push([id, src]) } } })
  c.m.start('deitch'); pump(c.m)
  let g2 = 0
  while (c.m.cur && c.m.cur.id !== 'S3' && g2++ < 40) { c.m.choose('TRUTH'); pump(c.m) }
  c.m.choose('TRUTH'); pump(c.m)
  eq(calls.length, 1, 'S3 정답이 evidence 모듈로 위임된다')
  eq(calls[0][0], 'pressure-log', '위임한 증거 id')
  eq(calls[0][1], 'deitch', 'source는 인물 id 문자열')
  ok(!c.state.has('pressure-log'), 'evidence 모듈이 있으면 state에 직접 쓰지 않는다')
  ok(walk(b).indexOf('S3') >= 0, '조건 충족 후 S3 등장')
}

// ── 8. 종료·이벤트·힌트 비노출 ──────────────────────────────────────
async function testEndAndUi () {
  const ctx = await fresh()
  ctx.m.start('deitch'); pump(ctx.m)
  walk(ctx)
  const end = ctx.events.filter(e => e.type === 'interrogation:end').pop()
  ok(!!end, 'interrogation:end 발신')
  eq(end.payload.npc, 'deitch', 'end.npc')
  eq(typeof end.payload.score, 'number', 'end.score 숫자')
  eq(end.payload.tier, 'partial', '거짓을 전부 흘려보내면 부분 등급')

  // 전 진술 정답 = 만점 등급
  const p = await fresh({ evidence: ALL_EVIDENCE })
  p.m.start('deitch'); pump(p.m)
  let guard = 0
  while (p.m.cur && guard++ < 40) {
    const s = p.m.cur
    if (s.correct === 'LIE') { p.m.choose('LIE'); p.m.present(s.evidence[0]) } else p.m.choose('TRUTH')
    pump(p.m)
  }
  eq(p.state.npc('deitch').score, maxScore(I.deitch), '전 진술 정답이면 만점')
  eq(p.events.filter(e => e.type === 'interrogation:end').pop().payload.tier, 'full', '만점은 full 등급')
  const st = ctx.events.filter(e => e.type === 'interrogation:statement')
  eq(st[0]?.payload.line, I.deitch.statements[0].text, 'statement 이벤트가 원문 대사를 싣는다')
  eq(st[0]?.payload.truth, true, 'statement 이벤트가 진위를 싣는다(텔 시스템용)')
  eq(maxScore(I.deitch), 3 + 4, '다이치 만점 = 진실3 + 거짓2×2')

  const s = JSON.stringify((await driveTo('deitch', 'S2', { evidence: ['flask'] })).m.getState())
  ok(!s.includes('truth'), 'getState는 진위를 노출하지 않는다')
  ok(!s.includes('register'), 'getState는 정답 증거를 노출하지 않는다')

  // 진실+DOUBT는 다음 진술을 짧게, 소각은 이후 전부 짧게 만든다 (STORY 4-2)
  const d = await driveTo('deitch', 'S1')
  d.m.choose('DOUBT'); pump(d.m)
  eq(d.m.cur?.id, 'S2', 'DOUBT 후 다음 진술로')
  const said = d.events.filter(e => e.type === 'subtitle').map(e => e.payload.text)
  ok(said.indexOf(I.deitch.statements[1].text) < 0, '방어적 상태에서 다음 진술이 축약된다')

  const b = await driveTo('deitch', 'S1', { evidence: ['flask'] })
  b.m.choose('LIE'); b.m.present('flask'); pump(b.m)
  const said2 = b.events.filter(e => e.type === 'subtitle').map(e => e.payload.text)
  ok(said2.indexOf('…근무 중에 마신 적 없습니다.') >= 0, 'flask 전용 소각 대사')
  ok(said2.indexOf(I.deitch.statements[1].text) < 0, '소각 후 진술이 한 문장으로 줄어든다')
}

// ── 9. 카메라 (루브릭 N5) ───────────────────────────────────────────
async function testCamera () {
  const cam = fakeCamera()
  const a = await driveTo('deitch', 'S1', { camera: cam })
  const z0 = cam.position.z
  const f0 = cam.fov
  a.m.choose('TRUTH')
  for (let i = 0; i < 60; i++) a.m.update(0.05, a.m.t + 0.05)
  ok(cam.position.z > z0 + 0.05, `TRUTH는 뒤로 물러난다 (z ${z0.toFixed(2)}→${cam.position.z.toFixed(2)})`)
  ok(cam.fov > f0 + 1, `TRUTH는 광각으로 (fov ${f0.toFixed(1)}→${cam.fov.toFixed(1)})`)

  const cam2 = fakeCamera()
  const b = await driveTo('deitch', 'S2', { camera: cam2, evidence: ['register'] })
  const z2 = cam2.position.z
  const fv2 = cam2.fov
  b.m.choose('LIE')
  for (let i = 0; i < 60; i++) b.m.update(0.05, b.m.t + 0.05)
  ok(cam2.position.z < z2 - 0.05, `LIE는 밀고 들어간다 (z ${z2.toFixed(2)}→${cam2.position.z.toFixed(2)})`)
  ok(cam2.fov < fv2 - 1, `LIE는 망원으로 (fov ${fv2.toFixed(1)}→${cam2.fov.toFixed(1)})`)
  const zPush = cam2.position.z
  b.m.cancel()
  for (let i = 0; i < 60; i++) b.m.update(0.05, b.m.t + 0.05)
  ok(cam2.position.z > zPush, '증거 선택을 취소하면 카메라가 진술 위치로 돌아온다')
  b.m.choose('LIE')
  for (let i = 0; i < 60; i++) b.m.update(0.05, b.m.t + 0.05)
  b.m.present('register')
  for (let i = 0; i < 90; i++) b.m.update(0.05, b.m.t + 0.05)
  ok(cam2.position.z !== zPush, '판정 후 카메라가 다시 움직인다')

  const cam3 = fakeCamera()
  const c = await driveTo('deitch', 'S3', { camera: cam3 })
  const z3 = cam3.position.z
  c.m.choose('DOUBT')
  for (let i = 0; i < 60; i++) c.m.update(0.05, c.m.t + 0.05)
  ok(Math.abs(cam3.position.x) > 0.1, 'DOUBT는 옆으로 미끄러진다')
  ok(cam3.position.z > z3 - 0.2, 'DOUBT는 밀고 들어가지 않는다')

  // QA 하네스·플레이어가 카메라를 잡으면 그 자리를 지킨다
  cam3.position.set(9, 9, 9)
  cam3.fov = 50
  for (let i = 0; i < 30; i++) c.m.update(0.05, c.m.t + 0.05)
  ok(Math.abs(cam3.position.x - 9) < 1e-6 && Math.abs(cam3.position.z - 9) < 1e-6, '외부 카메라 제어를 덮어쓰지 않는다')
  eq(cam3.fov, 50, '외부 fov도 유지한다')
}

// ── 10. 지목 모드 · 증거판 ──────────────────────────────────────────
async function testDeduction () {
  const acc = await fresh()
  acc.m.start('doyle')
  pump(acc.m)
  ok(acc.events.some(e => e.type === 'deduction:open'), '도일은 심문이 아니라 지목으로 넘어간다')
  ok(acc.events.filter(e => e.type === 'subtitle').length >= 2, '도일 도입부 대사 재생')

  const mk = async (evidence) => {
    const bus = new EventBus()
    const state = new GameState(bus)
    const engine = { bus, state, camera: null, qa: true, time: 0, get: () => undefined }
    const d = new Deduction(SCRIPT)
    await d.init(engine)
    state.setAct(3)
    for (const id of evidence) state.addEvidence({ id, kind: 'doc', title: id })
    const events = []
    bus.on('*', e => events.push(e))
    d.start()
    return { d, state, events }
  }

  eq(SCRIPT.LINKS.length, 3, '링크는 3개')
  const none = await mk([])
  eq(none.d.link('hatch-lock', 'shoes'), false, '미보유 증거는 링크 불가 (UI가 === false로 거른다)')
  eq(none.d.getBoardState().last.reason, 'not-held', '실패 사유는 보드 상태로 읽는다')
  eq(none.d.made.length, 0, '미보유 링크는 성립 안 함')
  eq(none.d.getBoardState().nodes.length, 0, '보유 증거가 없으면 판에 카드도 없다')

  const one = await mk(['hatch-lock', 'shoes', 'wrench'])
  eq(one.d.link('hatch-lock', 'wrench'), false, '잘못된 조합은 성립 안 함')
  eq(one.d.made.length, 0, '오답 조합은 링크 목록에 없음')
  eq(one.state.npc('doyle').score, 0, '오답 조합에 페널티 없음')
  eq(one.d.link('shoes', 'hatch-lock').ok, true, '순서 무관하게 정답 조합 성립')
  eq(one.d.link('shoes', 'hatch-lock'), false, '중복 링크 방지')
  eq(one.d.getBoardState().links.filter(l => l.made).length, 1, '보드가 성립 링크만 made로 표시')
  eq(one.d.getBoardState().nodes.length, 3, '보드 카드는 보유 증거 수와 같다')
  eq(one.d.resolve().id, 'cold', '1링크는 미제')
  eq(one.state.accusation, null, '1링크는 지목 불성립')

  const two = await mk(['hatch-lock', 'shoes', 'water-log', 'pressure-log'])
  two.d.link('hatch-lock', 'shoes'); two.d.link('water-log', 'pressure-log')
  eq(two.d.resolve().id, 'partial', '2링크는 부분')
  eq(two.state.accusation, 'doyle', '2링크 이상에서 지목 성립')

  const all = await mk(['hatch-lock', 'shoes', 'water-log', 'pressure-log', 'photos', 'wrench'])
  for (const l of SCRIPT.LINKS) all.d.link(l.needs[0], l.needs[1])
  eq(all.d.made.length, 3, '3링크 전부 성립')
  const said = all.events.filter(e => e.type === 'subtitle').map(e => e.payload.text)
  for (const l of SCRIPT.LINKS) ok(said.indexOf(l.reaction) >= 0, `${l.id} 도일 반응 원문 자막`)
  ok(said.indexOf(SCRIPT.LINKS[2].followUp.text) >= 0, 'L3 형사 후속 대사')
  eq(all.d.resolve().id, 'full', '3링크는 완전')
  ok(all.events.some(e => e.type === 'deduction:link' && e.payload.ok), 'deduction:link 발신')
  const res = all.events.filter(e => e.type === 'deduction:resolve').pop()
  eq(res.payload.links.length, 3, 'deduction:resolve가 링크를 싣는다')

  const hidden = (await mk(['photos'])).d.getBoardState()
  eq(hidden.nodes.length, 1, '보유하지 않은 증거는 판에 카드로 올라가지 않는다')
  eq(hidden.nodes[0].id, 'photos', '판에는 보유한 것만')
  ok(hidden.links.every(l => l.made === false), '아무것도 성립하지 않은 판')
}

// ── 11. script.js 없이도 부팅 ───────────────────────────────────────
async function testNoScript () {
  const bus = new EventBus()
  const state = new GameState(bus)
  const engine = { bus, state, camera: null, qa: true, time: 0, get: () => undefined }
  const m = new Interrogation({})
  await m.init(engine)
  eq(m.start('deitch'), false, 'script.js 없으면 심문은 조용히 비활성')
  eq(m.isActive(), false, '비활성 상태 유지')
  eq(m.isModal(), false, '비활성이면 플레이어를 막지 않는다')
  m.update(0.016, 0.016)
  bus.emit('interrogation:start', { npc: 'deitch' })
  ok(!!m.reason, '비활성 사유를 노출한다')

  const d = new Deduction()
  await d.init(engine)
  eq(d.links.length, 3, 'script.js 없어도 증거판은 사본으로 동작')
  ok(d.start(), '증거판 단독 부팅')
}

// ── 12. QA 샷 경로 (qa:state → 진술 + 선택 대기) ────────────────────
async function testQaShot () {
  const ctx = await fresh({ camera: fakeCamera() })
  ctx.bus.emit('qa:state', { interrogating: 'deitch' })
  eq(ctx.m.phase, 'choice', 'qa:state 한 번에 선택 대기까지 진행')
  eq(ctx.m.cur?.id, 'S1', '첫 진술에서 멈춘다')
  const said = ctx.events.filter(e => e.type === 'subtitle')
  eq(said.length, 1, '건너뛴 대사로 자막 큐를 채우지 않는다')
  eq(said.at(-1).payload.text, I.deitch.statements[0].text, '화면에 남는 자막은 현재 진술이다')
  eq(said.at(-1).payload.speaker, SCRIPT.CHARACTERS.deitch.name, '화자는 인물 이름')
  eq(ctx.m.getState().line, I.deitch.statements[0].text, '선택 대기 중에도 진술이 유지된다')
  eq(ctx.m.getState().choices.length, 3, '선택지 3개 노출')
  eq(ctx.m.isModal(), true, '심문 중에는 모달 — 플레이어 이동 차단')

  // 하네스가 카메라를 잡은 뒤에는 그 자리를 지켜야 샷 프레이밍이 유지된다
  const cam = ctx.engine.camera
  cam.position.set(0, 1.42, 1.35)
  cam.fov = 50
  for (let i = 0; i < 32; i++) ctx.m.update(1 / 60, ctx.m.t + 1 / 60)
  ok(Math.abs(cam.position.y - 1.42) < 1e-6 && Math.abs(cam.position.z - 1.35) < 1e-6, '샷 카메라 위치 유지')
  eq(cam.fov, 50, '샷 fov 유지')
}

// ── 13. 증거 선택 UI 연동 ───────────────────────────────────────────
async function testPicker () {
  // notebook.pickEvidence()는 Promise를 돌려준다 (src/ui/notebook.js)
  let asked = null
  const nb = { pickEvidence: (o) => { asked = o; return Promise.resolve('register') } }
  const a = await fresh({ evidence: ['register'], flags: FLAGS, mods: { notebook: nb } })
  a.m.start('deitch'); pump(a.m)
  let guard = 0
  while (a.m.cur && a.m.cur.id !== 'S2' && guard++ < 40) { a.m.choose('TRUTH'); pump(a.m) }
  const before = a.state.npc('deitch').score
  a.m.choose('LIE')
  ok(!!asked, 'notebook.pickEvidence로 위임한다')
  ok(asked.available.indexOf('register') >= 0, '보유 증거 목록을 넘긴다')
  ok(!a.events.some(e => e.type === 'interrogation:needEvidence'), 'UI가 있으면 버스 폴백을 쓰지 않는다')
  await Promise.resolve()
  pump(a.m)
  eq(a.state.npc('deitch').score - before, 2, 'UI가 고른 증거로 판정된다')

  // 취소하면 선택 단계로 돌아온다
  const b = await fresh({ evidence: ['register'], flags: FLAGS, mods: { notebook: { pickEvidence: () => Promise.resolve(null) } } })
  b.m.start('deitch'); pump(b.m)
  guard = 0
  while (b.m.cur && b.m.cur.id !== 'S2' && guard++ < 40) { b.m.choose('TRUTH'); pump(b.m) }
  b.m.choose('LIE')
  await Promise.resolve()
  eq(b.m.phase, 'choice', 'UI에서 취소하면 선택 단계로 복귀')

  // UI가 없으면 버스로 요청하고 evidencePicked를 기다린다
  const c = await driveTo('deitch', 'S2', { evidence: ['register'] })
  c.m.choose('LIE')
  const need = c.events.filter(e => e.type === 'interrogation:needEvidence').pop()
  ok(!!need, 'UI가 없으면 interrogation:needEvidence 발신')
  eq(need.payload.npc, 'deitch', 'needEvidence.npc')
  const s0 = c.state.npc('deitch').score
  c.bus.emit('interrogation:evidencePicked', { id: 'register' })
  pump(c.m)
  eq(c.state.npc('deitch').score - s0, 2, 'evidencePicked로 판정된다')
}

// ── 실행 ────────────────────────────────────────────────────────────
testTable()
testData()
await testMatrix()
await testBurnPermanence()
await testEvidenceBinding()
await testReopen()
await testRequires()
await testEndAndUi()
await testCamera()
await testDeduction()
await testNoScript()
await testQaShot()
await testPicker()

console.log(`\n${fails.length ? '✗' : '✓'} ${pass} passed, ${fails.length} failed`)
for (const f of fails.slice(0, 40)) console.log('  ✗ ' + f)
process.exit(fails.length ? 1 : 0)
