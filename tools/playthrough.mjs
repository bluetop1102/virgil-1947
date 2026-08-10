// E2 골든 패스 표를 소비하는 결정론적 브라우저 완주·캡처 하네스.
//   node tools/playthrough.mjs --fast --act 1
//   node tools/playthrough.mjs --paced --act 1
//   node tools/playthrough.mjs --capture first30 --out shots/p1-06
import { chromium } from 'playwright'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE = join(ROOT, 'packets/PACKET-T-P1-06.md')
const LOCK = join(ROOT, '.shot-lock')
const PORT = Number(process.env.SHOT_PORT || 5206)
const STEP = 1 / 60
const GPU_ARGS = [
  '--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization',
  '--enable-zero-copy', '--disable-frame-rate-limit', '--force-color-profile=srgb'
]

function parseArgs (args) {
  const value = flag => {
    const at = args.indexOf(flag)
    return at >= 0 ? args[at + 1] : null
  }
  const capture = value('--capture')
  const checkCapture = value('--check-capture')
  const mode = args.includes('--paced') ? 'paced' : args.includes('--fast') ? 'fast' : null
  const act = Number(value('--act') ?? 1)
  const out = value('--out') ?? 'shots/playthrough'
  if ([Boolean(capture), Boolean(checkCapture), Boolean(mode)].filter(Boolean).length !== 1) throw new Error('--fast, --paced, --capture, --check-capture 중 하나가 필요합니다')
  if (!capture && act !== 1) throw new Error('현재 수직 슬라이스는 --act 1만 지원합니다')
  if (capture && capture !== 'first30') throw new Error(`알 수 없는 캡처 구간: ${capture}`)
  return { capture, checkCapture, mode, act, out }
}

async function analyzePng (page, bytes) {
  const b64 = Buffer.from(bytes).toString('base64')
  return page.evaluate(async source => {
    const image = new Image()
    image.src = `data:image/png;base64,${source}`
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(image, 0, 0)
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    let nonBlack = 0, sum = 0, sum2 = 0, max = 0
    const count = canvas.width * canvas.height
    for (let i = 0; i < pixels.length; i += 4) {
      const luma = 0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2]
      if (pixels[i] > 2 || pixels[i + 1] > 2 || pixels[i + 2] > 2) nonBlack++
      if (luma > max) max = luma
      sum += luma
      sum2 += luma * luma
    }
    const mean = sum / count
    return {
      max: +max.toFixed(2),
      mean: +mean.toFixed(4),
      variance: +(sum2 / count - mean * mean).toFixed(4),
      nonBlack,
      nonBlackPct: +(nonBlack * 100 / count).toFixed(5)
    }
  }, b64)
}

function judgeFirst30 (frames) {
  const window = frames.filter(frame => frame.t >= 4 && frame.t <= 12)
  const pureBlack = window.filter(frame => frame.pixels && frame.pixels.nonBlackPct < 0.001 && frame.pixels.variance < 0.1)
  const visibleInk = window.filter(frame => frame.pixels && frame.pixels.nonBlack >= 20 && frame.pixels.max >= 24)
  const sameSize = window.length > 0 && new Set(window.map(frame => frame.bytes)).size === 1
  const failures = []
  if (window.length !== 9) failures.push(`t=4~12 프레임 ${window.length}/9`)
  if (pureBlack.length > 4) failures.push(`순흑 프레임 ${pureBlack.length}/9 > 4`)
  if (visibleInk.length < 4) failures.push(`가시 잉크 프레임 ${visibleInk.length}/9 < 4`)
  if (sameSize) failures.push('t=4~12 파일 크기 전부 동일')
  return { pass: failures.length === 0, window: window.length, pureBlack: pureBlack.length, visibleInk: visibleInk.length, sameSize, failures }
}

async function checkCapture (browser, directory) {
  const page = await browser.newPage({ viewport: { width: 32, height: 32 } })
  const frames = []
  for (const file of readdirSync(directory).filter(name => /^first30-t\d{3}\.png$/.test(name)).sort()) {
    const png = readFileSync(join(directory, file))
    frames.push({ t: Number(file.match(/t(\d{3})/)[1]), file, bytes: png.length, pixels: await analyzePng(page, png) })
  }
  const gate = judgeFirst30(frames)
  console.log(JSON.stringify({ directory, gate }, null, 2))
  await page.close()
  if (!gate.pass) throw new Error(`첫 30초 순흑 게이트 실패: ${gate.failures.join(' · ')}`)
}

