// rdiff.mjs <a> <b> — 상고(rn) 구간별 평균 채널차. 색수차는 rn>0.4 에서만 산다.
import { decode } from '../post4/png.mjs'
const A = decode(process.argv[2]), B = decode(process.argv[3])
const bins = [[0, 0.4], [0.4, 0.6], [0.6, 0.8], [0.8, 1.0]]
for (const [r0, r1] of bins) {
  let s = 0, n = 0, mx = 0
  for (let y = 0; y < A.h; y++) for (let x = 0; x < A.w; x++) {
    const dx = x / A.w - 0.5, dy = y / A.h - 0.5
    const rn = Math.min(1, Math.hypot(dx, dy) / 0.5)
    if (rn < r0 || rn >= r1) continue
    const p = (y * A.w + x) * A.ch
    let d = 0
    for (let k = 0; k < 3; k++) d = Math.max(d, Math.abs(A.data[p + k] - B.data[p + k]))
    s += d; n++; if (d > mx) mx = d
  }
  console.log(`rn ${r0}-${r1}  meanCh ${(s / n).toFixed(3)}  maxCh ${mx}`)
}
