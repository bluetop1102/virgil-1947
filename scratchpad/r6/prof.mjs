// 휘도 프로파일 / 하드 에지 탐지. 눈으로 본 "이음선"을 좌표로 못박는다.
//   node scratchpad/r6/prof.mjs row  <img> <y> <x0> <x1> [smooth]
//   node scratchpad/r6/prof.mjs col  <img> <x> <y0> <y1> [smooth]
//   node scratchpad/r6/prof.mjs edges <img> <x0> <y0> <x1> <y1>   수직 하드에지 후보 랭킹
import fs from 'node:fs'
import { chromium } from 'playwright'

const [cmd, file, ...rest] = process.argv.slice(2)
const br = await chromium.launch()
const pg = await br.newPage({ viewport: { width: 64, height: 64 } })
await pg.setContent('<canvas id=c></canvas>')
const b64 = fs.readFileSync(file).toString('base64')

const res = await pg.evaluate(async ([src, cmd, rest]) => {
  const img = new Image(); img.src = 'data:image/png;base64,' + src
  await img.decode()
  const W = img.naturalWidth, H = img.naturalHeight
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d', { willReadFrequently: true })
  g.drawImage(img, 0, 0)
  const d = g.getImageData(0, 0, W, H).data
  const L = (x, y) => { const p = (y * W + x) * 4; return 0.2126 * d[p] + 0.7152 * d[p + 1] + 0.0722 * d[p + 2] }

  if (cmd === 'row') {
    const [y, x0, x1, sm] = rest.map(Number)
    const S = sm || 1
    const out = []
    for (let x = x0; x <= x1; x++) {
      let s = 0, n = 0
      for (let yy = y - S; yy <= y + S; yy++) { s += L(x, yy); n++ }
      out.push(+(s / n).toFixed(1))
    }
    return { x0, out }
  }
  if (cmd === 'col') {
    const [x, y0, y1, sm] = rest.map(Number)
    const S = sm || 1
    const out = []
    for (let y = y0; y <= y1; y++) {
      let s = 0, n = 0
      for (let xx = x - S; xx <= x + S; xx++) { s += L(xx, y); n++ }
      out.push(+(s / n).toFixed(1))
    }
    return { y0, out }
  }
  if (cmd === 'edges') {
    const [x0, y0, x1, y1] = rest.map(Number)
    // 세로 하드에지: 열평균 휘도의 1차 차분. 열 전체에서 일관되게 나타나는 계단만 남는다.
    const colAvg = []
    for (let x = x0; x <= x1; x++) {
      let s = 0
      for (let y = y0; y <= y1; y++) s += L(x, y)
      colAvg.push(s / (y1 - y0 + 1))
    }
    const rowAvg = []
    for (let y = y0; y <= y1; y++) {
      let s = 0
      for (let x = x0; x <= x1; x++) s += L(x, y)
      rowAvg.push(s / (x1 - x0 + 1))
    }
    const rank = (arr, off) => arr.map((v, i) => ({ p: off + i, d: +(arr[i + 1] - v).toFixed(2) }))
      .slice(0, -1).sort((a, b) => Math.abs(b.d) - Math.abs(a.d)).slice(0, 12)
    return { vert: rank(colAvg, x0), horz: rank(rowAvg, y0) }
  }
}, [b64, cmd, rest])

await br.close()
if (res.out) {
  const base = res.x0 ?? res.y0
  const s = res.out
  let txt = ''
  for (let i = 0; i < s.length; i += 1) {
    const dv = i > 0 ? s[i] - s[i - 1] : 0
    txt += `${base + i}\t${s[i]}\t${dv > 0 ? '+' : ''}${dv.toFixed(1)}${Math.abs(dv) > 2.5 ? '  <<<' : ''}\n`
  }
  console.log(txt)
} else console.log(JSON.stringify(res, null, 1))
