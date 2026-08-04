// 출하 프레임의 휘도를 현행 인화 곡선으로 역산한 뒤 후보 파라미터를 걸어 히스토그램을 예측한다.
// 셰이더가 휘도비로 스케일하므로 채널 클램프를 무시하면 이 1D 근사가 성립한다.
import { decode, lum } from './png.mjs'

const CUR = { pivot: 0.24, slope: 0.55, width: 1.00, shoulder: 0.26, shoulderK: 0.38 }

function smoothstep (e0, e1, x) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}
function f (x, p) {
  if (x <= 0) return 0
  const md = Math.log2(Math.max(x, 1e-4) / p.pivot)
  const ma = p.slope * md * Math.exp(-md * md / (2 * p.width * p.width))
  let mo = x * Math.pow(2, ma)
  mo *= 1 - p.shoulder * smoothstep(p.shoulderK, 1, mo)
  return Math.min(1, Math.max(0, mo))
}

const N = 8192
function lut (p) { const a = new Float64Array(N + 1); for (let i = 0; i <= N; i++) a[i] = f(i / N, p); return a }
function mono (a) { let bad = 0; for (let i = 1; i <= N; i++) if (a[i] < a[i - 1] - 1e-9) bad++; return bad }
function inv (a, y) {
  let lo = 0, hi = N
  while (lo < hi) { const m = (lo + hi) >> 1; if (a[m] < y) lo = m + 1; else hi = m }
  return lo / N
}

const img = decode(process.argv[2])
const cands = JSON.parse(process.argv[3] ?? '[]')
const cur = lut(CUR)
console.log('current curve non-monotonic samples:', mono(cur))

const n = img.w * img.h
const pre = new Float64Array(n)
for (let i = 0; i < n; i++) pre[i] = inv(cur, Math.min(1, lum(img, i) / 255))

function report (name, p) {
  const a = lut(p)
  const bad = mono(a)
  const hist = new Int32Array(256)
  for (let i = 0; i < n; i++) hist[Math.min(255, Math.round(f(pre[i], p) * 255))]++
  const q = t => { const c = n * t; let s = 0; for (let v = 0; v < 256; v++) { s += hist[v]; if (s >= c) return v } return 255 }
  const band = (x, y) => { let s = 0; for (let v = x; v <= y; v++) s += hist[v]; return +(s * 100 / n).toFixed(2) }
  console.log(`${name.padEnd(26)} p05=${String(q(0.05)).padStart(3)} p25=${String(q(0.25)).padStart(3)} p50=${String(q(0.5)).padStart(3)} p75=${String(q(0.75)).padStart(3)} p95=${String(q(0.95)).padStart(3)} p999=${String(q(0.999)).padStart(3)} | L0-64=${band(0, 64)} L64-160=${band(64, 160)} L160+=${band(160, 255)} | L=0 ${(hist[0] * 100 / n).toFixed(3)}% L=255 ${(hist[255] * 100 / n).toFixed(3)}%${bad ? '  NONMONO ' + bad : ''}`)
}

report('current', CUR)
for (const c of cands) report(JSON.stringify(c), { ...CUR, ...c })
