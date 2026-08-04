// node scratchpad/lit1/stat.mjs <png...> — 이번 라운드 판정 박스 통계
import { decode, lum, box } from './png.mjs'

export const BOX = {
  // G2 근경/원경 대비 사다리
  nearWallpaperL: [40, 60, 600, 700],
  nearWallR: [2100, 100, 2555, 900],
  farWainscot: [1030, 590, 1250, 700],
  farEnd: [960, 430, 1290, 700],
  // G4 천장
  ceilPanel: [1000, 100, 1350, 175],
  ceilBeam: [1000, 178, 1350, 198],
  ceilPanel2: [1000, 205, 1350, 262],
  ceilAll: [700, 0, 1700, 300]
}

const files = process.argv.slice(2)
for (const f of files) {
  const img = decode(f)
  const L = lum(img)
  const o = {}
  for (const k in BOX) o[k] = box(L, img.w, BOX[k])
  console.log(f)
  for (const k in o) console.log('  ', k.padEnd(16), JSON.stringify(o[k]))
  console.log('   nearL sd/far sd  ', (o.nearWallpaperL.sd / o.farWainscot.sd).toFixed(2),
    ' nearR sd/far sd', (o.nearWallR.sd / o.farWainscot.sd).toFixed(2))
}
