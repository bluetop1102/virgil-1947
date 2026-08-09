// S-D 검증 — J5. ①이양 직후 조작 카드가 뜨고 스스로 내려가는가 ②Esc 일시정지가 이동을
// 실제로 멈추는가 ③설정 카드에 조작 안내 행 ④Escape 양보 규약(노트 위에서 설정이 안 뜬다) 유지.
// 카드 판독성("종이 소품으로 읽히는가", D7)은 프레임을 본 독립 에이전트가 판정한다.
//
// 계약: S-D 는 hud 에 controlsCardState() 를 노출해야 한다 — 'visible' | 'hidden' | 'never'.
// (카드는 canvas 소품이라 DOM 텍스트로 검출할 수 없다. 상태 훅이 기계 검증의 유일한 창이다.)
import { boot, shot, stats, sleep, saveLog, visibleText, verdict } from './common.mjs'

const { browser, page, issues } = await boot()

const t0 = (await stats(page)).t
await page.keyboard.press('Enter')
while ((await stats(page)).t - t0 < 33) await sleep(300)

// ① 조작 카드 — 이양 +1초에 visible, 이후 자동 소거는 폴링으로 잰다.
// 고정 벽시계 대기(+7s)는 엔진 시계 0.4배 조건에서 카드 수명(엔진 초)을 못 덮어 오탐한다.
await sleep(1000)
const cardEarly = await page.evaluate(() => window.__ENGINE__.get('hud')?.controlsCardState?.() ?? 'never')
await shot(page, 'guide-00-controls-card')
let cardLate = cardEarly
for (let i = 0; i < 60; i++) {                 // 최대 30초 벽시계 — 0.4배에서도 엔진 12초를 덮는다
  await sleep(500)
  cardLate = await page.evaluate(() => window.__ENGINE__.get('hud')?.controlsCardState?.() ?? 'never')
  if (cardLate === 'hidden') break
}

// ② Esc 일시정지 — 열림 중 W 1.6초: 위치 동결. 닫힘 후 W 1초: 이동 복귀
await page.keyboard.press('Escape')
await sleep(800)
const settingsOpen = await page.evaluate(() => !!window.__ENGINE__.get('settings')?.isOpen?.())
const p0 = (await stats(page)).pos
await page.keyboard.down('w'); await sleep(1600); await page.keyboard.up('w')
const p1 = (await stats(page)).pos
const frozen = Math.hypot(p1[0] - p0[0], p1[2] - p0[2])
const settingsTexts = await visibleText(page)
await shot(page, 'guide-01-settings')
await page.keyboard.press('Escape')
await sleep(800)
// 2.2초 보행 — 경합 시 엔진 시계가 0.2배까지 떨어져 1초 보행이 0.19m(임계 미달)로 오탐하던
// 것(S-D 실측)의 여유분. 비경합 실측 0.30~1.13m.
await page.keyboard.down('w'); await sleep(2200); await page.keyboard.up('w')
const p2 = (await stats(page)).pos
const resumed = Math.hypot(p2[0] - p1[0], p2[2] - p1[2])

// ③ 설정 카드 조작 안내 행 — 설정은 DOM 텍스트라 visibleText 로 검출 가능
const hasControlsRow = settingsTexts.some(t => /조작|이동/.test(t))

// ④ Escape 양보 — 노트 열림 상태에서 Esc 는 노트만 닫는다
await page.keyboard.press('Tab')
await sleep(900)
const nbOpen = await page.evaluate(() => !!window.__ENGINE__.get('notebook')?.isOpen?.())
await page.keyboard.press('Escape')
await sleep(700)
const after = await page.evaluate(() => ({
  nb: !!window.__ENGINE__.get('notebook')?.isOpen?.(),
  st: !!window.__ENGINE__.get('settings')?.isOpen?.()
}))

saveLog('probe-guidance', { cardEarly, cardLate, settingsOpen, frozen, resumed, hasControlsRow, nbOpen, after, issues })

verdict([
  ['조작 카드: 이양 직후 표시', cardEarly === 'visible', `+1s 상태 ${cardEarly}`],
  ['조작 카드: 자동 소거', cardLate === 'hidden', `+7s 상태 ${cardLate}`],
  ['Esc 일시정지: 이동 동결', settingsOpen && frozen < 0.05, `열림 중 이동 ${frozen.toFixed(3)}m`],
  ['Esc 해제: 이동 복귀', resumed > 0.2, `닫힘 후 이동 ${resumed.toFixed(2)}m`],
  ['설정 카드 조작 안내 행', hasControlsRow, ''],
  ['Escape 양보 규약 유지', nbOpen && !after.nb && !after.st, `노트 ${nbOpen}→${after.nb}, 설정 ${after.st}`],
  ['콘솔 에러·경고 0', issues.length === 0, issues.slice(0, 3).join(' | ')]
])
console.log('\nguide-00-controls-card.jpg 를 독립 에이전트에게 채점시켜라 — 종이 소품으로 읽히는가(D7), 4개 키가 3초 안에 판독되는가.')
await browser.close()
