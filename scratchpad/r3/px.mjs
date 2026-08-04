// 최소 PNG 디코더 + 영역 통계. 진단 전용(프로덕션 코드 아님).
import fs from 'fs'
import zlib from 'zlib'

export function readPng (path) {
  const b = fs.readFileSync(path)
  let o = 8, w = 0, h = 0, bd = 0, ct = 0
  const idat = []
  while (o < b.length) {
    const len = b.readUInt32BE(o)
    const type = b.toString('ascii', o + 4, o + 8)
    const data = b.subarray(o + 8, o + 8 + len)
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); bd = data[8]; ct = data[9] }
    else if (type === 'IDAT') idat.push(data)
    else if (type === 'IEND') break
    o += 12 + len
  }
  if (bd !== 8) throw new Error('bitDepth ' + bd)
  const ch = ct === 6 ? 4 : ct === 2 ? 3 : ct === 0 ? 1 : ct === 4 ? 2 : -1
  if (ch < 0) throw new Error('colorType ' + ct)
  const raw = zlib.inflateSync(Buffer.concat(idat))
  const stride = w * ch
  const out = Buffer.alloc(h * stride)
  let p = 0
  for (let y = 0; y < h; y++) {
    const f = raw[p++]
    const line = raw.subarray(p, p + stride); p += stride
    const cur = out.subarray(y * stride, y * stride + stride)
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? cur[x - ch] : 0
      const bb = prev ? prev[x] : 0
      const c = (prev && x >= ch) ? prev[x - ch] : 0
      let v = line[x]
      if (f === 1) v += a
      else if (f === 2) v += bb
      else if (f === 3) v += (a + bb) >> 1
      else if (f === 4) {
        const pp = a + bb - c
        const pa = Math.abs(pp - a), pb = Math.abs(pp - bb), pc = Math.abs(pp - c)
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? bb : c)
      }
      cur[x] = v & 255
    }
  }
  return { w, h, ch, data: out }
}

export function stats (img, x0, y0, x1, y1) {
  const { w, ch, data } = img
  let n = 0, sl = 0, sl2 = 0, sr = 0, sg = 0, sb = 0
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * w + x) * ch
      const r = data[i], g = data[i + 1], bl = data[i + 2]
      const L = 0.2126 * r + 0.7152 * g + 0.0722 * bl
      sl += L; sl2 += L * L; sr += r; sg += g; sb += bl; n++
    }
  }
  const m = sl / n
  return { n, L: +m.toFixed(2), sd: +Math.sqrt(Math.max(sl2 / n - m * m, 0)).toFixed(2), R: +(sr / n).toFixed(1), G: +(sg / n).toFixed(1), B: +(sb / n).toFixed(1) }
}

// 고주파 RMS: 3x3 라플라시안. 미세 대비가 살아 있는지 본다.
export function hf (img, x0, y0, x1, y1) {
  const { w, ch, data } = img
  const L = (x, y) => { const i = (y * w + x) * ch; return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2] }
  let s = 0, n = 0
  for (let y = y0 + 1; y < y1 - 1; y++) {
    for (let x = x0 + 1; x < x1 - 1; x++) {
      const v = 4 * L(x, y) - L(x - 1, y) - L(x + 1, y) - L(x, y - 1) - L(x, y + 1)
      s += v * v; n++
    }
  }
  return +Math.sqrt(s / n).toFixed(2)
}

if ((process.argv[1] || '').endsWith('px.mjs') && process.argv[2]) {
  const img = readPng(process.argv[2])
  const boxes = JSON.parse(process.argv[3] || '{}')
  console.log(process.argv[2], img.w + 'x' + img.h)
  for (const k of Object.keys(boxes)) {
    const [a, b, c, d] = boxes[k]
    console.log(k.padEnd(16), JSON.stringify(stats(img, a, b, c, d)), 'hf=' + hf(img, a, b, c, d))
  }
}
