// crop.mjs <src.png> <out.png> <x> <y> <w> <h> [scale]  — 좌상단 기준, nearest 확대
import { decode, encode, crop } from './png.mjs'
const [src, out, x, y, w, h, s] = process.argv.slice(2)
encode(out, crop(decode(src), +x, +y, +w, +h, +(s ?? 1)))
console.log(out)
