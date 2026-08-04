// 라운드 판정 지표. node scratchpad/lit1/an.mjs <png...>
// 접합선은 눈대중이 아니라 카메라 투영으로 잡는다(proj.mjs).
import { decode, lum, box } from './png.mjs'
import { px } from './proj.mjs'

// 월드 z를 따라 접합선을 샘플. 각 샘플에서 화면 세로 오프셋 d 의 휘도를 모은다.
function edgeProfile (L, w, h, pts, span = 60) {
  const out = []
  for (let d = -span; d <= span; d++) {
    let s = 0, c = 0
    for (const [x, y] of pts) {
      const yy = y + d
      if (x < 0 || x >= w || yy < 0 || yy >= h) continue
      s += L[yy * w + x]; c++
    }
    out.push(c ? s / c : NaN)
  }
  return out
}

function sample (wx, wy, z0, z1, n) {
  const p = []
  for (let i = 0; i <= n; i++) {
    const z = z0 + (z1 - z0) * i / n
    const [x, y] = px([wx, -500 + wy, z])
    if (x >= 2 && x < 2558 && y >= 2 && y < 1438) p.push([x, y])
  }
  return p
}

// 그레인은 픽셀 스케일이라 1px 편차 RMS 를 지배한다 — 5×5 와 21×21 사이의 대역만 본다.
function midContrast (L, w, r) {
  let s = 0, c = 0
  for (let y = r[1] + 10; y < r[3] - 10; y++) for (let x = r[0] + 10; x < r[2] - 10; x++) {
    let a = 0, b = 0
    for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) a += L[(y + j) * w + x + i]
    for (let j = -10; j <= 10; j += 2) for (let i = -10; i <= 10; i += 2) b += L[(y + j) * w + x + i]
    const d = a / 25 - b / 121
    s += d * d; c++
  }
  return Math.sqrt(s / Math.max(c, 1))
}
function range (L, w, r) {
  const v = []
  for (let y = r[1]; y < r[3]; y++) for (let x = r[0]; x < r[2]; x++) v.push(L[y * w + x])
  v.sort((a, b) => a - b)
  return v[Math.floor(v.length * 0.9)] - v[Math.floor(v.length * 0.1)]
}

// 국소 대비 = 5×5 평균에서의 편차 RMS
function localContrast (L, w, r) {
  let s = 0, c = 0
  for (let y = r[1] + 2; y < r[3] - 2; y++) for (let x = r[0] + 2; x < r[2] - 2; x++) {
    let m = 0
    for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) m += L[(y + j) * w + x + i]
    m /= 25
    const d = L[y * w + x] - m
    s += d * d; c++
  }
  return Math.sqrt(s / Math.max(c, 1))
}

const BOX = {
  nearWallpaperL: [40, 60, 600, 700],
  nearWallR: [2100, 100, 2555, 900],
  // 조명 조건이 비슷한 면끼리 비교해야 대기 원근 판정이 성립한다 — 좌측 웨인스코트(2m) ↔ 끝벽 웨인스코트(15m)
  nearWainscot: [300, 950, 900, 1240],
  farWainscot: [1335, 790, 1525, 872],
  farWall: [1335, 660, 1525, 770]
}

const EDGES = {
  // 좌측 웨인스코트 밑단 ↔ 마루
  wallFloorL: sample(-1.42, 0, 0.9, -2.6, 120),
  // 우측 벽 ↔ 마루
  wallFloorR: sample(1.42, 0, 0.6, -2.6, 120),
  // 러너 좌측 가장자리 ↔ 마루
  carpetL: sample(-1.0, 0, 0.9, -2.6, 120),
  // 웨인스코트 상단 캡 ↔ 벽지 (좌)
  wainCapL: sample(-1.42, 1.06, 1.2, -2.6, 120)
}

for (const f of process.argv.slice(2)) {
  const img = decode(f)
  const L = lum(img), w = img.w, h = img.h
  const b = {}
  for (const k in BOX) b[k] = box(L, w, BOX[k])
  const lc = {}, mc = {}, rg = {}
  for (const k in BOX) { lc[k] = +localContrast(L, w, BOX[k]).toFixed(2); mc[k] = +midContrast(L, w, BOX[k]).toFixed(2); rg[k] = +range(L, w, BOX[k]).toFixed(1) }

  console.log(`\n=== ${f}`)
  console.log('  box   ', Object.entries(b).map(([k, v]) => `${k}=${v.mean}/${v.sd}`).join('  '))
  console.log('  mid   ', JSON.stringify(mc), ' nearL/far', (mc.nearWallpaperL / mc.farWainscot).toFixed(2), ' nearR/far', (mc.nearWallR / mc.farWainscot).toFixed(2))
  console.log('  p90-10', JSON.stringify(rg), ' nearL/far', (rg.nearWallpaperL / rg.farWainscot).toFixed(2), ' nearR/far', (rg.nearWallR / rg.farWainscot).toFixed(2))
  console.log('  local ', JSON.stringify(lc),
    ' nearL/far', (lc.nearWallpaperL / lc.farWainscot).toFixed(2),
    ' nearR/far', (lc.nearWallR / lc.farWainscot).toFixed(2),
    ' farMean/nearMean', (b.farWainscot.mean / b.nearWallpaperL.mean).toFixed(2))
  for (const k in EDGES) {
    const p = edgeProfile(L, w, h, EDGES[k])
    const at = d => p[d + 60]
    let mv = 1e9, md = 0
    for (let d = -18; d <= 18; d++) if (at(d) < mv) { mv = at(d); md = d }
    const above = (at(-45) + at(-40) + at(-35)) / 3
    const below = (at(35) + at(40) + at(45)) / 3
    console.log(`  ${k.padEnd(11)} above=${above.toFixed(1)} min@${md}=${mv.toFixed(1)} below=${below.toFixed(1)}` +
      `  drop ${(100 * (1 - mv / Math.min(above, below))).toFixed(1)}% / ${(100 * (1 - mv / Math.max(above, below))).toFixed(1)}%`)
    if (process.env.DUMP) console.log('      ', p.map((v, i) => (i % 5 === 0 ? `${i - 60}:${v.toFixed(0)}` : '')).filter(Boolean).join(' '))
  }
}
