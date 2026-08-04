// prof.mjs <a.png> <b.png> <cx> <cy> — (a-b) 휘도 델타의 수평·수직 감쇠 프로파일과 25% 반경
import { decode, lum } from './png.mjs'
const a = decode(process.argv[2]), b = decode(process.argv[3])
const cx = +process.argv[4], cy = +process.argv[5]
const d = (x, y) => (x < 0 || y < 0 || x >= a.w || y >= a.h) ? 0 : lum(a, y * a.w + x) - lum(b, y * b.w + x)
function ray (dx, dy) {
  const out = []
  for (let r = 0; r <= 320; r += 8) {
    let s = 0, n = 0
    // 광원 코어 자체(클리핑 영역)를 피하려고 수직 방향 ±6px 평균
    for (let k = -6; k <= 6; k += 3) { s += d(Math.round(cx + dx * r - dy * k), Math.round(cy + dy * r + dx * k)); n++ }
    out.push(+(s / n).toFixed(2))
  }
  return out
}
const dirs = { right: [1, 0], left: [-1, 0], down: [0, 1], up: [0, -1] }
const res = {}
for (const [k, v] of Object.entries(dirs)) res[k] = ray(v[0], v[1])
const r25 = arr => { const pk = Math.max(...arr.slice(1, 6)); for (let i = 1; i < arr.length; i++) if (arr[i] < pk * 0.25) return i * 8; return 320 }
for (const [k, v] of Object.entries(res)) console.log(`${k.padEnd(6)} r25=${String(r25(v)).padStart(3)}px  ${v.slice(0, 14).join(' ')}`)
const hx = (r25(res.right) + r25(res.left)) / 2, vy = (r25(res.up) + r25(res.down)) / 2
console.log(`anisotropy H/V = ${(hx / vy).toFixed(2)}  (H ${hx}px / V ${vy}px)`)