function section (source, start, end) {
  const at = source.indexOf(start)
  const until = source.indexOf(end, at + start.length)
  if (at < 0 || until < 0) throw new Error(`E2 표 절을 찾지 못했습니다: ${start}`)
  return source.slice(at, until)
}

function seconds (stamp) {
  const match = stamp.match(/(\d+):(\d+)/)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

function clean (value) {
  return value.replace(/\*\*/g, '').replace(/`/g, '').replace(/<br\s*\/?>/gi, ' ').trim()
}

function parseRows (markdown) {
  const rows = []
  for (const line of markdown.split('\n')) {
    if (!line.startsWith('|')) continue
    const cells = line.split('|').slice(1, -1).map(clean)
    if (cells.length < 3 || !/^\d+:\d+/.test(cells[0])) continue
    const times = cells[0].match(/\d+:\d+/g) ?? []
    rows.push({
      stamp: cells[0],
      t: seconds(times[0]),
      end: seconds(times[1] ?? times[0]),
      action: cells[1],
      expect: cells.slice(2).join(' | ')
    })
  }
  return rows
}

function loadTimeline () {
  const source = readFileSync(SOURCE, 'utf8')
  const act1 = parseRows(section(source, '### 4.7 E2 1막', '### 4.8 E2 [구현]'))
  const full = parseRows(section(source, '### 4.6 E2 완주 타임라인', '### 4.7 E2 1막'))
  const first30 = parseRows(section(source, '### E2 §첫 — 첫 30초 사양', '### E7 §1'))
  if (act1.length !== 8 || first30.length !== 5) {
    throw new Error(`E2 표 파싱 수 불일치: act1=${act1.length}, first30=${first30.length}`)
  }
  return { act1, full, first30 }
}

let holdsLock = false

function lockOwnerAlive () {
  try {
    const match = readFileSync(join(LOCK, 'owner'), 'utf8').match(/^pid=(\d+)$/)
    if (!match) return true
    process.kill(Number(match[1]), 0)
    return true
  } catch (error) {
    return error?.code !== 'ESRCH'
  }
}

async function acquireLock () {
  for (let attempt = 0; attempt < 900; attempt++) {
    try {
      mkdirSync(LOCK)
      writeFileSync(join(LOCK, 'owner'), `pid=${process.pid}`)
      holdsLock = true
      return
    } catch {}
    if (!lockOwnerAlive()) {
      rmSync(LOCK, { recursive: true, force: true })
      continue
    }
    if (attempt === 0) console.log('GPU 락 대기 중 — 다른 캡처가 끝나면 자동으로 시작합니다')
    await sleep(2000)
  }
  throw new Error('GPU 락 대기 한도를 초과했습니다')
}

function releaseLock () {
  if (!holdsLock) return
  try {
    if (readFileSync(join(LOCK, 'owner'), 'utf8') === `pid=${process.pid}`) {
      rmSync(LOCK, { recursive: true, force: true })
    }
  } catch {}
  holdsLock = false
}

function serve () {
  const bin = join(ROOT, 'node_modules/.bin/vite')
  const child = spawn(bin, ['--port', String(PORT), '--strictPort'], {
    cwd: ROOT,
    stdio: 'ignore',
    detached: true,
    env: { ...process.env, SHOT: '1' }
  })
  child.unref()
  return child
}

function killServer (child) {
  if (!child?.pid) return
  try { process.kill(-child.pid, 'SIGKILL') } catch {}
  try { child.kill('SIGKILL') } catch {}
}

async function waitPort () {
  for (let attempt = 0; attempt < 120; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/`)
      if (response.ok) return
    } catch {}
    await sleep(250)
  }
  throw new Error('vite did not start')
}

function watchConsole (page) {
  const issues = []
  page.on('console', message => {
    if (message.type() === 'error' || message.type() === 'warning') {
      issues.push(`${message.type()}: ${message.text()}`)
    }
  })
  page.on('pageerror', error => issues.push(`pageerror: ${error.message}`))
  return issues
}

