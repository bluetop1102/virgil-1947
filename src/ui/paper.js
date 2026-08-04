// 절차 생성 종이. UI의 모든 표면은 여기서 나온 캔버스다 (외부 이미지 로드 금지).
// 깨끗한 사각형은 실패다 — 결·변색·접힘·마모가 없으면 웹 패널로 읽힌다 (루브릭 D7/N8).
import { rng, clamp } from '../core/util.js'

export function dpr () { return Math.min(window.devicePixelRatio || 1, 2) }

export function surface (w, h, scale = dpr()) {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w * scale))
  c.height = Math.max(1, Math.round(h * scale))
  c.style.width = w + 'px'
  c.style.height = h + 'px'
  const ctx = c.getContext('2d')
  ctx.scale(scale, scale)
  return { c, ctx, w, h }
}

// cssText는 인라인 스타일을 통째로 갈아치우므로 surface()가 잡아둔 CSS 크기(=dpr 보정)가 날아간다.
// 캔버스에 스타일을 줄 때는 반드시 이 함수를 쓴다.
export function place (c, css) {
  const w = c.style.width
  const h = c.style.height
  c.style.cssText = css
  c.style.width = w
  c.style.height = h
  return c
}

const CACHE = new Map()
function cached (key, make) {
  let v = CACHE.get(key)
  if (!v) { v = make(); CACHE.set(key, v) }
  return v
}

// 미세 입자. 종이 표면의 고주파 성분 — 이게 없으면 그라디언트가 CSS처럼 매끈해진다.
export function grain (seed = 3, size = 128) {
  return cached(`g${seed}.${size}`, () => {
    const c = document.createElement('canvas')
    c.width = c.height = size
    const x = c.getContext('2d')
    const img = x.createImageData(size, size)
    const r = rng(seed)
    for (let i = 0; i < size * size; i++) {
      const v = r() - 0.5
      const p = i * 4
      const up = v > 0
      img.data[p] = up ? 255 : 40
      img.data[p + 1] = up ? 250 : 32
      img.data[p + 2] = up ? 232 : 26
      img.data[p + 3] = Math.abs(v) * 255
    }
    x.putImageData(img, 0, 0)
    return c
  })
}

// 펄프 섬유. 짧은 획을 무작위 방향으로 깔아 종이 결을 만든다.
export function fiber (seed = 5, size = 256) {
  return cached(`f${seed}.${size}`, () => {
    const c = document.createElement('canvas')
    c.width = c.height = size
    const x = c.getContext('2d')
    const r = rng(seed)
    for (let i = 0; i < size * 7; i++) {
      const x0 = r() * size
      const y0 = r() * size
      const len = 3 + r() * 24
      const vert = r() < 0.34
      const dark = r() < 0.5
      x.strokeStyle = dark
        ? `rgba(74,58,38,${(0.03 + r() * 0.07).toFixed(3)})`
        : `rgba(255,250,236,${(0.03 + r() * 0.09).toFixed(3)})`
      x.lineWidth = r() < 0.86 ? 1 : 1.8
      x.beginPath()
      x.moveTo(x0, y0)
      if (vert) x.lineTo(x0 + (r() - 0.5) * 1.6, y0 + len)
      else x.lineTo(x0 + len, y0 + (r() - 0.5) * 1.6)
      x.stroke()
    }
    return c
  })
}

export const TONES = {
  bond: { a: '#e9e0c9', b: '#d7c9a9', stain: '141,106,52', rule: null },
  note: { a: '#e6dcc2', b: '#d2c39f', stain: '134,98,46', rule: 'rgba(96,110,128,0.20)' },
  manila: { a: '#d6b47c', b: '#bd9757', stain: '118,80,34', rule: null },
  carbon: { a: '#e2dbc6', b: '#cfc5aa', stain: '110,96,74', rule: null },
  news: { a: '#dcd6c1', b: '#c6bfa6', stain: '108,92,60', rule: null },
  card: { a: '#eae2cc', b: '#dbceb0', stain: '146,104,50', rule: 'rgba(122,60,48,0.22)' },
  wall: { a: '#b9ac93', b: '#8d8168', stain: '76,64,46', rule: null }
}

