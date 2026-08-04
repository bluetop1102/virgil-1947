// 손에 잡히는 소품·증거물. props.js가 재수출한다(§11 파일당 500줄 분할).

import * as THREE from 'three'
import { rng, clamp, lerp, smoothstep, noise2D, fbm } from '../core/util.js'
import {
  bevelBox, lathe, profile, tube, crumple, merge, twoSided, xf, collar,
  mesh, glowMesh, group, groundContact
} from './kit.js'

// 종이 한 장. 완전 평면은 D4/D6에서 죽은 면으로 읽히므로 항상 미세하게 휜다.
// o.fold 를 주면 한쪽 모서리가 대각 크리스를 따라 접혀 실루엣이 직사각형에서 벗어난다.
function sheet (w, h, seed, curl = 0.012, seg = 12, o = {}) {
  const g = new THREE.PlaneGeometry(w, h, seg, seg)
  g.rotateX(-Math.PI / 2)
  const pos = g.attributes.position
  const n = noise2D(seed)
  const fold = o.fold ?? 0
  const fs = o.foldSign ?? 1
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i)
    const e = Math.pow(Math.abs(x) / (w * 0.5), 2.2) + Math.pow(Math.abs(z) / (h * 0.5), 2.6)
    // 구겨진 종이의 결은 등방 노이즈가 아니라 몇 가닥의 긴 능선이다 — 사인 능선을 겹쳐 만든다.
    const crease = Math.sin(x * (o.creaseFreq ?? 17) + fbm(n, x * 3, z * 3, 2) * 2.4) *
      Math.sin(z * (o.creaseFreq ?? 17) * 0.62 + 1.1) * curl * (o.crease ?? 0.55)
    let y = e * curl + fbm(n, x * 26, z * 26, 3) * curl * 0.35 + crease
    if (fold > 0) {
      // 접힌 모서리: 크리스 바깥쪽 삼각형을 위로 말아 올린다
      const u = (x * fs / (w * 0.5) + z / (h * 0.5)) * 0.5
      const t = clamp((u - (1 - fold)) / fold, 0, 1)
      y += smoothstep(t) * fold * Math.min(w, h) * 0.42
    }
    pos.setY(i, y)
  }
  g.computeVertexNormals()
  return g
}

// 종이를 실물 두께의 카드로 만든다. 0.3mm 자체는 화면에서 안 보여도 테두리가 만드는
// 하이라이트 선 한 줄이 "단색 쿼드"를 "물체"로 바꾼다(G6).
function card (w, h, seed, o = {}) {
  const seg = o.seg ?? 14
  const top = sheet(w, h, seed, o.curl ?? 0.010, seg, o)
  const t = o.thick ?? 0.0003
  const bot = top.clone()
  bot.translate(0, -t, 0)
  const parts = [top, twoSided(bot)]
  // 테두리 스트립 — 그리드 경계 정점을 따라 위/아래 면을 잇는다
  const p = top.attributes.position
  const idx = (ix, iz) => iz * (seg + 1) + ix
  const loop = []
  for (let ix = 0; ix <= seg; ix++) loop.push(idx(ix, 0))
  for (let iz = 1; iz <= seg; iz++) loop.push(idx(seg, iz))
  for (let ix = seg - 1; ix >= 0; ix--) loop.push(idx(ix, seg))
  for (let iz = seg - 1; iz >= 1; iz--) loop.push(idx(0, iz))
  const pos = [], tri = []
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i]
    pos.push(p.getX(a), p.getY(a), p.getZ(a), p.getX(a), p.getY(a) - t, p.getZ(a))
  }
  for (let i = 0; i < loop.length; i++) {
    const a = i * 2, b = ((i + 1) % loop.length) * 2
    tri.push(a, b, a + 1, b, b + 1, a + 1)
  }
  const rim = new THREE.BufferGeometry()
  rim.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  rim.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3 * 2), 2))
  rim.setIndex(tri)
  rim.computeVertexNormals()
  parts.push(rim)
  return merge(parts)
}

function ruledLines (w, h, rows, seed) {
  const g = [], m = []
  const r = rng(seed)
  for (let i = 0; i < rows; i++) {
    const y = -h * 0.5 + h * (i + 0.7) / (rows + 0.4)
    const len = w * lerp(0.34, 0.86, r())
    g.push(bevelBox(len, 0.0016, 0.0009, 0.0003, 1))
    m.push(xf([-w * 0.5 + len * 0.5 + w * 0.06, 0.0016, y]))
  }
  return merge(g, m)
}

