// 여러 좌표의 평균 RGB. 색 변경이 화면에서 실제로 몇 단계 움직였는지 본다.
//   node scratchpad/r6/px.mjs <img> <x,y,r> ...
import fs from 'node:fs'; import { chromium } from 'playwright'
const [f, ...pts] = process.argv.slice(2)
const br = await chromium.launch(); const pg = await br.newPage({ viewport:{width:64,height:64} })
await pg.setContent('<canvas id=c></canvas>')
const out = await pg.evaluate(async ([src, pts]) => {
  const im = new Image(); im.src = 'data:image/png;base64,' + src; await im.decode()
  const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0)
  const d = g.getImageData(0, 0, c.width, c.height).data
  return pts.map(p => {
    const [x, y, r] = p.split(',').map(Number)
    let R = 0, G = 0, B = 0, n = 0
    for (let yy = y - r; yy <= y + r; yy++) for (let xx = x - r; xx <= x + r; xx++) {
      const i = (yy * c.width + xx) * 4; R += d[i]; G += d[i+1]; B += d[i+2]; n++
    }
    return { p, r: +(R/n).toFixed(1), g: +(G/n).toFixed(1), b: +(B/n).toFixed(1),
             rb: +((R-B)/n).toFixed(1), gm: +((G - (R+B)/2)/n).toFixed(1) }
  })
}, [fs.readFileSync(f).toString('base64'), pts])
await br.close()
for (const o of out) console.log(`  ${o.p.padEnd(14)} R${String(o.r).padStart(6)} G${String(o.g).padStart(6)} B${String(o.b).padStart(6)}   R-B ${String(o.rb).padStart(6)}  녹조 ${String(o.gm).padStart(6)}`)
