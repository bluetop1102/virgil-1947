// 엘리베이터 사진 4장. 은염 인화의 계조로만 그린다 — 선이 아니라 빛으로 읽혀야 한다.
// 4번째 장의 황동 반사에 두 번째 형체가 있다 (docs/STORY.md §5.3 S3).
import { print, surface, place } from './paper.js'
import { typed, penEllipse, INK, FONT } from './type.js'

function figure (ctx, w, h, x, y, s, tone, blur) {
  ctx.save()
  if (blur) ctx.filter = `blur(${blur}px)`
  ctx.fillStyle = tone
  ctx.beginPath()
  ctx.ellipse(x, y - s * 0.86, s * 0.15, s * 0.19, 0, 0, 6.2832)   // 머리
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(x - s * 0.20, y - s * 0.66)
  ctx.quadraticCurveTo(x - s * 0.30, y - s * 0.22, x - s * 0.24, y + s * 0.02)
  ctx.lineTo(x + s * 0.24, y + s * 0.02)
  ctx.quadraticCurveTo(x + s * 0.30, y - s * 0.26, x + s * 0.19, y - s * 0.66)
  ctx.quadraticCurveTo(x, y - s * 0.78, x - s * 0.20, y - s * 0.66)
  ctx.fill()
  ctx.restore()
}

const FRAMES = [
  // 1 — 빈 승강기, 문 열림
  (ctx, w, h, r) => {},
  // 2 — 문 앞에 선 형체
  (ctx, w, h, r) => { figure(ctx, w, h, w * 0.44, h * 0.86, h * 0.52, 'rgba(10,10,12,0.90)', 1.2) },
  // 3 — 버튼판 쪽으로 돌아선 형체
  (ctx, w, h, r) => {
    figure(ctx, w, h, w * 0.60, h * 0.88, h * 0.55, 'rgba(8,8,10,0.92)', 1.6)
    ctx.save()
    ctx.filter = 'blur(2.4px)'
    ctx.fillStyle = 'rgba(6,6,8,0.55)'
    ctx.beginPath()
    ctx.ellipse(w * 0.72, h * 0.52, w * 0.05, h * 0.03, 0.4, 0, 6.2832)
    ctx.fill()
    ctx.restore()
  },
  // 4 — 안쪽에 선 형체 + 황동 패널 반사 속의 두 번째 형체
  (ctx, w, h, r) => {
    figure(ctx, w, h, w * 0.38, h * 0.84, h * 0.50, 'rgba(9,9,11,0.90)', 1.3)
    ctx.save()
    ctx.globalAlpha = 0.5
    figure(ctx, w, h, w * 0.79, h * 0.70, h * 0.34, 'rgba(14,14,16,0.75)', 3.4)
    ctx.restore()
  }
]

