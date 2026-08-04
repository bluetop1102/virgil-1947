// 후보 격자 탐색. 제약(순흑 0 · p05 ≥ 6 · 블로우아웃 < 0.2% · p999 200~250) 아래
// L64-160 점유율을 최대화하고 동률이면 p50 이 낮은 쪽을 고른다.
import { decode, lum } from './png.mjs'
const CUR = { pivot: 0.24, slope: 0.55, width: 1.00, shoulder: 0.26, shoulderK: 0.38 }
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
function f (x, p) {
  if (x <= 0) return 0
  const md = Math.log2(Math.max(x, 1e-4) / p.pivot)
  let mo = x * Math.pow(2, p.slope * md * Math.exp(-md * md / (2 * p.width * p.width)))
  mo *= 1 - p.shoulder * ss(p.shoulderK, 1, mo)
  return Math.min(1, Math.max(0, mo))
}
const N = 8192
const lutOf = p => { const a = new Float64Array(N + 1); for (let i = 0; i <= N; i++) a[i] = f(i / N, p); return a }
const inv = (a, y) => { let lo = 0, hi = N; while (lo < hi) { const m = (lo + hi) >> 1; if (a[m] < y) lo = m + 1; else hi = m } return lo / N }
const img = decode(process.argv[2])
const n = img.w * img.h
const cur = lutOf(CUR)
const pre = new Float64Array(n)
for (let i = 0; i < n; i++) pre[i] = inv(cur, Math.min(1, lum(img, i) / 255))

function evalP (p) {
  const a = lutOf(p)
  for (let i = 1; i <= N; i++) if (a[i] < a[i - 1] - 1e-9) return null
  const hist = new Int32Array(256)
  for (let i = 0; i < n; i++) hist[Math.min(255, Math.round(f(pre[i], p) * 255))]++
  const q = t => { const c = n * t; let s = 0; for (let v = 0; v < 256; v++) { s += hist[v]; if (s >= c) return v } return 255 }
  const band = (x, y) => { let s = 0; for (let v = x; v <= y; v++) s += hist[v]; return s * 100 / n }
  return {
    p05: q(0.05), p50: q(0.5), p75: q(0.75), p95: q(0.95), p999: q(0.999),
    lo: band(0, 64), mid: band(64, 160), hi: band(160, 255),
    black: hist[0] * 100 / n, white: hist[255] * 100 / n
  }
}
const out = []
for (const pivot of [0.16, 0.18, 0.19, 0.20, 0.21, 0.22, 0.24]) {
  for (const slope of [0.55, 0.7, 0.85, 1.0, 1.15]) {
    for (const width of [0.55, 0.7, 0.85, 1.0]) {
      for (const shoulder of [0.20, 0.26, 0.30]) {
        const p = { ...CUR, pivot, slope, width, shoulder }
        const r = evalP(p)
        if (!r) continue
        if (r.black > 0.01 || r.p05 < 6 || r.white > 0.2 || r.p999 < 200 || r.p999 > 250) continue
        out.push({ p, r })
      }
    }
  }
}
out.sort((a, b) => (b.r.mid - a.r.mid) || (a.r.p50 - b.r.p50))
for (const o of out.slice(0, 18)) {
  console.log(`pivot ${o.p.pivot} slope ${o.p.slope} width ${o.p.width} sh ${o.p.shoulder} | p05 ${o.r.p05} p50 ${o.r.p50} p75 ${o.r.p75} p95 ${o.r.p95} p999 ${o.r.p999} | lo ${o.r.lo.toFixed(2)} mid ${o.r.mid.toFixed(2)} hi ${o.r.hi.toFixed(2)} | white ${o.r.white.toFixed(3)}`)
}
console.log('candidates:', out.length)
