// 수사 파일. 탭으로 열고 닫는다. 열려 있는 동안 게임은 멈춘다.
// 증거는 카드가 아니라 끼워진 낱장이다 — 서류는 타이핑, 사진은 인화지, 물건은 스케치.
import { grain, surface, sheet, place } from './paper.js'
import { folder, tab, caseLeaf, docItem, sketchItem, markCanvas, attach } from './casebook.js'
import { typed, INK } from './type.js'
import { createScrubber, photoSheet } from './photos.js'
import { createBoard } from './board.js'
import { normalize, QA_NOTEBOOK } from './casefile.js'
import { clamp } from '../core/util.js'

// 격자로 놓지 않는다. 겹쳐 쌓인 더미로 보여야 손으로 던져놓은 서류가 된다.
const SLOT_R = [
  { x: 0.00, y: 0.020, w: 0.600, rot: -2.6 },
  { x: 0.400, y: 0.210, w: 0.580, rot: 2.9 },
  { x: 0.010, y: 0.400, w: 0.550, rot: 1.4 },
  { x: 0.500, y: 0.480, w: 0.500, rot: -3.6 },
  { x: 0.120, y: 0.720, w: 0.520, rot: 2.4 },
  { x: 0.560, y: 0.760, w: 0.430, rot: -1.5 }
]
const SLOT_L = [
  { x: 0.050, y: 0.600, w: 0.250, rot: -1.6 },
  { x: 0.365, y: 0.625, w: 0.245, rot: 2.4 },
  { x: 0.680, y: 0.590, w: 0.250, rot: -3.0 },
  { x: 0.155, y: 0.790, w: 0.245, rot: 1.8 },
  { x: 0.490, y: 0.808, w: 0.240, rot: -2.2 }
]

// 첫 문장은 실구현과 일치해야 한다 — 증거 아이템은 소모되지 않고, 무를 수 없는 것은
// 제시 행위와 그 판정이다(SUBMISSION-AUDIT 2026-08-10, 게이트 판정: 카피를 구현에 맞춘다).
const AIMING_NOTICE = '내민 증거는 무르지 못한다. 닫힌 진술은 다시 열리지 않는다. 수사는 계속된다.'

