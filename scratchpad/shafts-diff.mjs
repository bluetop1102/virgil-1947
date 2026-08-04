// 두 샷의 차분을 증폭해 PNG로 굽는다. 광축 셸/볼류메트릭의 단독 형상을 눈으로 보기 위한 도구.
import { load } from './shafts-img.mjs'
import { writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const [aP, bP, outP, gainS, cropS] = process.argv.slice(2)
const gain = Number(gainS || 4)
const a = load(aP), b = load(bP)
const [cx, cy, cw, ch] = (cropS || `0,0,${a.w},${a.h}`).split(',').map(Number)
const stride = (cw * 3 + 3) & ~3
const buf = Buffer.alloc(54 + stride * ch)
buf.write('BM', 0, 'latin1')
buf.writeUInt32LE(buf.length, 2)
buf.writeUInt32LE(54, 10)
buf.writeUInt32LE(40, 14)
buf.writeInt32LE(cw, 18)
buf.writeInt32LE(-ch, 22)
buf.writeUInt16LE(1, 26)
buf.writeUInt16LE(24, 28)
for (let y = 0; y < ch; y++) {
  for (let x = 0; x < cw; x++) {
    const pa = a.at(cx + x, cy + y), pb = b.at(cx + x, cy + y)
    const i = 54 + y * stride + x * 3
    for (let c = 0; c < 3; c++) {
      buf[i + 2 - c] = Math.min(255, Math.max(0, Math.round((pa[c] - pb[c]) * gain + 8)))
    }
  }
}
const bmp = outP.replace(/\.png$/, '.bmp')
writeFileSync(bmp, buf)
execSync(`sips -s format png "${bmp}" --out "${outP}"`, { stdio: 'ignore' })
console.log(outP, cw + 'x' + ch, 'gain', gain)
