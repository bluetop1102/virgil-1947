// node stack.mjs <out> <x> <y> <w> <h> <scale> <png...>
import { decode, encode, crop } from './png.mjs'
const a = process.argv.slice(2)
const [out, x, y, w, h, s] = a.slice(0, 6)
const imgs = a.slice(6).map(f => crop(decode(f), +x, +y, +w, +h, +s))
const W = imgs[0].w, H = imgs[0].h, ch = imgs[0].ch
const buf = Buffer.alloc(W * H * imgs.length * ch)
imgs.forEach((im, k) => im.data.copy(buf, k * W * H * ch))
encode(out, { w: W, h: H * imgs.length, ch, data: buf })
console.log(out)
