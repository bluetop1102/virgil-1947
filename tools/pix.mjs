// pix.mjs — 픽셀 검사·회귀 게이트.
//
//   node tools/pix.mjs crop  <src.png> <out.png> <x> <y> <w> <h> [zoom]
//   node tools/pix.mjs stats <img.png> [--json]
//   node tools/pix.mjs diff  <baseline.png> <candidate.png> [--heat out.png] [--json]
//
// 왜 필요한가: 심사자의 절대 점수만으로는 회귀가 안 보인다. 라운드4가 카펫을 고치면서
// 스미어와 에일리어싱을 새로 만든 것을 아무도 잡지 못했다. 여기서 재는 것은 "무엇이 몇 점인가"가
// 아니라 "직전 기준선 대비 무엇이 나빠졌는가"다.
//
// 지표는 전부 실격 항목(D1·D3·D6)과 이번 라운드의 결함에 직결되게 골랐다.
//   speckle  D1  이웃 4방향 모두와 크게 어긋나는 고립 픽셀(반딧불·계단 픽셀) 비율 ×1e4
//   streak   —   |dI/dx| 대비 |dI/dy| 비대칭. 수직 가닥이 늘면 올라간다
//   clipLo   D6  순수 흑(<3/255) 비율 %
//   clipHi   D6  블로우아웃(>250/255, 3채널 모두) 비율 %
//   flat     G6  32px 타일 표준편차가 1.2/255 미만인 면적 비율 %
//   detail   G6  국소 대비(3px 라플라시안 절댓값)의 중앙값 ×1e3
//   lumaMean —   평균 휘도. 노출이 통째로 움직였는지 본다
//
// 판정 규칙은 THRESH 에 있다. 하나라도 REGRESS면 그 라운드는 롤백 대상이다.

import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const METRICS = ['speckle', 'streak', 'clipLo', 'clipHi', 'flat', 'detail', 'lumaMean']

// [지표, 나쁜 방향, 허용 오차] — 허용 오차를 넘어 나쁜 방향으로 움직이면 REGRESS
const THRESH = {
  speckle: ['up', 3.0],
  streak: ['up', 0.06],
  clipLo: ['up', 1.2],
  clipHi: ['up', 0.35],
  flat: ['up', 1.5],
  detail: ['down', 3.0],
  lumaMean: ['both', 12.0]
}

async function withPage (fn) {
  const br = await chromium.launch()
  try {
    const pg = await br.newPage({ viewport: { width: 64, height: 64 } })
    await pg.setContent('<canvas id=c></canvas>')
    return await fn(pg)
  } finally { await br.close() }
}

const b64 = f => fs.readFileSync(f).toString('base64')

// 브라우저 안에서 도는 분석기. 한 번의 evaluate 로 전 지표를 뽑는다.
const ANALYZE = async ([src]) => {
  const img = new Image(); img.src = 'data:image/png;base64,' + src
  await img.decode()
  const W = img.naturalWidth, H = img.naturalHeight
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d', { willReadFrequently: true })
  g.drawImage(img, 0, 0)
  const d = g.getImageData(0, 0, W, H).data
  const L = new Float32Array(W * H)
  let clipLo = 0, clipHi = 0, sum = 0
  for (let i = 0, p = 0; i < W * H; i++, p += 4) {
    const r = d[p], gg = d[p + 1], b = d[p + 2]
    const l = 0.2126 * r + 0.7152 * gg + 0.0722 * b
    L[i] = l; sum += l
    if (r < 3 && gg < 3 && b < 3) clipLo++
    if (r > 250 && gg > 250 && b > 250) clipHi++
  }
  // speckle: 상하좌우 이웃 전부와 같은 부호로 크게 어긋나는 고립 픽셀
  let speck = 0
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x, v = L[i]
      const a = v - L[i - 1], b = v - L[i + 1], u = v - L[i - W], w = v - L[i + W]
      const T = 14
      if ((a > T && b > T && u > T && w > T) || (a < -T && b < -T && u < -T && w < -T)) speck++
    }
  }
  // streak: 수평 기울기 에너지 대비 수직 기울기 에너지. 수직 가닥이 많으면 gx가 gy보다 커진다
  let gx = 0, gy = 0
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x
      gx += Math.abs(L[i + 1] - L[i - 1])
      gy += Math.abs(L[i + W] - L[i - W])
    }
  }
  // flat / detail: 32px 타일 표준편차 + 라플라시안 중앙값
  const TS = 32
  let flatTiles = 0, tiles = 0
  for (let ty = 0; ty + TS <= H; ty += TS) {
    for (let tx = 0; tx + TS <= W; tx += TS) {
      let s = 0, s2 = 0
      for (let y = ty; y < ty + TS; y += 2) for (let x = tx; x + 1 < tx + TS; x += 2) {
        const v = L[y * W + x]; s += v; s2 += v * v
      }
      const n = (TS / 2) * (TS / 2)
      const sd = Math.sqrt(Math.max(0, s2 / n - (s / n) * (s / n)))
      tiles++; if (sd < 1.2) flatTiles++
    }
  }
  const lap = []
  for (let y = 2; y < H - 2; y += 3) for (let x = 2; x < W - 2; x += 3) {
    const i = y * W + x
    lap.push(Math.abs(4 * L[i] - L[i - 1] - L[i + 1] - L[i - W] - L[i + W]))
  }
  lap.sort((a, b) => a - b)
  return {
    W, H,
    speckle: +(speck / (W * H) * 1e4).toFixed(3),
    streak: +(gx / Math.max(gy, 1e-6)).toFixed(4),
    clipLo: +(clipLo / (W * H) * 100).toFixed(3),
    clipHi: +(clipHi / (W * H) * 100).toFixed(3),
    flat: +(flatTiles / tiles * 100).toFixed(2),
    detail: +(lap[lap.length >> 1] * 1e3 / 255).toFixed(2),
    lumaMean: +(sum / (W * H)).toFixed(3)
  }
}

