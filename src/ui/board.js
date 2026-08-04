// 증거판. 벽에 핀으로 꽂힌 서류와 실. 성립한 링크의 실은 팽팽하고, 아직 안 걸린 실은 늘어져 있다.
import { sheet, surface, place } from './paper.js'
import { typed, block, penLine, INK, wrap } from './type.js'
import { SKETCH, SKETCH_FOR, pushpin } from './sketch.js'
import { docItem } from './casebook.js'
import { photoSheet } from './photos.js'
import { normalize, LINKS, QA_BOARD, meta } from './casefile.js'
import { rng, clamp, damp } from '../core/util.js'
import { wall, lampShade, fgCard } from './wall.js'

const SPOT = {
  register: { x: 0.140, y: 0.215, w: 0.165 },
  roofkey: { x: 0.320, y: 0.145, w: 0.130 },
  'hatch-lock': { x: 0.445, y: 0.185, w: 0.155 },
  'water-log': { x: 0.705, y: 0.235, w: 0.185 },
  autopsy: { x: 0.905, y: 0.115, w: 0.165 },
  photos: { x: 0.185, y: 0.420, w: 0.205 },
  shoes: { x: 0.395, y: 0.665, w: 0.155 },
  wrench: { x: 0.585, y: 0.775, w: 0.155 },
  'pressure-log': { x: 0.825, y: 0.600, w: 0.185 },
  footprints: { x: 0.115, y: 0.775, w: 0.150 },
  journal: { x: 0.545, y: 0.150, w: 0.150 },
  keyrack: { x: 0.640, y: 0.470, w: 0.130 },
  flask: { x: 0.960, y: 0.400, w: 0.110 },
  'sink-trap': { x: 0.258, y: 0.615, w: 0.125 }
}

const CARD_TONE = ['card', 'bond', 'news', 'card', 'bond']

function cardFor (ev, w, h, seed) {
  if (ev.form === 'photo') return photoSheet(3, w, h, 2)
  if (ev.form !== 'object') return docItem(w, h, ev, seed)
  const tone = CARD_TONE[seed % CARD_TONE.length]
  const s = sheet({ w, h, seed: 500 + seed * 17, tone, creases: seed % 3 === 0 ? 1 : 0, deckle: 1.5 + (seed % 3) * 0.5, ruleGap: Math.round(h * 0.13), ruleTop: Math.round(h * 0.66) })
  const kind = SKETCH_FOR[ev.id]
  if (kind && SKETCH[kind]) {
    s.ctx.save()
    s.ctx.translate(w * 0.08, h * 0.06)
    SKETCH[kind](s.ctx, w * 0.84, h * 0.56)
    s.ctx.restore()
  }
  typed(s.ctx, ev.title, w * 0.09, h * 0.78, { size: clamp(w * 0.088, 10, 16), ink: INK.ribbon, alpha: 0.9, seed: seed * 3 + 1 })
  const n = (ev.note || [])[0]
  if (n) typed(s.ctx, n, w * 0.09, h * 0.92, { size: clamp(w * 0.068, 8, 13), ink: INK.faded, alpha: 0.66, seed: seed * 5 })
  return s
}

function twine (ctx, x0, y0, x1, y1, slack, seed) {
  const r = rng(seed | 0)
  const n = 34
  const pts = []
  const len = Math.hypot(x1 - x0, y1 - y0)
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const sag = Math.sin(t * Math.PI) * slack * len * 0.22
    pts.push([x0 + (x1 - x0) * t + (r() - 0.5) * 0.9, y0 + (y1 - y0) * t + sag + (r() - 0.5) * 0.9])
  }
  const path = (o) => {
    ctx.beginPath()
    ctx.moveTo(pts[0][0] + o, pts[0][1] + o)
    for (const p of pts) ctx.lineTo(p[0] + o, p[1] + o)
    ctx.stroke()
  }
  ctx.save()
  ctx.lineCap = 'round'
  ctx.strokeStyle = 'rgba(5,3,2,0.56)'
  ctx.lineWidth = 4.6
  ctx.filter = 'blur(3px)'
  path(8)
  ctx.filter = 'none'
  ctx.strokeStyle = '#3d0f0b'
  ctx.lineWidth = 4.2
  path(0)
  ctx.strokeStyle = '#8f2a1e'
  ctx.lineWidth = 2.6
  path(-0.5)
  ctx.strokeStyle = 'rgba(224,132,104,0.6)'
  ctx.lineWidth = 0.9
  path(-1.4)
  for (let i = 2; i < pts.length - 2; i += 2) {
    if (r() < 0.55) continue
    const p = pts[i]
    ctx.strokeStyle = `rgba(150,60,44,${0.3 + r() * 0.4})`
    ctx.lineWidth = 0.6
    ctx.beginPath()
    ctx.moveTo(p[0], p[1])
    ctx.lineTo(p[0] + (r() - 0.5) * 5, p[1] + (r() - 0.5) * 5)
    ctx.stroke()
  }
  ctx.restore()
}

