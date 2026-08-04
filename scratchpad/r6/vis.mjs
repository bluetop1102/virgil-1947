// 어두운 영역 구조를 눈으로 보기 위한 게인/감마 크롭. 판정용이 아니라 진단용이다.
//   node scratchpad/r6/vis.mjs <img> <out> <x> <y> <w> <h> <zoom> <gain> [gamma]
import fs from 'node:fs'
import { chromium } from 'playwright'

const [src, out, X, Y, W, H, Z, G, GA] = process.argv.slice(2)
const z = +Z || 1, w = Math.round(+W * z), h = Math.round(+H * z)
const br = await chromium.launch()
const pg = await br.newPage({ viewport: { width: w, height: h } })
await pg.setContent(`<style>html,body{margin:0}canvas{display:block}</style><canvas id=c width=${w} height=${h}></canvas>`)
await pg.evaluate(async ([s, x, y, sw, sh, dw, dh, gain, gamma]) => {
  const im = new Image(); im.src = 'data:image/png;base64,' + s
  await im.decode()
  const t = document.createElement('canvas'); t.width = sw; t.height = sh
  const tg = t.getContext('2d', { willReadFrequently: true })
  tg.drawImage(im, x, y, sw, sh, 0, 0, sw, sh)
  const d = tg.getImageData(0, 0, sw, sh)
  for (let i = 0; i < d.data.length; i += 4) {
    for (let k = 0; k < 3; k++) {
      const v = Math.pow((d.data[i + k] / 255) * gain, 1 / gamma)
      d.data[i + k] = Math.max(0, Math.min(255, v * 255))
    }
  }
  tg.putImageData(d, 0, 0)
  const g = document.getElementById('c').getContext('2d')
  g.imageSmoothingEnabled = false
  g.drawImage(t, 0, 0, sw, sh, 0, 0, dw, dh)
}, [fs.readFileSync(src).toString('base64'), +X, +Y, +W, +H, w, h, +G || 1, +GA || 1])
await pg.locator('#c').screenshot({ path: out })
await br.close()
console.log(`vis → ${out}  ${W}x${H}@${X},${Y} ×${z} gain${G} gamma${GA || 1}`)