function car (ctx, w, h, idx, r) {
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, '#8b857a')
  g.addColorStop(0.34, '#5d574e')
  g.addColorStop(0.82, '#3a3630')
  g.addColorStop(1, '#211f1c')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)

  // 천장 등 — 화면 안에서 광원이 설명되어야 한다
  const lg = ctx.createRadialGradient(w * 0.5, h * 0.02, 1, w * 0.5, h * 0.08, w * 0.72)
  lg.addColorStop(0, 'rgba(255,255,252,0.98)')
  lg.addColorStop(0.14, 'rgba(244,242,232,0.52)')
  lg.addColorStop(0.44, 'rgba(226,222,208,0.16)')
  lg.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = lg
  ctx.fillRect(0, 0, w, h)

  // 뒷벽 황동 패널 — 세로 홈마다 하이라이트가 달라야 금속으로 읽힌다
  ctx.save()
  for (let i = 0; i < 7; i++) {
    const x = w * (0.055 + i * 0.135)
    const pw = w * 0.118
    const pg = ctx.createLinearGradient(x, 0, x + pw, 0)
    pg.addColorStop(0, 'rgba(18,16,14,0.34)')
    pg.addColorStop(0.22, 'rgba(238,232,214,0.20)')
    pg.addColorStop(0.5, 'rgba(150,144,130,0.10)')
    pg.addColorStop(0.86, 'rgba(16,14,12,0.26)')
    pg.addColorStop(1, 'rgba(226,220,202,0.14)')
    ctx.fillStyle = pg
    ctx.fillRect(x, h * 0.08, pw, h * 0.76)
  }
  ctx.strokeStyle = 'rgba(240,236,222,0.26)'
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.moveTo(0, h * 0.545)
  ctx.lineTo(w, h * 0.535)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(10,9,8,0.5)'
  ctx.beginPath()
  ctx.moveTo(0, h * 0.565)
  ctx.lineTo(w, h * 0.555)
  ctx.stroke()
  ctx.restore()

  // 층 표시기 — 반원 다이얼
  ctx.save()
  ctx.fillStyle = 'rgba(20,18,16,0.5)'
  ctx.beginPath()
  ctx.arc(w * 0.5, h * 0.155, w * 0.088, Math.PI, 0)
  ctx.fill()
  ctx.strokeStyle = 'rgba(248,244,230,0.72)'
  ctx.lineWidth = 1.8
  ctx.beginPath()
  ctx.arc(w * 0.5, h * 0.155, w * 0.082, Math.PI, 0)
  ctx.stroke()
  for (let i = 0; i <= 9; i++) {
    const a = Math.PI + i / 9 * Math.PI
    ctx.strokeStyle = 'rgba(246,242,228,0.5)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(w * 0.5 + Math.cos(a) * w * 0.072, h * 0.155 + Math.sin(a) * w * 0.072)
    ctx.lineTo(w * 0.5 + Math.cos(a) * w * 0.082, h * 0.155 + Math.sin(a) * w * 0.082)
    ctx.stroke()
  }
  ctx.strokeStyle = 'rgba(252,248,236,0.9)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(w * 0.5, h * 0.155)
  ctx.lineTo(w * 0.5 + Math.cos(-2.4 + idx * 0.28) * w * 0.07, h * 0.155 + Math.sin(-2.4 + idx * 0.28) * w * 0.07)
  ctx.stroke()
  ctx.restore()

  // 바닥 광택
  const fg = ctx.createLinearGradient(0, h * 0.80, 0, h)
  fg.addColorStop(0, 'rgba(214,208,190,0.26)')
  fg.addColorStop(1, 'rgba(14,13,12,0.62)')
  ctx.fillStyle = fg
  ctx.fillRect(0, h * 0.80, w, h * 0.2)

  FRAMES[idx % 4](ctx, w, h, r)

  // 바닥 반사 — 형체가 접지되어야 사진으로 읽힌다
  ctx.save()
  ctx.filter = 'blur(4px)'
  ctx.globalAlpha = 0.26
  ctx.scale(1, -1)
  ctx.translate(0, -h * 1.72)
  FRAMES[idx % 4](ctx, w, h, r)
  ctx.restore()

  // 비네트 + 현상 얼룩
  const v = ctx.createRadialGradient(w * 0.5, h * 0.42, w * 0.14, w * 0.5, h * 0.5, w * 0.82)
  v.addColorStop(0, 'rgba(0,0,0,0)')
  v.addColorStop(1, 'rgba(0,0,0,0.46)')
  ctx.fillStyle = v
  ctx.fillRect(0, 0, w, h)
  for (let i = 0; i < 4; i++) {
    const x = r() * w
    const y = r() * h
    const rad = w * (0.2 + r() * 0.4)
    const sg = ctx.createRadialGradient(x, y, 0, x, y, rad)
    sg.addColorStop(0, `rgba(232,228,214,${0.03 + r() * 0.05})`)
    sg.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = sg
    ctx.fillRect(0, 0, w, h)
  }
}

export function photoSheet (idx, w, h, seed = 0) {
  const s = print({
    w,
    h,
    seed: 900 + idx * 37 + seed,
    border: Math.max(5, Math.round(w * 0.045)),
    draw: (ctx, iw, ih, r) => car(ctx, iw, ih, idx, r)
  })
  // 현상소 프레임 번호는 그리스 펜슬로 여백에 적혀 있다
  typed(s.ctx, String(idx + 1), w - Math.max(5, w * 0.045) - 9, h - 3, {
    size: Math.max(8, w * 0.05), ink: INK.grease, alpha: 0.6, seed: 40 + idx, font: FONT.type
  })
  return s
}

