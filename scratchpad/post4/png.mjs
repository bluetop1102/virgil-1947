// PNG 디코드/인코드 유틸. sips 크롭 오프셋 의미가 모호해 자체 구현으로 좌표를 확정한다.
import { readFileSync, writeFileSync } from 'node:fs'
import zlib from 'node:zlib'

export function decode (path) {
  const buf = readFileSync(path)
  let off = 8
  let w = 0, h = 0, bd = 0, ct = 0
  const idat = []
  while (off < buf.length) {
    const len = buf.readUInt32BE(off)
    const type = buf.toString('ascii', off + 4, off + 8)
    const data = buf.subarray(off + 8, off + 8 + len)
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4); bd = data[8]; ct = data[9]
    } else if (type === 'IDAT') idat.push(data)
    else if (type === 'IEND') break
    off += 12 + len
  }
  if (bd !== 8) throw new Error('bitDepth ' + bd)
  const ch = ct === 6 ? 4 : ct === 2 ? 3 : ct === 0 ? 1 : ct === 4 ? 2 : 0
  if (!ch) throw new Error('colorType ' + ct)
  const raw = zlib.inflateSync(Buffer.concat(idat))
  const stride = w * ch
  const out = Buffer.alloc(w * h * ch)
  let p = 0
  for (let y = 0; y < h; y++) {
    const ft = raw[p++]
    const row = raw.subarray(p, p + stride); p += stride
    const cur = out.subarray(y * stride, y * stride + stride)
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? cur[x - ch] : 0
      const b = prev ? prev[x] : 0
      const c = (prev && x >= ch) ? prev[x - ch] : 0
      let v = row[x]
      if (ft === 1) v += a
      else if (ft === 2) v += b
      else if (ft === 3) v += (a + b) >> 1
      else if (ft === 4) {
        const pp = a + b - c
        const pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c)
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c)
      }
      cur[x] = v & 255
    }
  }
  return { w, h, ch, data: out }
}

function crc32 (buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk (type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}

export function encode (path, img) {
  const { w, h, ch, data } = img
  const stride = w * ch
  const raw = Buffer.alloc((stride + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0
    data.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8; ihdr[9] = ch === 4 ? 6 : ch === 3 ? 2 : 0; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  writeFileSync(path, Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 6 })),
    chunk('IEND', Buffer.alloc(0))
  ]))
}

// 좌상단 (x,y) 기준 크롭 + 정수배 확대 (nearest)
export function crop (img, x, y, cw, chh, s = 1) {
  const { w, h, ch, data } = img
  x = Math.max(0, x | 0); y = Math.max(0, y | 0)
  cw = Math.min(cw | 0, w - x); chh = Math.min(chh | 0, h - y)
  const ow = cw * s, oh = chh * s
  const out = Buffer.alloc(ow * oh * ch)
  for (let j = 0; j < oh; j++) {
    const sy = y + ((j / s) | 0)
    for (let i = 0; i < ow; i++) {
      const sx = x + ((i / s) | 0)
      const si = (sy * w + sx) * ch
      const di = (j * ow + i) * ch
      for (let k = 0; k < ch; k++) out[di + k] = data[si + k]
    }
  }
  return { w: ow, h: oh, ch, data: out }
}

export function lum (img, i) {
  const d = img.data, ch = img.ch, p = i * ch
  return 0.2126 * d[p] + 0.7152 * d[p + 1] + 0.0722 * d[p + 2]
}

export function region (img, x, y, cw, chh) {
  const idx = []
  for (let j = y; j < y + chh; j++) for (let i = x; i < x + cw; i++) idx.push(j * img.w + i)
  return idx
}