// 타이핑된 본문. 글자 하나는 화면에서 2px 미만이라 자형은 못 읽히지만, 단어 길이와 어간의
// 리듬은 읽힌다 — 그 리듬이 "백지"와 "서류"를 가른다(G6). 활자 높이만큼 살짝 눌러 찍는다.
function typedText (w, h, seed, o = {}) {
  const r = rng(seed)
  const rows = o.rows ?? 15
  const em = o.em ?? Math.min(w, h) * 0.030
  const lh = (h * (o.fill ?? 0.78)) / rows
  const left = -w * 0.5 + w * (o.margin ?? 0.13)
  const right = w * 0.5 - w * (o.margin ?? 0.13)
  const glyph = new THREE.PlaneGeometry(1, 1)
  glyph.rotateX(-Math.PI / 2)
  const g = [], m = []
  for (let i = 0; i < rows; i++) {
    const z = -h * 0.5 + h * (o.top ?? 0.14) + i * lh
    if (z > h * 0.5 - em) break
    let x = left + (r() < (o.indent ?? 0.22) ? em * 3 : 0)
    const end = right - (i === rows - 1 ? (right - left) * lerp(0.1, 0.6, r()) : em * lerp(0, 3, r()))
    while (x < end) {
      const wl = Math.round(lerp(2, 9, r() * r() + 0.12))       // 단어 길이 분포는 짧은 쪽으로 치우친다
      for (let c = 0; c < wl && x < end; c++) {
        const cw = em * lerp(0.52, 0.94, r())
        g.push(glyph)
        m.push(xf([x + cw * 0.5, 0, z], [0, 0, 0], [cw, 1, em * lerp(0.72, 1.0, r())]))
        x += em * 0.92
      }
      x += em * lerp(0.7, 1.2, r())
    }
  }
  return g.length ? merge(g, m) : null
}

export function keyBrass (seed = 1, o = {}) {
  const root = group('keyBrass')
  const len = o.len ?? 0.075
  const g = [], m = []
  g.push(tube(Array.from({ length: 14 }, (_, i) => {
    const a = i / 14 * Math.PI * 2
    return [Math.cos(a) * 0.011, Math.sin(a) * 0.011 - 0.011, 0]
  }), 0.0038, 36, 6, true)); m.push(null)
  g.push(tube([[0, -0.021, 0], [0, -len, 0]], 0.0042, 4, 8)); m.push(null)
  const r = rng(seed)
  for (let i = 0; i < 3; i++) {
    const t = 0.008 + i * 0.009
    g.push(bevelBox(0.0075, 0.0055 + r() * 0.004, 0.0022, 0.0006, 1))
    m.push(xf([0.005, -len + t, 0]))
  }
  root.add(mesh(merge(g, m), 'brass.tarnished', { wear: 0.9, seed }))
  return { root, anchors: { bow: [0, -0.011, 0], tip: [0, -len, 0] } }
}

export function registerBook (seed = 1, o = {}) {
  const root = group('registerBook')
  const w = o.w ?? 0.40, d = o.d ?? 0.30, open = o.open !== false
  if (!open) {
    root.add(mesh(bevelBox(w, 0.055, d, 0.006, 2), 'leather.worn.brown', { wear: 0.9, seed }))
    root.add(mesh(bevelBox(w - 0.014, 0.042, d - 0.012, 0.002, 1), 'paper.aged', { wear: 0.4, seed: seed + 1, pos: [0.004, 0, 0] }))
    groundContact(root, { strength: 0.5, spread: 0.8 })
    return { root, anchors: { cover: [0, 0.03, 0] } }
  }
  const cover = merge(
    [bevelBox(w, 0.012, d, 0.004, 2), bevelBox(w, 0.012, d, 0.004, 2), bevelBox(0.028, 0.030, d, 0.008, 2)],
    [xf([-w * 0.5 - 0.016, 0.004, 0], [0, 0, 0.035]), xf([w * 0.5 + 0.016, 0.004, 0], [0, 0, -0.035]), xf([0, 0.014, 0])]
  )
  root.add(mesh(cover, 'leather.worn.brown', { wear: 0.95, seed }))
  const pages = merge(
    [bevelBox(w - 0.02, 0.020, d - 0.014, 0.003, 2), bevelBox(w - 0.02, 0.020, d - 0.014, 0.003, 2)],
    [xf([-w * 0.5 - 0.014, 0.020, 0], [0, 0, 0.04]), xf([w * 0.5 + 0.014, 0.020, 0], [0, 0, -0.04])]
  )
  root.add(mesh(pages, 'paper.aged', { wear: 0.35, seed: seed + 1 }))
  const leaf = sheet(w - 0.03, d - 0.02, seed + 2, 0.004, 14)
  for (const s of [-1, 1]) {
    const p = mesh(leaf, 'paper.aged', { wear: 0.25, seed: seed + 3 })
    p.position.set(s * (w * 0.5 + 0.014), 0.031, 0)
    p.rotation.z = -s * 0.04
    const lines = mesh(ruledLines(w - 0.05, d - 0.05, 11, seed + 4 + s), 'bakelite.black', { wear: 0.3, cast: false })
    lines.position.set(s * (w * 0.5 + 0.014), 0.033, 0)
    lines.rotation.z = -s * 0.04
    root.add(p, lines)
  }
  const ribbon = mesh(crumple(bevelBox(0.012, 0.0012, d * 0.62, 0.0004, 1), { amp: 0.004, freq: 30, seed: seed + 6 }),
    'fabric.velvet.red', { wear: 0.3, cast: false })
  ribbon.position.set(0.02, 0.034, d * 0.24)
  root.add(ribbon)
  groundContact(root, { strength: 0.45, spread: 0.9 })
  return { root, anchors: { leftPage: [-w * 0.5 - 0.014, 0.034, 0], rightPage: [w * 0.5 + 0.014, 0.034, 0] } }
}

