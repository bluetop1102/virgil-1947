// 하네스 LUM_PROBE 와 같은 게이트를 PNG 에서 재현한다(probe 가 페이지 리로드로 죽을 때 대체 증거).
import { decode, lum } from './png.mjs'
for (const f of process.argv.slice(2)) {
  const img = decode(f), L = lum(img), n = img.w * img.h, ch = img.ch
  const hist = new Int32Array(256)
  let black = 0, white = 0, sum = 0
  for (let i = 0; i < n; i++) {
    const r = img.data[i * ch], g = img.data[i * ch + 1], b = img.data[i * ch + 2]
    if (r === 0 && g === 0 && b === 0) black++
    if (r === 255 && g === 255 && b === 255) white++
    hist[L[i] | 0]++; sum += L[i]
  }
  const rank = q => { let c = 0; const t = Math.ceil(n * q); for (let v = 0; v < 256; v++) { c += hist[v]; if (c >= t) return v } return 255 }
  let dark = 0; for (let v = 0; v <= 6; v++) dark += hist[v]
  const darkPct = dark * 100 / n
  const p999 = rank(0.999)
  console.log(f.split('/').slice(-2).join('/'), `p99.9=${p999} p50=${rank(0.5)} mean=${(sum / n).toFixed(1)} dark=${darkPct.toFixed(2)}% black=${(black * 100 / n).toFixed(3)}% white=${(white * 100 / n).toFixed(3)}%`, (p999 >= 150 && darkPct <= 10) ? 'gate ok' : 'GATE FAIL')
}
