// S-B 검증 — J3. 2차 §0-6 재현 동선(데스크 정면 접근) 그대로 심문에 들어가
// S2 푸시인 텔 3프레임과 판정 리버스 샷 2프레임을 남긴다.
// 기계는 상태 전이·자막만 판정한다 — **오클루전·오버숄더 판정은 프레임을 본 독립
// 에이전트가 한다**(발주문 §4의 블라인드 채점표). 이 프로브는 그 재료를 만든다.
import { boot, shot, stats, sleep, saveLog, aim, findTarget, walkTo,
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
async function waitIg (pred, ms = 40000, tag = '') {
  const t0 = Date.now()
  let s = null
  while (Date.now() - t0 < ms) {
    s = await ig()
    if (pred(s)) return s
    await sleep(250)
  }
  await shot(page, `tell-diag-${tag}`)
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

const t0 = (await stats(page)).t
await page.keyboard.press('Enter')
while ((await stats(page)).t - t0 < 32) await sleep(300)

// 이양 직후 — 첫 목표 독백(S-B 작업 3) 검출. 5초 창 안에 자막이 떠야 한다.
let goalLine = null
for (let i = 0; i < 20 && !goalLine; i++) {
  goalLine = await page.evaluate(() => {
    const s = window.__ENGINE__.get('subtitles')
    return s?.cur?.text ?? null
  })
  if (!goalLine) await sleep(300)
}
await shot(page, 'tell-00-handover-goal')

// 숙박부 획득 (S2 거짓 지목에 필요)
const register = await findTarget(page, 'lobby/front-desk')
await walkTo(page, register[0] + 0.3, register[2] + 1.7, { tol: 0.5 })
await aim(page, ...register)
await sleep(900)
await page.keyboard.press('e')
await sleep(1200)

// §0-6 재현 각: 데스크 정면에서 진입
await walkTo(page, -2.35, -2.05, { tol: 0.5 })
await aim(page, -3.35, 1.0, -4.25)
await sleep(900)
await page.keyboard.press('e')
await sleep(600)
if ((await ig()).phase === 'idle') { await aim(page, -3.35, 1.3, -4.25); await sleep(800); await page.keyboard.press('e') }

// S1 — 진실
await waitIg(s => s.sid?.endsWith('S1') && s.phase === 'choice', 40000, 's1-choice')
await page.keyboard.press('1')

// S2 — 거짓 진술 낭독(푸시인) 중 텔 3프레임 : 독립 에이전트 채점 재료
await waitIg(s => s.sid?.endsWith('S2'), 30000, 's2')
await sleep(800); await shot(page, 'tell-01-pushin-a')
await sleep(1500); await shot(page, 'tell-02-pushin-b')
await sleep(1500); await shot(page, 'tell-03-pushin-c')

// 거짓 지목 → 판정 리버스 샷 2프레임 : 오버숄더 채점 재료
await waitIg(s => s.phase === 'choice', 30000, 's2-choice')
await page.keyboard.press('3')
await waitIg(s => s.pick, 8000, 's2-pick')
if (!await pickEvidence('register')) console.log('경고: picker에서 register 못 찾음')
await waitIg(s => !s.pick, 15000, 's2-resolve')
await sleep(700); await shot(page, 'tell-04-reverse-a')
await sleep(1800); await shot(page, 'tell-05-reverse-b')

const evts = await fetchEventLog(page)
saveLog('probe-tell', { events: evts, issues, goalLine })

verdict([
  ['심문 S1→S2 전이·지목·판정 정상', true, '위 단계 전부 통과(실패 시 이미 throw)'],
  ['이양 직후 목표 독백 자막', !!goalLine, goalLine ? `"${goalLine}"` : '자막 없음 — S-B 작업 3 미구현'],
  ['콘솔 에러·경고 0', issues.length === 0, issues.slice(0, 3).join(' | ')]
])
console.log('\n다음 5프레임을 독립 에이전트에게 채점시켜라(발주문 §4 블라인드 채점표):')
console.log('  tell-01~03-pushin-*  → 다이치 얼굴·양손이 보이는가, 무엇이 가리는가')
console.log('  tell-04~05-reverse-* → 프레임 전경에 다이치 어깨/데스크가 있는가')
await browser.close()