// 타일 단위 변화량 + 히트맵. 어느 영역이 바뀌었는지 귀속용.
const DIFF = async ([a, b, TS]) => {
  const load = async s => {
    const im = new Image(); im.src = 'data:image/png;base64,' + s
    await im.decode()
    const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight
    const g = c.getContext('2d', { willReadFrequently: true })
    g.drawImage(im, 0, 0)
    return { d: g.getImageData(0, 0, c.width, c.height).data, W: c.width, H: c.height }
  }
  const A = await load(a), B = await load(b)
  if (A.W !== B.W || A.H !== B.H) return { error: 'size mismatch ' + A.W + 'x' + A.H + ' vs ' + B.W + 'x' + B.H }
  const W = A.W, H = A.H
  const out = document.createElement('canvas'); out.width = W; out.height = H
  const og = out.getContext('2d')
  const oi = og.createImageData(W, H)
  let total = 0, changed = 0
  const cols = Math.ceil(W / TS), rows = Math.ceil(H / TS)
  const tile = new Float64Array(cols * rows), tileN = new Float64Array(cols * rows)
  for (let y = 0, p = 0; y < H; y++) {
    for (let x = 0; x < W; x++, p += 4) {
      const dr = Math.abs(A.d[p] - B.d[p]), dg = Math.abs(A.d[p + 1] - B.d[p + 1]), db = Math.abs(A.d[p + 2] - B.d[p + 2])
      const m = (dr + dg + db) / 3
      total += m; if (m > 6) changed++
      const ti = (y / TS | 0) * cols + (x / TS | 0)
      tile[ti] += m; tileN[ti]++
      const base = (A.d[p] * 0.2126 + A.d[p + 1] * 0.7152 + A.d[p + 2] * 0.0722) * 0.28
      const hot = Math.min(255, m * 5)
      oi.data[p] = Math.min(255, base + hot)
      oi.data[p + 1] = Math.min(255, base + hot * 0.25)
      oi.data[p + 2] = Math.min(255, base + Math.max(0, 60 - m * 5))
      oi.data[p + 3] = 255
    }
  }
  og.putImageData(oi, 0, 0)
  const list = []
  for (let i = 0; i < tile.length; i++) list.push({ x: (i % cols) * TS, y: (i / cols | 0) * TS, v: +(tile[i] / tileN[i]).toFixed(2) })
  list.sort((p, q) => q.v - p.v)
  return {
    meanDiff: +(total / (W * H)).toFixed(3),
    changedPct: +(changed / (W * H) * 100).toFixed(2),
    hotTiles: list.slice(0, 14),
    heat: out.toDataURL('image/png')
  }
}

const cmd = process.argv[2]
const args = process.argv.slice(3).filter(a => !a.startsWith('--'))
const flag = n => { const i = process.argv.indexOf('--' + n); return i < 0 ? null : (process.argv[i + 1] ?? true) }

