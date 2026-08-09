// 자막. 배경 박스 없음, 색 구분 없음, 지문 없음.
// 필름 프린트에 태워 넣은 글자처럼 — 미세한 헐레이션과 불균일 농도만 남긴다.
import { surface } from './paper.js'
import { FONT, penLine } from './type.js'
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

// 어절 경계 개행. type.js 의 wrap 은 글자 단위라 "…제 기억 / 으론." 처럼 어절 중간이 갈렸다
// (3차 판정 §3 부수 ① — 제출 프레임에 그대로 찍힌다). 자막만 공백에서 끊고, 한 어절이 한 줄을
// 넘을 때에 한해 그 어절 안에서 글자 단위로 쪼갠다.
function wrapWords (ctx, text, maxW, size) {
  ctx.save()
  ctx.font = `400 ${size}px ${FONT.serif}`
  const fits = t => ctx.measureText(t).width <= maxW
  const out = []
  for (const para of String(text).split('\n')) {
    let line = ''
    for (const word of para.split(/\s+/)) {
      if (!word) continue
      const test = line ? `${line} ${word}` : word
      if (fits(test)) { line = test; continue }
      if (line) { out.push(line); line = '' }
      if (fits(word)) { line = word; continue }
      let chunk = ''
      for (const ch of word) {
        if (chunk && !fits(chunk + ch)) { out.push(chunk); chunk = ch } else chunk += ch
      }
      line = chunk
    }
    if (line) out.push(line)
  }
  ctx.restore()
  return out.length ? out : ['']
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
    // 밝은 벽·바닥 위에서 글자가 묻히던 것(사용자 체험 피드백)의 대비 보강. 배경 박스를 두지
    // 않는다는 원칙은 유지하고, 글자 뒤 어둠을 넓고 진하게 깔아 배경과 분리한다.
    ctx.fillStyle = `rgba(6,5,4,${alpha * 0.78})`
    ctx.filter = `blur(${(size * 0.16).toFixed(2)}px)`
    ctx.fillText(ch, cx + 0.6, y + jy + 1.4)
    ctx.fillText(ch, cx + 0.6, y + jy + 1.4)
    ctx.fillStyle = `rgba(${ink},${alpha * 0.24})`
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
    this.layer.className = 'virgil-sub'
    // body 직속 + z-index 93 — 인트로 베일(cinematics, z92)이 ui-root(z10)를 통째로 덮어
    // 타이핑 자막 4줄이 가려졌던 결함의 수정. 설정(140)·타이틀(120)보다는 아래를 유지한다.
    this.layer.style.cssText = 'position:fixed;left:0;right:0;bottom:0;display:flex;justify-content:center;pointer-events:none;opacity:0;z-index:93'
    document.body.appendChild(this.layer)
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
    // 타이핑 자막은 글자마다 show 가 다시 불린다. 그때마다 t0 를 리셋하면 페이드인(0.14s)이
    // 매번 처음부터 다시 시작돼 행이 끝날 때까지 반투명에 머문다 — 인트로 자막이 흐리게
    // 읽히던 진짜 원인이다. 앞 텍스트의 연장이면 같은 행의 이어쓰기로 보고 t0 를 유지한다.
    const typing = this.cur && text !== this.cur.text && text.startsWith(this.cur.text)
    this.cur = {
      speaker: p.speaker ? (NAME[p.speaker] || p.speaker) : '',
      text,
      dur: p.dur ?? Math.max(1.8, text.length * 0.11)
    }
    if (!typing) this.t0 = this.engine.time
    this._draw()
  },

  clear () {
    this.cur = null
    this.layer.style.opacity = '0'
  },

  _draw () {
    const { ctx } = this.s
    ctx.clearRect(0, 0, this.cw, this.ch)
    // 상한 27px 는 1920·2560 어느 쪽에서도 걸려 실제 표시가 늘 27px 였다 — 1080p 에서 판독이
    // 흐리다는 체험 피드백의 직접 원인. 계수와 상한을 함께 올린다.
    const size = clamp(Math.round(this.vw * 0.0195), 17, 36)
    const lines = wrapWords(ctx, this.cur.text, this.cw - 40, size)
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
      const nx0 = (this.cw - nw) / 2
      let nx = nx0
      const ny = y - lh - nameSize * 0.35
      const r = rng(7)
      ctx.save()
      ctx.font = `400 ${nameSize}px ${FONT.serif}`
      ctx.textBaseline = 'alphabetic'
      // 밝은 데스크·벽 위에서 화자명이 통째로 묻히던 것(2차 N8 소형)의 수정. 본문 글자가
      // 쓰는 것과 같은 어둠(넓은 블러 2패스)을 이름에도 깔고, 잉크 농도를 본문 쪽으로 올린다.
      for (const ch of this.cur.speaker) {
        ctx.fillStyle = 'rgba(5,4,3,0.66)'
        ctx.filter = `blur(${(nameSize * 0.2).toFixed(2)}px)`
        ctx.fillText(ch, nx + 0.6, ny + 1.3)
        ctx.fillText(ch, nx + 0.6, ny + 1.3)
        ctx.filter = 'none'
        ctx.fillStyle = `rgba(214,199,171,${0.82 + r() * 0.14})`
        ctx.fillText(ch, nx, ny)
        nx += ctx.measureText(ch).width + track
      }
      ctx.restore()
      // 이름 아래 잉크 밑줄 — 배경이 밝을 때 이름 덩어리를 배경에서 떼는 마지막 한 겹
      const uy = ny + nameSize * 0.44
      ctx.save()
      ctx.filter = `blur(${(nameSize * 0.24).toFixed(2)}px)`
      penLine(ctx, nx0 - 2, uy + 1.3, nx0 + nw - track + 2, uy + 1.3, { w: 2.4, alpha: 0.6, ink: '5,4,3', seed: 11 })
      ctx.filter = 'none'
      penLine(ctx, nx0, uy, nx0 + nw - track, uy, { w: 0.9, alpha: 0.52, ink: '206,192,166', seed: 11 })
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
    if (t > this.cur.dur) {
      // 페이드아웃이 끝난 뒤에만 지운다. 예전엔 a<=0 전체를 지웠는데, show()와 같은
      // 프레임에 update가 돌면 t=0 → a=0 이라 엔진 루프 안에서 발화된 자막(인트로 타이핑·
      // 로어·심문 반응 대사)이 전부 한 프레임 만에 지워졌다. DOM 이벤트 경로로 발화된
      // 자막만 살아남아 결함이 기계 게이트에 안 잡혔다.
      a = 1 - (t - this.cur.dur) / outT
      if (a <= 0) { this.clear(); return }
    } else if (t < inT) {
      a = t / inT
    }
    a = clamp(a, 0, 1)
    this.layer.style.opacity = String(a)
    this.layer.style.transform = `translateY(${((1 - a) * 5).toFixed(2)}px)`
  }
}
