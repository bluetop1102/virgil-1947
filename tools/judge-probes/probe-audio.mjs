// S-A 검증 — J6. ①인트로 드론이 실제로 울리는가(musicOn 타임라인) ②심문 구간이 자유 배회보다
// 조용한 역전이 해소됐는가(RMS 비교) ③콘솔 0. 톤 품질은 기계가 못 본다 — 사람 귀 항목은
// docs/submission/audio-listen-check.md 로.
import { boot, shot, stats, sleep, saveLog, aim, findTarget, walkTo,
  armAudioTap, startAudioLog, fetchAudioLog, startEventLog, fetchEventLog, verdict } from './common.mjs'

const { browser, page, issues } = await boot()
await armAudioTap(page)
await startAudioLog(page)
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
  throw new Error(`waitIg timeout ${tag}: ${JSON.stringify(s)}`)
}

const t0 = (await stats(page)).t
await page.keyboard.press('Enter')

// 인트로 32초 — 드론 구간
while ((await stats(page)).t - t0 < 32) await sleep(300)
await shot(page, 'audio-handover')

// 자유 배회 기준선 12초 (스폰 자리 정지)
const freeFrom = (await stats(page)).t
await sleep(12000)
const freeTo = (await stats(page)).t

// 심문 진입 → S1 lines 구간 측정
let interroMean = null
let interroDetail = '심문 진입 실패 — 수동 확인 필요'
try {
  const register = await findTarget(page, 'lobby/front-desk')
  await walkTo(page, register[0] + 0.3, register[2] + 1.7, { tol: 0.5 })
  await aim(page, ...register)
  await sleep(900)
  await page.keyboard.press('e')          // 숙박부 획득(획득음 스파이크도 기록됨)
  await sleep(1200)
  await walkTo(page, -2.35, -2.05, { tol: 0.5 })
  await aim(page, -3.35, 1.0, -4.25)
  await sleep(900)
  await page.keyboard.press('e')
  await sleep(600)
  if ((await ig()).phase === 'idle') { await aim(page, -3.35, 1.3, -4.25); await sleep(800); await page.keyboard.press('e') }
  await waitIg(s => s.sid?.endsWith('S1'), 40000, 's1')
  const iFrom = (await stats(page)).t
  await sleep(9000)                        // S1 낭독 9초 — 긴장층이 얹힐 자리
  const iTo = (await stats(page)).t
  await shot(page, 'audio-interro-lines')
  const aud = await fetchAudioLog(page)
  const win = aud.filter(s => s.rms != null && s.t >= iFrom && s.t <= iTo)
  interroMean = win.length ? win.reduce((p, c) => p + c.rms, 0) / win.length : null
  interroDetail = `심문 lines 평균 ${interroMean?.toFixed(1)}dB (${win.length}샘플)`
} catch (e) {
  console.log('심문 측정 실패:', e.message)
}

const aud = await fetchAudioLog(page)
const evts = await fetchEventLog(page)
saveLog('probe-audio', { audio: aud, events: evts, issues })

const active = aud.filter(s => s.rms != null)
const introMusic = active.filter(s => s.musicOn && s.t - t0 < 31)
const freeWin = active.filter(s => s.t >= freeFrom && s.t <= freeTo)
const freeMean = freeWin.length ? freeWin.reduce((p, c) => p + c.rms, 0) / freeWin.length : null

verdict([
  ['인트로 드론 발화 (musicOn ≥ 10초)', introMusic.length >= 40,
    `musicOn 샘플 ${introMusic.length}/40 (t<${(t0 + 31).toFixed(0)})`],
  ['자유 배회 무음 없음 (rms<-55dB 0건)', freeWin.length > 0 && freeWin.every(s => s.rms > -55),
    `기준선 평균 ${freeMean?.toFixed(1)}dB`],
  ['심문 역전 해소 (lines ≥ 배회 -1dB)',
    interroMean != null && freeMean != null && interroMean >= freeMean - 1.0,
    `${interroDetail} vs 배회 ${freeMean?.toFixed(1)}dB`],
  ['콘솔 에러·경고 0', issues.length === 0, issues.slice(0, 3).join(' | ')]
])
await browser.close()
