#!/usr/bin/env node
// 배포 검증 — 정적 산출물이 "링크 클릭만으로" 도는지 실제로 확인한다.
//
//   node tools/serve-check.mjs                         # dist/ 를 루트에 얹고 검사
//   node tools/serve-check.mjs --prefix /cecil-hotel-noir   # 서브패스(GitHub Pages 프로젝트 사이트) 재현
//   node tools/serve-check.mjs --dir dist --port 8123
//
// 심사자는 링크를 한 번 클릭할 뿐이다 — 그 한 번에 부팅·렌더·콘솔 0 이 전부 성립해야 한다.
// 로컬 dev 서버가 도는 것은 증거가 아니다(vite 가 경로를 보정해 준다). 이 검사기는
// 보정 없는 순수 정적 서버라, 베이스 경로가 틀리면 여기서 404 로 드러난다.

import { createServer } from 'node:http'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, extname, resolve } from 'node:path'
import { chromium } from 'playwright'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const arg = (name, dflt) => {
  const i = process.argv.indexOf(name)
  return i > -1 ? process.argv[i + 1] : dflt
}
const DIST = resolve(ROOT, arg('--dir', 'dist'))
const PREFIX = (arg('--prefix', '') || '').replace(/\/$/, '')
const PORT = Number(arg('--port', 8123))

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
}

if (!existsSync(join(DIST, 'index.html'))) {
  console.error(`배포 산출물이 없다 — ${DIST}/index.html. 먼저 빌드하라.`)
  process.exit(2)
}

const server = createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0])
  if (PREFIX) {
    if (!p.startsWith(PREFIX)) { res.writeHead(404); return res.end(`서브패스 밖 요청: ${p}`) }
    p = p.slice(PREFIX.length) || '/'
  }
  if (p === '/') p = '/index.html'
  const f = join(DIST, p)
  if (!f.startsWith(DIST) || !existsSync(f) || !statSync(f).isFile()) {
    res.writeHead(404); return res.end(`없음: ${p}`)
  }
  res.writeHead(200, { 'content-type': MIME[extname(f)] ?? 'application/octet-stream' })
  res.end(readFileSync(f))
})
await new Promise(r => server.listen(PORT, '127.0.0.1', r))

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=metal'] })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const noise = [], failed = []
page.on('console', m => {
  if (m.type() === 'error' || m.type() === 'warning') noise.push(`[${m.type()}] ${m.text().slice(0, 200)}`)
})
page.on('pageerror', e => noise.push(`[pageerror] ${String(e).slice(0, 200)}`))
page.on('requestfailed', r => failed.push(`${r.failure()?.errorText}  ${r.url().slice(0, 140)}`))

const url = `http://127.0.0.1:${PORT}${PREFIX}/`
console.log(`배포 검증 — ${url}  (산출물 ${DIST.replace(ROOT + '/', '')})`)

let booted = false
try {
  await page.goto(url, { waitUntil: 'load', timeout: 60000 })
  await page.waitForFunction(() => !!window.__CECIL__, { timeout: 120000 })
  booted = true
} catch (e) {
  noise.push(`[goto] ${String(e).split('\n')[0].slice(0, 200)}`)
}
await page.waitForTimeout(4000)

const canvas = await page.evaluate(() => {
  const c = document.querySelector('canvas')
  return c ? { w: c.width, h: c.height } : null
}).catch(() => null)
const title = await page.title().catch(() => '(읽기 실패)')

const ok = booted && failed.length === 0 && noise.length === 0 && !!canvas
console.log(`  부팅(window.__CECIL__)  ${booted ? '성립' : '실패'}`)
console.log(`  캔버스                  ${canvas ? `${canvas.w}×${canvas.h}` : '없음'}`)
console.log(`  <title>                 ${title}`)
console.log(`  요청 실패               ${failed.length}건`)
for (const f of failed.slice(0, 10)) console.log(`      ${f}`)
console.log(`  콘솔 에러·경고          ${noise.length}건`)
for (const n of noise.slice(0, 12)) console.log(`      ${n}`)
console.log(`\n  ${ok ? 'PASS' : 'FAIL'} — 링크 한 번으로 ${ok ? '실행된다' : '실행되지 않는다'}`)

await browser.close()
server.close()
process.exit(ok ? 0 : 1)
