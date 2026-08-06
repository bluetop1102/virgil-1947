// 수사 파일의 물성 파츠. 폴더·수첩 장·끼워진 서류·스케치를 각각 독립 캔버스로 만든다.
// 하나의 큰 패널로 그리면 종이가 아니라 화면이 된다 — 반드시 낱장이어야 그림자가 산다.
import { sheet, surface, coffeeRing, crease } from './paper.js'
import { typed, stamp, pen, penLine, penTick, penEllipse, INK, FONT, wrap } from './type.js'
import { SKETCH, SKETCH_FOR, paperclip, tape, staple, pushpin } from './sketch.js'
import { rng, clamp } from '../core/util.js'

export function folder (w, h) {
  const s = sheet({ w, h, seed: 77, tone: 'manila', creases: 2, deckle: 2.2, grain: 0.42, light: 0.9 })
  const ctx = s.ctx
  const r = rng(613)

  // 접힌 등 — 두 장이 아니라 한 장이 접힌 것이다
  const gx = w * 0.5
  crease(ctx, w, h, gx, 0, gx + 2, h, 1.5)
  const g = ctx.createLinearGradient(gx - 26, 0, gx + 26, 0)
  g.addColorStop(0, 'rgba(28,20,10,0.00)')
  g.addColorStop(0.45, 'rgba(28,20,10,0.26)')
  g.addColorStop(0.55, 'rgba(28,20,10,0.22)')
  g.addColorStop(1, 'rgba(28,20,10,0.00)')
  ctx.fillStyle = g
  ctx.fillRect(gx - 26, 0, 52, h)

  // 모서리 보강 — 오래된 파일은 모서리부터 닳는다
  for (const [cx, cy, sx, sy] of [[0, 0, 1, 1], [w, 0, -1, 1], [0, h, 1, -1], [w, h, -1, -1]]) {
    ctx.save()
    ctx.translate(cx, cy)
    ctx.scale(sx, sy)
    ctx.fillStyle = 'rgba(60,42,20,0.14)'
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(30 + r() * 10, 0)
    ctx.lineTo(0, 26 + r() * 9)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  // 끈 고정 단추와 감긴 실
  const bx = w - 26
  const by = h * 0.5
  ctx.save()
  ctx.fillStyle = 'rgba(20,14,8,0.4)'
  ctx.beginPath()
  ctx.ellipse(bx + 1.5, by + 2, 7, 6.4, 0, 0, 6.2832)
  ctx.fill()
  const bg = ctx.createRadialGradient(bx - 2, by - 2.4, 0.5, bx, by, 8)
  bg.addColorStop(0, '#6d6459')
  bg.addColorStop(0.5, '#3b332a')
  bg.addColorStop(1, '#16110c')
  ctx.fillStyle = bg
  ctx.beginPath()
  ctx.ellipse(bx, by, 6.6, 6, 0, 0, 6.2832)
  ctx.fill()
  ctx.restore()
  for (let i = 0; i < 7; i++) {
    penLine(ctx, bx - 6 + r() * 12, by - 9 + r() * 18, bx - 40 - r() * 30, by - 16 + r() * 32, {
      w: 1.0, alpha: 0.24, ink: '92,78,54', seed: 20 + i
    })
  }

  // 오른쪽 안쪽 면의 인쇄 서식 — 빈 판지 그대로 두면 큰 단색 면이 남는다 (루브릭 G6)
  const fx = w * 0.53
  const fw = w * 0.44
  typed(ctx, 'CONTENTS', fx, h * 0.045, { size: 10, track: 3.0, ink: INK.faded, alpha: 0.46, seed: 6 })
  penLine(ctx, fx, h * 0.058, fx + fw, h * 0.059, { w: 0.8, alpha: 0.26, ink: '86,66,38', seed: 8 })
  for (let y = h * 0.10; y < h * 0.93; y += h * 0.052) {
    ctx.strokeStyle = 'rgba(88,66,36,0.22)'
    ctx.lineWidth = 0.8
    ctx.beginPath()
    ctx.moveTo(fx, y)
    for (let x = fx; x < fx + fw; x += 30) ctx.lineTo(x, y + (r() - 0.5) * 0.5)
    ctx.stroke()
  }
  ctx.strokeStyle = 'rgba(88,66,36,0.24)'
  ctx.lineWidth = 0.9
  ctx.strokeRect(fx + fw * 0.60, h * 0.90, fw * 0.40, h * 0.075)
  typed(ctx, 'DATE', fx + fw * 0.63, h * 0.935, { size: 9, track: 2.2, ink: INK.faded, alpha: 0.40, seed: 9 })

  typed(ctx, 'CASE FILE', 22, h - 16, { size: 11, track: 3.4, ink: INK.faded, alpha: 0.42, seed: 4 })
  return s
}

export function tab (w, h, text) {
  const s = sheet({ w, h, seed: 91, tone: 'manila', creases: 0, deckle: 1.6, grain: 0.4, light: 0.8 })
  typed(s.ctx, text, 14, h * 0.66, { size: clamp(h * 0.44, 10, 16), track: 1.6, ink: INK.ribbon, alpha: 0.78, seed: 8 })
  return s
}

export function caseLeaf (w, h, act = 2) {
  const s = sheet({ w, h, seed: 131, tone: 'note', creases: 1, deckle: 1.6, margin: Math.round(w * 0.085), ruleGap: Math.round(h * 0.0385), ruleTop: Math.round(h * 0.185) })
  const ctx = s.ctx
  const m = Math.round(w * 0.085) + 14
  const u = w / 468                       // 기준 폭 대비 배율

  coffeeRing(ctx, w * 0.84, h * 0.175, w * 0.21, 44, 0.34)
  coffeeRing(ctx, w * 0.70, h * 0.245, w * 0.13, 51, 0.20)

  typed(ctx, 'LOS ANGELES POLICE DEPARTMENT', m, 32 * u, { size: 10.5 * u, track: 2.2 * u, ink: INK.faded, alpha: 0.62, seed: 3 })
  penLine(ctx, m, 41 * u, w - 30 * u, 41.5 * u, { w: 0.9, alpha: 0.34, seed: 5 })
  typed(ctx, '실종 · 호텔 버질 942호', m, 74 * u, { size: 21 * u, ink: INK.ribbon, alpha: 0.95, seed: 7, track: 0.4 })
  typed(ctx, '밴스, 아이리스 · 22', m, 102 * u, { size: 14 * u, ink: INK.ribbon, alpha: 0.86, seed: 11 })
  typed(ctx, '입실 10월 2일 — 최종 확인 10월 9일 밤', m, 124 * u, { size: 12 * u, ink: INK.faded, alpha: 0.8, seed: 13 })

  const items = [
    ['9일 이후에도 객실 청구', act >= 1],
    ['9일부터 3층 위 급수 없음', act >= 2],
    ['ROOF 고리 비어 있음', act >= 2]
  ]
  let y = 164 * u
  typed(ctx, '확인', m, y, { size: 12 * u, track: 3 * u, ink: INK.faded, alpha: 0.66, seed: 17 })
  y += 26 * u
  items.forEach((it, i) => {
    if (it[1]) penTick(ctx, m + 1, y - 6 * u, 8.5 * u, { seed: 40 + i, alpha: 0.72 })
    typed(ctx, it[0], m + 20 * u, y, { size: 13 * u, ink: it[1] ? INK.ribbon : INK.faded, alpha: it[1] ? 0.9 : 0.5, seed: 21 + i * 5 })
    y += 27 * u
  })

  // 여백 낙서 — 형사가 두 번째 항목에 표시를 해뒀다
  penLine(ctx, m - 22 * u, (164 + 26 + 27) * u - 12 * u, m - 22 * u, (164 + 26 + 27 * 2) * u - 4 * u, { w: 1.6, alpha: 0.55, seed: 71 })
  pen(ctx, [[m - 22 * u, (164 + 26 + 27) * u - 12 * u], [m - 14 * u, (164 + 26 + 27) * u - 6 * u], [m - 22 * u, (164 + 26 + 27) * u + 1 * u]], { w: 1.4, alpha: 0.5, seed: 73 })

  stamp(ctx, 'MISSING PERSON', w * 0.63, y + 4 * u, { size: 15 * u, angle: -0.17, seed: 33, alpha: 0.74, track: 1.8 * u })

  penLine(ctx, m, y + 22 * u, w - 44 * u, y + 24 * u, { w: 0.8, alpha: 0.26, seed: 61 })
  typed(ctx, '물건', m, y + 48 * u, { size: 12 * u, track: 3 * u, ink: INK.faded, alpha: 0.6, seed: 63 })

  return { s, listBottom: y + 60 * u, margin: m, u }
}

// 끼워진 서류 한 장. 제목과 메모만 타이핑되어 있다 — 정답 힌트는 어디에도 없다.
export function docItem (w, h, ev, seed = 1) {
  const tone = ev.form === 'doc' ? (seed % 3 === 0 ? 'carbon' : 'bond') : 'bond'
  const s = sheet({ w, h, seed: 200 + seed * 13, tone, creases: 1, deckle: 1.7, grain: 0.5 })
  const ctx = s.ctx
  const u = w / 220
  const ink = tone === 'carbon' ? INK.carbon : INK.ribbon

  typed(ctx, ev.title, 15 * u, 30 * u, { size: 14 * u, ink, alpha: 0.92, seed: seed * 7 + 1 })
  penLine(ctx, 14 * u, 38 * u, w - 22 * u, 38.6 * u, { w: 0.8, alpha: 0.28, seed: seed + 3 })
  let y = 58 * u
  for (const line of (ev.note || []).slice(0, 4)) {
    const ls = wrap(ctx, line, w - 34 * u, { size: 11 * u })
    for (const l of ls) {
      typed(ctx, l, 15 * u, y, { size: 11 * u, ink, alpha: 0.72, seed: seed * 11 + Math.round(y) })
      y += 16 * u
    }
    y += 3 * u
  }
  return s
}

// 노트 위에 직접 그린 물건 스케치. 배경이 없어야 '종이에 그린 것'으로 읽힌다.
export function sketchItem (w, h, ev, seed = 1) {
  const s = surface(w, h)
  const ctx = s.ctx
  const kind = SKETCH_FOR[ev.id]
  const u = w / 130
  if (kind && SKETCH[kind]) {
    ctx.save()
    ctx.translate(0, -h * 0.06)
    SKETCH[kind](ctx, w, h * 0.82)
    ctx.restore()
  } else {
    penEllipse(ctx, w / 2, h * 0.42, w * 0.3, h * 0.26, { seed: seed * 3, alpha: 0.5 })
  }
  penLine(ctx, w * 0.14, h * 0.86, w * 0.86, h * 0.865, { w: 0.7, alpha: 0.22, seed: seed + 9 })
  const t = ev.title
  const ts = clamp(11 * u, 9, 14)
  ctx.save()
  ctx.font = `400 ${ts}px ${FONT.type}`
  const tw = ctx.measureText(t).width
  ctx.restore()
  typed(ctx, t, Math.max(2, (w - tw) / 2), h * 0.97, { size: ts, ink: INK.pen, alpha: 0.86, seed: seed * 5 })
  return s
}

// 선택 표시. 포커스 링이 아니라 형사가 펜으로 두른 자국이다.
export function markCanvas (w, h, seed = 1) {
  const s = surface(w, h)
  penEllipse(s.ctx, w / 2, h / 2, w * 0.47, h * 0.46, { seed: seed * 17 + 3, alpha: 0.62, w: 2.1, ink: INK.stamp })
  return s
}

export function attach (ctx, w, h, kind, seed = 1) {
  const r = rng(seed | 0)
  if (kind === 'clip') paperclip(ctx, w * (0.16 + r() * 0.12), 12, 0.95, -0.2 + r() * 0.4)
  else if (kind === 'tape') {
    tape(ctx, w * 0.18, 4, 46, 17, -0.42 + r() * 0.2, seed)
    tape(ctx, w * 0.84, h - 5, 44, 16, -0.36 + r() * 0.3, seed + 5)
  } else if (kind === 'staple') staple(ctx, w * 0.12, 13, -0.5 + r() * 0.9)
  else if (kind === 'pin') pushpin(ctx, w * 0.5, 11, seed)
}
