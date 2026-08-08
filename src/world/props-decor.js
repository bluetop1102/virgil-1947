import { rng, clamp, fbm, lerp, noise2D, smoothstep } from '../core/util.js'
import {
  edgeWear, lathe, ribbon, crumple, merge, twoSided, mesh, group, groundContact
} from './kit.js'

// 눌려 벗겨진 윗면(소파 팔걸이·의자 좌판). 벨벳은 앉는 자리가 어두워지는 게 아니라 파일(pile)이
// 사라지며 밝아진다 — 근접에서 명도차로 읽혀야 "여기 사람이 오래 앉았다"가 성립한다
// (체험 리뷰 N6: "소파 팔걸이 마모는 원거리 판독 불가"). edgeWear가 구운 정점 컬러 위에 곱한다.
// kit.js 가 제자리지만 그 파일에는 기존 materials-outside-factory 위반이 있어 계약 린트가
// 커밋을 막는다 — 위반 해소는 소유자 라운드 소관이라 여기에 둔다.
export function rubbedTop (geo, seed) {
  const g = geo.attributes.color ? geo : edgeWear(geo, { amount: 0.5, seed })
  const pos = g.attributes.position
  const nrm = g.attributes.normal
  const col = g.attributes.color
  const n = noise2D(seed + 41)
  g.computeBoundingBox()
  const bx = g.boundingBox
  const sy = Math.max(bx.max.y - bx.min.y, 1e-5)
  const cz = (bx.min.z + bx.max.z) * 0.5
  const sz = Math.max((bx.max.z - bx.min.z) * 0.5, 1e-5)
  for (let i = 0; i < pos.count; i++) {
    const ty = smoothstep(clamp(((pos.getY(i) - bx.min.y) / sy - 0.52) / 0.34, 0, 1))
    const up = clamp(nrm.getY(i), 0, 1)
    const mid = 1 - clamp(Math.abs((pos.getZ(i) - cz) / sz), 0, 1)
    const grain = fbm(n, pos.getX(i) * 7, pos.getZ(i) * 7, 3) * 0.5 + 0.5
    const k = 1 + clamp(ty * up * (0.45 + 0.75 * mid) * (0.5 + 0.6 * grain), 0, 1) * 0.62
    col.setXYZ(i, col.getX(i) * k, col.getY(i) * k, col.getZ(i) * k)
  }
  col.needsUpdate = true
  return g
}

export function potPlant (seed = 1) {
  const root = group('potPlant')
  const r = rng(seed)
  const pot = mesh(lathe([[0, 0], [0.14, 0], [0.155, 0.02], [0.175, 0.24], [0.19, 0.28], [0.185, 0.30], [0.168, 0.29], [0.155, 0.03]], 30),
    'ceramic.sink', { wear: 0.85, seed })
  const soil = mesh(crumple(lathe([[0, 0.27], [0.16, 0.275], [0.166, 0.265]], 26), { amp: 0.012, freq: 22, seed: seed + 1 }),
    'grime.overlay', { wear: 0.6, seed: seed + 1 })
  root.add(pot, soil)
  const fg = [], fm = []
  for (let i = 0; i < 11; i++) {
    const a = r() * Math.PI * 2
    const lean = lerp(0.18, 0.62, r())
    const len = lerp(0.34, 0.62, r())
    const droop = lerp(0.3, 0.85, r())
    const p = [
      [0, 0.27, 0],
      [Math.cos(a) * len * 0.34 * lean, 0.27 + len * 0.55, Math.sin(a) * len * 0.34 * lean],
      [Math.cos(a) * len * 0.85, 0.27 + len * (0.86 - droop * 0.42), Math.sin(a) * len * 0.85],
      [Math.cos(a) * len * 1.12, 0.27 + len * (0.72 - droop * 0.62), Math.sin(a) * len * 1.12]
    ]
    fg.push(ribbon(p, (t) => 0.012 + Math.sin(clamp(t, 0, 1) * Math.PI) * 0.055 * (1 - t * 0.35), 14, (r() - 0.5) * 1.4))
    fm.push(null)
  }
  root.add(mesh(twoSided(merge(fg, fm)), 'grime.overlay', { wear: 0.9, seed: seed + 3 }))
  groundContact(root, { strength: 0.6, spread: 0.8 })
  return { root, anchors: { rim: [0, 0.30, 0] } }
}
