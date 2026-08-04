// 전체 프레임 휘도 히스토그램 + 구간 점유율. 심사 지표(p05/p50/p95, L구간 비율)와 같은 정의.
import { decode, lum } from './png.mjs'
const path = process.argv[2]
const img = decode(path)
const n = img.w * img.h
const hist = new Int32Array(256)
let black = 0, white = 0, sum = 0
for (let i = 0; i < n; i++) {
  const p = i * img.ch
  const r = img.data[p], g = img.data[p + 1], b = img.data[p + 2]
  if (r === 0 && g === 0 && b === 0) black++
  if (r === 255 && g === 255 && b === 255) white++
  const l = Math.round(lum(img, i))
  hist[l]++; sum += l
}
const pct = q => { const t = n * q; let s = 0; for (let v = 0; v < 256; v++) { s += hist[v]; if (s >= t) return v } return 255 }
const band = (a, b) => { let s = 0; for (let v = a; v <= b; v++) s += hist[v]; return +(s * 100 / n).toFixed(2) }
console.log(JSON.stringify({
  file: path, w: img.w, h: img.h,
  p01: pct(0.01), p05: pct(0.05), p25: pct(0.25), p50: pct(0.5), p75: pct(0.75), p95: pct(0.95), p99: pct(0.99), p999: pct(0.999),
  mean: +(sum / n).toFixed(2),
  blackPct: +(black * 100 / n).toFixed(4), whitePct: +(white * 100 / n).toFixed(4),
  b0_64: band(0, 64), b64_160: band(64, 160), b160_255: band(160, 255),
  b0_16: band(0, 16), b16_32: band(16, 32), b32_64: band(32, 64), b64_96: band(64, 96), b96_128: band(96, 128), b128_160: band(128, 160)
}, null, 1))