export function telephone (seed = 1) {
  const root = group('telephone')
  const base = mesh(lathe([[0, 0], [0.085, 0], [0.090, 0.008], [0.082, 0.022], [0.055, 0.030],
    [0.052, 0.040], [0.030, 0.046], [0.028, 0.056]], 32), 'bakelite.black', { wear: 0.6, seed })
  root.add(base)
  const dg = [], dm = []
  dg.push(lathe([[0.028, 0.030], [0.070, 0.036], [0.072, 0.046], [0.030, 0.050]], 30)); dm.push(null)
  const r = rng(seed + 1)
  for (let i = 0; i < 10; i++) {
    const a = -0.5 + i / 10 * 5.0
    dg.push(lathe([[0, 0], [0.0092, 0.001], [0.0092, 0.010], [0, 0.011]], 12))
    dm.push(xf([Math.cos(a) * 0.049, 0.041, Math.sin(a) * 0.049]))
  }
  root.add(mesh(merge(dg, dm), 'brass.polished', { wear: 0.5, seed: seed + 1 }))
  const column = mesh(lathe([[0.028, 0.056], [0.022, 0.10], [0.016, 0.24], [0.020, 0.27],
    [0.030, 0.285], [0.044, 0.30], [0.040, 0.315], [0.020, 0.318]], 22), 'bakelite.black', { wear: 0.5, seed: seed + 2 })
  root.add(column)
  const fg = [], fm = []
  for (const s of [-1, 1]) {
    fg.push(tube([[0, 0.24, 0], [s * 0.045, 0.252, 0.028], [s * 0.062, 0.268, 0.052]], 0.0075, 14, 6)); fm.push(null)
  }
  root.add(mesh(merge(fg, fm), 'brass.tarnished', { wear: 0.7, seed: seed + 3 }))
  const rec = group('receiver')
  rec.add(mesh(merge(
    [lathe([[0, 0], [0.030, 0.006], [0.028, 0.016], [0.013, 0.020]], 20),
      tube([[0, 0.014, 0], [0.055, 0.028, 0], [0.110, 0.014, 0]], 0.011, 18, 8),
      lathe([[0, 0], [0.026, 0.006], [0.024, 0.015], [0.011, 0.019]], 20)],
    [null, null, xf([0.110, 0, 0])]
  ), 'bakelite.black', { wear: 0.55, seed: seed + 4 }))
  rec.position.set(-0.055, 0.272, 0.041)
  rec.rotation.set(0, 0.1, 0.04)
  root.add(rec)
  const cord = mesh(tube(Array.from({ length: 26 }, (_, i) => {
    const t = i / 25
    return [lerp(0.02, 0.10, t) + Math.sin(t * 26) * 0.012, lerp(0.24, 0.03, t) - Math.sin(t * Math.PI) * 0.06, Math.cos(t * 26) * 0.012 + t * 0.05]
  }), 0.0055, 60, 6), 'bakelite.black', { wear: 0.4, seed: seed + 5 })
  root.add(cord)
  groundContact(root, { strength: 0.55, spread: 0.85 })
  return { root, anchors: { mouth: [0, 0.318, 0], receiver: [-0.055, 0.272, 0.041] } }
}

