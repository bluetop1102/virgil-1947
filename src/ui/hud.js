// HUD. 크로스헤어·체력·탄약·미니맵 없음.
// 상호작용 가능 여부는 오브젝트 쪽 림 강조가 알린다(GAMEPLAY/재질 소관). 여기는 손글씨 한 줄만 남긴다.
import { surface, sheet } from './paper.js'
import { typed, pen, penLine, INK, FONT } from './type.js'
import { paperclip } from './sketch.js'
import { normalize } from './casefile.js'
import { clamp } from '../core/util.js'

export default {
  name: 'hud',
  order: 80,

  async init (engine) {
    this.engine = engine
    this.prompt = null
    this.slip = null
    this.slipT0 = -99
    this.choicePrompt = null
    this.choiceBusy = false

    this.layer = document.createElement('div')
    this.layer.style.cssText = 'position:absolute;inset:0;pointer-events:none'
    document.getElementById('ui-root')?.appendChild(this.layer)

    this.pWrap = document.createElement('div')
    this.pWrap.style.cssText = 'position:absolute;opacity:0;transition:opacity .22s ease,transform .22s cubic-bezier(.16,1,.3,1)'
    this.layer.appendChild(this.pWrap)

    this.sWrap = document.createElement('div')
    this.sWrap.style.cssText = 'position:absolute;opacity:0;transform:translateY(26px) rotate(-1.4deg);transition:opacity .3s ease,transform .42s cubic-bezier(.16,1,.3,1);filter:drop-shadow(-6px 10px 12px rgba(0,0,0,.62))'
    this.layer.appendChild(this.sWrap)

    // ── T-P1-09 심문 3선택 프롬프트 ─────────────────────────────
    this.choiceWrap = document.createElement('div')
    this.choiceWrap.style.cssText = 'position:absolute;left:50%;bottom:6.5%;opacity:0;pointer-events:none;transform:translate(-50%,16px) rotate(-.4deg);transition:opacity .2s ease,transform .28s cubic-bezier(.16,1,.3,1);filter:drop-shadow(-8px 13px 15px rgba(0,0,0,.68))'
    this.layer.appendChild(this.choiceWrap)
    this.choiceWrap.addEventListener('pointerdown', (e) => this._choicePointer(e))
    this._choiceKey = (e) => this._keyChoice(e)
    window.addEventListener('keydown', this._choiceKey)

    if (engine.qa) {
      this.pWrap.style.transition = 'none'
      this.sWrap.style.transition = 'none'
      this.choiceWrap.style.transition = 'none'
    }

    this._layout(engine.size.w, engine.size.h)

    engine.bus.on('evidence:collected', ({ id }) => this._noteEvidence(id))
    engine.bus.on('interrogation:prompt', (prompt) => this._showChoicePrompt(prompt))
    engine.bus.on('qa:shot', () => { if (engine.qa) { this.setPrompt(null); this._hideSlip(); this._hideChoicePrompt() } })
    engine.bus.on('qa:state', (s) => {
      if (!engine.qa) return
      if (s?.ui === 'prompt') {
        this._showChoicePrompt({ npc: 'deitch', sid: 'deitch.S2', options: ['TRUTH', 'DOUBT', 'LIE'] })
        this._noteEvidence('register')
      }
      if (s?.ui === 'notebook' || s?.ui === 'deduction' || s?.ui === 'photos' || s?.ui === 'present') this.setPrompt(null)
    })

    if (engine.qa) {
      const harness = engine.harness.bind(engine)
      engine.harness = () => {
        const base = harness()
        return {
          ...base,
          qa: {
            ...(base.qa ?? {}),
            choose: (input) => this._qaChoose(input)
          }
        }
      }
    }
  },

  _layout (w, h) {
    this.vw = w
    this.vh = h
    this.pad = Math.round(Math.min(w, h) * 0.045)
    this.pw = clamp(Math.round(w * 0.30), 220, 460)
    this.ph = Math.round(this.pw * 0.20)
    this.pWrap.style.left = this.pad + 'px'
    this.pWrap.style.bottom = this.pad + 'px'
    this.sWrap.style.right = Math.round(this.pad * 0.9) + 'px'
    this.sWrap.style.bottom = Math.round(this.pad * 1.05) + 'px'
    if (this.prompt) this._drawPrompt()
    if (this.slip) this._drawSlip()
    if (this.choicePrompt) this._drawChoicePrompt()
  },

  resize (w, h) {
    if (Math.abs(w - (this.vw ?? 0)) < 4 && Math.abs(h - (this.vh ?? 0)) < 4) return
    this._layout(w, h)
  },

  // 공개 API. GAMEPLAY가 조준 대상이 바뀔 때 호출한다.
  setPrompt (text, key) {
    if (!text) {
      this.prompt = null
      this.pWrap.style.opacity = '0'
      this.pWrap.style.transform = 'translateY(4px)'
      return
    }
    if (this.prompt && this.prompt.text === text && this.prompt.key === key) return
    this.prompt = { text, key: key || null }
    this._drawPrompt()
    this.pWrap.style.opacity = '1'
    this.pWrap.style.transform = 'translateY(0)'
  },

  _drawPrompt () {
    if (this.pc) this.pc.c.remove()
    const w = this.pw
    const h = this.ph
    this.pc = surface(w, h)
    const ctx = this.pc.ctx
    const size = clamp(Math.round(w * 0.052), 11, 19)
    const y = h - size * 0.5

    penLine(ctx, 2, y - size * 1.75, w * 0.42, y - size * 1.75, { w: 0.9, alpha: 0.30, ink: '214,198,166', seed: 5 })

    let x = 2
    if (this.prompt.key) {
      const bs = size * 1.42
      const by = y - bs * 0.82
      pen(ctx, [[x, by], [x + bs, by - 0.6], [x + bs + 0.5, by + bs], [x - 0.4, by + bs + 0.4], [x, by]], {
        w: 1.1, alpha: 0.5, ink: '224,208,174', seed: 9
      })
      typed(ctx, this.prompt.key, x + bs * 0.28, by + bs * 0.74, {
        size: size * 0.86, ink: '234,220,190', alpha: 0.86, seed: 13, font: FONT.type
      })
      x += bs + size * 0.7
    }
    typed(ctx, this.prompt.text, x, y, { size, ink: '226,212,184', alpha: 0.72, seed: 21, track: 0.6, wobble: 0.02 })
    this.pWrap.appendChild(this.pc.c)
  },

  _showChoicePrompt (payload) {
    const allowed = ['TRUTH', 'DOUBT', 'LIE']
    const options = Array.isArray(payload?.options) ? payload.options.filter(o => allowed.includes(o)) : []
    if (!payload?.sid || options.length < 2) return false
    this.choicePrompt = { npc: payload.npc, sid: payload.sid, options }
    this.choiceBusy = false
    this.setPrompt(null)
    this._drawChoicePrompt()
    this.choiceWrap.style.opacity = '1'
    this.choiceWrap.style.pointerEvents = 'auto'
    this.choiceWrap.style.transform = 'translate(-50%,0) rotate(-.4deg)'
    return true
  },

  _hideChoicePrompt () {
    this.choicePrompt = null
    this.choiceBusy = false
    this.choiceWrap.style.opacity = '0'
    this.choiceWrap.style.pointerEvents = 'none'
    this.choiceWrap.style.transform = 'translate(-50%,16px) rotate(-.4deg)'
  },

  _drawChoicePrompt () {
    if (this.cc) this.cc.c.remove()
    const options = this.choicePrompt?.options || []
    const w = clamp(Math.round(this.vw * 0.43), 410, 710)
    const h = clamp(Math.round(w * 0.19), 82, 128)
    const s = sheet({ w, h, seed: 942, tone: 'bond', creases: 1, deckle: 1.8, grain: 0.7 })
    const ctx = s.ctx
    const labels = { TRUTH: '진실', DOUBT: '의심', LIE: '거짓' }
    const size = clamp(Math.round(w * 0.028), 13, 20)
    typed(ctx, '진술 기록 — 판단', w * 0.055, h * 0.28, { size: size * 0.58, ink: INK.faded, alpha: 0.62, track: 1.5, seed: 3 })
    penLine(ctx, w * 0.05, h * 0.37, w * 0.95, h * 0.37, { w: 0.75, alpha: 0.24, ink: INK.faded, seed: 7 })
    options.forEach((choice, i) => {
      const x = w * (i + 0.5) / options.length
      typed(ctx, `${i + 1}. ${labels[choice]}`, x - size * 1.65, h * 0.76, {
        size, ink: INK.ribbon, alpha: 0.88, seed: 21 + i * 13, track: 0.7
      })
      if (i > 0) penLine(ctx, w * i / options.length, h * 0.48, w * i / options.length, h * 0.83, { w: 0.65, alpha: 0.16, ink: INK.faded, seed: 40 + i })
    })
    this.cc = s
    this.choiceWrap.appendChild(s.c)
  },

  _choicePointer (e) {
    if (!this.choicePrompt || this.choiceBusy) return
    const box = this.choiceWrap.getBoundingClientRect()
    const i = Math.floor(clamp((e.clientX - box.left) / Math.max(box.width, 1), 0, 0.999) * this.choicePrompt.options.length)
    this._choosePrompt(this.choicePrompt.options[i])
  },

  _keyChoice (e) {
    if (!this.choicePrompt || this.choiceBusy || e.repeat) return
    const i = Number(e.key) - 1
    if (!Number.isInteger(i) || i < 0 || i >= this.choicePrompt.options.length) return
    e.preventDefault()
    this._choosePrompt(this.choicePrompt.options[i])
  },

  _emitChoice (sid, choice, evidence) {
    const payload = { sid, choice }
    if (evidence != null) payload.evidence = evidence
    this.engine.bus.emit('interrogation:choose', payload)
  },

  _emitAiming (sid, on) {
    this.engine.bus.emit('interrogation:aiming', { sid, on })
  },

  async _choosePrompt (choice) {
    const prompt = this.choicePrompt
    if (!prompt || prompt.options.indexOf(choice) < 0 || this.choiceBusy) return false
    if (choice !== 'LIE') {
      this._emitChoice(prompt.sid, choice)
      this._hideChoicePrompt()
      return true
    }
    this.choiceBusy = true
    this._emitAiming(prompt.sid, true)
    const held = this.engine.state.evidenceList().map(e => e.id)
    const evidence = await this.engine.get('notebook')?.pickEvidence({ available: held, sid: prompt.sid })
    this._emitAiming(prompt.sid, false)
    if (evidence) this._hideChoicePrompt()
    else this.choiceBusy = false
    return !!evidence
  },

  _qaChoose (input) {
    const choice = input?.choice
    const sid = input?.sid
    if (!sid || !['TRUTH', 'DOUBT', 'LIE'].includes(choice)) return false
    if (choice === 'LIE') {
      if (!input.evidence) return false
      this._emitAiming(sid, true)
      this._emitChoice(sid, choice, input.evidence)
      this._emitAiming(sid, false)
    } else this._emitChoice(sid, choice)
    if (this.choicePrompt?.sid === sid) this._hideChoicePrompt()
    return true
  },

  _noteEvidence (id) {
    const st = this.engine.state.evidence.get(id)
    this.slip = normalize(st || { id })
    this.slipT0 = this.engine.time
    this._drawSlip()
    this.sWrap.style.opacity = '1'
    this.sWrap.style.transform = 'translateY(0) rotate(-1.4deg)'
  },

  _hideSlip () {
    this.slip = null
    this.sWrap.style.opacity = '0'
    this.sWrap.style.transform = 'translateY(26px) rotate(-1.4deg)'
  },

  _drawSlip () {
    if (this.sc) this.sc.c.remove()
    const w = clamp(Math.round(this.vw * 0.19), 160, 300)
    const h = Math.round(w * 0.36)
    const s = sheet({ w, h, seed: 404, tone: 'bond', creases: 1, deckle: 1.9, grain: 0.55 })
    const ctx = s.ctx
    const size = clamp(Math.round(w * 0.078), 11, 18)
    typed(ctx, '증거 — 노트에 끼움', 14, h * 0.36, { size: size * 0.62, ink: INK.faded, alpha: 0.7, track: 1.4, seed: 3 })
    typed(ctx, this.slip.title, 13, h * 0.72, { size, ink: INK.ribbon, alpha: 0.92, seed: 7 })
    paperclip(ctx, w - 17, h * 0.30, 0.82, 0.42)
    this.sc = s
    this.sWrap.appendChild(s.c)
  },

  update () {
    if (this.slip && this.engine.time - this.slipT0 > 4.6 && !this.engine.qa) this._hideSlip()
  },

  dispose () { window.removeEventListener('keydown', this._choiceKey) }
}
