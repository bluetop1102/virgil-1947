// 라이팅 이음선 탐지기. 최종 화면에는 계단이 있는데 깊이·노멀 버퍼에는 없는 지점 = 지오메트리
// 근거가 없는 광량 계단이다. 눈으로 "직사각 이음선"을 찾는 대신 기계로 좌표를 뽑는다.
//   node scratchpad/r6/seams.mjs <final.png> <depth.png> <normal.png> [minRun] [lumT]
import fs from 'node:fs'
import { chromium } from 'playwright'

const [FIN, DEP, NRM, MINRUN = 40, LUMT = 4.0] = process.argv.slice(2)
const b64 = f => fs.readFileSync(f).toString('base64')
const br = await chromium.launch()
const pg = await br.newPage({ viewport: { width: 64, height: 64 } })
await pg.setContent('<canvas id=c></canvas>')

const out = await pg.evaluate(async ([f, d, n, minRun, lumT]) => {
  const load = async s => {
    const im = new Image(); im.src = 'data:image/png;base64,' + s
    await im.decode()
    const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight
    const g = c.getContext('2d', { willReadFrequently: true })
    g.drawImage(im, 0, 0)
    return { d: g.getImageData(0, 0, c.width, c.height).data, W: c.width, H: c.height }
  }
  const F = await load(f), D = await load(d), N = await load(n)
  const W = F.W, H = F.H
  const lum = s => { const o = new Float32Array(W * H); for (let i = 0, p = 0; i < W * H; i++, p += 4) o[i] = 0.2126 * s[p] + 0.7152 * s[p + 1] + 0.0722 * s[p + 2]; return o }
  const LF = lum(F.d), LD = lum(D.d)
  // 노멀은 채널별 최대 변화를 쓴다 — 휘도로 합치면 xy 부호 반전이 상쇄된다
  const nGradX = (i) => Math.max(Math.abs(N.d[i * 4] - N.d[(i - 1) * 4]), Math.abs(N.d[i * 4 + 1] - N.d[(i - 1) * 4 + 1]), Math.abs(N.d[i * 4 + 2] - N.d[(i - 1) * 4 + 2]))
  const nGradY = (i) => Math.max(Math.abs(N.d[i * 4] - N.d[(i - W) * 4]), Math.abs(N.d[i * 4 + 1] - N.d[(i - W) * 4 + 1]), Math.abs(N.d[i * 4 + 2] - N.d[(i - W) * 4 + 2]))

  const DT = 1.2, NT = 6      // 깊이/노멀이 이 미만이면 "지오메트리 경계 아님"

  // 세로 이음선: 열 x 에서 |L(x)-L(x-1)| 이 크고 깊이·노멀은 매끈한 픽셀의 연속 런
  const seams = []
  const scan = (vertical) => {
    const A = vertical ? W : H, B = vertical ? H : W
    for (let a = 2; a < A - 2; a++) {
      let run = 0, sum = 0, start = 0
      for (let b = 2; b < B - 2; b++) {
        const x = vertical ? a : b, y = vertical ? b : a
        const i = y * W + x
        const dl = vertical ? LF[i] - LF[i - 1] : LF[i] - LF[i - W]
        const dd = Math.abs(vertical ? LD[i] - LD[i - 1] : LD[i] - LD[i - W])
        const dn = vertical ? nGradX(i) : nGradY(i)
        const hit = Math.abs(dl) > lumT && dd < DT && dn < NT
        if (hit) { if (!run) start = b; run++; sum += Math.abs(dl) } else {
          if (run >= minRun) seams.push({ dir: vertical ? 'V' : 'H', at: a, from: start, to: b - 1, len: run, mean: +(sum / run).toFixed(2) })
          run = 0; sum = 0
        }
      }
      if (run >= minRun) seams.push({ dir: vertical ? 'V' : 'H', at: a, from: start, to: B - 3, len: run, mean: +(sum / run).toFixed(2) })
    }
  }
  scan(true); scan(false)
  seams.sort((p, q) => q.len * q.mean - p.len * p.mean)
  return { W, H, n: seams.length, top: seams.slice(0, 25) }
}, [b64(FIN), b64(DEP), b64(NRM), +MINRUN, +LUMT])

await br.close()
console.log(`${out.W}x${out.H}  후보 ${out.n}개  (지오메트리 근거 없는 광량 계단)`)
for (const s of out.top) console.log(`  ${s.dir} ${String(s.at).padStart(5)}  ${String(s.from).padStart(5)}→${String(s.to).padStart(5)}  len ${String(s.len).padStart(4)}  평균계단 ${s.mean}`)
