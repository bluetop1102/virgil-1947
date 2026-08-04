// 대기 프로브가 쓰는 건축 셸. 무드마다 "실제 공간"이 있어야 조명·안개·비가 놓일 자리가 생긴다.
// 프리미티브 턴테이블은 재질 프리뷰지 씬이 아니다(루브릭 D4/G10).
// 재질은 계약대로 materials/library.js의 mat()만 쓴다 — 여기서 new Material을 만들지 않는다.

import * as THREE from 'three'
import { rng, lerp } from '../../core/util.js'
import { bevelBox, profile, merge, mesh, group } from '../kit.js'

export const BASE_PROF = [[0, 0], [0.135, 0], [0.135, 0.020], [0.118, 0.028], [0.116, 0.040],
  [0.128, 0.048], [0.104, 0.058], [0.018, 0.058], [0.012, 0.028], [0, 0.024]]
export const RAIL_PROF = [[0, 0], [0.062, 0], [0.058, 0.018], [0.040, 0.026], [0.034, 0.044],
  [0.014, 0.052], [0, 0.050]]
export const CROWN_PROF = [[0, 0], [0.165, 0], [0.156, 0.034], [0.130, 0.050], [0.108, 0.086],
  [0.066, 0.122], [0.026, 0.138], [0, 0.140]]

const T = 0.22   // 벽 두께

// 사각 방의 네 벽 런. up 벡터는 단면이 실내를 향하도록 벽마다 다르다(kit.profile 프레임 규약).
export function runs (x0, x1, z0, z1, y) {
  return [
    [[x0, y, z0], [x1, y, z0], [0, 0, 1]],
    [[x1, y, z0], [x1, y, z1], [-1, 0, 0]],
    [[x1, y, z1], [x0, y, z1], [0, 0, -1]],
    [[x0, y, z1], [x0, y, z0], [1, 0, 0]]
  ]
}

export function trimRun (prof, list) {
  const g = []
  for (const [a, b, up] of list) g.push(profile(prof, [a, b], { up }))
  return merge(g)
}

/**
 * 닫힌 방 껍데기. {x0,x1,z0,z1,h, floor, ceil, wall, wainscot, wainscotH, skipZ0...}
 * 벽은 두께가 있는 상자다 — 판때기 평면은 그림자와 볼류메트릭이 새서 즉시 가짜로 읽힌다.
 */
export function room (o) {
  const g = group('shell')
  const cx = (o.x0 + o.x1) * 0.5, cz = (o.z0 + o.z1) * 0.5
  const w = o.x1 - o.x0, d = o.z1 - o.z0, h = o.h
  g.add(mesh(new THREE.PlaneGeometry(w, d, 12, 12), o.floor,
    { rot: [-Math.PI / 2, 0, 0], pos: [cx, 0, cz], cast: false }))
  if (o.ceil) {
    g.add(mesh(new THREE.PlaneGeometry(w, d, 6, 6), o.ceil,
      { rot: [Math.PI / 2, 0, 0], pos: [cx, h, cz], cast: false }))
  }
  const wall = o.wall
  if (!o.skipZ0) g.add(mesh(bevelBox(w + T * 2, h, T, 0.02, 2), wall, { pos: [cx, h * 0.5, o.z0 - T * 0.5], cast: false }))
  if (!o.skipZ1) g.add(mesh(bevelBox(w + T * 2, h, T, 0.02, 2), wall, { pos: [cx, h * 0.5, o.z1 + T * 0.5], cast: false }))
  if (!o.skipX0) g.add(mesh(bevelBox(T, h, d, 0.02, 2), wall, { pos: [o.x0 - T * 0.5, h * 0.5, cz], cast: false }))
  if (!o.skipX1) g.add(mesh(bevelBox(T, h, d, 0.02, 2), wall, { pos: [o.x1 + T * 0.5, h * 0.5, cz], cast: false }))

  if (o.wainscot) {
    const wy = o.wainscotH ?? 1.02
    const pan = []
    const push = (px, py, pz, pw, pd) => {
      pan.push(bevelBox(pw, wy, pd, 0.012, 2).clone().translate(px, py, pz))
    }
    push(cx, wy * 0.5, o.z0 + 0.03, w, 0.06)
    push(cx, wy * 0.5, o.z1 - 0.03, w, 0.06)
    push(o.x0 + 0.03, wy * 0.5, cz, 0.06, d)
    push(o.x1 - 0.03, wy * 0.5, cz, 0.06, d)
    g.add(mesh(merge(pan), o.wainscot, { wear: 0.8, seed: 31, cast: false }))
    g.add(mesh(trimRun(RAIL_PROF, runs(o.x0 + 0.005, o.x1 - 0.005, o.z0 + 0.005, o.z1 - 0.005, wy)),
      o.wainscot, { wear: 0.9, seed: 33, cast: false }))
  }
  g.add(mesh(trimRun(BASE_PROF, runs(o.x0 + 0.002, o.x1 - 0.002, o.z0 + 0.002, o.z1 - 0.002, 0)),
    o.trim ?? 'wood.painted.white', { wear: 0.85, seed: 35, cast: false }))
  if (o.ceil) {
    g.add(mesh(trimRun(CROWN_PROF, runs(o.x0 + 0.002, o.x1 - 0.002, o.z0 + 0.002, o.z1 - 0.002, h - 0.14)),
      o.trim ?? 'wood.painted.white', { wear: 0.6, seed: 37, cast: false }))
  }
  return g
}

