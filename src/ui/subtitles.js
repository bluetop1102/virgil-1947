// 자막. 배경 박스 없음, 색 구분 없음, 지문 없음.
// 필름 프린트에 태워 넣은 글자처럼 — 미세한 헐레이션과 불균일 농도만 남긴다.
import { surface } from './paper.js'
import { FONT, wrap } from './type.js'
import { rng, clamp } from '../core/util.js'

const NAME = {
  deitch: '마를로 다이치',
  ruiz: '콘수엘라 루이즈',
  pryce: '월터 프라이스',
  doyle: '에멧 도일',
  det: '형사',
  player: '형사'
}

// 괄호 지문은 애니메이션의 몫이다. 자막으로 내보내지 않는다.
function strip (t) {
  return String(t ?? '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/（[^）]*）/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function glyphs (ctx, text, x, y, size, alpha, seed, ink) {
  const r = rng(seed | 0)
  ctx.save()
  ctx.font = `400 ${size}px ${FONT.serif}`
  ctx.textBaseline = 'alphabetic'
  let cx = x
  for (const ch of text) {
    const w = ctx.measureText(ch).width
    if (ch === ' ') { cx += w; continue }
    const jy = (r() - 0.5) * size * 0.028
    const d = 0.86 + 0.14 * r()
    ctx.fillStyle = `rgba(6,5,4,${alpha * 0.55})`
    ctx.filter = `blur(${(size * 0.09).toFixed(2)}px)`
    ctx.fillText(ch, cx + 0.6, y + jy + 1.4)
    ctx.fillStyle = `rgba(${ink},${alpha * 0.22})`
    ctx.fillText(ch, cx, y + jy)
    ctx.filter = 'none'
    ctx.fillStyle = `rgba(${ink},${alpha * d})`
    ctx.fillText(ch, cx, y + jy)
    cx += w
  }
  ctx.restore()
  return cx - x
}

export default {
  name: 'subtitles',
  order: 80,

  async init (engine) {
    this.engine = engine
    this.cur = null
    this.t0 = 0
    this.layer = document.createElement('div')
    this.layer.className = 'cecil-sub'
    this.layer.style.cssText = 'position:absolute;left:0;right:0;bottom:0;display:flex;justify-content:center;pointer-events:none;opacity:0'
    const root = document.getElementById('ui-root')
    root?.appendChild(this.layer)
    this._layout(engine.size.w, engine.size.h)

    engine.bus.on('subtitle', (p) => this.show(p))
    engine.bus.on('qa:shot', () => { if (engine.qa) this.clear() })
    engine.bus.on('qa:state', (s) => {
      if (!engine.qa || !s?.interrogating) return
      // 심문 샷의 자막 물성 확인용 프리뷰. 실제 모듈이 발신하면 그쪽이 덮어쓴다.
      const line = {
        deitch: '그 방은 열려 있습니다. 청소도 안 들어갔고요. 필요하신 게 뭡니까.',
        ruiz: '942호는 8일부터 안 들어갔어요. 문에 팻말이 걸려 있었으니까.',
        pryce: '저는 여기 하우스 디텍티브였습니다. 4년 전까지. 지금은 그냥 세입자고요.',
        doyle: '그 아가씨요? 못 봤습니다. 저는 밸브만 봅니다.'
      }[s.interrogating]
      if (line) this.show({ speaker: s.interrogating, text: line, dur: 1e6 })
    })
  },

  _layout (w, h) {
    this.vw = w
    this.vh = h
    this.cw = Math.min(w * 0.74, 980)
    this.ch = Math.round(Math.min(h * 0.2, 150))
    this.layer.style.paddingBottom = Math.round(h * 0.075) + 'px'
    if (this.s) this.s.c.remove()
    this.s = surface(this.cw, this.ch)
    this.layer.appendChild(this.s.c)
    if (this.cur) this._draw()
  },

  resize (w, h) {
    if (Math.abs(w - (this.vw ?? 0)) < 4 && Math.abs(h - (this.vh ?? 0)) < 4) return
    this._layout(w, h)
  },

  show (p) {
    const text = strip(p?.text)
    if (!text) return
    this.cur = {
      speaker: p.speaker ? (NAME[p.speaker] || p.speaker) : '',
      text,
      dur: p.dur ?? Math.max(1.8, text.length * 0.11)
    }
    this.t0 = this.engine.time
    this._draw()
  },

  clear () {
    this.cur = null
    this.layer.style.opacity = '0'
  },

  _draw () {
    const { ctx } = this.s
    ctx.clearRect(0, 0, this.cw, this.ch)
    const size = clamp(Math.round(this.vw * 0.0168), 15, 27)
    const lines = wrap(ctx, this.cur.text, this.cw - 40, { size, font: FONT.serif })
    const lh = size * 1.66
    const nameSize = Math.round(size * 0.64)
    const total = lines.length * lh + (this.cur.speaker ? nameSize * 2.1 : 0)
    let y = this.ch - 10 - (lines.length - 1) * lh
    if (this.cur.speaker) {
      ctx.save()
      ctx.font = `400 ${nameSize}px ${FONT.serif}`
      const track = nameSize * 0.34
      const nw = ctx.measureText(this.cur.speaker).width + track * (this.cur.speaker.length - 1)
      ctx.restore()
      let nx = (this.cw - nw) / 2
      const ny = y - lh - nameSize * 0.35
      const r = rng(7)
      ctx.save()
      ctx.font = `400 ${nameSize}px ${FONT.serif}`
      ctx.textBaseline = 'alphabetic'
      for (const ch of this.cur.speaker) {
        ctx.fillStyle = `rgba(4,3,2,0.5)`
        ctx.filter = `blur(${(nameSize * 0.1).toFixed(2)}px)`
        ctx.fillText(ch, nx + 0.5, ny + 1.2)
        ctx.filter = 'none'
        ctx.fillStyle = `rgba(206,192,166,${0.62 + r() * 0.16})`
        ctx.fillText(ch, nx, ny)
        nx += ctx.measureText(ch).width + track
      }
      ctx.restore()
    }
    let s = 31
    for (const ln of lines) {
      ctx.save()
      ctx.font = `400 ${size}px ${FONT.serif}`
      const lw = ctx.measureText(ln).width
      ctx.restore()
      glyphs(ctx, ln, (this.cw - lw) / 2, y, size, 1, s, '236,229,214')
      s += 19
      y += lh
    }
    this._total = total
  },

  update () {
    if (!this.cur) return
    const t = this.engine.time - this.t0
    const inT = 0.14
    const outT = 0.34
    let a = 1
    if (t < inT) a = t / inT
    else if (t > this.cur.dur) a = 1 - (t - this.cur.dur) / outT
    if (a <= 0) { this.clear(); return }
    a = clamp(a, 0, 1)
    this.layer.style.opacity = String(a)
    this.layer.style.transform = `translateY(${((1 - a) * 5).toFixed(2)}px)`
  }
}