// 1940년대 스탠더드 타자기. 순수 박스 몸통은 그 자체로 실격(D4)이라, 실루엣을 만드는 부재를
// 따로 세운다 — 곡면 사이드 플레이트 / 3단 계단 키뱅크 / 플래튼·페이퍼베일 롤러 / 리본 스풀 2개 /
// 캐리지 리턴 레버. 검은 실루엣만 봐도 타자기로 읽혀야 한다.
export function typewriter (seed = 1) {
  const root = group('typewriter')
  const w = 0.34
  const r = rng(seed + 2)

  // 사이드 플레이트: 앞이 낮고 뒤로 솟는 곡면 프레임. u = -z(뒤가 +), v = y.
  const CHEEK = [[-0.150, 0.005], [-0.150, 0.028], [-0.126, 0.041], [-0.086, 0.052],
    [-0.030, 0.062], [0.018, 0.088], [0.058, 0.119], [0.090, 0.127],
    [0.117, 0.112], [0.126, 0.068], [0.118, 0.018], [0.098, 0.004]]
  const bg = [], bm = []
  for (const s of [-1, 1]) {
    const x0 = s * (w * 0.5 - 0.016)
    bg.push(profile(CHEEK, [[x0, 0, 0], [x0 + s * 0.015, 0, 0]], { up: [0, 1, 0], curveSegments: 2 }))
    bm.push(null)
  }
  // 몸통 셸 — 모따기 반경은 최소변의 1.5% 이상(0.085 × 0.055)
  bg.push(bevelBox(w - 0.034, 0.082, 0.185, 0.0055, 3)); bm.push(xf([0, 0.043, -0.030]))
  bg.push(bevelBox(w - 0.052, 0.030, 0.152, 0.0060, 3)); bm.push(xf([0, 0.098, -0.048]))
  // 3단 계단형 키뱅크 라이저 — 각 단이 모따기된 별개 부재라 앞 실루엣이 톱니로 읽힌다
  for (let s = 0; s < 3; s++) {
    bg.push(bevelBox(w - 0.040 - s * 0.012, 0.020, 0.030, 0.0045, 3))
    bm.push(xf([0, 0.030 + s * 0.013, 0.118 - s * 0.030]))
  }
  bg.push(bevelBox(w - 0.020, 0.014, 0.026, 0.0045, 3)); bm.push(xf([0, 0.014, 0.140]))
  root.add(mesh(merge(bg, bm), 'bakelite.black', { wear: 0.7, seed }))

  const kg = [], km = []
  const keyGeo = lathe([[0, 0], [0.0088, 0.0012], [0.0088, 0.0058], [0.0062, 0.0072], [0, 0.0072]], 14)
  const stem = lathe([[0.0026, -0.016], [0.0032, -0.004], [0.0026, 0]], 8)
  for (let row = 0; row < 4; row++) {
    const cols = 10 - (row % 2)
    for (let i = 0; i < cols; i++) {
      const x = (i - (cols - 1) / 2) * 0.0295 + (row % 2 ? 0.014 : 0)
      const z = 0.148 - row * 0.029
      const y = 0.056 + row * 0.0135 + (r() - 0.5) * 0.0012
      kg.push(keyGeo); km.push(xf([x, y, z], [-0.22, 0, 0]))
      kg.push(stem); km.push(xf([x, y, z], [-0.22, 0, 0]))
    }
  }
  const spaceBar = lathe([[0, 0], [0.010, 0.002], [0.010, 0.007], [0, 0.008]], 12)
  kg.push(spaceBar); km.push(xf([0, 0.024, 0.150], [-0.1, 0, 0], [8.4, 1, 1]))
  root.add(mesh(merge(kg, km), 'bakelite.black', { wear: 0.45, seed: seed + 2 }))

  const sg = [], sm = []
  for (let i = 0; i < 22; i++) {                       // 타이프바 바스켓
    const a = (i / 21 - 0.5) * 1.5
    sg.push(bevelBox(0.0026, 0.0014, 0.10, 0.0005, 1))
    sm.push(xf([Math.sin(a) * 0.055, 0.108 + Math.cos(a) * 0.008, -0.048], [0.5, -a, 0]))
  }
  // 캐리지: 플래튼 + 양 끝 노브 + 레일 + 페이퍼 베일(작은 롤러 2개)
  const PY = 0.158, PZ = -0.088
  sg.push(lathe([[0, -0.135], [0.026, -0.133], [0.0285, -0.126], [0.0285, 0.126], [0.026, 0.133], [0, 0.135]], 26))
  sm.push(xf([0, PY, PZ], [0, 0, Math.PI / 2]))
  sg.push(tube([[-0.168, PY - 0.036, PZ + 0.026], [0.168, PY - 0.036, PZ + 0.026]], 0.0065, 4, 8)); sm.push(null)
  sg.push(tube([[-0.150, PY + 0.030, PZ + 0.040], [0.150, PY + 0.030, PZ + 0.040]], 0.0042, 4, 7)); sm.push(null)
  for (const s of [-1, 1]) {
    sg.push(tube([[s * 0.150, PY + 0.030, PZ + 0.040], [s * 0.142, PY + 0.004, PZ + 0.030]], 0.0038, 4, 6)); sm.push(null)
    sg.push(lathe([[0, -0.010], [0.011, -0.009], [0.012, 0.009], [0, 0.010]], 12))
    sm.push(xf([s * 0.075, PY + 0.030, PZ + 0.040], [0, 0, Math.PI / 2]))
    // 리본 스풀 — 위로 튀어나온 실루엣 두 개
    sg.push(lathe([[0, 0], [0.020, 0.001], [0.021, 0.005], [0.008, 0.007], [0.008, 0.022],
      [0.021, 0.024], [0.020, 0.028], [0, 0.029]], 18))
    sm.push(xf([s * 0.088, 0.112, -0.014]))
    sg.push(collar(0.0285, { t: 0.012, b: 0.006, seg: 20 }))
    sm.push(xf([s * 0.128, PY, PZ], [0, 0, Math.PI / 2]))
  }
  // 캐리지 리턴 레버 — 좌측으로 길게 뻗는 팔. 실루엣 판독의 결정타다.
  sg.push(tube([[-0.150, PY + 0.012, PZ], [-0.196, PY + 0.026, PZ + 0.018],
    [-0.216, PY + 0.052, PZ + 0.052], [-0.206, PY + 0.062, PZ + 0.086]], 0.0055, 20, 7)); sm.push(null)
  sg.push(lathe([[0, 0], [0.009, 0.002], [0.009, 0.020], [0, 0.022]], 12))
  sm.push(xf([-0.206, PY + 0.062, PZ + 0.092], [1.42, 0, 0.22]))
  root.add(mesh(merge(sg, sm), 'steel.galvanized', { wear: 0.75, seed: seed + 3 }))

  const kn = [], knm = []
  for (const s of [-1, 1]) {
    kn.push(lathe([[0, 0], [0.030, 0.003], [0.033, 0.010], [0.030, 0.020], [0.014, 0.023], [0, 0.023]], 22))
    knm.push(xf([s * 0.146, PY, PZ], [0, 0, s * Math.PI / 2]))
  }
  kn.push(bevelBox(0.058, 0.006, 0.030, 0.0018, 2)); knm.push(xf([0.096, 0.114, 0.008], [0, 0, 0]))
  root.add(mesh(merge(kn, knm), 'brass.tarnished', { wear: 0.6, seed: seed + 5 }))

  // 플래튼에 물린 서류 — 백지 판이 아니라 타이핑된 양식이어야 한다(G6)
  const pw = 0.204, ph = 0.268
  const paper = mesh(card(pw, ph, seed + 4, { curl: 0.009, seg: 16, fold: 0.14, foldSign: -1, crease: 0.7 }),
    'paper.aged', { wear: 0.25, seed: seed + 4 })
  const glyphs = typedText(pw, ph, seed + 8, { rows: 16, em: 0.0062, top: 0.16, fill: 0.74 })
  const ink = glyphs ? mesh(glyphs, 'bakelite.black', { cast: false }) : null
  if (ink) ink.position.y = 0.0011
  const head = mesh(merge([bevelBox(pw * 0.42, 0.0012, 0.0022, 0.0004, 1),
    bevelBox(pw * 0.30, 0.0012, 0.0016, 0.0004, 1), bevelBox(pw * 0.74, 0.0012, 0.0011, 0.0003, 1)],
  [xf([-pw * 0.16, 0.0012, -ph * 0.40]), xf([-pw * 0.22, 0.0012, -ph * 0.34]), xf([0, 0.0012, -ph * 0.28])]),
  'bakelite.black', { cast: false })
  const bay = group('page')
  bay.add(paper, head)
  if (ink) bay.add(ink)
  bay.position.set(0, PY + 0.020, PZ + 0.030)
  bay.rotation.x = -1.28
  root.add(bay)

  groundContact(root, { radius: 0.175, radiusZ: 0.16, strength: 0.86 })
  groundContact(root, { radius: 0.30, radiusZ: 0.27, strength: 0.28, y: 0.0026 })
  return { root, anchors: { platen: [0, PY, PZ], paper: [0, 0.32, -0.16] } }
}

