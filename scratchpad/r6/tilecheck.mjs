// 플래그된 타일에서 "고립 스파클 픽셀 좌표"를 양쪽 이미지에서 뽑아 동일한지 본다.
// 같은 좌표에 이미 있던 디더가 배경이 어두워져 도드라진 것이면 좌표 집합이 거의 겹친다.
import fs from 'node:fs'
import { chromium } from 'playwright'

const [X, Y, S] = [1920, 0, 160]
const br = await chromium.launch()
const pg = await br.newPage({ viewport: { width: 64, height: 64 } })
await pg.setContent('<canvas id=c></canvas>')

async function tile (file) {
  return pg.evaluate(async ([src, X, Y, S]) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + src
    await img.decode()
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight
    const g = c.getContext('2d', { willReadFrequently: true })
    g.drawImage(img, 0, 0)
    const d = g.getImageData(X, Y, S, S).data
    const L = new Float32Array(S * S)
    for (let i = 0, p = 0; i < S * S; i++, p += 4) L[i] = 0.2126 * d[p] + 0.7152 * d[p + 1] + 0.0722 * d[p + 2]
    const spark = []
    const T = 14
    for (let y = 1; y < S - 1; y++) for (let x = 1; x < S - 1; x++) {
      const i = y * S + x, v = L[i]
      const n = [L[i - 1], L[i + 1], L[i - S], L[i + S], L[i - S - 1], L[i - S + 1], L[i + S - 1], L[i + S + 1]]
      let hi = 0
      for (const q of n) if (v - q > T) hi++
      if (hi === 8) spark.push(y * S + x)
    }
    const sorted = [...L].sort((a, b) => a - b)
    return { mean: +(L.reduce((a, b) => a + b, 0) / L.length).toFixed(2), median: +sorted[S * S >> 1].toFixed(2), spark }
  }, [fs.readFileSync(file).toString('base64'), X, Y, S])
}

const a = await tile(process.argv[2])
const b = await tile(process.argv[3])
await br.close()
const sa = new Set(a.spark), sb = new Set(b.spark)
const shared = [...sb].filter(i => sa.has(i)).length
console.log(`before  mean=${a.mean} median=${a.median} spark=${a.spark.length}`)
console.log(`after   mean=${b.mean} median=${b.median} spark=${b.spark.length}`)
console.log(`after 스파클 중 before 에도 있던 좌표: ${shared}/${b.spark.length}`)
