// S-C 검증 + 게이트 재촬영 — J2/J1/G7. ①모달 복귀 화이트아웃(밝은 종이 화면 → 닫기 → 노출
// 복귀 속도) ②앙각 노출 상한 ③제출 프레임 3종 재촬영(타이틀·인트로 t14 모션블러·데스크 코너·
// 로비 와이드·샹들리에 앙각). 글로우·블러·프레임 품질 판정은 독립 에이전트가 프레임으로 한다.
import { boot, shot, stats, sleep, saveLog, aim, walkTo, verdict } from './common.mjs'

const { browser, page, issues } = await boot()

await shot(page, 'frame-00-title')
const t0 = (await stats(page)).t
await page.keyboard.press('Enter')

// 인트로 t=14 — 트래킹 모션블러 채점 재료
while ((await stats(page)).t - t0 < 14) await sleep(120)
await shot(page, 'frame-01-cin-t14')
while ((await stats(page)).t - t0 < 33) await sleep(300)

// 데스크 코너 (제출 프레임 1 계보)
await aim(page, -3.0, 1.35, -4.0)
await sleep(1500)
await shot(page, 'frame-02-desk-corner')

// ① 모달 복귀 화이트아웃 — 수사노트(밝은 종이) 3초 → 닫기 → 1.2초 내 노출 복귀
await page.keyboard.press('Tab')
await sleep(3000)
await page.keyboard.press('Escape')
const expoTrail = []
for (let i = 0; i < 10; i++) {
  await sleep(200)
  expoTrail.push((await stats(page)).expo)
}
const expoAt1s = expoTrail[4]
await shot(page, 'frame-03-after-modal')

// ② 샹들리에 앙각 — 노출 상한
await walkTo(page, 1.2, 1.5, { tol: 0.9, timeout: 20000 })
await aim(page, 0.4, 6.0, -0.5)
await sleep(2500)
const upExpo = (await stats(page)).expo
await shot(page, 'frame-04-ceiling-up')

// 로비 와이드 (제출 프레임 3 계보 — 샹들리에 상단 글로우 채점 재료)
await walkTo(page, 1.2, 6.2, { tol: 0.9, timeout: 25000 })
await aim(page, -2.2, 1.5, -4.0)
await sleep(1800)
await shot(page, 'frame-05-lobby-wide')

saveLog('probe-frames', { expoTrail, expoAt1s, upExpo, issues })

verdict([
  ['모달 복귀 1초 내 노출 ≤ 40', expoAt1s != null && expoAt1s <= 40, `복귀 궤적 ${expoTrail.join(' → ')}`],
  ['앙각 노출 ≤ 50', upExpo != null && upExpo <= 50, `앙각 expo ${upExpo}`],
  ['콘솔 에러·경고 0', issues.length === 0, issues.slice(0, 3).join(' | ')]
])
console.log('\n독립 에이전트 채점 재료: frame-01(모션블러 형체 판독) · frame-05(샹들리에 상단 세로 글로우 유무) · frame-02(제출 후보).')
await browser.close()
