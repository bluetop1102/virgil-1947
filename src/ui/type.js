// 잉크. 글자는 절대 깨끗하면 안 된다 — 리본 농도, 타건 편차, 번짐, 겹침이 있어야 종이로 읽힌다.
// 폰트 파일 로드가 금지되어 있으므로 시스템 글리프를 원자재로 쓰고 물성은 전부 캔버스에서 만든다.
import { rng } from '../core/util.js'

export const FONT = {
  type: "'Courier New', Courier, 'AppleMyungjo', 'Apple SD Gothic Neo', serif",
  serif: "'AppleMyungjo', 'Apple SD Gothic Neo', Georgia, 'Times New Roman', serif",
  hand: "'Snell Roundhand', 'Apple Chancery', 'AppleMyungjo', 'Apple SD Gothic Neo', cursive"
}

export const INK = {
  ribbon: '30,25,21',
  faded: '86,72,58',
  carbon: '58,54,78',
  pen: '26,32,58',
  stamp: '122,44,32',
  pencil: '62,58,52',
  grease: '38,36,34'
}

function setFont (ctx, o) {
  const style = o.italic ? 'italic ' : ''
  const weight = o.weight ?? 400
  ctx.font = `${style}${weight} ${o.size}px ${o.font || FONT.type}`
  ctx.textBaseline = 'alphabetic'
}

// 한 줄 타이핑. 글자마다 농도·회전·베이스라인이 다르다.
export function typed (ctx, text, x, y, o = {}) {
  const size = o.size ?? 13
  const ink = o.ink ?? INK.ribbon
  const base = o.alpha ?? 0.9
  const r = rng((o.seed ?? 11) | 0)
  const track = o.track ?? 0
  ctx.save()
  setFont(ctx, { ...o, size })
  ctx.fillStyle = `rgb(${ink})`
  let cx = x
  let drift = 0
  for (const ch of text) {
    const wch = ctx.measureText(ch).width
    if (ch === ' ') { cx += wch + track; drift += (r() - 0.5) * 0.12; continue }
    drift = Math.max(-0.9, Math.min(0.9, drift + (r() - 0.5) * 0.34))
    const jx = (r() - 0.5) * size * 0.05
    const rot = (r() - 0.5) * (o.wobble ?? 0.036)
    const dens = base * (0.5 + 0.5 * Math.pow(r(), 0.55))
    ctx.save()
    ctx.translate(cx + wch / 2 + jx, y + drift * (size * 0.055) + (r() - 0.5) * size * 0.05)
    ctx.rotate(rot)
    ctx.globalAlpha = dens * 0.3
    ctx.filter = `blur(${(size * 0.05).toFixed(2)}px)`
    ctx.fillText(ch, -wch / 2, 0)
    ctx.filter = 'none'
    ctx.globalAlpha = dens
    ctx.fillText(ch, -wch / 2, 0)
    if (r() < 0.07) {           // 타건이 겹쳐 두 번 찍힌 글자
      ctx.globalAlpha = dens * 0.34
      ctx.fillText(ch, -wch / 2 + 0.55, 0.35)
    }
    ctx.restore()
    cx += wch + track + (r() - 0.5) * size * 0.028
  }
  ctx.restore()
  return cx - x
}

export function measureTyped (ctx, text, o = {}) {
  ctx.save()
  setFont(ctx, { ...o, size: o.size ?? 13 })
  const w = ctx.measureText(text).width + (o.track ?? 0) * text.length
  ctx.restore()
  return w
}

export function wrap (ctx, text, maxW, o = {}) {
  ctx.save()
  setFont(ctx, { ...o, size: o.size ?? 13 })
  const track = o.track ?? 0
  const out = []
  let line = ''
  for (const ch of text) {
    if (ch === '\n') { out.push(line); line = ''; continue }
    const test = line + ch
    if (ctx.measureText(test).width + track * test.length > maxW && line) { out.push(line); line = ch === ' ' ? '' : ch } else line = test
  }
  if (line) out.push(line)
  ctx.restore()
  return out
}

export function block (ctx, text, x, y, maxW, o = {}) {
  const size = o.size ?? 13
  const lh = o.lh ?? size * 1.62
  const lines = Array.isArray(text) ? text : wrap(ctx, text, maxW, o)
  let cy = y
  let s = (o.seed ?? 11) | 0
  for (const ln of lines) {
    typed(ctx, ln, x + (o.ragged ? ((s * 37) % 5) * 0.4 : 0), cy, { ...o, size, seed: s })
    s += 17
    cy += lh
  }
  return cy - y
}

