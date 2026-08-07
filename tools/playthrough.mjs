// E2 골든 패스 표를 소비하는 결정론적 브라우저 완주·캡처 하네스.
//   node tools/playthrough.mjs --fast --act 1
//   node tools/playthrough.mjs --paced --act 1
//   node tools/playthrough.mjs --capture first30 --out shots/p1-06
import { chromium } from 'playwright'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
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
  const mode = args.includes('--paced') ? 'paced' : args.includes('--fast') ? 'fast' : null
  const act = Number(value('--act') ?? 1)
  const out = value('--out') ?? 'shots/playthrough'
  if (capture && mode) throw new Error('--capture와 --fast/--paced는 함께 쓸 수 없습니다')
  if (!capture && !mode) throw new Error('--fast, --paced, --capture 중 하나가 필요합니다')
  if (!capture && act !== 1) throw new Error('현재 수직 슬라이스는 --act 1만 지원합니다')
  if (capture && capture !== 'first30') throw new Error(`알 수 없는 캡처 구간: ${capture}`)
  return { capture, mode, act, out }
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
    await this.page.goto(`http://127.0.0.1:${PORT}/?qa=1`, { waitUntil: 'load', timeout: 120000 })
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
    await this.qa(this.mode === 'paced' ? 'walk' : 'goto', id)
    return this.qa('interact', id)
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
  await page.waitForFunction(() => window.__CECIL__?.ready && window.__ENGINE__?.get('title')?.active === 'title', null, { timeout: 240000 })
  await page.mouse.click(640, 360)
  await page.waitForFunction(() => window.__ENGINE__?.get('cinematics')?.playing, null, { timeout: 30000 })

  const frames = []
  for (let t = 0; t <= 30; t++) {
    await page.waitForFunction(target => {
      const cinematic = window.__ENGINE__?.get('cinematics')
      return cinematic && cinematic.clock >= target
    }, t, { timeout: 5000 })
    const name = `first30-t${String(t).padStart(3, '0')}.png`
    await page.screenshot({ path: join(out, name), timeout: 120000 })
    frames.push({ t, file: name })
  }

  const bootErrors = await page.evaluate(() => window.__CECIL__.errors ?? [])
  const report = {
    source: 'packets/PACKET-T-P1-06.md E2 first30',
    intervalSeconds: 1,
    segments: timeline.first30,
    frames,
    console: consoleIssues.concat(bootErrors)
  }
  writeFileSync(join(out, 'first30-report.json'), JSON.stringify(report, null, 2))
  if (report.console.length) throw new Error(`콘솔 문제 ${report.console.join(' | ')}`)
  console.log(`first30 캡처 PASS: ${frames.length}프레임 · ${timeline.first30.length}행 · ${out}`)
  console.log(`파일명 범위: ${frames[0].file} … ${frames[frames.length - 1].file}`)
  console.log('콘솔 PASS: error 0 · warning 0')
  await page.close()
}

const options = parseArgs(process.argv.slice(2))
const timeline = loadTimeline()
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
