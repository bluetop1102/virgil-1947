// node scratchpad/lit1/mark.mjs <src> <out> — 투영으로 잡은 측정선을 그려 좌표를 눈으로 검증한다
import { decode, encode } from './png.mjs'
import { px } from './proj.mjs'
const [src, out] = process.argv.slice(2)
const img = decode(src)
const put = (x, y, c) => {
  if (x < 0 || y < 0 || x >= img.w || y >= img.h) return
  const i = (y * img.w + x) * img.ch
  img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]
}
const trace = (wx, wy, z0, z1, c) => {
  for (let i = 0; i <= 600; i++) {
    const [x, y] = px([wx, -500 + wy, z0 + (z1 - z0) * i / 600])
    put(x, y, c)
  }
}
trace(-1.42, 0, 0.9, -2.6, [0, 255, 0])     // 좌 벽-바닥
trace(1.42, 0, 0.6, -2.6, [255, 255, 0])    // 우 벽-바닥
trace(-1.0, 0, 0.9, -2.6, [255, 0, 0])      // 러너 좌 가장자리
trace(-1.42, 1.06, 1.2, -2.6, [0, 160, 255]) // 웨인스코트 캡
encode(out, img)
console.log(out)