export function ashtray (seed = 1, o = {}) {
  const root = group('ashtray')
  const dish = mesh(lathe([[0, 0], [0.075, 0.002], [0.082, 0.014], [0.084, 0.030],
    [0.072, 0.032], [0.066, 0.016], [0.050, 0.008], [0, 0.007]], 34), 'glass.clear', { wear: 0.3, seed })
  root.add(dish)
  const r = rng(seed + 1)
  const bg = [], bm = [], eg = [], em = []
  for (let i = 0; i < (o.butts ?? 4); i++) {
    const a = r() * Math.PI * 2
    const rad = lerp(0.012, 0.05, r())
    const rot = r() * Math.PI * 2
    bg.push(lathe([[0, 0], [0.0042, 0.0005], [0.0042, 0.026], [0, 0.0265]], 10))
    bm.push(xf([Math.cos(a) * rad, 0.012, Math.sin(a) * rad], [Math.PI / 2 - 0.06, rot, 0]))
    eg.push(lathe([[0, 0], [0.0043, 0.0005], [0.0043, 0.011], [0, 0.0113]], 10))
    em.push(xf([Math.cos(a) * rad + Math.sin(rot) * 0.026, 0.012, Math.sin(a) * rad + Math.cos(rot) * 0.026], [Math.PI / 2 - 0.06, rot, 0]))
  }
  root.add(mesh(merge(bg, bm), 'paper.aged', { wear: 0.7, seed: seed + 2 }))
  root.add(mesh(merge(eg, em), 'grime.overlay', { wear: 0.9, seed: seed + 3 }))
  const ag = [], am = []
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2
    const rad = r() * 0.055
    ag.push(bevelBox(0.0035 + r() * 0.004, 0.0012, 0.0035 + r() * 0.004, 0.0004, 1))
    am.push(xf([Math.cos(a) * rad, 0.0078, Math.sin(a) * rad], [0, r() * 3, 0]))
  }
  root.add(mesh(merge(ag, am), 'grime.overlay', { wear: 0.8, seed: seed + 4, cast: false }))
  return { root, anchors: { rim: [0, 0.032, 0] } }
}