// 사진 스크럽 뷰어: 4장 넘김 + 확대. 게임 UI 위젯이 아니라 책상에 늘어놓은 인화지로 보여야 한다.
export function createScrubber (opts = {}) {
  const el = document.createElement('div')
  el.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;pointer-events:auto'
  const state = { idx: 0, zoom: 0, count: 4 }

  const big = document.createElement('div')
  big.style.cssText = 'position:relative;filter:drop-shadow(-10px 16px 22px rgba(0,0,0,.72));transform-origin:60% 55%;transition:transform .34s cubic-bezier(.16,1,.3,1)'
  const strip = document.createElement('div')
  strip.style.cssText = 'display:flex;gap:0;margin-top:2.2vh;pointer-events:auto'
  el.appendChild(big)
  el.appendChild(strip)

  let bw = 0
  let bh = 0
  const bigCache = new Map()
  const smallCache = new Map()

  function layout (vw, vh) {
    bh = Math.round(vh * 0.60)
    bw = Math.round(bh * 1.30)
    bigCache.clear()
    smallCache.clear()
    strip.textContent = ''
    for (let i = 0; i < state.count; i++) {
      const t = document.createElement('div')
      const sw = Math.round(vw * 0.105)
      const s = photoSheet(i, sw, Math.round(sw * 0.78), 5)
      t.style.cssText = `position:relative;margin-right:${Math.round(vw * 0.008)}px;transform:rotate(${(i % 2 ? 1 : -1) * (0.8 + i * 0.3)}deg);filter:drop-shadow(-3px 5px 7px rgba(0,0,0,.6));cursor:pointer`
      t.appendChild(s.c)
      const mark = surface(sw + 14, Math.round(sw * 0.78) + 14)
      place(mark.c, 'position:absolute;left:-7px;top:-7px;pointer-events:none;opacity:0')
      penEllipse(mark.ctx, (sw + 14) / 2, (sw * 0.78 + 14) / 2, sw * 0.53, sw * 0.42, {
        ink: INK.grease, alpha: 0.55, w: 2.0, seed: 60 + i
      })
      t.appendChild(mark.c)
      t._mark = mark.c
      t.addEventListener('pointerdown', () => setIndex(i))
      strip.appendChild(t)
    }
    render()
  }

  function render () {
    big.textContent = ''
    let s = bigCache.get(state.idx)
    if (!s) { s = photoSheet(state.idx, bw, bh); bigCache.set(state.idx, s) }
    big.appendChild(s.c)
    if (state.idx === 3) {
      // 4번째 장의 반사 — 형사가 그리스 펜슬로 둘러놓은 자리
      const mk = surface(bw, bh)
      penEllipse(mk.ctx, bw * 0.79, bh * 0.60, bw * 0.10, bh * 0.17, { ink: INK.grease, alpha: 0.5, w: 2.2, seed: 77 })
      place(mk.c, 'position:absolute;left:0;top:0;pointer-events:none')
      big.appendChild(mk.c)
    }
    big.style.transform = state.zoom ? 'scale(1.62)' : 'scale(1)'
    ;[...strip.children].forEach((c, i) => { c._mark.style.opacity = i === state.idx ? '1' : '0' })
  }

  function setIndex (i) {
    state.idx = (i + state.count) % state.count
    render()
  }

  function key (e) {
    if (e.key === 'ArrowRight' || e.key === 'd') setIndex(state.idx + 1)
    else if (e.key === 'ArrowLeft' || e.key === 'a') setIndex(state.idx - 1)
    else if (e.key === 'z' || e.key === 'Z') { state.zoom = state.zoom ? 0 : 1; render() }
    else return false
    return true
  }

  big.addEventListener('pointerdown', () => { state.zoom = state.zoom ? 0 : 1; render() })

  return { el, layout, setIndex, key, state, render }
}
