// reg5.mjs <a.png> [b.png] — 라운드5 심사 지목 영역의 평균휘도 · 그래디언트 RMS
import { decode, lum } from '../post4/png.mjs'
const REG = {
  wainsL:  [250, 850, 650, 400],   // 인포커스 기준 (좌측 징두리)
  endwall: [1080, 420, 440, 540],  // 복도 끝 벽
  endwallP:[1150, 650, 100, 100],  // 심사 지목점 (1200,700)
  pillarR: [2280, 200, 140, 1240], // 마호가니 기둥
  pillarP: [2250, 750, 100, 100],  // 심사 지목점 (2300,800)
  plaque:  [2130, 600, 120, 580],  // 격자 플라크
  cart:    [1550, 850, 500, 590],
  tubeL:   [250, 165, 180, 100],   // 좌 형광관 (330,215)
  tubeLout:[250, 265, 180, 60],    // 관 아래 20px 밖 천장
  tubeR:   [950, 155, 180, 100],   // 우 형광관 (1030,205)
  tubeRout:[950, 255, 180, 60],
  ff:      [2175, 1025, 80, 80]    // 파이어플라이 (2215,1065)
}
function stats (img, [x, y, w, h]) {
  let s = 0, g = 0, n = 0, mx = 0, sat = 0
  for (let j = y; j < Math.min(y + h, img.h - 1); j++) {
    for (let i = x; i < Math.min(x + w, img.w - 1); i++) {
      const l = lum(img, j * img.w + i)
      s += l; n++
      if (l > mx) mx = l
      const p = (j * img.w + i) * img.ch
      const r = img.data[p], gg = img.data[p + 1], b = img.data[p + 2]
      const hi = Math.max(r, gg, b), lo = Math.min(r, gg, b)
      if (hi > 40 && (hi - lo) / hi > 0.55) sat++
      const dx = lum(img, j * img.w + i + 1) - l
      const dy = lum(img, (j + 1) * img.w + i) - l
      g += dx * dx + dy * dy
    }
  }
  return { mean: +(s / n).toFixed(2), grad: +Math.sqrt(g / n).toFixed(2), max: +mx.toFixed(0), satPct: +(sat * 100 / n).toFixed(2) }
}
const a = decode(process.argv[2])
const b = process.argv[3] ? decode(process.argv[3]) : null
for (const [k, r] of Object.entries(REG)) {
  const sa = stats(a, r)
  if (b) {
    const sb = stats(b, r)
    console.log(`${k.padEnd(9)} mean ${String(sa.mean).padStart(7)} / ${String(sb.mean).padStart(7)}  grad ${String(sa.grad).padStart(6)} / ${String(sb.grad).padStart(6)}  gradRatio ${(sa.grad / Math.max(sb.grad, 1e-6)).toFixed(3)}`)
  } else {
    console.log(`${k.padEnd(9)} mean ${String(sa.mean).padStart(7)}  grad ${String(sa.grad).padStart(6)}  max ${String(sa.max).padStart(4)}  sat% ${sa.satPct}`)
  }
}