class QaSession {
  constructor (page, mode) {
    this.page = page
    this.mode = mode
    this.events = []
    this.cursor = 0
    this.delays = []
  }

  async open () {
    // 완주 게이트는 상태·이벤트를 판정하고 픽셀은 판정하지 않는다. low 프리셋으로 돌려야
    // 10분짜리 paced 스케줄을 풀 렌더 비용 때문에 수십 분 기다리지 않고 같은 고정 스텝으로 소비한다.
    await this.page.goto(`http://127.0.0.1:${PORT}/?qa=1&q=low`, { waitUntil: 'load', timeout: 120000 })
    await this.page.waitForFunction(() => window.__CECIL__?.ready && window.__CECIL__.qa, null, { timeout: 240000 })
    this.base = await this.time()
    await this.sync()
  }

  async qa (method, ...args) {
    const result = await this.page.evaluate(({ method, args }) => {
      const fn = window.__CECIL__?.qa?.[method]
      if (typeof fn !== 'function') throw new Error(`qa.${method} 없음`)
      return fn(...args)
    }, { method, args })
    if (result === false) throw new Error(`qa.${method}(${args.map(String).join(', ')}) 실패`)
    return result
  }

  async time () {
    return this.page.evaluate(() => window.__CECIL__.stats().time)
  }

  async advanceTo (time) {
    await this.page.evaluate(({ time, step }) => window.__CECIL__.advanceTo(time, step), { time, step: STEP })
    await this.sync()
  }

  async settle (frames = 15) {
    await this.page.evaluate(({ frames, step }) => window.__CECIL__.settle(frames, step), { frames, step: STEP })
    await this.sync()
  }

  async sync () {
    const fresh = await this.page.evaluate(since => window.__CECIL__.qa.events(since), this.cursor)
    if (fresh.length) {
      this.events.push(...fresh)
      this.cursor = fresh[fresh.length - 1].index + 1
    }
    return fresh
  }

  async waitEvent (type, predicate, from = 0, maxSeconds = 30) {
    for (let tick = 0; tick <= maxSeconds * 4; tick++) {
      const hit = this.events.slice(from).find(event => event.type === type && predicate(event.payload ?? {}))
      if (hit) return hit
      await this.settle(15)
    }
    throw new Error(`${type} 이벤트 대기 초과`)
  }

  async schedule (row) {
    const planned = this.base + row.t
    await this.advanceTo(planned)
    const actual = await this.time()
    const delay = Math.max(0, actual - planned)
    this.delays.push({ stamp: row.stamp, planned: row.t, actual: actual - this.base, delay })
    console.log(`행 ${row.stamp} 시작 ${formatSeconds(actual - this.base)} · 지연 ${delay.toFixed(2)}초`)
  }

  async moveAndInteract (id) {
    const from = this.events.length
    const moved = await this.qa(this.mode === 'paced' ? 'walk' : 'goto', id)
    await this.sync()
    const interacted = await this.qa('interact', id)
    await this.sync()
    const observed = this.events.slice(from).filter(event =>
      event.type === 'player:interact' || event.type === 'act:enter' || event.type === 'interrogation:left' || event.type === 'qa:walk:fallback')
    if (id === 'lobby/elevator') {
      console.log(`엘리베이터 추적: move=${moved} interact=${interacted} events=${observed.map(event => `${event.type}(${event.payload?.targetId || ''})@${event.time.toFixed(2)}`).join(',') || '(없음)'}`)
    }
    if (!observed.some(event => event.type === 'player:interact')) {
      throw new Error(`${id} player:interact 이벤트 미발화`)
    }
    return interacted
  }

  async state () { return this.qa('state') }
}

function formatSeconds (value) {
  const rounded = Math.max(0, Math.round(value))
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')}`
}

async function collectLobby (session) {
  const targets = [
    ['lobby/front-desk', 'register'],
    ['lobby/behind-desk', 'keyrack'],
    ['lobby/under-desk', 'flask']
  ]
  for (const [target, evidence] of targets) {
    await session.moveAndInteract(target)
    const state = await session.state()
    if (!state.evidence.includes(evidence)) throw new Error(`${evidence} 획득 실패`)
  }
  await session.moveAndInteract('radio-lobby')
  await session.moveAndInteract('lobby-frame')
}

