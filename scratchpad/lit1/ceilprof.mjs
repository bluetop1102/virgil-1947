// 천장 반자틀 줄무늬 지표. 투영으로 잡은 반자틀 위치(py≈65 / 184 / 270)를 기준으로
// 보 아래(그림자) 대 보 사이(패널)의 휘도차를 낸다. node ceilprof.mjs <png...>
import { decode, lum } from './png.mjs'
const X0 = 1000, X1 = 1360
for (const f of process.argv.slice(2)) {
  const img = decode(f), L = lum(img)
  const p = []
  for (let y = 30; y < 300; y++) { let s = 0; for (let x = X0; x < X1; x++) s += L[y * img.w + x]; p.push(s / (X1 - X0)) }
  const at = y => p[y - 30]
  // 패널 = 반자틀 사이, 보밑 = 반자틀 직후(먼 쪽) 20px
  const seg = (a, z) => { let s = 0; for (let y = a; y <= z; y++) s += at(y); return s / (z - a + 1) }
  const mn = (a, z) => { let m = 1e9, my = a; for (let y = a; y <= z; y++) if (at(y) < m) { m = at(y); my = y } return [my, m] }
  const mx = (a, z) => { let m = -1e9, my = a; for (let y = a; y <= z; y++) if (at(y) > m) { m = at(y); my = y } return [my, m] }
  const [by1, bv1] = mn(55, 95)
  const [py1, pv1] = mx(100, 176)
  const [by2, bv2] = mn(177, 200)
  const [py2, pv2] = mx(205, 262)
  // 패널 내부 변조: 보 직후 어두움 → 패널 중앙 회복
  const dip1 = mn(96, 140), dip2 = mn(200, 240)
  console.log(f.split('/').pop().padEnd(24),
    `beam1@${by1}=${bv1.toFixed(1)} panel1@${py1}=${pv1.toFixed(1)} d=${(100 * (1 - bv1 / pv1)).toFixed(0)}%`,
    `| beam2@${by2}=${bv2.toFixed(1)} panel2@${py2}=${pv2.toFixed(1)} d=${(100 * (1 - bv2 / pv2)).toFixed(0)}%`,
    `| dip1@${dip1[0]}=${dip1[1].toFixed(1)}(${(100 * (1 - dip1[1] / pv1)).toFixed(0)}%)`,
    `dip2@${dip2[0]}=${dip2[1].toFixed(1)}(${(100 * (1 - dip2[1] / pv2)).toFixed(0)}%)`)
  if (process.env.DUMP) console.log('   ', p.map((v, i) => (i % 4 === 0 ? `${i + 30}:${v.toFixed(0)}` : '')).filter(Boolean).join(' '))
}
