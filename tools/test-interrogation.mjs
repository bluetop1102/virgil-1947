import { judge } from '../src/narrative/interrogation.js'
import * as SCRIPT from '../src/narrative/script.js'
import HUD from '../src/ui/hud.js'
import NOTEBOOK from '../src/ui/notebook.js'
import SETTINGS from '../src/ui/settings.js'
import { fresh, pump, driveTo, FLAGS } from './interrogation-harness.mjs'

const burnMode = process.argv.includes('--burn')
let passed = 0
const failures = []

function ok (condition, message) {
  if (condition) passed++
  else failures.push(message)
}

function equal (actual, expected, message) {
  ok(Object.is(actual, expected), `${message} — got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)
}

function eventsOf (ctx, type) {
  return ctx.events.filter(event => event.type === type)
}

function fakeElement () {
  return {
    style: {}, children: [],
    appendChild (child) { this.children.push(child); return child },
    addEventListener () {}, removeEventListener () {}, remove () {},
    getBoundingClientRect () { return { left: 0, width: 600 } }
  }
}

async function withFakeDom (run) {
  const previous = { window: globalThis.window, document: globalThis.document }
  const listeners = new Map()
  const root = fakeElement()
  globalThis.window = {
    addEventListener (type, fn) { const list = listeners.get(type) || []; list.push(fn); listeners.set(type, list) },
    removeEventListener (type, fn) { listeners.set(type, (listeners.get(type) || []).filter(item => item !== fn)) },
    dispatch (type, event) { for (const fn of [...(listeners.get(type) || [])]) fn(event) }
  }
  globalThis.document = {
    createElement: () => fakeElement(),
    getElementById: id => id === 'ui-root' ? root : null
  }
  try { return await run(globalThis.window) } finally {
    if (previous.window === undefined) delete globalThis.window
    else globalThis.window = previous.window
    if (previous.document === undefined) delete globalThis.document
    else globalThis.document = previous.document
  }
}

function testScriptIntegrity () {
  for (const [npc, data] of Object.entries(SCRIPT.INTERROGATIONS)) {
    ok(Boolean(SCRIPT.CHARACTERS[npc]), `${npc} CHARACTERS 항목 존재`)
    for (const statement of data.statements || []) {
      const tag = statement.graphId || `${npc}.${statement.id}`
      for (const id of statement.evidence || []) ok(Boolean(SCRIPT.EVIDENCE[id]), `${tag} 정답 증거 ${id} 실재`)
      for (const id of Object.keys(statement.lieVariants || {})) {
        ok(Boolean(SCRIPT.EVIDENCE[id]), `${tag} lieVariants ${id} 실재`)
        ok((statement.evidence || []).includes(id), `${tag} lieVariants ${id}는 정답 증거`)
      }
      for (const id of Object.keys(statement.wrongVariants || {})) {
        ok(Boolean(SCRIPT.EVIDENCE[id]), `${tag} wrongVariants ${id} 실재`)
        ok(!(statement.evidence || []).includes(id), `${tag} wrongVariants ${id}는 오답 증거`)
      }
      const branches = [
        statement.onTruth, statement.onDoubt, statement.onLieCorrect, statement.onLieWrong,
        ...Object.values(statement.lieVariants || {}), ...Object.values(statement.wrongVariants || {})
      ]
      for (const branch of branches) {
        for (const id of [...(branch?.grants || []), ...(branch?.spawns || [])]) {
          ok(Boolean(SCRIPT.EVIDENCE[id]), `${tag} 분기 증거 ${id} 실재`)
        }
      }
    }
  }
  console.log('PASS  심문 스크립트 증거 참조 무결성')
}

async function chooseAt (npc, sid, choice, evidence = [], picked = null) {
  const ctx = await driveTo(npc, sid, { evidence, flags: FLAGS })
  ok(Boolean(ctx), `${npc}.${sid} 도달`)
  if (!ctx) return null
  const before = ctx.state.npc(npc).score
  const accepted = picked == null ? ctx.m.choose(choice) : ctx.m.choose(choice, picked)
  ok(accepted, `${npc}.${sid} ${choice} 선택 수락`)
  pump(ctx.m)
  return { ...ctx, delta: ctx.state.npc(npc).score - before }
}

async function testSevenOutcomes () {
  const cases = [
    ['진실+TRUTH', true, 'TRUTH', null, [], 1, false],
    ['진실+DOUBT', true, 'DOUBT', null, [], -1, false],
    ['진실+LIE', true, 'LIE', 'flask', ['register'], -2, true],
    ['거짓+TRUTH', false, 'TRUTH', null, ['register'], 0, false],
    ['거짓+DOUBT', false, 'DOUBT', null, ['register'], 0.5, false],
    ['거짓+LIE정답', false, 'LIE', 'register', ['register'], 2, false],
    ['거짓+LIE오답', false, 'LIE', 'flask', ['register'], -2, true]
  ]
  for (const [name, truth, choice, evidence, correct, delta, burn] of cases) {
    const result = judge(truth, choice, evidence, correct)
    equal(result.delta, delta, `${name} 점수`)
    equal(result.burn, burn, `${name} 소각`)
  }

  const truth = await chooseAt('deitch', 'S1', 'TRUTH')
  equal(truth.delta, 1, '실기계 진실+TRUTH')
  const truthDoubt = await chooseAt('deitch', 'S1', 'DOUBT')
  equal(truthDoubt.delta, -1, '실기계 진실+DOUBT')
  equal(truthDoubt.m.getState().choices.join(','), 'TRUTH,LIE', 'DOUBT 후 재질문은 2선택')
  const truthLie = await chooseAt('deitch', 'S1', 'LIE', ['flask'], 'flask')
  equal(truthLie.delta, -2, '실기계 진실+LIE')
  const falseTruth = await chooseAt('deitch', 'S2', 'TRUTH')
  equal(falseTruth.delta, 0, '실기계 거짓+TRUTH')
  const falseDoubt = await chooseAt('deitch', 'S2', 'DOUBT')
  equal(falseDoubt.delta, 0.5, '실기계 거짓+DOUBT')
  const falseLie = await chooseAt('deitch', 'S2', 'LIE', ['register'], 'register')
  equal(falseLie.delta, 2, '실기계 거짓+LIE정답')
  const falseWrong = await chooseAt('deitch', 'S2', 'LIE', ['flask'], 'flask')
  equal(falseWrong.delta, -2, '실기계 거짓+LIE오답')
  console.log('PASS  판정표 7결과 전이')
}

async function testDoubtReplacement () {
  const lie = await driveTo('deitch', 'S2', { evidence: ['register'], flags: FLAGS })
  lie.m.choose('DOUBT')
  pump(lie.m)
  equal(lie.state.npc('deitch').score, 1.5, '선행 S1 TRUTH + S2 DOUBT 점수')
  lie.m.choose('LIE', 'register')
  pump(lie.m)
  equal(lie.state.npc('deitch').score, 3, '후속 LIE는 DOUBT +0.5를 +2로 대체')

  const accept = await driveTo('deitch', 'S1')
  accept.m.choose('DOUBT')
  pump(accept.m)
  accept.m.choose('TRUTH')
  pump(accept.m)
  equal(accept.state.npc('deitch').score, -1, '후속 TRUTH는 DOUBT 점수 유지')
  equal(accept.m.cur?.id, 'S2', '후속 선택 뒤 다음 진술')
  console.log('PASS  DOUBT 재질문·점수 대체')
}

async function complete (strategy) {
  const ctx = await fresh({ evidence: Object.keys(SCRIPT.EVIDENCE), flags: FLAGS })
  ctx.m.start('deitch')
  pump(ctx.m)
  let guard = 0
  while (ctx.m.cur && guard++ < 30) {
    const statement = ctx.m.cur
    const [choice, evidence] = strategy(statement)
    ctx.m.choose(choice, evidence)
    pump(ctx.m)
    if (ctx.m.getState().reasking) {
      ctx.m.choose('TRUTH')
      pump(ctx.m)
    }
  }
  return ctx
}

async function testTierAndEvents () {
  const full = await complete(statement => statement.truth
    ? ['TRUTH', null]
    : ['LIE', statement.evidence[0]])
  equal(eventsOf(full, 'interrogation:end').at(-1)?.payload.tier, '만점', '소각 0 + 모든 거짓 반박 = 만점')

  const partial = await complete(() => ['TRUTH', null])
  equal(eventsOf(partial, 'interrogation:end').at(-1)?.payload.tier, '부분', '미반박 거짓이 있으면 부분')

  const failed = await complete(statement => statement.id === 'S2'
    ? ['LIE', 'flask']
    : ['TRUTH', null])
  equal(eventsOf(failed, 'interrogation:end').at(-1)?.payload.tier, '실패', '핵심 진술 소각 = 실패')

  const prompted = await fresh()
  prompted.m.start('deitch')
  pump(prompted.m)
  const prompt = eventsOf(prompted, 'interrogation:prompt').at(-1)?.payload
  equal(prompt?.sid, 'deitch.S1', 'prompt sid는 정본 진술 id')
  equal(prompt?.options.join(','), 'TRUTH,DOUBT,LIE', 'prompt 3선택')
  equal(Object.keys(prompt || {}).sort().join(','), 'npc,options,sid', 'prompt에 힌트 필드 없음')

  const perf = await driveTo('deitch', 'S2', { evidence: ['register'] })
  ok(eventsOf(perf, 'perf:state').some(event => event.payload.state === 'lying'), '거짓 진술은 lying 연기')
  perf.m.choose('LIE', 'register')
  pump(perf.m)
  ok(eventsOf(perf, 'flag:set').some(event => event.payload.id === 'deitch-recanted'), '플래그 통지')

  const grant = await driveTo('deitch', 'S3')
  grant.m.choose('TRUTH')
  pump(grant.m)
  ok(eventsOf(grant, 'evidence:granted').some(event => event.payload.id === 'pressure-log'), '증거 지급 통지')

  const ui = await driveTo('deitch', 'S2', { evidence: ['register'] })
  const uiBefore = ui.state.npc('deitch').score
  ui.bus.emit('interrogation:choose', { sid: 'deitch.S1', choice: 'TRUTH' })
  equal(ui.state.npc('deitch').score, uiBefore, '지난 prompt 응답은 무시')
  ui.bus.emit('interrogation:choose', { sid: 'deitch.S2', choice: 'LIE', evidence: 'register' })
  pump(ui.m)
  equal(ui.state.npc('deitch').score - uiBefore, 2, 'UI choose 이벤트 판정')
  console.log('PASS  상태식 tier·표준 이벤트')
}

async function testReinterrogation () {
  const ctx = await driveTo('deitch', 'S4', { evidence: ['keyrack'] })
  ctx.m.choose('LIE', 'keyrack')
  pump(ctx.m)
  ok(ctx.state.npc('deitch').reopen.includes('S4'), 'keyrack 부분 성공은 S4 재심문 개방')
  ctx.m.choose('TRUTH')
  pump(ctx.m)
  const score = ctx.state.npc('deitch').score
  ctx.state.setAct(2)
  ctx.state.addEvidence({ id: 'roofkey', kind: 'object', title: '옥상 열쇠' })
  ctx.m.start('deitch')
  pump(ctx.m)
  equal(ctx.m.cur?.id, 'S4', '2막 roofkey 재심문')
  ctx.m.choose('LIE', 'roofkey')
  pump(ctx.m)
  equal(ctx.state.npc('deitch').score, score, '재심문 점수는 기존 판정 대체')
  ok(ctx.state.is('deitch-confession'), '재심문 자백 플래그')
  ok(eventsOf(ctx, 'perf:state').some(event => event.payload.state === 'breaking'), 'breakingOn 정답 직후 붕괴')
  console.log('PASS  deitch.S4 재심문')
}

async function testElevatorGateStates () {
  // ae7ba8c 회귀(SUBMISSION-AUDIT 독립 재현): 심문을 연 적 없는 fresh 상태의 격자문 E 가
  // presented 지연 초기화(Interrogation._rec 이후에만 존재) 때문에 459행에서 예외를 던졌다.
  // 3상태 계약을 못 박는다 — ①심문 전: 예외 없이 "프런트 쪽 일" ②중단: "진술이 아직 남았다"
  // ③완료: act 2 전환(기존 testProgressionAndResume 이 검증).
  const cold = await fresh({ flags: FLAGS })
  cold.bus.emit('player:interact', { targetId: 'lobby/elevator' })
  equal(cold.state.act, 1, '심문 전 격자문은 1막 유지')
  ok(eventsOf(cold, 'subtitle').at(-1)?.payload.text?.includes('프런트 쪽 일'), '심문 전 거절 자막')

  const mid = await fresh({ flags: FLAGS })
  mid.m.start('deitch')
  pump(mid.m)
  mid.bus.emit('player:interact', { targetId: 'lobby/elevator' })
  equal(mid.state.act, 1, '중단 상태 격자문은 1막 유지')
  ok(eventsOf(mid, 'subtitle').at(-1)?.payload.text?.includes('진술이 아직 남았다'), '중단 상태 거절 자막')
  console.log('PASS  격자문 3상태 — 심문 전·중단 거절(완료 전환은 아래)')
}

async function testProgressionAndResume () {
  const ctx = await complete(statement => statement.truth
    ? ['TRUTH', null]
    : ['LIE', statement.evidence[0]])
  const before = eventsOf(ctx, 'act:enter').length
  ctx.bus.emit('player:interact', { targetId: 'lobby/elevator' })
  equal(ctx.state.act, 2, '다이치 종료 후 엘리베이터로 2막')
  equal(eventsOf(ctx, 'act:enter').length - before, 1, 'act:enter{act:2} 1회')
  equal(eventsOf(ctx, 'act:enter').at(-1)?.payload.act, 2, 'act:enter payload')
  ctx.bus.emit('player:interact', { targetId: 'lobby/elevator' })
  equal(eventsOf(ctx, 'act:enter').length - before, 1, '막 전환 재발화 없음')

  const resumed = await fresh({ act: 2, flags: FLAGS })
  resumed.m.start('ruiz')
  pump(resumed.m)
  equal(resumed.m.cur?.id, 'S1', '중단 전 첫 진술 제시')
  equal(resumed.m.isModal(), false, '심문 중 이동 이탈 허용')
  resumed.m.start('ruiz')
  pump(resumed.m)
  equal(resumed.m.cur?.id, 'S2', '재접근은 다음 미제시 진술부터 재개')
  equal(eventsOf(resumed, 'interrogation:end').length, 0, '잔여 진술 전에는 종료 미발화')
  console.log('PASS  막 전환·중단 재개')
}

async function testUiStateMachine () {
  await withFakeDom(async fakeWindow => {
    const player = { pos: { x: 0, y: 0, z: 0 } }
    const mods = { player }
    const anchor = {
      position: { clone: () => ({ x: 0, y: 0, z: 0 }) },
      getWorldPosition (out) { out.x = 0; out.y = 0; out.z = 0; return out }
    }
    const scene = { getObjectByName: name => name === 'npc/deitch' ? anchor : null }
    const ctx = await fresh({ scene, mods })
    ctx.engine.size = { w: 1280, h: 720 }
    ctx.engine.harness = () => ({})
    const hud = Object.assign(Object.create(HUD), {
      _drawChoicePrompt () {}, _drawPrompt () {}, _drawSlip () {}
    })
    const liveNotebook = Object.assign(Object.create(NOTEBOOK), { _layout () {} })
    mods.notebook = liveNotebook
    await liveNotebook.init(ctx.engine)
    await hud.init(ctx.engine)

    ctx.m.start('deitch')
    pump(ctx.m)
    equal(ctx.m.getState().phase, 'choice', 'UI 이탈 전 선택 대기')
    equal(hud.choicePrompt?.sid, 'deitch.S1', 'HUD가 현재 선택지를 표시')
    let aimResolved = 'pending'
    liveNotebook.mode = 'present'
    liveNotebook._pick = { resolve: value => { aimResolved = value } }

    const before = ctx.state.npc('deitch').score
    player.pos.x = 4.3
    ctx.m.update(1 / 60, ctx.m.t + 1 / 60)
    equal(ctx.m.getState().phase, 'idle', '거리 이탈 시 심문 세션 종료')
    equal(hud.choicePrompt, null, '거리 이탈 시 선택지 해제')
    equal(hud.choiceWrap.style.pointerEvents, 'none', '거리 이탈 후 선택지 입력 차단')
    equal(liveNotebook.mode, null, '거리 이탈 시 증거 지목 모드 해제')
    equal(aimResolved, null, '거리 이탈 시 대기 중 지목 Promise 취소')
    ok(eventsOf(ctx, 'interrogation:left').length === 1, '거리 이탈 이벤트 1회')

    fakeWindow.dispatch('keydown', { key: '2', repeat: false, preventDefault () {} })
    ctx.bus.emit('interrogation:choose', { sid: 'deitch.S1', choice: 'DOUBT' })
    equal(ctx.state.npc('deitch').score, before, '세션 밖 숫자·choose 입력은 점수를 만들지 않음')
    ok(!Object.hasOwn(ctx.state.npc('deitch').scores, 'S1'), '미청취 진술 판정 기록 없음')
    hud.dispose()
    liveNotebook.dispose()
  })

  let notebookClosed = false
  let settingsOpened = false
  const notebook = Object.assign(Object.create(NOTEBOOK), {
    mode: 'present',
    scrub: { el: { style: { display: 'none' } } },
    close () { notebookClosed = true; this.mode = null }
  })
  const settings = Object.assign(Object.create(SETTINGS), {
    opened: false,
    engine: { get: name => name === 'notebook' ? notebook : undefined },
    open () { settingsOpened = true; this.opened = true },
    close () { this.opened = false }
  })
  const escape = {
    key: 'Escape', repeat: false, stopped: false,
    preventDefault () {}, stopImmediatePropagation () { this.stopped = true }
  }
  settings._key(escape)
  if (!escape.stopped) notebook._key(escape)
  ok(notebookClosed, '증거 지목 중 Escape는 지목을 먼저 취소')
  equal(settingsOpened, false, '증거 지목 중 Escape는 설정 카드를 열지 않음')

  let tabClosed = false
  const tabNotebook = Object.assign(Object.create(NOTEBOOK), {
    mode: 'present', scrub: { el: { style: { display: 'none' } } },
    close () { tabClosed = true; this.mode = null },
    open () { this.mode = 'read' }
  })
  tabNotebook._key({ key: 'Tab', preventDefault () {} })
  ok(tabClosed, '증거 지목 중 Tab은 지목 노트를 먼저 닫음')
  equal(tabNotebook.mode, null, 'Tab 취소 후 지목 모드 해제')
  console.log('PASS  심문 UI 이탈·입력·Escape/Tab 우선순위')
}

async function testBurn () {
  const deitch = await driveTo('deitch', 'S1', { evidence: ['flask'] })
  deitch.m.choose('LIE', 'flask')
  pump(deitch.m)
  equal(deitch.state.npc('deitch').burned.includes('S1'), true, '소각 기록')
  equal(eventsOf(deitch, 'flag:set').filter(event => event.payload.id === 'deitch-clammed').length, 1, '소각 결과 플래그 최초 1회')
  deitch.m.start('deitch')
  pump(deitch.m)
  equal(eventsOf(deitch, 'flag:set').filter(event => event.payload.id === 'deitch-clammed').length, 1, '재접근 시 소각 플래그 재발화 없음')
  equal(deitch.state.serialize().npcs.deitch.burned.includes('S1'), true, 'serialize에 burned 포함')

  const grant = await driveTo('deitch', 'S3', { evidence: ['flask'] })
  grant.m.choose('LIE', 'flask')
  pump(grant.m)
  equal(eventsOf(grant, 'evidence:granted').filter(event => event.payload.id === 'pressure-log').length, 0, '소각된 진술의 grant 미발화')
  grant.m.start('deitch')
  pump(grant.m)
  equal(eventsOf(grant, 'evidence:granted').filter(event => event.payload.id === 'pressure-log').length, 0, '재접근 후 grant 재발화 없음')

  const ruiz = await driveTo('ruiz', 'S2', { evidence: ['flask'], act: 2 })
  const mark = ruiz.events.length
  ruiz.m.choose('LIE', 'flask')
  pump(ruiz.m)
  equal(eventsOf(ruiz, 'flag:set').filter(event => event.payload.id === 'footprints-lost').length, 1, '소각 손실 플래그 1회')
  const afterBurn = ruiz.events.slice(mark)
  ok(!afterBurn.some(event => event.type === 'flag:set' && event.payload.id === 'two-voices'), '소각 시 대체 성공 플래그 미발화')
  ok(!afterBurn.some(event => event.type === 'flag:set' && event.payload.id === 'spawn:footprints'), '소각 시 대체 spawn 미발화')
  console.log('PASS  --burn 소각 직렬화·unlocks 재발화 차단')
  console.log('WAIT  역직렬화 유지 — restore 경로가 티켓 범위 밖')
}

if (burnMode) {
  await testBurn()
} else {
  testScriptIntegrity()
  await testSevenOutcomes()
  await testDoubtReplacement()
  await testTierAndEvents()
  await testReinterrogation()
  await testElevatorGateStates()
  await testProgressionAndResume()
  await testUiStateMachine()
}

console.log(`\n${failures.length ? 'FAIL' : 'PASS'}  ${passed} passed, ${failures.length} failed`)
for (const failure of failures.slice(0, 30)) console.log(`  FAIL  ${failure}`)
process.exit(failures.length ? 1 : 0)