// 만년필 획. 필압에 따라 굵기와 농도가 변하고 획 끝에 잉크가 고인다.
export function pen (ctx, pts, o = {}) {
  if (pts.length < 2) return
  const r = rng((o.seed ?? 3) | 0)
  const ink = o.ink ?? INK.pen
  const w = o.w ?? 1.5
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath()
    ctx.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i]
      const j = pass === 0 ? 0 : 0.5
      ctx.lineTo(p[0] + (r() - 0.5) * j, p[1] + (r() - 0.5) * j)
    }
    ctx.strokeStyle = `rgba(${ink},${pass === 0 ? (o.alpha ?? 0.82) : (o.alpha ?? 0.82) * 0.4})`
    ctx.lineWidth = pass === 0 ? w : w * 1.9
    ctx.globalAlpha = pass === 0 ? 1 : 0.35
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  const e = pts[pts.length - 1]
  ctx.fillStyle = `rgba(${ink},${(o.alpha ?? 0.82) * 0.7})`
  ctx.beginPath()
  ctx.arc(e[0], e[1], w * 0.62, 0, 6.2832)
  ctx.fill()
  ctx.restore()
}

export function penLine (ctx, x0, y0, x1, y1, o = {}) {
  const r = rng((o.seed ?? 9) | 0)
  const n = Math.max(3, Math.round(Math.hypot(x1 - x0, y1 - y0) / 9))
  const pts = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    pts.push([x0 + (x1 - x0) * t + (r() - 0.5) * 1.4, y0 + (y1 - y0) * t + (r() - 0.5) * 1.8])
  }
  pen(ctx, pts, o)
}

// 손으로 그린 타원. 증거를 표시할 때 UI 링이 아니라 형사가 펜으로 두른 자국이어야 한다.
export function penEllipse (ctx, cx, cy, rx, ry, o = {}) {
  const r = rng((o.seed ?? 21) | 0)
  const loops = o.loops ?? 1
  const pts = []
  const a0 = -0.7 + r() * 0.4
  const n = 46 * loops
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const a = a0 + t * 6.2832 * loops + 0.25
    const k = 1 + Math.sin(a * 2.3 + r()) * 0.02
    pts.push([
      cx + Math.cos(a) * rx * k + (r() - 0.5) * 1.4,
      cy + Math.sin(a) * ry * k * (1 + t * 0.03) + (r() - 0.5) * 1.4
    ])
  }
  pen(ctx, pts, o)
}

export function penTick (ctx, x, y, s = 7, o = {}) {
  pen(ctx, [[x, y], [x + s * 0.42, y + s * 0.66], [x + s * 1.18, y - s * 0.85]], { w: 1.7, ...o })
}

// 고무 스탬프. 잉크가 고르게 묻지 않아 글자가 부분적으로 비어야 한다.
export function stamp (ctx, text, x, y, o = {}) {
  const size = o.size ?? 15
  const pad = o.pad ?? 9
  const tmpW = Math.ceil(text.length * size * 0.85 + pad * 2 + 30)
  const tmpH = Math.ceil(size * 2.4 + pad)
  const t = document.createElement('canvas')
  const sc = Math.min(window.devicePixelRatio || 1, 2)
  t.width = tmpW * sc
  t.height = tmpH * sc
  const c = t.getContext('2d')
  c.scale(sc, sc)
  const ink = o.ink ?? INK.stamp
  const r = rng((o.seed ?? 31) | 0)

  c.save()
  c.font = `700 ${size}px ${o.font || FONT.type}`
  c.textBaseline = 'middle'
  c.fillStyle = `rgb(${ink})`
  const tw = c.measureText(text).width + (o.track ?? size * 0.22) * text.length
  const bw = tw + pad * 2
  const bh = size * 1.9
  const bx = (tmpW - bw) / 2
  const by = (tmpH - bh) / 2
  if (o.box !== false) {
    c.strokeStyle = `rgb(${ink})`
    c.lineWidth = 2.2
    c.strokeRect(bx, by, bw, bh)
    c.lineWidth = 0.9
    c.strokeRect(bx + 3.4, by + 3.4, bw - 6.8, bh - 6.8)
  }
  let cx = bx + pad
  for (const ch of text) {
    c.globalAlpha = 0.68 + r() * 0.32
    c.fillText(ch, cx, tmpH / 2 + (r() - 0.5) * 0.8)
    cx += c.measureText(ch).width + (o.track ?? size * 0.22)
  }
  c.restore()

  // 잉크 결손 — 이 단계가 없으면 스탬프가 벡터 도형처럼 보인다
  c.globalCompositeOperation = 'destination-out'
  for (let i = 0; i < 260; i++) {
    c.globalAlpha = 0.25 + r() * 0.75
    c.beginPath()
    c.ellipse(r() * tmpW, r() * tmpH, 0.6 + r() * 3.4, 0.5 + r() * 2.2, r() * 3, 0, 6.2832)
    c.fill()
  }
  c.globalAlpha = 1
  c.globalCompositeOperation = 'source-over'

  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(o.angle ?? -0.06)
  ctx.globalAlpha = o.alpha ?? 0.82
  ctx.drawImage(t, -tmpW / 2, -tmpH / 2, tmpW, tmpH)
  ctx.restore()
  return { w: bw, h: bh }
}

// 타이핑 라인 앞에 붙는 항목 표식. 불릿 대신 타자기로 친 하이픈·괄호를 쓴다.
export function label (ctx, text, x, y, o = {}) {
  return typed(ctx, text, x, y, { size: 10, track: 1.6, alpha: 0.62, ...o })
}