async function answer (session, sid, choice, evidence) {
  const from = session.events.length
  await session.waitEvent('interrogation:prompt', payload => payload.sid === sid, 0)
  await session.qa('choose', { sid, choice, ...(evidence ? { evidence } : {}) })
  await session.sync()
  const verdict = await session.waitEvent('interrogation:verdict', () => true, from, 2)
  if (choice !== 'LIE' && !verdict.payload.correct) throw new Error(`${sid} 정답 판정 실패`)
  if (choice === 'LIE' && !verdict.payload.correct) throw new Error(`${sid} 증거 판정 실패`)
}

async function actOnRow (session, row) {
  if (row.expect.includes('register') && row.expect.includes('keyrack') && row.expect.includes('flask')) {
    await collectLobby(session)
    return
  }
  if (/S1\(진실\)|S1 —/.test(row.action)) {
    await session.moveAndInteract('npc/deitch')
    await answer(session, 'deitch.S1', 'TRUTH')
  } else if (/S2\(거짓\)|C1.*S2/.test(row.action)) {
    await answer(session, 'deitch.S2', 'LIE', 'register')
  } else if (/S3\(진실\)/.test(row.action)) {
    await answer(session, 'deitch.S3', 'TRUTH')
  } else if (/S4\(거짓\)/.test(row.action)) {
    await answer(session, 'deitch.S4', 'LIE', 'keyrack')
  } else if (/S5\(진실\)/.test(row.action)) {
    await answer(session, 'deitch.S5', 'TRUTH')
  } else if (row.expect.includes('act:enter {act:2}')) {
    await session.moveAndInteract('lobby/elevator')
  }
}

function maxIncidentGap (rows, boundary) {
  const points = [...new Set(rows.map(row => row.t).filter(t => t != null && t <= boundary))].sort((a, b) => a - b)
  let max = 0
  for (let i = 1; i < points.length; i++) max = Math.max(max, points[i] - points[i - 1])
  return max
}

async function runAct1 (browser, timeline, mode) {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } })
  const consoleIssues = watchConsole(page)
  const session = new QaSession(page, mode)
  await session.open()
  console.log(`E2 소비: ${timeline.act1.length}행 · 모드 ${mode}`)

  for (const row of timeline.act1) {
    if (mode === 'paced') await session.schedule(row)
    await actOnRow(session, row)
  }

  const endedAt = session.events.length
  await session.waitEvent('interrogation:end', payload => payload.npc === 'deitch', 0, 30)
  let state = await session.state()
  if (state.act !== 2) {
    const elevator = timeline.act1[timeline.act1.length - 1]
    if (mode === 'paced' && (await session.time()) < session.base + elevator.t) await session.schedule(elevator)
    await session.moveAndInteract('lobby/elevator')
    await session.sync()
    state = await session.state()
  }

  const required = ['register', 'keyrack', 'flask', 'pressure-log']
  const missing = required.filter(id => !state.evidence.includes(id))
  const act2 = session.events.find(event => event.type === 'act:enter' && event.payload?.act === 2)
  const lore = session.events.filter(event => event.type === 'lore:heard')
  const boundary = timeline.act1[timeline.act1.length - 1].end
  const actualBoundary = act2 ? act2.time - session.base : Infinity
  const maxBoundary = boundary * 1.4
  const gap = maxIncidentGap(timeline.full, boundary)
  const bootErrors = await page.evaluate(() => window.__CECIL__.errors ?? [])

  if (missing.length) throw new Error(`증거 4종 미획득: ${missing.join(', ')}`)
  if (!act2) throw new Error('act:enter {act:2} 미도달')
  if (lore.length < 3) throw new Error(`lore:heard 부족: ${lore.length}/3`)
  if (mode === 'paced' && actualBoundary > maxBoundary) throw new Error('1막 경계 +40% 상한 초과')
  if (gap > 180) throw new Error(`무사건 간격 초과: ${gap}초`)
  if (consoleIssues.length || bootErrors.length) throw new Error(`콘솔 문제 ${consoleIssues.concat(bootErrors).join(' | ')}`)

  console.log(`증거 4종 PASS: ${required.join(', ')}`)
  console.log(`괴담 접촉 PASS: lore:heard ${lore.length}건`)
  console.log(`1막 완주 PASS: act:enter{act:2} @ ${formatSeconds(actualBoundary)} (상한 ${formatSeconds(maxBoundary)})`)
  console.log(`무사건 간격 PASS: 최대 ${formatSeconds(gap)} (기준 3:00 이하)`)
  console.log('콘솔 PASS: error 0 · warning 0')
  await page.close()
  return { endedAt, state, actualBoundary, gap }
}