// 가장자리 절단선. 자로 자른 듯 곧으면 안 된다 — 손으로 찢거나 오래 닳은 선이어야 한다.
export function edgePath (ctx, w, h, seed = 1, amp = 1.4) {
  const r = rng(seed)
  const step = 13
  ctx.beginPath()
  const jx = () => (r() - 0.5) * amp * 2
  ctx.moveTo(jx() + 1, jx() + 1)
  for (let x = step; x < w; x += step) ctx.lineTo(x, clamp(jx(), -amp, amp) + 0.6)
  ctx.lineTo(w - 1 + jx(), jx() + 1)
  for (let y = step; y < h; y += step) ctx.lineTo(w - 0.6 + clamp(jx(), -amp, amp), y)
  ctx.lineTo(w - 1 + jx(), h - 1 + jx())
  for (let x = w - step; x > 0; x -= step) ctx.lineTo(x, h - 0.6 + clamp(jx(), -amp, amp))
  ctx.lineTo(jx() + 1, h - 1 + jx())
  for (let y = h - step; y > 0; y -= step) ctx.lineTo(0.6 + clamp(jx(), -amp, amp), y)
  ctx.closePath()
}

function foxing (ctx, w, h, r, n) {
  for (let i = 0; i < n; i++) {
    const x = r() * w
    const y = r() * h
    const rad = 1.6 + r() * 9
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad)
    const a = 0.04 + r() * 0.11
    g.addColorStop(0, `rgba(126,84,38,${a})`)
    g.addColorStop(0.6, `rgba(126,84,38,${a * 0.4})`)
    g.addColorStop(1, 'rgba(126,84,38,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.ellipse(x, y, rad, rad * (0.6 + r() * 0.7), r() * 3, 0, 6.2832)
    ctx.fill()
  }
}

// 접힌 자국: 한쪽은 빛을 받고 반대쪽은 그늘진다. 단순 선 하나는 접힘으로 안 읽힌다.
export function crease (ctx, w, h, x0, y0, x1, y1, str = 1) {
  const dx = x1 - x0
  const dy = y1 - y0
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  for (let s = -1; s <= 1; s += 2) {
    const g = ctx.createLinearGradient(x0, y0, x0 + nx * 9 * s, y0 + ny * 9 * s)
    g.addColorStop(0, s < 0 ? `rgba(58,44,26,${0.16 * str})` : `rgba(255,250,236,${0.20 * str})`)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.strokeStyle = g
    ctx.lineWidth = 9
    ctx.beginPath()
    ctx.moveTo(x0 + nx * 4.5 * s, y0 + ny * 4.5 * s)
    ctx.lineTo(x1 + nx * 4.5 * s, y1 + ny * 4.5 * s)
    ctx.stroke()
  }
  ctx.strokeStyle = `rgba(70,54,32,${0.13 * str})`
  ctx.lineWidth = 0.8
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.lineTo(x1, y1)
  ctx.stroke()
}