export function cigarette (seed = 1, o = {}) {
  const root = group('cigarette')
  const len = o.len ?? 0.068
  const body = mesh(lathe([[0, 0], [0.0043, 0.0006], [0.0043, len * 0.62], [0.0043, len], [0, len]], 12),
    'paper.aged', { wear: 0.35, seed })
  const band = mesh(lathe([[0.00435, 0], [0.00435, len * 0.30]], 12), 'leather.worn.brown', { wear: 0.4, seed: seed + 1 })
  const ember = glowMesh(lathe([[0, len], [0.0042, len - 0.002], [0.0038, len + 0.003], [0, len + 0.004]], 10),
    'ember', { color: 0x1c0a04, emissive: 0xff5a1e, intensity: 4.5, roughness: 0.7 })
  root.add(body, band, ember)
  return { root, anchors: { smoke: [0, len + 0.004, 0], tip: [0, 0, 0] } }
}

export function glassTumbler (seed = 1, o = {}) {
  const root = group('glassTumbler')
  const h = o.h ?? 0.095
  root.add(mesh(lathe([[0, 0], [0.033, 0], [0.035, 0.006], [0.033, 0.026], [0.036, h - 0.004],
    [0.037, h], [0.032, h], [0.030, h - 0.006], [0.027, 0.030], [0.026, 0.022], [0, 0.021]], 34),
  'glass.clear', { wear: 0.15, seed }))
  if (o.liquid !== false) {
    root.add(mesh(lathe([[0, 0.021], [0.0285, 0.024], [0.031, h * 0.52], [0, h * 0.525]], 30),
      'water.dark', { cast: false }))
  }
  return { root, anchors: { rim: [0, h, 0] } }
}

