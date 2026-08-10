// S-D 검증 — J5. ①이양 직후 조작 카드가 뜨고 스스로 내려가는가 ②Esc 일시정지가 이동을
// 실제로 멈추는가 ③설정 카드에 조작 안내 행 ④Escape 양보 규약(노트 위에서 설정이 안 뜬다) 유지.
// 카드 판독성("종이 소품으로 읽히는가", D7)은 프레임을 본 독립 에이전트가 판정한다.
//
// 계약: S-D 는 hud 에 controlsCardState() 를 노출해야 한다 — 'visible' | 'hidden' | 'never'.
// (카드는 canvas 소품이라 DOM 텍스트로 검출할 수 없다. 상태 훅이 기계 검증의 유일한 창이다.)
import { boot, shot, stats, sleep, saveLog, visibleText, verdict } from './common.mjs'

const { browser, page, issues } = await boot()

// ① 조작 카드 — 판정을 사건에 결박한다. 이전 판은 `engine.time ≥ 33` 뒤 벽시계 +1초에 상태를
// 읽었는데, 인트로 종료가 실행마다 t=30.3~34.8 로 흔들려(3차 판정 §0-1) 같은 빌드가 PASS 와
// FAIL 로 갈렸다 — 게임이 아니라 게이트의 결함이다. `cinematic:end`(cin-intro) 를 페이지에서
// 받은 그 순간부터 카드 상태를 60ms 로 샘플링해 수명 전체를 잡는다.
await page.evaluate(() => {
  const E = window.__ENGINE__
  const rec = { end: null, first: null, hid: null, samples: [] }
  window.__CARD__ = rec
  E.bus.on('cinematic:end', ({ id }) => {
    if (id !== 'cin-intro' || rec.end != null) return
    rec.end = +E.time.toFixed(2)
    const tick = () => {
      const s = E.get('hud')?.controlsCardState?.() ?? 'never'
      const t = +E.time.toFixed(2)
      rec.samples.push([t, s])
      if (s === 'visible' && rec.first == null) rec.first = t
      if (s === 'hidden' && rec.first != null && rec.hid == null) rec.hid = t
      // 1600: 카드 수명이 무입력 8엔진초로 늘었다(S-J) — 0.2배 시계까지 감안하면 60ms×1600=96s
      if (rec.hid == null && rec.samples.length < 1600) setTimeout(tick, 60)
    }
    tick()
  })
})

await page.keyboard.press('Enter')
await page.waitForFunction(() => window.__CARD__.end != null, null, { timeout: 240000 })

// 카드가 떠 있는 동안 프레임을 남긴다(판독성은 독립 에이전트 몫 — 아래 안내 참조).
for (let i = 0; i < 300; i++) {
  const c = await page.evaluate(() => ({ f: window.__CARD__.first, h: window.__CARD__.hid }))
  if (c.f != null || c.h != null) break
  await sleep(120)
}
await shot(page, 'guide-00-controls-card')
await page.waitForFunction(() => window.__CARD__.hid != null, null, { timeout: 120000 }).catch(() => {})
const card = await page.evaluate(() => window.__CARD__)
const cardEarly = card.first != null ? 'visible' : 'never'
const cardLate = card.hid != null ? 'hidden' : cardEarly

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

saveLog('probe-guidance', { card, cardEarly, cardLate, settingsOpen, frozen, resumed, hasControlsRow, nbOpen, after, issues })

verdict([
  ['조작 카드: 이양 직후 표시', card.first != null,
    `cinematic:end t=${card.end} → visible t=${card.first ?? '없음'}`],
  ['조작 카드: 자동 소거', card.hid != null,
    card.first != null && card.hid != null ? `수명 ${(card.hid - card.first).toFixed(2)} 엔진초` : `상태 ${cardLate}`],
  ['Esc 일시정지: 이동 동결', settingsOpen && frozen < 0.05, `열림 중 이동 ${frozen.toFixed(3)}m`],
  ['Esc 해제: 이동 복귀', resumed > 0.2, `닫힘 후 이동 ${resumed.toFixed(2)}m`],
  ['설정 카드 조작 안내 행', hasControlsRow, ''],
  ['Escape 양보 규약 유지', nbOpen && !after.nb && !after.st, `노트 ${nbOpen}→${after.nb}, 설정 ${after.st}`],
  ['콘솔 에러·경고 0', issues.length === 0, issues.slice(0, 3).join(' | ')]
])
console.log('\nguide-00-controls-card.jpg 를 독립 에이전트에게 채점시켜라 — 종이 소품으로 읽히는가(D7), 4개 키가 3초 안에 판독되는가.')
await browser.close()