export function coffeeRing (ctx, x, y, rad, seed = 4, a = 0.13) {
  const r = rng(seed)
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(1, 0.82 + r() * 0.2)
  const g = ctx.createRadialGradient(0, 0, rad * 0.5, 0, 0, rad)
  g.addColorStop(0, `rgba(112,72,34,${a * 0.16})`)
  g.addColorStop(0.86, `rgba(104,64,28,${a * 0.34})`)
  g.addColorStop(1, 'rgba(88,52,22,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(0, 0, rad, 0, 6.2832)
  ctx.fill()
  // 테두리는 한 줄이 아니라 마른 자국이 끊긴 호의 연속이다
  for (let i = 0; i < 34; i++) {
    const a0 = r() * 6.2832
    const span = 0.10 + r() * 0.42
    ctx.strokeStyle = `rgba(86,52,20,${a * (0.25 + r() * 0.85)})`
    ctx.lineWidth = 0.8 + r() * 2.2
    ctx.beginPath()
    ctx.arc(0, 0, rad * (0.90 + r() * 0.10), a0, a0 + span)
    ctx.stroke()
  }
  ctx.restore()
}

// 광원 방향 통일: UI 전체가 좌상단 텅스텐 등을 받는다. 이게 없으면 종이가 평면 도형으로 보인다.
export function light (ctx, w, h, str = 1) {
  const g = ctx.createLinearGradient(0, 0, w * 0.75, h)
  g.addColorStop(0, `rgba(255,236,196,${0.16 * str})`)
  g.addColorStop(0.42, 'rgba(255,236,196,0)')
  g.addColorStop(1, `rgba(24,18,12,${0.26 * str})`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  const v = ctx.createRadialGradient(w * 0.32, h * 0.24, 0, w * 0.32, h * 0.24, Math.max(w, h) * 0.95)
  v.addColorStop(0, 'rgba(255,240,210,0.10)')
  v.addColorStop(0.55, 'rgba(0,0,0,0)')
  v.addColorStop(1, `rgba(16,12,8,${0.22 * str})`)
  ctx.fillStyle = v
  ctx.fillRect(0, 0, w, h)
}

export function sheet (o = {}) {
  const w = o.w
  const h = o.h
  const seed = (o.seed ?? 1) | 0
  const P = TONES[o.tone] || TONES.bond
  const s = surface(w, h)
  const ctx = s.ctx
  const r = rng(seed * 7919 + 13)

  const g = ctx.createLinearGradient(0, 0, w * 0.6, h)
  g.addColorStop(0, P.a)
  g.addColorStop(1, P.b)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)

  for (let i = 0; i < 8; i++) {
    const x = r() * w
    const y = r() * h
    const rad = (0.22 + r() * 0.7) * Math.max(w, h)
    const rg = ctx.createRadialGradient(x, y, 0, x, y, rad)
    rg.addColorStop(0, `rgba(${P.stain},${(0.04 + r() * 0.06).toFixed(3)})`)
    rg.addColorStop(1, `rgba(${P.stain},0)`)
    ctx.fillStyle = rg
    ctx.fillRect(0, 0, w, h)
  }

  ctx.save()
  const fp = ctx.createPattern(fiber(seed + 11), 'repeat')
  fp.setTransform(new DOMMatrix().scale(1.35).rotate(7))
  ctx.globalAlpha = 0.62
  ctx.fillStyle = fp
  ctx.fillRect(0, 0, w, h)
  const fp2 = ctx.createPattern(fiber(seed + 29), 'repeat')
  fp2.setTransform(new DOMMatrix().scale(0.7).rotate(-23))
  ctx.globalAlpha = 0.4
  ctx.fillStyle = fp2
  ctx.fillRect(0, 0, w, h)
  ctx.restore()

  foxing(ctx, w, h, r, Math.round((w * h) / 3400))

  if (P.rule) {
    const gap = o.ruleGap ?? 21
    ctx.lineWidth = 0.9
    for (let y = (o.ruleTop ?? gap * 2); y < h - gap * 0.6; y += gap) {
      ctx.strokeStyle = P.rule
      ctx.beginPath()
      ctx.moveTo(o.ruleInset ?? 16, y)
      for (let x = (o.ruleInset ?? 16); x < w - 12; x += 26) ctx.lineTo(x, y + (r() - 0.5) * 0.5)
      ctx.stroke()
    }
    if (o.margin) {
      ctx.strokeStyle = 'rgba(140,66,52,0.30)'
      ctx.lineWidth = 1.1
      ctx.beginPath()
      ctx.moveTo(o.margin, 4)
      ctx.lineTo(o.margin + (r() - 0.5) * 1.4, h - 4)
      ctx.stroke()
    }
  }

  if (o.creases !== false) {
    const n = o.creases === true ? 2 : (o.creases ?? 1)
    for (let i = 0; i < n; i++) {
      if (r() < 0.5) {
        const y = h * (0.22 + r() * 0.56)
        crease(ctx, w, h, -2, y, w + 2, y + (r() - 0.5) * 5, 0.7 + r() * 0.5)
      } else {
        const x = w * (0.24 + r() * 0.52)
        crease(ctx, w, h, x, -2, x + (r() - 0.5) * 5, h + 2, 0.7 + r() * 0.5)
      }
    }
  }

  ctx.save()
  ctx.globalAlpha = o.grain ?? 0.5
  const gp = ctx.createPattern(grain(seed + 3), 'repeat')
  ctx.fillStyle = gp
  ctx.fillRect(0, 0, w, h)
  ctx.restore()

  if (o.light !== false) light(ctx, w, h, o.light ?? 1)

  // 절단선 바깥을 잘라낸다 — 이후 CSS drop-shadow가 이 불규칙 실루엣을 그대로 그림자로 만든다
  ctx.save()
  ctx.globalCompositeOperation = 'destination-in'
  ctx.fillStyle = '#000'
  edgePath(ctx, w, h, seed + 101, o.deckle ?? 1.4)
  ctx.fill()
  ctx.restore()

  // 가장자리 마모: 닳은 모서리는 어둡고 지저분하다
  ctx.save()
  ctx.globalCompositeOperation = 'source-atop'
  ctx.strokeStyle = 'rgba(62,46,26,0.34)'
  ctx.lineWidth = 2.4
  ctx.filter = 'blur(2px)'
  edgePath(ctx, w, h, seed + 101, o.deckle ?? 1.4)
  ctx.stroke()
  ctx.filter = 'none'
  ctx.strokeStyle = 'rgba(48,34,18,0.22)'
  ctx.lineWidth = 0.8
  edgePath(ctx, w, h, seed + 101, o.deckle ?? 1.4)
  ctx.stroke()
  const r2 = rng(seed + 77)
  for (let i = 0; i < 7; i++) {
    const ex = r2() * w
    const ey = r2() < 0.5 ? r2() * 3 : h - r2() * 3
    ctx.fillStyle = `rgba(52,38,20,${0.10 + r2() * 0.16})`
    ctx.beginPath()
    ctx.ellipse(ex, ey, 3 + r2() * 12, 1.4 + r2() * 3, 0, 0, 6.2832)
    ctx.fill()
  }
  ctx.restore()

  return s
}

// 은염 인화지. 흑백 계조를 만들고 셀레늄 조색·입자·먼지·긁힘을 얹은 뒤 부채꼴 백테두리를 붙인다.
export function print (o = {}) {
  const w = o.w
  const h = o.h
  const seed = (o.seed ?? 2) | 0
  const bd = o.border ?? 9
  const s = surface(w, h)
  const ctx = s.ctx
  const r = rng(seed * 104729 + 7)
  const iw = w - bd * 2
  const ih = h - bd * 2

  const img = surface(iw, ih, dpr())
  o.draw?.(img.ctx, iw, ih, rng(seed + 5))

  ctx.save()
  ctx.beginPath()
  ctx.rect(bd, bd, iw, ih)
  ctx.clip()
  ctx.drawImage(img.c, bd, bd, iw, ih)

  const tone = ctx.createLinearGradient(bd, bd, bd + iw * 0.4, bd + ih)
  tone.addColorStop(0, 'rgba(72,58,34,0.20)')
  tone.addColorStop(1, 'rgba(30,36,52,0.22)')
  ctx.globalCompositeOperation = 'overlay'
  ctx.fillStyle = tone
  ctx.fillRect(bd, bd, iw, ih)
  ctx.globalCompositeOperation = 'source-over'

  ctx.globalAlpha = o.grain ?? 0.34
  const gp = ctx.createPattern(grain(seed + 17), 'repeat')
  ctx.fillStyle = gp
  ctx.fillRect(bd, bd, iw, ih)
  ctx.globalAlpha = 1

  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = r() < 0.6 ? `rgba(250,246,236,${0.2 + r() * 0.5})` : `rgba(20,16,12,${0.2 + r() * 0.4})`
    ctx.beginPath()
    ctx.ellipse(bd + r() * iw, bd + r() * ih, 0.4 + r() * 1.1, 0.4 + r() * 0.9, r() * 3, 0, 6.2832)
    ctx.fill()
  }
  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = `rgba(240,238,228,${0.06 + r() * 0.10})`
    ctx.lineWidth = 0.6 + r() * 0.6
    ctx.beginPath()
    const x0 = bd + r() * iw
    ctx.moveTo(x0, bd)
    ctx.lineTo(x0 + (r() - 0.5) * 14, bd + ih)
    ctx.stroke()
  }
  ctx.restore()

  // 인화 테두리: 1940년대 현상소 부채꼴 컷
  ctx.save()
  ctx.globalCompositeOperation = 'destination-over'
  ctx.fillStyle = '#e8e2d2'
  ctx.fillRect(0, 0, w, h)
  ctx.restore()

  ctx.save()
  ctx.globalCompositeOperation = 'destination-in'
  ctx.fillStyle = '#000'
  edgePath(ctx, w, h, seed + 313, 1.1)
  ctx.fill()
  ctx.restore()

  ctx.save()
  ctx.globalCompositeOperation = 'source-atop'
  const bg = ctx.createLinearGradient(0, 0, w * 0.7, h)
  bg.addColorStop(0, 'rgba(255,244,220,0.16)')
  bg.addColorStop(1, 'rgba(26,20,14,0.24)')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)
  ctx.globalAlpha = 0.35
  ctx.fillStyle = ctx.createPattern(grain(seed + 41), 'repeat')
  ctx.fillRect(0, 0, w, h)
  ctx.restore()

  return s
}
