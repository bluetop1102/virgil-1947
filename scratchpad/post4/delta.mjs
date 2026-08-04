// delta.mjs <a.png> <b.png> <out.png> <x> <y> <w> <h> <scale> <gain> — (a-b)*gain 을 가시화
import { decode, encode, crop } from './png.mjs'
const [ap, bp, out, x, y, w, h, s, gain] = process.argv.slice(2)
const A = crop(decode(ap), +x, +y, +w, +h, 1)
const B = crop(decode(bp), +x, +y, +w, +h, 1)
const g = +(gain ?? 8)
const img = { w: A.w, h: A.h, ch: A.ch, data: Buffer.alloc(A.data.length) }
let mx = 0
for (let i = 0; i < A.w * A.h; i++) {
  for (let k = 0; k < 3; k++) {
    const d = (A.data[i * A.ch + k] - B.data[i * A.ch + k]) * g
    if (Math.abs(d / g) > mx) mx = Math.abs(d / g)
    img.data[i * A.ch + k] = Math.max(0, Math.min(255, Math.round(d)))
  }
  if (A.ch === 4) img.data[i * A.ch + 3] = 255
}
encode(out, crop(img, 0, 0, A.w, A.h, +(s ?? 1)))
console.log(out, 'maxAbsChannelDelta', mx)
