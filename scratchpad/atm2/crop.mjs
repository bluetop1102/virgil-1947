// PNG 크롭·확대. 등배로는 안 보이는 모티·접합선을 눈으로 확인하기 위한 도구.
// 사용: node crop.mjs <in.png> <out.png> x y w h [scale]
import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const [inp, outp, x, y, w, h, s = 2] = process.argv.slice(2)
const b64 = readFileSync(inp).toString('base64')
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: Math.round(w * s), height: Math.round(h * s) } })
await page.setContent(`<style>html,body{margin:0;overflow:hidden}canvas{display:block}</style><canvas id=c></canvas>`)
await page.evaluate(async ([src, x, y, w, h, s]) => {
  const img = new Image()
  await new Promise(r => { img.onload = r; img.src = src })
  const c = document.getElementById('c')
  c.width = w * s; c.height = h * s
  const g = c.getContext('2d')
  g.imageSmoothingEnabled = false
  g.drawImage(img, x, y, w, h, 0, 0, w * s, h * s)
}, [`data:image/png;base64,${b64}`, +x, +y, +w, +h, +s])
await page.locator('#c').screenshot({ path: outp })
await browser.close()
process.exit(0)
