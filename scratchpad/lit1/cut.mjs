// node scratchpad/lit1/cut.mjs <src.png> <out.png> <x> <y> <w> <h> [scale]
import { decode, encode, crop } from './png.mjs'
const [src, out, x, y, w, h, s] = process.argv.slice(2)
encode(out, crop(decode(src), +x, +y, +w, +h, +(s || 1)))
console.log(out)
