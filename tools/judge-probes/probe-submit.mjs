// S-E 재촬영 — 제출 프레임 5장(3차 판정 §5 확정본)을 **같은 빌드 한 실행**에서 다시 찍는다.
// 3차가 쓴 프레임은 자막 어절 분리(§3 부수 ①)가 찍혀 있어 그대로는 제출할 수 없고, 프레임마다
// 다른 실행에서 온 것이 섞이면 "이 화면이 이 빌드의 것인가"를 증명할 수 없다.
// 산출: frame-00-title · fr-50-notebook · sub-11-s1-choice · sub-30-picker · sub-40-s3-lines.
// 대기는 전부 사건 결박이다(엔진 시계가 실시간의 0.4배까지 흐른다 — common.mjs 머리주석).
import { boot, shot, sleep, saveLog, aim, findTarget, walkTo,
  startEventLog, fetchEventLog, verdict } from './common.mjs'

const { browser, page, issues } = await boot()
await startEventLog(page)

async function ig () {
  return page.evaluate(() => {
    const E = window.__ENGINE__
    const g = E.get('interrogation')
    const nb = E.get('notebook')
    const st = g?.getState ? g.getState() : {}
    return { phase: st.phase ?? null, sid: st.statementId ?? null, pick: !!nb?._pick }
  })
}
async function waitIg (pred, ms = 120000, tag = '') {
  const t0 = Date.now()
  let s = null
  while (Date.now() - t0 < ms) {
    s = await ig()
    if (pred(s)) return s
    await sleep(250)
  }
  await shot(page, `sub-diag-${tag}`)
  throw new Error(`waitIg timeout ${tag}: ${JSON.stringify(s)}`)
}
async function pickEvidence (id) {
  for (let i = 0; i < 12; i++) {
    const f = await page.evaluate(() => {
      const nb = window.__ENGINE__.get('notebook')
      return nb.items?.[nb.focus]?.ev?.id ?? null
    })
    if (f === id) { await page.keyboard.press('Enter'); return true }
    await page.keyboard.press('ArrowRight')
    await sleep(200)
  }
  return false
}
// 자막은 캔버스라 DOM 으로 못 읽는다(PROMPT-integrate §3-2). 프레임에 무슨 문장이 찍혔는지만
// 모듈 상태에서 받아두고, 어절이 갈렸는지는 프레임을 직접 본다 — 판정 방법은 육안이다.
async function subtitleText () {
  return page.evaluate(() => window.__ENGINE__.get('subtitles')?.cur?.text ?? null)
}

const shots = []
await shot(page, 'frame-00-title', shots)

// 이양 = 인트로 종료. 고정 엔진 시각 대기는 실행마다 갈린다(3차 §0-1).
await page.evaluate(() => {
  window.__ENGINE__.bus.on('cinematic:end', ({ id }) => { if (id === 'cin-intro') window.__HANDOVER__ = true })
})
await page.keyboard.press('Enter')
await page.waitForFunction(() => window.__HANDOVER__ === true, null, { timeout: 240000 })
await sleep(1500)

// 숙박부 획득 — 수사노트에 실을 증거이자 S2 거짓 지목의 재료
const register = await findTarget(page, 'lobby/front-desk')
await walkTo(page, register[0] + 0.3, register[2] + 1.7, { tol: 0.5 })
await aim(page, ...register)
await sleep(900)
await page.keyboard.press('e')
await page.waitForFunction(() => (window.__EVTLOG__ ?? []).some(e => e.ev === 'evidence:collected'),
  null, { timeout: 60000 })
await sleep(1200)

// 수사노트 (예비 프레임 — UI 디제시스)
await page.keyboard.press('Tab')
await page.waitForFunction(() => !!window.__ENGINE__.get('notebook')?.isOpen?.(), null, { timeout: 30000 })
await sleep(1600)
await shot(page, 'fr-50-notebook', shots)
await page.keyboard.press('Escape')
await page.waitForFunction(() => !window.__ENGINE__.get('notebook')?.isOpen?.(), null, { timeout: 30000 })
await sleep(800)

// 심문 진입 — 3차와 같은 데스크 정면 각
await walkTo(page, -2.35, -2.05, { tol: 0.5 })
await aim(page, -3.35, 1.0, -4.25)
await sleep(900)
await page.keyboard.press('e')
await sleep(600)
if ((await ig()).phase === 'idle') { await aim(page, -3.35, 1.3, -4.25); await sleep(800); await page.keyboard.press('e') }

// 본선 프레임 ② — S1 선택지 쪽지 + 다이치 (자막이 함께 찍힌다)
await waitIg(s => s.sid?.endsWith('S1') && s.phase === 'choice', 120000, 's1-choice')
await sleep(700)
const subS1 = await subtitleText()
await shot(page, 'sub-11-s1-choice', shots)
await page.keyboard.press('1')

// 본선 프레임 ① — 증거 서류철(지목 모달)
await waitIg(s => s.sid?.endsWith('S2'), 90000, 's2')
await waitIg(s => s.phase === 'choice', 120000, 's2-choice')
await page.keyboard.press('3')
await waitIg(s => s.pick, 30000, 's2-pick')
await sleep(1200)
await shot(page, 'sub-30-picker', shots)
const picked = await pickEvidence('register')
await waitIg(s => !s.pick, 45000, 's2-resolve')

// 예비 프레임 — S3 낭독(램프가 프레임 밖인 유일한 인물 컷)
await waitIg(s => s.sid?.endsWith('S3') && s.phase === 'lines', 180000, 's3-lines')
await sleep(1200)
const subS3 = await subtitleText()
await shot(page, 'sub-40-s3-lines', shots)

const events = await fetchEventLog(page)
saveLog('probe-submit', { log: shots, subS1, subS3, picked, issues, events })

verdict([
  ['제출 프레임 5장 촬영', shots.length === 5, shots.map(s => s.shot).join(' · ')],
  ['증거 지목 서류철 진입', picked, picked ? 'register 포커스' : 'picker 에서 register 못 찾음'],
  // 자막을 실제로 달고 찍히는 프레임은 S3 낭독 컷 하나다. S1 은 선택지 국면이라 진술 자막이
  // 이미 내려가 있다(빈 값이 정상 — 초기 판에서 이걸 FAIL 로 세었다가 게이트만 틀렸다).
  ['S3 낭독 자막 원문 확보(어절 분리 육안 확인용)', !!subS3, subS3 ?? '자막 없음'],
  ['S1 선택지 컷 자막 상태', true, subS1 ? `자막 있음: ${subS1}` : '자막 없음(선택지 국면 — 정상)'],
  ['콘솔 에러·경고 0', issues.length === 0, issues.slice(0, 3).join(' | ')]
])
console.log('\n5장을 Read 도구로 직접 봐라 — 자막 줄바꿈이 어절을 가르지 않는지가 이 재촬영의 목적이다.')
await browser.close()