async function runCapture (browser, timeline, out) {
  mkdirSync(out, { recursive: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })
  const consoleIssues = watchConsole(page)
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load', timeout: 120000 })
  // 입장 게이트(S-K 2026-08-10)를 먼저 통과한다 — 로딩이 끝나도 타이틀은 스스로 열리지 않는다.
  // 첫 클릭이 그 제스처, 두 번째 클릭이 체크인이다. 게이트가 없는 판에서는 첫 조건이 바로 title 이 된다.
  await page.waitForFunction(() => {
    const title = window.__ENGINE__?.get('title')
    return window.__CECIL__?.ready && title && (title.active === 'gate' || title.active === 'title')
  }, null, { timeout: 240000 })
  if (await page.evaluate(() => window.__ENGINE__?.get('title')?.active === 'gate')) {
    await page.mouse.click(640, 360)
    await page.waitForFunction(() => window.__ENGINE__?.get('title')?.active === 'title', null, { timeout: 60000 })
  }
  await page.mouse.click(640, 360)
  await page.waitForFunction(() => window.__ENGINE__?.get('cinematics')?.playing, null, { timeout: 30000 })

  const frames = []
  for (let t = 0; t <= 30; t++) {
    await page.waitForFunction(target => {
      const cinematic = window.__ENGINE__?.get('cinematics')
      return cinematic && cinematic.clock >= target
    }, t, { timeout: 5000 })
    const name = `first30-t${String(t).padStart(3, '0')}.png`
    const png = await page.screenshot({ path: join(out, name), timeout: 120000 })
    frames.push({ t, file: name, bytes: png.length, pixels: await analyzePng(page, png) })
  }

  const bootErrors = await page.evaluate(() => window.__CECIL__.errors ?? [])
  const introGate = judgeFirst30(frames)
  const report = {
    source: 'packets/PACKET-T-P1-06.md E2 first30',
    intervalSeconds: 1,
    segments: timeline.first30,
    frames,
    introGate,
    console: consoleIssues.concat(bootErrors)
  }
  writeFileSync(join(out, 'first30-report.json'), JSON.stringify(report, null, 2))
  if (report.console.length) throw new Error(`콘솔 문제 ${report.console.join(' | ')}`)
  if (!introGate.pass) throw new Error(`첫 30초 순흑 게이트 실패: ${introGate.failures.join(' · ')}`)
  console.log(`first30 캡처 PASS: ${frames.length}프레임 · ${timeline.first30.length}행 · ${out}`)
  console.log(`인트로 픽셀 PASS: 순흑 ${introGate.pureBlack}/9 · 가시 잉크 ${introGate.visibleInk}/9 · 단일크기 ${introGate.sameSize ? 'YES' : 'NO'}`)
  console.log(`파일명 범위: ${frames[0].file} … ${frames[frames.length - 1].file}`)
  console.log('콘솔 PASS: error 0 · warning 0')
  await page.close()
}

const options = parseArgs(process.argv.slice(2))
const timeline = loadTimeline()
if (options.checkCapture) {
  const browser = await chromium.launch({ headless: true })
  try { await checkCapture(browser, resolve(ROOT, options.checkCapture)) } finally { await browser.close() }
  process.exit(0)
}
await acquireLock()
const server = serve()
process.on('exit', () => { releaseLock(); killServer(server) })
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => { releaseLock(); killServer(server); process.exit(1) })
}

let browser
try {
  await waitPort()
  browser = await chromium.launch({ headless: true, args: GPU_ARGS })
  if (options.capture) await runCapture(browser, timeline, resolve(ROOT, options.out))
  else await runAct1(browser, timeline, options.mode)
} finally {
  await browser?.close()
  releaseLock()
  killServer(server)
}