export default {
  name: 'notebook',
  order: 80,

  async init (engine) {
    this.engine = engine
    this.mode = null
    this.items = []
    this.focus = 0
    this._pick = null
    this.interrogationPrompt = null

    const root = document.getElementById('ui-root')
    this.layer = document.createElement('div')
    this.layer.style.cssText = 'position:absolute;inset:0;display:none;pointer-events:auto'
    root?.appendChild(this.layer)

    this.dim = document.createElement('div')
    this.dim.style.cssText = 'position:absolute;inset:0;background:radial-gradient(76% 64% at 33% 26%,rgba(104,74,40,.52) 0%,rgba(30,22,14,.84) 40%,rgba(15,13,12,.97) 100%);opacity:0;transition:opacity .26s ease'
    this.layer.appendChild(this.dim)

    this.stage = document.createElement('div')
    this.stage.style.cssText = 'position:absolute;left:50%;top:50%;transform-origin:50% 54%;transition:transform .38s cubic-bezier(.16,1,.3,1),opacity .2s ease'
    this.layer.appendChild(this.stage)

    this.scrub = createScrubber()
    this.scrub.el.style.display = 'none'
    this.scrub.el.style.background = 'radial-gradient(100% 80% at 50% 46%,rgba(4,3,2,.62),rgba(2,2,2,.93))'
    this.layer.appendChild(this.scrub.el)

    this.board = createBoard(engine)
    this.layer.appendChild(this.board.el)

    this.veil = document.createElement('div')
    this.veil.style.cssText = 'position:absolute;inset:0;pointer-events:none;opacity:.30;mix-blend-mode:screen'
    this.layer.appendChild(this.veil)

    if (engine.qa) {
      this.dim.style.transition = 'none'
      this.stage.style.transition = 'none'
    }

    this._layout(engine.size.w, engine.size.h)
    this._onKey = (e) => this._key(e)
    window.addEventListener('keydown', this._onKey)

    // 막이 바뀌면 수첩 첫 장의 확인 항목이 달라진다 — 열 때가 아니라 바뀔 때 다시 찍는다
    engine.bus.on('act:enter', () => { if (this.vw) this._layout(this.vw, this.vh) })
    // ── T-P1-09 증거 지목 모드·QA 대리 구동 ─────────────────────
    engine.bus.on('interrogation:prompt', (prompt) => { this.interrogationPrompt = prompt })
    // 심문 사거리 이탈 — 증거 지목(present)이 열려 있었으면 닫는다. close()가 _pick을
    // null로 해소하므로 hud의 대기 프라미스도 함께 풀린다.
    engine.bus.on('interrogation:left', () => { if (this.mode === 'present') this.close() })
    engine.bus.on('evidence:collected', () => {
      if (this.mode === 'read' || this.mode === 'present') this._build()
    })
    engine.bus.on('lore:heard', () => {
      if (this.mode === 'read') this._build()
    })
    engine.bus.on('qa:shot', () => { if (engine.qa) this.close(true) })
    engine.bus.on('qa:state', (s) => {
      if (!engine.qa || !s?.ui) return
      if (s.ui === 'notebook') this.open('read')
      else if (s.ui === 'present') { this.open('present'); this.focus = 1; this._paint() }
      else if (s.ui === 'photos') { this.open('read'); this._openScrub(3, false) }
      else if (s.ui === 'deduction') this.openBoard()
    })

    if (engine.qa) {
      const harness = engine.harness.bind(engine)
      engine.harness = () => {
        const base = harness()
        return {
          ...base,
          qa: {
            ...(base.qa ?? {}),
            link: (evidence, claimId) => this._qaLink(evidence, claimId),
            sign: () => this._qaSign(),
            notebook: (input) => this._qaNotebook(input)
          }
        }
      }
    }
  },

  _layout (vw, vh) {
    this.vw = vw
    this.vh = vh
    const H = Math.round(Math.min(vh * 0.86, vw * 0.50))
    const W = Math.round(H / 0.575)
    this.W = W
    this.H = H
    this.stage.style.width = W + 'px'
    this.stage.style.height = H + 'px'
    this.stage.style.marginLeft = (-W / 2) + 'px'
    this.stage.style.marginTop = (-H / 2) + 'px'
    this.stage.textContent = ''

    const f = folder(W, H)
    place(f.c, 'position:absolute;left:0;top:0;filter:drop-shadow(-16px 22px 26px rgba(0,0,0,.72))')
    const tb = tab(Math.round(W * 0.20), Math.round(H * 0.052), '942 · VANCE')
    place(tb.c, `position:absolute;left:${Math.round(W * 0.60)}px;top:${-Math.round(H * 0.045)}px;filter:drop-shadow(-4px 4px 8px rgba(0,0,0,.6))`)
    this.stage.appendChild(tb.c)
    this.stage.appendChild(f.c)

    const lw = Math.round(W * 0.435)
    const lh = H - Math.round(H * 0.088)
    this.leafBox = { x: Math.round(W * 0.028), y: Math.round(H * 0.044), w: lw, h: lh }
    const leaf = caseLeaf(lw, lh, this.engine.state.act)
    place(leaf.s.c, `position:absolute;left:${this.leafBox.x}px;top:${this.leafBox.y}px;transform:rotate(-.5deg);filter:drop-shadow(-5px 7px 9px rgba(0,0,0,.46))`)
    this.stage.appendChild(leaf.s.c)
    attach(leaf.s.ctx, lw, lh, 'clip', 3)

    this.rightBox = { x: Math.round(W * 0.525), y: Math.round(H * 0.048), w: Math.round(W * 0.445), h: lh }
    this.itemWrap = document.createElement('div')
    this.itemWrap.style.cssText = 'position:absolute;inset:0'
    this.stage.appendChild(this.itemWrap)

    const g = surface(vw, vh)
    g.ctx.globalAlpha = 0.42
    g.ctx.fillStyle = g.ctx.createPattern(grain(19), 'repeat')
    g.ctx.fillRect(0, 0, vw, vh)
    this.veil.textContent = ''
    this.veil.appendChild(g.c)

    this.scrub.layout(vw, vh)
    this.board.layout(vw, vh)
    this._build()
  },

  resize (w, h) {
    if (Math.abs(w - (this.vw ?? 0)) < 4 && Math.abs(h - (this.vh ?? 0)) < 4) return
    this._layout(w, h)
  },

  _list () {
    const live = this.engine.state.evidenceList().map(normalize)
    let out = live.length ? live : (this.engine.qa ? QA_NOTEBOOK.map(id => normalize({ id })) : [])
    // 제시 모드에서는 심문 쪽이 넘긴 보유 목록으로 제한한다 — 없는 증거는 집을 수도 없다 (N4)
    if (this.mode === 'present' && this._filter) out = out.filter(e => this._filter.has(e.id))
    return out
  },

  _build () {
    this.itemWrap.textContent = ''
    this.items = []
    const list = this._list()
    const loose = list.filter(e => e.form !== 'object')
    const objs = list.filter(e => e.form === 'object')

    loose.forEach((ev, i) => {
      const sl = SLOT_R[i % SLOT_R.length]
      const w = Math.round(this.rightBox.w * sl.w)
      const h = Math.round(w * (ev.form === 'photo' ? 0.78 : 0.545))
      const s = ev.form === 'photo' ? this._photo(w, h) : docItem(w, h, ev, i + 1)
      attach(s.ctx, w, h, ['clip', 'tape', 'staple', 'clip'][i % 4], i * 7 + 5)
      this._mount(s, ev, {
        x: clamp(this.rightBox.x + this.rightBox.w * sl.x, this.rightBox.x - 6, this.rightBox.x + this.rightBox.w - w),
        y: clamp(this.rightBox.y + this.rightBox.h * sl.y, this.rightBox.y, this.rightBox.y + this.rightBox.h - h - 4),
        rot: sl.rot, w, h, lift: true
      })
    })

    objs.forEach((ev, i) => {
      const sl = SLOT_L[i % SLOT_L.length]
      const w = Math.round(this.leafBox.w * sl.w)
      const h = Math.round(w * 0.92)
      this._mount(sketchItem(w, h, ev, i + 2), ev, {
        x: clamp(this.leafBox.x + this.leafBox.w * sl.x, this.leafBox.x, this.leafBox.x + this.leafBox.w - w),
        y: clamp(this.leafBox.y + this.leafBox.h * sl.y, this.leafBox.y, this.leafBox.y + this.leafBox.h - h - 4),
        rot: sl.rot, w, h, lift: false
      })
    })
    if (this.mode === 'present') this._mountAimingNotice()
    this._paint()
  },

  _mountAimingNotice () {
    const w = Math.round(this.W * 0.56)
    const h = Math.round(this.H * 0.155)
    const s = sheet({ w, h, seed: 1947, tone: 'bond', creases: 1, deckle: 1.4, grain: 0.65 })
    const ctx = s.ctx
    const size = clamp(Math.round(h * 0.135), 10, 15)
    typed(ctx, '증거 제시 수칙', w * 0.06, h * 0.24, { size: size * 0.72, ink: INK.stamp, alpha: 0.72, track: 1.8, seed: 5 })
    typed(ctx, '내민 증거는 무르지 못한다.', w * 0.06, h * 0.49, { size, ink: INK.ribbon, alpha: 0.88, seed: 11 })
    typed(ctx, '닫힌 진술은 다시 열리지 않는다.', w * 0.06, h * 0.69, { size, ink: INK.ribbon, alpha: 0.86, seed: 23 })
    typed(ctx, '수사는 계속된다.', w * 0.06, h * 0.89, { size, ink: INK.ribbon, alpha: 0.88, seed: 37 })
    const d = document.createElement('div')
    d.style.cssText = `position:absolute;left:${Math.round(this.W * 0.37)}px;top:${Math.round(this.H * 0.015)}px;z-index:8;transform:rotate(.45deg);pointer-events:none;filter:drop-shadow(-5px 8px 10px rgba(0,0,0,.58))`
    d.dataset.notice = AIMING_NOTICE
    d.appendChild(s.c)
    this.itemWrap.appendChild(d)
  },

  _photo (w, h) {
    const s = photoSheet(0, w, h, 1)
    const tw = Math.round(w * 0.5)
    const th = Math.round(tw * 0.30)
    const tg = sheet({ w: tw, h: th, seed: 313, tone: 'bond', creases: 0, deckle: 1.1, grain: 0.5, light: 0.6 })
    typed(tg.ctx, '엘리베이터 사진 4장', 8, th * 0.72, { size: clamp(th * 0.54, 9, 15), ink: INK.ribbon, alpha: 0.95, seed: 9 })
    s.ctx.save()
    s.ctx.translate(w * 0.05, h * 0.70)
    s.ctx.rotate(-0.045)
    s.ctx.shadowColor = 'rgba(0,0,0,.5)'
    s.ctx.shadowBlur = 5
    s.ctx.shadowOffsetY = 3
    s.ctx.drawImage(tg.c, 0, 0, tw, th)
    s.ctx.restore()
    return s
  },

  _mount (s, ev, o) {
    const d = document.createElement('div')
    d.style.cssText = `position:absolute;left:${Math.round(o.x)}px;top:${Math.round(o.y)}px;width:${o.w}px;height:${o.h}px;` +
      `transform:rotate(${o.rot}deg);transition:transform .2s cubic-bezier(.16,1,.3,1),filter .2s ease;` +
      (o.lift ? 'filter:drop-shadow(-5px 8px 9px rgba(0,0,0,.58));' : 'filter:drop-shadow(-1px 2px 1px rgba(0,0,0,.18));')
    s.c.style.position = 'absolute'
    s.c.style.left = '0'
    s.c.style.top = '0'
    d.appendChild(s.c)
    const mk = markCanvas(o.w + 22, o.h + 22, o.w + ev.id.length)
    place(mk.c, 'position:absolute;left:-11px;top:-11px;opacity:0;transition:opacity .16s ease;pointer-events:none')
    d.appendChild(mk.c)
    d.addEventListener('pointerenter', () => { this.focus = this.items.indexOf(it); this._paint() })
    d.addEventListener('pointerdown', () => this._choose(ev.id))
    const it = { el: d, mark: mk.c, ev, o }
    this.items.push(it)
    this.itemWrap.appendChild(d)
  },

  _paint () {
    this.items.forEach((it, i) => {
      const on = this.mode === 'present' && i === this.focus
      it.mark.style.opacity = on ? '1' : '0'
      const lift = on ? -4 : 0
      it.el.style.transform = `translate(${lift * 0.4}px,${lift}px) rotate(${it.o.rot + (on ? 0.5 : 0)}deg)`
      if (it.o.lift) it.el.style.filter = on
        ? 'drop-shadow(-8px 13px 15px rgba(0,0,0,.66))'
        : 'drop-shadow(-5px 8px 9px rgba(0,0,0,.58))'
    })
  },

  isOpen () { return this.mode !== null },

  open (mode = 'read') {
    if (this.mode === mode) return
    this.mode = mode
    this._build()
    this.layer.style.display = 'block'
    this.dim.style.opacity = '1'
    this.stage.style.opacity = '1'
    this.stage.style.transform = 'rotate(-.9deg) translateY(0)'
    this.scrub.el.style.display = 'none'
    this.board.close()
    this.engine.bus.emit('ui:open', { ui: mode })
  },

  openBoard () {
    this.mode = 'deduction'
    this.layer.style.display = 'block'
    this.dim.style.opacity = '1'
    this.stage.style.opacity = '0'
    this.scrub.el.style.display = 'none'
    this.board.open()
    this.engine.bus.emit('ui:open', { ui: 'deduction' })
  },

  close (silent) {
    if (this.mode === null) return
    const was = this.mode
    this.mode = null
    this.layer.style.display = 'none'
    this.dim.style.opacity = '0'
    this.stage.style.transform = 'rotate(-.9deg) translateY(34px)'
    this.scrub.el.style.display = 'none'
    this.board.close()
    this._filter = null
    if (this._pick) { this._pick.resolve(null); this._pick = null }
    if (!silent) this.engine.bus.emit('ui:close', { ui: was })
  },

  // INTERROGATION이 '거짓' 선택 후 호출한다. 증거를 고르지 않으면 null.
  pickEvidence (opts) {
    if (this._pick) return this._pick.p
    this._filter = Array.isArray(opts?.available) ? new Set(opts.available) : null
    this.mode = null
    this.open('present')
    this.focus = 0
    this._paint()
    let resolve
    const p = new Promise(r => { resolve = r })
    this._pick = { p, resolve, sid: opts?.sid || this.interrogationPrompt?.sid || null }
    return p
  },

  _choose (id) {
    if (this.mode !== 'present') {
      if (id === 'photos') this._openScrub(0, false)
      return
    }
    const pick = this._pick
    this._pick = null
    this.close(true)
    if (pick?.sid) this.engine.bus.emit('interrogation:choose', { sid: pick.sid, choice: 'LIE', evidence: id })
    pick?.resolve(id)
    this.engine.bus.emit('ui:close', { ui: 'present' })
  },

  _qaLink (evidence, claimId) {
    if (!Array.isArray(evidence) || evidence.length !== 2 || evidence[0] === evidence[1] ||
      evidence.some(id => typeof id !== 'string' || !id) || typeof claimId !== 'string' || !claimId) return false
    this.engine.bus.emit('deduction:present', { evidence: [...evidence], claim: claimId })
    return true
  },

  _qaSign () {
    this.engine.bus.emit('deduction:sign', {})
    return true
  },

  _qaNotebook (input) {
    const op = input?.op
    const arg = input?.arg
    if (op === 'open') { this.open('read'); return true }
    if (op === 'close') { this.close(); return true }
    if (op === 'tab') {
      if (arg === 'deduction') this.openBoard()
      else this.open(arg === 'present' ? 'present' : 'read')
      return true
    }
    if (op === 'scrub') {
      if (!this.mode) this.open('read')
      const index = Number.isInteger(arg) ? clamp(arg, 0, 3) : 0
      this._openScrub(index, false)
      return true
    }
    if (op === 'inspect') {
      if (!this.mode) this.open('read')
      const item = typeof arg === 'string' ? this.items.find(it => it.ev.id === arg) : this.items[arg ?? this.focus]
      if (!item) return false
      this.focus = this.items.indexOf(item)
      if (item.ev.id === 'photos') this._openScrub(0, false)
      else this._paint()
      return true
    }
    return false
  },

  _openScrub (idx, zoom) {
    this.scrub.state.zoom = zoom ? 1 : 0
    this.scrub.setIndex(idx)
    this.scrub.el.style.display = 'flex'
  },

  _key (e) {
    if (e.key === 'Tab') {
      e.preventDefault()
      if (this.mode) this.close()
      else this.open('read')
      return
    }
    if (!this.mode) return
    if (this.scrub.el.style.display !== 'none') {
      if (e.key === 'Escape') { this.scrub.el.style.display = 'none'; return }
      if (this.scrub.key(e)) { e.preventDefault(); return }
    }
    if (e.key === 'Escape') { this.close(); return }
    if (this.mode !== 'present') return
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { this.focus = (this.focus + 1) % this.items.length; this._paint() }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { this.focus = (this.focus - 1 + this.items.length) % this.items.length; this._paint() }
    else if (e.key === 'Enter') this._choose(this.items[this.focus]?.ev.id)
  },

  update () {
    if (this.mode === 'deduction') this.board.update(this.engine.time)
  },

  dispose () { window.removeEventListener('keydown', this._onKey) }
}