export function whiskeyBottle (seed = 1) {
  const root = group('whiskeyBottle')
  root.add(mesh(lathe([[0, 0], [0.041, 0.003], [0.044, 0.012], [0.044, 0.15], [0.038, 0.185],
    [0.017, 0.215], [0.016, 0.268], [0.019, 0.276], [0.017, 0.284], [0, 0.285]], 34),
  'glass.clear', { wear: 0.2, seed }))
  root.add(mesh(lathe([[0, 0.012], [0.040, 0.014], [0.040, 0.15], [0.034, 0.182], [0.014, 0.208], [0, 0.209]], 30),
    'water.dark', { cast: false }))
  const cap = mesh(lathe([[0, 0.276], [0.020, 0.278], [0.021, 0.300], [0.016, 0.306], [0, 0.307]], 20),
    'bakelite.black', { wear: 0.6, seed: seed + 1 })
  const label = mesh(lathe([[0.0445, 0.042], [0.0445, 0.132]], 34, { phiStart: -1.15, phiLength: 2.3 }),
    'paper.aged', { wear: 0.55, seed: seed + 2, cast: false })
  root.add(cap, label)
  groundContact(root, { strength: 0.5, spread: 0.9 })
  return { root, anchors: { neck: [0, 0.27, 0], cap: [0, 0.30, 0] } }
}

export function suitcase (seed = 1, o = {}) {
  const root = group('suitcase')
  const w = o.w ?? 0.60, h = o.h ?? 0.20, d = o.d ?? 0.42
  root.add(mesh(bevelBox(w, h, d, 0.018, 3), 'leather.worn.brown', { wear: 0.95, seed, pos: [0, h * 0.5, 0] }))
  const g = [], m = []
  for (const s of [-1, 1]) {
    g.push(bevelBox(w * 0.06, h + 0.006, d + 0.006, 0.010, 2)); m.push(xf([s * w * 0.36, h * 0.5, 0]))
  }
  g.push(bevelBox(w + 0.004, 0.012, d + 0.004, 0.004, 1)); m.push(xf([0, h * 0.52, 0]))
  root.add(mesh(merge(g, m), 'leather.worn.brown', { wear: 0.6, seed: seed + 1 }))
  const bg = [], bm = []
  for (const s of [-1, 1]) {
    bg.push(bevelBox(0.052, 0.030, 0.016, 0.005, 2)); bm.push(xf([s * 0.14, h * 0.52, d * 0.5 + 0.004]))
    bg.push(bevelBox(0.030, 0.018, 0.010, 0.003, 1)); bm.push(xf([s * 0.14, h * 0.52 - 0.024, d * 0.5 + 0.006]))
  }
  bg.push(tube([[-0.062, h + 0.006, 0], [-0.052, h + 0.052, 0], [0.052, h + 0.052, 0], [0.062, h + 0.006, 0]], 0.010, 20, 8))
  bm.push(null)
  root.add(mesh(merge(bg, bm), 'brass.tarnished', { wear: 0.85, seed: seed + 2 }))
  groundContact(root, { strength: 0.7, spread: 0.95 })
  return { root, anchors: { handle: [0, h + 0.055, 0], lid: [0, h, 0] } }
}