// 벽 개구부(창·문틀 안쪽). 벽 상자를 뚫을 수 없으니 개구부 둘레만 네 조각으로 다시 세운다.
export function pierced (axis, at, h, wall, span, hole, opts = {}) {
  const g = []
  const [a0, a1] = span
  const [h0, h1] = hole
  const y0 = opts.sill ?? 0.9
  const y1 = opts.head ?? 2.25
  const mk = (u0, u1, v0, v1) => {
    const uw = u1 - u0, vh = v1 - v0
    if (uw <= 0.001 || vh <= 0.001) return
    const b = bevelBox(axis === 'x' ? T : uw, vh, axis === 'x' ? uw : T, 0.02, 2).clone()
    b.translate(axis === 'x' ? at : (u0 + u1) * 0.5, (v0 + v1) * 0.5, axis === 'x' ? (u0 + u1) * 0.5 : at)
    g.push(b)
  }
  mk(a0, h0, 0, h)
  mk(h1, a1, 0, h)
  mk(h0, h1, 0, y0)
  mk(h0, h1, y1, h)
  return mesh(merge(g), wall, { cast: false })
}

// 슬랫 블라인드. 광축 셸의 slat 변조와 짝을 이뤄 실제 그림자 줄무늬를 만든다.
export function blinds (w, h, count, seed, tiltBase = 0.62) {
  const r = rng(seed)
  const g = [], m = []
  const geo = bevelBox(w, 0.004, 0.052, 0.0015, 1)
  for (let i = 0; i < count; i++) {
    const y = h - (i + 0.5) * (h / count)
    const tilt = tiltBase + (r() - 0.5) * 0.10
    g.push(geo)
    m.push(new THREE.Matrix4().makeRotationX(tilt).setPosition(0, y, (r() - 0.5) * 0.004))
  }
  const o = mesh(merge(g, m), 'wood.painted.white', { wear: 0.5, seed: seed + 2 })
  const cordGeo = bevelBox(0.006, h, 0.006, 0.002, 1).clone().translate(w * 0.32, h * 0.5, 0.02)
  o.add(mesh(cordGeo, 'wood.painted.white', { cast: false }))
  return o
}

// 벽에 붙는 액자·번호판처럼 얇은 판. 벽면에서 살짝 띄워 자체 그림자를 남긴다.
export function plate (w, h, name, seed) {
  return mesh(bevelBox(w, h, 0.010, 0.003, 1), name, { wear: 0.6, seed })
}

export function tiledFloor (x0, x1, z0, z1, name, cell, seed) {
  const r = rng(seed)
  const g = [], m = []
  const nx = Math.max(1, Math.round((x1 - x0) / cell))
  const nz = Math.max(1, Math.round((z1 - z0) / cell))
  const geo = bevelBox(cell * 0.97, 0.018, cell * 0.97, 0.004, 1)
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nz; j++) {
      g.push(geo)
      m.push(new THREE.Matrix4().makeRotationY((r() - 0.5) * 0.012)
        .setPosition(x0 + (i + 0.5) * cell, lerp(-0.004, 0.002, r()), z0 + (j + 0.5) * cell))
    }
  }
  return mesh(merge(g, m), name, { cast: false, wear: 0.35, seed: seed + 1 })
}
