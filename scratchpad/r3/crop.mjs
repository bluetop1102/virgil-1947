// 진단용 크롭/확대. node crop.mjs src.png out.png x0 y0 x1 y1 [zoom]
import fs from 'fs'
import zlib from 'zlib'
import { readPng } from './px.mjs'

const [src, out, x0, y0, x1, y1, zs] = process.argv.slice(2)
const z = Math.max(parseInt(zs || '1', 10), 1)
const img = readPng(src)
const X0 = +x0, Y0 = +y0, W = +x1 - +x0, H = +y1 - +y0
const ow = W * z, oh = H * z
const raw = Buffer.alloc(oh * (ow * 3 + 1))
for (let y = 0; y < oh; y++) {
  const o = y * (ow * 3 + 1)
  raw[o] = 0
  const sy = Y0 + Math.floor(y / z)
  for (let x = 0; x < ow; x++) {
    const sx = X0 + Math.floor(x / z)
    const i = (sy * img.w + sx) * img.ch
    raw[o + 1 + x * 3] = img.data[i]
    raw[o + 2 + x * 3] = img.data[i + 1]
    raw[o + 3 + x * 3] = img.data[i + 2]
  }
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crcT = []
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c >>> 0 }
  let c = 0xffffffff
  for (const b of td) c = crcT[(c ^ b) & 255] ^ (c >>> 8)
  const crc = Buffer.alloc(4); crc.writeUInt32BE((c ^ 0xffffffff) >>> 0)
  return Buffer.concat([len, td, crc])
}
const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(ow, 0); ihdr.writeUInt32BE(oh, 4); ihdr[8] = 8; ihdr[9] = 2
fs.writeFileSync(out, Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))
]))
console.log(out, ow + 'x' + oh)