export function policeCamera (seed = 1) {
  const root = group('policeCamera')
  const body = mesh(bevelBox(0.16, 0.20, 0.09, 0.010, 2), 'leather.worn.brown', { wear: 0.9, seed })
  body.position.set(0, 0.10, -0.03)
  root.add(body)
  const bel = [], bm = []
  for (let i = 0; i < 9; i++) {
    const t = i / 8
    const s = lerp(1.0, 0.55, t)
    bel.push(bevelBox(0.13 * s, 0.15 * s, 0.014, 0.004, 1))
    bm.push(xf([0, 0.10, 0.022 + t * 0.088], [0, 0, 0], [1, 1, 1]))
  }
  root.add(mesh(merge(bel, bm), 'bakelite.black', { wear: 0.7, seed: seed + 1 }))
  const lg = [], lm = []
  lg.push(lathe([[0.020, 0], [0.034, 0.004], [0.036, 0.020], [0.030, 0.028], [0.020, 0.030]], 24)); lm.push(xf([0, 0.10, 0.112], [Math.PI / 2, 0, 0]))
  lg.push(lathe([[0, 0], [0.030, 0.002], [0.030, 0.010], [0, 0.011]], 20)); lm.push(xf([0, 0.145, -0.03], [0, 0, 0]))
  root.add(mesh(merge(lg, lm), 'brass.polished', { wear: 0.6, seed: seed + 2 }))
  root.add(mesh(lathe([[0, 0], [0.019, 0.0015], [0.019, 0.006], [0, 0.007]], 20), 'glass.clear',
    { pos: [0, 0.10, 0.142], rot: [Math.PI / 2, 0, 0], cast: false }))
  const flash = group('flash')
  flash.add(mesh(lathe([[0.008, 0], [0.052, 0.030], [0.070, 0.062], [0.072, 0.068], [0.052, 0.036], [0.010, 0.006]], 26),
    'steel.galvanized', { wear: 0.5, seed: seed + 3 }))
  flash.add(glowMesh(lathe([[0, 0], [0.020, 0.012], [0.022, 0.030], [0.012, 0.042], [0, 0.044]], 16), 'flashbulb',
    { color: 0x2a2a26, emissive: 0xcfe0ff, intensity: 0.55, roughness: 0.15 }))
  flash.position.set(-0.14, 0.13, -0.02)
  flash.rotation.set(-Math.PI / 2, 0, -0.35)
  root.add(flash)
  root.add(mesh(tube([[-0.13, 0.02, -0.02], [-0.10, 0.005, -0.02], [-0.075, 0.02, -0.02]], 0.009, 14, 7),
    'leather.worn.brown', { wear: 0.9, seed: seed + 4 }))
  groundContact(root, { strength: 0.6, spread: 1.0 })
  return { root, anchors: { lens: [0, 0.10, 0.145], flash: [-0.14, 0.17, -0.02] } }
}

export function photoPrint (seed = 1, o = {}) {
  const root = group('photoPrint')
  const w = o.w ?? 0.125, h = o.h ?? 0.165
  const paper = mesh(twoSided(sheet(w, h, seed, o.curl ?? 0.010, 14)), 'paper.aged', { wear: 0.4, seed })
  const img = mesh(sheet(w - 0.018, h - 0.022, seed + 1, o.curl ?? 0.010, 12), 'grime.overlay',
    { wear: 0.6, seed: seed + 1, cast: false, pos: [0, 0.0008, 0] })
  root.add(paper, img)
  return { root, anchors: { face: [0, 0.002, 0] } }
}

export function journal (seed = 1, o = {}) {
  const root = group('journal')
  const w = o.w ?? 0.115, d = o.d ?? 0.165
  root.add(mesh(bevelBox(w, 0.020, d, 0.005, 2), 'leather.worn.brown', { wear: 0.95, seed, pos: [0, 0.010, 0] }))
  root.add(mesh(bevelBox(w - 0.008, 0.014, d - 0.006, 0.002, 1), 'paper.aged', { wear: 0.5, seed: seed + 1, pos: [0.003, 0.010, 0] }))
  root.add(mesh(crumple(bevelBox(0.010, 0.0016, d + 0.006, 0.0005, 1), { amp: 0.002, freq: 30, seed: seed + 2 }),
    'fabric.velvet.red', { wear: 0.4, seed: seed + 2, pos: [-w * 0.24, 0.0195, 0.006], cast: false }))
  groundContact(root, { strength: 0.42, spread: 0.85 })
  return { root, anchors: { cover: [0, 0.021, 0] } }
}

export function ledger (seed = 1, o = {}) {
  const root = group('ledger')
  const w = o.w ?? 0.30, d = o.d ?? 0.40
  root.add(mesh(bevelBox(w, 0.050, d, 0.006, 2), 'leather.worn.brown', { wear: 0.9, seed, pos: [0, 0.025, 0] }))
  root.add(mesh(bevelBox(w - 0.012, 0.038, d - 0.010, 0.002, 1), 'paper.aged', { wear: 0.45, seed: seed + 1, pos: [0.004, 0.025, 0] }))
  root.add(mesh(bevelBox(0.034, 0.054, d + 0.004, 0.010, 2), 'fabric.velvet.red', { wear: 0.7, seed: seed + 2, pos: [-w * 0.5 + 0.012, 0.025, 0] }))
  const lg = [], lm = []
  for (let i = 0; i < 3; i++) {
    lg.push(bevelBox(w * 0.5, 0.0018, 0.0016, 0.0004, 1))
    lm.push(xf([0.02, 0.0505, -d * 0.30 + i * 0.020]))
  }
  root.add(mesh(merge(lg, lm), 'brass.polished', { wear: 0.5, seed: seed + 3, cast: false }))
  groundContact(root, { strength: 0.55, spread: 0.9 })
  return { root, anchors: { cover: [0, 0.051, 0] } }
}
