// 최소 PNG 디코더/인코더 (8bit, non-interlaced). sips --cropOffset 의 좌표계가 불명확해
// 측정 근거가 흔들리므로 픽셀 접근을 직접 한다.
import { readFileSync, writeFileSync } from 'node:fs'
import { inflateSync, deflateSync } from 'node:zlib'

const CRC = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c }
  return (buf) => { let c = -1; for (let i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0 }
})()

export function decode (path) {
  const b = readFileSync(path)
  let p = 8, w = 0, h = 0, bd = 0, ct = 0
  const idat = []
  while (p < b.length) {
    const len = b.readUInt32BE(p)
    const type = b.toString('ascii', p + 4, p + 8)
    const data = b.subarray(p + 8, p + 8 + len)
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); bd = data[8]; ct = data[9] }
    else if (type === 'IDAT') idat.push(data)
    else if (type === 'IEND') break
    p += 12 + len
  }
  if (bd !== 8) throw new Error(`bit depth ${bd} 미지원`)
  const ch = ct === 6 ? 4 : ct === 2 ? 3 : ct === 0 ? 1 : ct === 4 ? 2 : 0
  if (!ch) throw new Error(`color type ${ct} 미지원`)
  const raw = inflateSync(Buffer.concat(idat))
  const stride = w * ch
  const out = Buffer.alloc(h * stride)
  let o = 0
  for (let y = 0; y < h; y++) {
    const f = raw[o++]
    const line = raw.subarray(o, o + stride); o += stride
    const cur = out.subarray(y * stride, (y + 1) * stride)
    const prev = y ? out.subarray((y - 1) * stride, y * stride) : null
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? cur[x - ch] : 0
      const bb = prev ? prev[x] : 0
      const c = prev && x >= ch ? prev[x - ch] : 0
      let v = line[x]
      if (f === 1) v += a
      else if (f === 2) v += bb
      else if (f === 3) v += (a + bb) >> 1
      else if (f === 4) {
        const pa = Math.abs(bb - c), pb = Math.abs(a - c), pc = Math.abs(a + bb - 2 * c)
        v += pa <= pb && pa <= pc ? a : pb <= pc ? bb : c
      }
      cur[x] = v & 0xff
    }
  }
  return { w, h, ch, data: out }
}

export function encode (path, img) {
  const { w, h, ch, data } = img
  const stride = w * ch
  const raw = Buffer.alloc(h * (stride + 1))
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0
    data.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  const chunk = (type, body) => {
    const c = Buffer.alloc(8 + body.length + 4)
    c.writeUInt32BE(body.length, 0); c.write(type, 4, 'ascii'); body.copy(c, 8)
    c.writeUInt32BE(CRC(c.subarray(4, 8 + body.length)), 8 + body.length)
    return c
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8; ihdr[9] = ch === 4 ? 6 : ch === 3 ? 2 : 0
  writeFileSync(path, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 6 })), chunk('IEND', Buffer.alloc(0))
  ]))
  return path
}

export function crop (img, x, y, w, h, scale = 1) {
  const ch = img.ch
  const out = Buffer.alloc(w * scale * h * scale * ch)
  for (let j = 0; j < h * scale; j++) {
    const sy = Math.min(img.h - 1, y + ((j / scale) | 0))
    for (let i = 0; i < w * scale; i++) {
      const sx = Math.min(img.w - 1, x + ((i / scale) | 0))
      const s = (sy * img.w + sx) * ch, d = (j * w * scale + i) * ch
      for (let c = 0; c < ch; c++) out[d + c] = img.data[s + c]
    }
  }
  return { w: w * scale, h: h * scale, ch, data: out }
}

export function lum (img) {
  const n = img.w * img.h, L = new Float32Array(n), ch = img.ch
  for (let i = 0; i < n; i++) L[i] = 0.2126 * img.data[i * ch] + 0.7152 * img.data[i * ch + 1] + 0.0722 * img.data[i * ch + 2]
  return L
}

export function box (L, w, r) {
  let s = 0, s2 = 0, c = 0, mn = 1e9, mx = -1e9
  for (let y = r[1]; y < r[3]; y++) for (let x = r[0]; x < r[2]; x++) {
    const v = L[y * w + x]; s += v; s2 += v * v; c++
    if (v < mn) mn = v; if (v > mx) mx = v
  }
  const m = s / c
  return { mean: +m.toFixed(2), sd: +Math.sqrt(Math.max(s2 / c - m * m, 0)).toFixed(2), min: +mn.toFixed(1), max: +mx.toFixed(1) }
}