export function createBoard (engine) {
  const el = document.createElement('div')
  el.style.cssText = 'position:absolute;inset:0;display:none;pointer-events:auto'
  const nodesEl = document.createElement('div')
  nodesEl.style.cssText = 'position:absolute;inset:0'
  const slipsEl = document.createElement('div')
  slipsEl.style.cssText = 'position:absolute;inset:0;pointer-events:none'
  let wallC = null
  let stringS = null
  let vw = 0
  let vh = 0
  let nodes = []
  let links = []
  let drag = null
  let dirty = true

  function layout (w, h) {
    vw = w
    vh = h
    el.textContent = ''
    wallC = wall(w, h)
    place(wallC.c, 'position:absolute;left:0;top:0')
    el.appendChild(wallC.c)
    el.appendChild(nodesEl)
    const fg = lampShade(w, h)
    place(fg.c, 'position:absolute;left:0;top:0;pointer-events:none;z-index:3')
    stringS = surface(w, h)
    place(stringS.c, 'position:absolute;left:0;top:0;pointer-events:none')
    el.appendChild(stringS.c)
    el.appendChild(slipsEl)
    const near = fgCard(w, h)
    place(near.c, 'position:absolute;left:0;top:0;pointer-events:none;z-index:4')
    el.appendChild(near.c)
    el.appendChild(fg.c)
    if (el.style.display !== 'none') build()
  }

  function state () {
    const d = engine.get('deduction')
    const st = d?.getBoardState?.()
    if (st?.nodes?.length) return st
    const live = engine.state.evidenceList().map(e => e.id)
    const ids = live.length ? live : (engine.qa ? QA_BOARD : [])
    const made = engine.qa && !live.length ? ['L1', 'L2'] : []
    return {
      nodes: ids.map(id => ({ id })),
      links: LINKS.map(l => ({ ...l, made: made.includes(l.id) && ids.includes(l.a) && ids.includes(l.b) }))
    }
  }

  function build () {
    const st = state()
    nodesEl.textContent = ''
    slipsEl.textContent = ''
    nodes = []
    st.nodes.forEach((n, i) => {
      const ev = normalize({ id: n.id, ...meta(n.id), ...n })
      const sp = SPOT[n.id] || { x: 0.5 + (i % 3) * 0.1, y: 0.5, w: 0.12 }
      const w = Math.round(vw * sp.w)
      const h = Math.round(w * (ev.form === 'photo' ? 0.8 : ev.form === 'object' ? 1.0 : 0.68))
      const x = Math.round(vw * sp.x - w / 2)
      const y = Math.round(vh * sp.y - h / 2)
      const rot = ((i * 37) % 9 - 4) * 0.8
      const s = cardFor(ev, w, h, i + 1)
      const d = document.createElement('div')
      d.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;transform:rotate(${rot}deg);` +
        'filter:drop-shadow(-7px 12px 13px rgba(0,0,0,.66));transition:transform .18s cubic-bezier(.16,1,.3,1);cursor:grab'
      place(s.c, 'position:absolute;left:0;top:0')
      d.appendChild(s.c)
      const pin = surface(26, 26)
      pushpin(pin.ctx, 13, 13, i * 7 + 3)
      place(pin.c, `position:absolute;left:${Math.round(w / 2 - 13)}px;top:-9px;pointer-events:none`)
      d.appendChild(pin.c)
      nodesEl.appendChild(d)
      const node = { id: n.id, el: d, px: x + w / 2, py: y + 4, rot }
      d.addEventListener('pointerdown', (e) => { drag = { from: node, x: e.clientX, y: e.clientY }; dirty = true })
      d.addEventListener('pointerup', () => { if (drag && drag.from !== node) tryLink(drag.from.id, node.id); drag = null; dirty = true })
      d.addEventListener('pointerenter', () => { if (drag) d.style.transform = `rotate(${rot}deg) translateY(-3px)` })
      d.addEventListener('pointerleave', () => { d.style.transform = `rotate(${rot}deg)` })
      nodes.push(node)
    })
    links = (st.links || LINKS).map(l => ({ ...l, slack: l.made ? 0.05 : 1 }))
    for (const l of links) if (l.made) slip(l)
    dirty = true
  }

  function slip (l) {
    const a = nodes.find(n => n.id === l.a)
    const b = nodes.find(n => n.id === l.b)
    if (!a || !b) return
    const w = Math.round(clamp(vw * 0.145, 150, 260))
    const h = Math.round(w * 0.42)
    const s = sheet({ w, h, seed: 700 + l.id.charCodeAt(1), tone: 'bond', creases: 0, deckle: 1.4, grain: 0.5 })
    typed(s.ctx, l.id, 11, h * 0.3, { size: h * 0.19, track: 1.6, ink: INK.stamp, alpha: 0.72, seed: 3 })
    penLine(s.ctx, 10, h * 0.36, w - 14, h * 0.365, { w: 0.8, alpha: 0.24, seed: 6 })
    const lines = wrap(s.ctx, l.claim, w - 22, { size: h * 0.155 })
    block(s.ctx, lines.slice(0, 3), 11, h * 0.56, w - 22, { size: h * 0.155, lh: h * 0.2, ink: INK.ribbon, alpha: 0.82, seed: 11 })
    // 실 위에 겹쳐 놓으면 둘 다 안 읽힌다 — 실의 법선 방향으로 밀어 꽂는다
    const dx = b.px - a.px
    const dy = b.py - a.py
    const len = Math.hypot(dx, dy) || 1
    const side = l.id === 'L1' ? -1 : 1
    const off = h * 0.55
    const t = 0.68
    const mx = a.px + dx * t + (-dy / len) * off * side
    const my = a.py + dy * t + (dx / len) * off * side
    const d = document.createElement('div')
    const rot = (l.id === 'L2' ? 2.2 : -2.6)
    d.style.cssText = `position:absolute;left:${Math.round(mx - w / 2)}px;top:${Math.round(my - h * 0.2)}px;transform:rotate(${rot}deg);` +
      'filter:drop-shadow(-5px 8px 9px rgba(0,0,0,.6))'
    place(s.c, 'position:absolute;left:0;top:0')
    d.appendChild(s.c)
    const pin = surface(24, 24)
    pushpin(pin.ctx, 12, 12, l.id.charCodeAt(1))
    place(pin.c, `position:absolute;left:${Math.round(w / 2 - 12)}px;top:-8px`)
    d.appendChild(pin.c)
    slipsEl.appendChild(d)
  }

  function tryLink (a, b) {
    const l = links.find(x => (x.a === a && x.b === b) || (x.a === b && x.b === a))
    if (!l || l.made) return
    const d = engine.get('deduction')
    const ok = d?.link ? d.link(a, b) : true
    if (ok === false) return
    l.made = true
    slip(l)
  }

  function drawStrings () {
    const { ctx } = stringS
    ctx.clearRect(0, 0, vw, vh)
    for (const l of links) {
      const a = nodes.find(n => n.id === l.a)
      const b = nodes.find(n => n.id === l.b)
      if (!a || !b || !l.made) continue
      twine(ctx, a.px, a.py, b.px, b.py, l.slack, l.id.charCodeAt(1) * 13 + 5)
    }
    // 아직 아무 데도 닿지 않은 실 — 판이 미완이라는 사실 자체가 정보다
    const open = links.find(l => !l.made)
    const loose = open && nodes.find(n => n.id === open.b)
    if (loose) twine(ctx, loose.px, loose.py, loose.px + vw * 0.028, loose.py + vh * 0.20, 0.62, 991)
    if (drag) {
      twine(ctx, drag.from.px, drag.from.py, drag.x, drag.y, 0.5, 771)
    }
  }

  el.addEventListener('pointermove', (e) => {
    if (!drag) return
    drag.x = e.clientX
    drag.y = e.clientY
    dirty = true
  })
  el.addEventListener('pointerup', () => { drag = null; dirty = true })

  return {
    el,
    layout,
    open () {
      // deduction은 open 상태가 아니면 link()를 거부한다. 판을 펼치는 것이 지목의 시작이다.
      const d = engine.get('deduction')
      if (d && d.open === false && !engine.qa) d.start?.()
      el.style.display = 'block'
      build()
    },
    close () { el.style.display = 'none'; drag = null },
    update (t) {
      let moving = false
      for (const l of links) {
        const target = l.made ? 0.045 : 1
        if (Math.abs(l.slack - target) > 0.002) { l.slack = damp(l.slack, target, 7, 1 / 60); moving = true }
      }
      if (moving || dirty) { drawStrings(); dirty = false }
      void t
    }
  }
}