if (cmd === 'crop') {
  const [src, out, X, Y, W, H, Z] = args
  const z = Z ? +Z : 1
  const w = Math.round(+W * z), h = Math.round(+H * z)
  await withPage(async pg => {
    await pg.setViewportSize({ width: w, height: h })
    await pg.setContent(`<style>html,body{margin:0}canvas{display:block}</style><canvas id=c width=${w} height=${h}></canvas>`)
    await pg.evaluate(async ([s, x, y, sw, sh, dw, dh]) => {
      const im = new Image(); im.src = 'data:image/png;base64,' + s
      await im.decode()
      const g = document.getElementById('c').getContext('2d')
      g.imageSmoothingEnabled = false
      g.drawImage(im, x, y, sw, sh, 0, 0, dw, dh)
    }, [b64(src), +X, +Y, +W, +H, w, h])
    await pg.locator('#c').screenshot({ path: out })
  })
  console.log(`crop → ${out}  (${+W}x${+H} @${+X},${+Y} ×${z})`)
} else if (cmd === 'sheet') {
  // sheet <out.png> <x> <y> <w> <h> <cols> <zoom> <img...>  — 같은 영역을 여러 컷에서 잘라 라벨과 함께 격자로 붙인다
  const [out, X, Y, W, H, COLS, Z, ...imgs] = args
  const z = +Z, cw = Math.round(+W * z), ch = Math.round(+H * z), cols = +COLS
  const rows = Math.ceil(imgs.length / cols)
  const LB = 26, PAD = 6
  const tw = cols * (cw + PAD) + PAD, th = rows * (ch + LB + PAD) + PAD
  await withPage(async pg => {
    await pg.setViewportSize({ width: tw, height: th })
    await pg.setContent(`<style>html,body{margin:0;background:#111}canvas{display:block}</style><canvas id=c width=${tw} height=${th}></canvas>`)
    await pg.evaluate(async ([list, X, Y, W, H, cw, ch, cols, LB, PAD, tw, th]) => {
      const g = document.getElementById('c').getContext('2d')
      g.imageSmoothingEnabled = false
      g.fillStyle = '#111'; g.fillRect(0, 0, tw, th)
      for (let i = 0; i < list.length; i++) {
        const im = new Image(); im.src = 'data:image/png;base64,' + list[i].b
        await im.decode()
        const cx = PAD + (i % cols) * (cw + PAD)
        const cy = PAD + ((i / cols) | 0) * (ch + LB + PAD)
        g.fillStyle = '#eee'; g.font = 'bold 17px monospace'
        g.fillText(list[i].n, cx + 2, cy + 18)
        g.drawImage(im, X, Y, W, H, cx, cy + LB, cw, ch)
      }
    }, [imgs.map(f => ({ n: path.basename(f, '.png'), b: b64(f) })), +X, +Y, +W, +H, cw, ch, cols, LB, PAD, tw, th])
    await pg.locator('#c').screenshot({ path: out })
  })
  console.log(`sheet → ${out}  ${imgs.length}컷 ${tw}×${th}`)
} else if (cmd === 'stats') {
  const r = await withPage(pg => pg.evaluate(ANALYZE, [b64(args[0])]))
  console.log(flag('json') ? JSON.stringify(r) : fmtStats(path.basename(args[0]), r))
} else if (cmd === 'diff') {
  const [base, cand] = args
  const res = await withPage(async pg => ({
    a: await pg.evaluate(ANALYZE, [b64(base)]),
    b: await pg.evaluate(ANALYZE, [b64(cand)]),
    d: await pg.evaluate(DIFF, [b64(base), b64(cand), 160])
  }))
  if (res.d.error) { console.error('ERROR ' + res.d.error); process.exit(2) }
  const heat = flag('heat')
  if (heat) fs.writeFileSync(heat, Buffer.from(res.d.heat.split(',')[1], 'base64'))
  const verdicts = {}
  let worst = 'PASS'
  for (const m of METRICS) {
    const [dir, tol] = THRESH[m]
    const dv = res.b[m] - res.a[m]
    let v = 'ok'
    if (dir === 'up' && dv > tol) v = 'REGRESS'
    else if (dir === 'down' && dv < -tol) v = 'REGRESS'
    else if (dir === 'both' && Math.abs(dv) > tol) v = 'REGRESS'
    else if ((dir === 'up' && dv < -tol) || (dir === 'down' && dv > tol)) v = 'better'
    verdicts[m] = { base: res.a[m], cand: res.b[m], delta: +dv.toFixed(3), verdict: v }
    if (v === 'REGRESS') worst = 'REGRESS'
  }
  const out = { gate: worst, meanDiff: res.d.meanDiff, changedPct: res.d.changedPct, metrics: verdicts, hotTiles: res.d.hotTiles }
  if (flag('json')) { console.log(JSON.stringify(out, null, 2)); process.exit(worst === 'REGRESS' ? 1 : 0) }
  console.log(`\n  기준선 ${path.basename(base)}  →  후보 ${path.basename(cand)}`)
  console.log(`  전체 변화 meanDiff ${res.d.meanDiff}/255 · 유의변화 픽셀 ${res.d.changedPct}%\n`)
  console.log('  지표        기준선      후보        Δ         판정')
  for (const m of METRICS) {
    const v = verdicts[m]
    console.log(`  ${m.padEnd(10)} ${String(v.base).padStart(9)} ${String(v.cand).padStart(10)} ${String(v.delta > 0 ? '+' + v.delta : v.delta).padStart(9)}   ${v.verdict === 'REGRESS' ? '✗ REGRESS' : v.verdict === 'better' ? '✓ better' : '·'}`)
  }
  console.log(`\n  변화 집중 타일(160px): ${res.d.hotTiles.slice(0, 6).map(t => `(${t.x},${t.y})=${t.v}`).join(' ')}`)
  console.log(`\n  ▶ 게이트: ${worst}\n`)
  process.exit(worst === 'REGRESS' ? 1 : 0)
} else {
  console.log('usage: pix.mjs crop|stats|diff  (see header)')
  process.exit(1)
}

function fmtStats (name, r) {
  return `\n  ${name}  ${r.W}×${r.H}\n` + METRICS.map(m => `  ${m.padEnd(10)} ${String(r[m]).padStart(10)}`).join('\n') + '\n'
}
