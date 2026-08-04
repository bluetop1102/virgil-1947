// PNG 두 장에서 같은 수평 스캔라인을 뽑아 차분 프로파일을 낸다(on - off).
// 하네스를 다시 돌릴 수 없는 과거 리비전의 샷을 같은 잣대로 재기 위한 도구.
import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'node:fs'

const [onPng, offPng, out] = process.argv.slice(2)
const SCAN_Y = (process.env.AB_SCANY || '620,700,780,860').split(',').map(Number)
const [X0, X1] = (process.env.AB_SCANX || '600,1900').split(',').map(Number)

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
await page.setContent('<canvas id=c></canvas>')
const rows = async (png) => page.evaluate(async ([src, ys, x0, x1]) => {
  const img = new Image()
  await new Promise(r => { img.onload = r; img.src = src })
  const c = document.getElementById('c')
  c.width = img.width; c.height = img.height
  const g = c.getContext('2d', { willReadFrequently: true })
  g.drawImage(img, 0, 0)
  const d = g.getImageData(0, 0, img.width, img.height).data
  const lum = (x, y) => { const i = (y * img.width + x) * 4; return 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2] }
  const out = {}
  for (const y of ys) {
    const row = []
    for (let x = x0; x < x1; x += 4) {
      let s = 0
      for (let dy = -2; dy <= 2; dy++) s += lum(x, y + dy)
      row.push(+(s / 5).toFixed(1))
    }
    out[y] = row
  }
  return out
}, [`data:image/png;base64,${readFileSync(png).toString('base64')}`, ys_, X0, X1])

const ys_ = SCAN_Y
const a = await rows(onPng)
const b = await rows(offPng)
writeFileSync(out, JSON.stringify({ rows: [{ v: 'on', scans: a }, { v: 'off', scans: b }] }, null, 2))
await browser.close()
process.exit(0)
