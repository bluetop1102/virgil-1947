import { rng, clamp, lerp } from '../core/util.js'
import {
  lathe, ribbon, crumple, merge, twoSided, mesh, group, groundContact
} from './kit.js'

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
