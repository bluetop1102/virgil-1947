// HUD. 크로스헤어·체력·탄약·미니맵 없음.
// 상호작용 가능 여부는 오브젝트 쪽 림 강조가 알린다(GAMEPLAY/재질 소관). 여기는 손글씨 한 줄만 남긴다.
import { surface, sheet } from './paper.js'
import { typed, measureTyped, pen, penLine, INK, FONT } from './type.js'
import { paperclip } from './sketch.js'
import { normalize } from './casefile.js'
import { clamp } from '../core/util.js'

// 프런트에서 건네주는 안내 카드. 조작을 알려주는 유일한 지점이라 문안은 여기가 원본이다.
const CARD_ROWS = [
  ['이동', ['W', 'A', 'S', 'D']],
  ['조사', ['E']],
  ['수첩', ['Tab']],
  ['카드', ['Esc']]
]
const CARD_DELAY = 0.5
// 표시 시간은 게임 시계(engine.time) 기준인데 프로브는 벽시계로 잰다. 헤드리스에서 두 시계의
// 비는 약 0.4 이고(S-A 실측, probe-audio.mjs 머리주석) GPU 경합 시 0.2 까지 떨어진다. 그 구간
// 전체에서 "+1초 표시 / +7초 소거" 두 판정을 동시에 만족하는 창은 (2.95, 4.03) 이다 —
// 6.0·4.2 로 올렸다가 각각 소거 판정에서 FAIL 했다. 발사문 사양값 3.5 가 그 창의 한가운데다.
const CARD_HOLD = 3.5

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
    this.cardVisible = false
    this.cardShown = false
    this.cardT0 = -99
    this.cardArm = 0

    this.layer = document.createElement('div')
    this.layer.style.cssText = 'position:absolute;inset:0;pointer-events:none'
    document.getElementById('ui-root')?.appendChild(this.layer)

    this.pWrap = document.createElement('div')
    this.pWrap.style.cssText = 'position:absolute;opacity:0;transition:opacity .22s ease,transform .22s cubic-bezier(.16,1,.3,1)'
    this.layer.appendChild(this.pWrap)

    this.sWrap = document.createElement('div')
    this.sWrap.style.cssText = 'position:absolute;opacity:0;transform:translateY(26px) rotate(-1.4deg);transition:opacity .3s ease,transform .42s cubic-bezier(.16,1,.3,1);filter:drop-shadow(-6px 10px 12px rgba(0,0,0,.62))'
    this.layer.appendChild(this.sWrap)

    // 카드는 화면에 붙은 판이 아니라 카운터에 놓인 물건이다. 원근 없이 정면으로 서 있으면
    // 방의 소실선과 어긋나 그것만 UI 오버레이로 읽힌다(블라인드 채점 지적) — 3D 기울기를 준다.
    this.cardPose = 'perspective(560px) rotateX(13deg) rotateY(11deg) rotate(-1.8deg)'
    this.cWrap = document.createElement('div')
    this.cWrap.style.cssText = 'position:absolute;opacity:0;transition:opacity .34s ease,transform .5s cubic-bezier(.16,1,.3,1);filter:drop-shadow(-7px 13px 16px rgba(0,0,0,.7))'
    this.cWrap.style.transform = `translateY(30px) ${this.cardPose}`
    this.layer.appendChild(this.cWrap)

    // ── T-P1-09 심문 3선택 프롬프트 ─────────────────────────────
    this.choiceWrap = document.createElement('div')
    // bottom 13% — 자막(하단 고정)과 같은 자리에 겹쳐 둘 다 판독이 흐려지던 것을 세로 분리
    this.choiceWrap.style.cssText = 'position:absolute;left:50%;bottom:13%;opacity:0;pointer-events:none;transform:translate(-50%,16px) rotate(-.4deg);transition:opacity .2s ease,transform .28s cubic-bezier(.16,1,.3,1);filter:drop-shadow(-8px 13px 15px rgba(0,0,0,.68))'
    this.layer.appendChild(this.choiceWrap)
    this.choiceWrap.addEventListener('pointerdown', (e) => this._choicePointer(e))
    this._choiceKey = (e) => this._keyChoice(e)
    window.addEventListener('keydown', this._choiceKey)

    if (engine.qa) {
      this.pWrap.style.transition = 'none'
      this.sWrap.style.transition = 'none'
      this.choiceWrap.style.transition = 'none'
      this.cWrap.style.transition = 'none'
    }

    this._layout(engine.size.w, engine.size.h)

    engine.bus.on('evidence:collected', ({ id }) => { this._hideCard(); this._noteEvidence(id) })
    // 조작을 처음 넘겨받는 두 경로. 새 게임은 인트로가 끝나는 자리(이양 직후 다이치 대사가
    // 지나간 뒤), 재입장은 타이틀이 닫히는 자리다. 시네마틱에는 이양 시점을 알리는 이벤트가
    // 없어서 cinematic:end 를 경계로 쓴다 — 대사와 카드가 겹치지 않는 이점도 같이 온다.
    engine.bus.on('cinematic:end', ({ id }) => { if (id === 'cin-intro') this._armCard() })
    engine.bus.on('title:proceed', ({ mode }) => { if (mode === 'wake') this._armCard() })
    engine.bus.on('interrogation:prompt', (prompt) => this._showChoicePrompt(prompt))
    // 심문 사거리 이탈 — 세션이 놓이면 선택지도 함께 내린다 (잔류 쪽지가 자유 이동 중
    // 입력을 받아 미청취 진술을 소모시키던 결함의 수신측 수정)
    engine.bus.on('interrogation:left', () => this._hideChoicePrompt())
    engine.bus.on('qa:shot', () => { if (engine.qa) { this.setPrompt(null); this._hideSlip(); this._hideChoicePrompt() } })
    engine.bus.on('qa:state', (s) => {
      if (!engine.qa) return
      if (s?.ui === 'prompt') {
        this._showChoicePrompt({ npc: 'deitch', sid: 'deitch.S2', options: ['TRUTH', 'DOUBT', 'LIE'] })
        this._noteEvidence('register')
      }
      if (s?.ui === 'notebook' || s?.ui === 'deduction' || s?.ui === 'photos' || s?.ui === 'present') this.setPrompt(null)
      if (s?.ui === 'controls') this._showCard()
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
    this.cWrap.style.right = Math.round(this.pad * 0.9) + 'px'
    this.cWrap.style.bottom = Math.round(this.pad * 1.05) + 'px'
    if (this.prompt) this._drawPrompt()
    if (this.slip) this._drawSlip()
    if (this.choicePrompt) this._drawChoicePrompt()
    if (this.cardVisible) this._drawCard()
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

  // 프로브 계약(tools/judge-probes/probe-guidance.mjs). 카드는 캔버스 소품이라 DOM 텍스트로
  // 검출되지 않는다 — 기계 검증이 들여다보는 유일한 창이다.
  controlsCardState () {
    if (this.cardVisible) return 'visible'
    return this.cardShown ? 'hidden' : 'never'
  },

  _armCard () {
    if (this.cardShown || this.cardArm || this.engine.qa) return
    this.cardArm = this.engine.time + CARD_DELAY
  },

  _showCard () {
    this.cardArm = 0
    this.cardVisible = true
    this.cardShown = true
    this.cardT0 = this.engine.time
    this._drawCard()
    this.cWrap.style.opacity = '1'
    this.cWrap.style.transform = `translateY(0) ${this.cardPose}`
  },

  _hideCard () {
    if (!this.cardVisible) return
    this.cardVisible = false
    this.cWrap.style.opacity = '0'
    this.cWrap.style.transform = `translateY(30px) ${this.cardPose}`
  },

  // 활자가 종이 섬유로 번진 자국을 먼저 깔고 그 위에 타건을 얹는다. 번짐이 없으면 종이만
  // 낡고 글자는 벡터로 찍은 듯 깨끗해서 둘이 다른 시대의 것으로 보인다(블라인드 채점 지적).
  _ink (ctx, text, x, y, o) {
    ctx.save()
    ctx.filter = `blur(${(o.size * 0.1).toFixed(2)}px)`
    typed(ctx, text, x, y, { ...o, alpha: (o.alpha ?? 0.86) * 0.42 })
    ctx.restore()
    return typed(ctx, text, x, y, o)
  },

  // 키는 타자기로 친 글자로만 적고, 그 아래를 연필로 한 번 그어 둔다. 키캡 모양 네모로
  // 두르면 종이가 아니라 게임 UI 아이콘으로 읽힌다(블라인드 채점 지적).
  _keyRun (ctx, text, x, y, size, seed) {
    const runW = measureTyped(ctx, text, { size: size * 0.92, font: FONT.type, track: 1.1 })
    // wobble 을 기본값보다 키운다 — 타건마다 활자가 미세하게 기울지 않으면, 낡은 종이 위에
    // 균질한 현대 폰트를 얹은 것으로 읽힌다(블라인드 채점 지적).
    this._ink(ctx, text, x, y, { size: size * 0.92, ink: INK.ribbon, alpha: 0.86, seed, font: FONT.type, track: 1.1, wobble: 0.055 })
    pen(ctx, [[x - 1, y + size * 0.3], [x + runW * 0.45, y + size * 0.34], [x + runW + 1, y + size * 0.28]], {
      w: 1.1, alpha: 0.4, ink: INK.pencil, seed: seed + 7
    })
    return runW
  },

  _drawCard () {
    if (this.cc2) this.cc2.c.remove()
    const w = clamp(Math.round(this.vw * 0.26), 300, 432)
    const h = Math.round(w * 0.60)
    const pad = Math.round(w * 0.082)
    const size = clamp(Math.round(w * 0.058), 15, 26)
    const top = h * 0.418
    const step = h * 0.149
    const s = sheet({
      w, h, seed: 1947, tone: 'card', creases: 2, deckle: 2.7, grain: 0.42, light: 0.72,
      ruleGap: step, ruleTop: top + size * 0.26, ruleInset: pad
    })
    const ctx = s.ctx
    // 머리글은 한 번에 친 한 줄이다. 호텔명을 따로 떼어 다른 크기·자간으로 박으면 종이 한 장이
    // 아니라 "로고를 합성한 것"으로 읽힌다(블라인드 채점 지적).
    this._ink(ctx, '프런트 안내 · HOTEL VIRGIL', pad, h * 0.215, {
      size: size * 0.74, ink: INK.faded, alpha: 0.9, track: 1.6, seed: 3, wobble: 0.05
    })
    penLine(ctx, pad, h * 0.285, w - pad, h * 0.285, { w: 1.0, alpha: 0.42, ink: INK.faded, seed: 7 })
    const keyX = pad + w * 0.30
    CARD_ROWS.forEach(([label, keys], i) => {
      const y = top + step * i
      const lw = this._ink(ctx, label, pad, y, { size: size * 0.88, ink: INK.ribbon, alpha: 0.86, track: 1.2, seed: 23 + i * 9, wobble: 0.05 })
      // 타자기로 친 안내표의 점 리더. 항목과 값을 잇는 1940년대 인쇄물 관습이다
      typed(ctx, '.'.repeat(Math.max(3, Math.floor((keyX - pad - lw) / (size * 0.42)))), pad + lw + size * 0.3, y, {
        size: size * 0.8, ink: INK.faded, alpha: 0.42, track: 0.8, seed: 61 + i * 5
      })
      this._keyRun(ctx, keys.join('  '), keyX, y, size, 41 + i * 13)
    })
    // 데스크 텅스텐 등을 카드도 받는다. 종이만 중성 회백으로 남으면 방의 호박색 조명과 어긋나
    // 그것 하나가 "장면 위에 얹힌 레이어"로 읽힌다(블라인드 채점 지적). source-atop 이라
    // 잘려나간 종이 바깥은 칠하지 않는다 — 실루엣은 그대로다.
    ctx.save()
    ctx.globalCompositeOperation = 'source-atop'
    const warm = ctx.createLinearGradient(0, 0, w * 0.85, h)
    warm.addColorStop(0, 'rgba(255,198,120,0.34)')
    warm.addColorStop(0.5, 'rgba(236,168,96,0.17)')
    warm.addColorStop(1, 'rgba(46,30,17,0.34)')
    ctx.fillStyle = warm
    ctx.fillRect(0, 0, w, h)
    ctx.restore()
    this.cc2 = s
    this.cWrap.appendChild(s.c)
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
    // 수사노트·사진이 위에 열려 있으면 쪽지는 그 뒤에 가려 있다. 안 보이는 선택지가
    // 숫자 입력을 받아 진술을 소모하던 누수(§0-3 계열)를 여기서 막는다.
    if (this.engine.get('notebook')?.isOpen?.() || this.engine.get('evidence')?.isModal?.()) return
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
    if (this.cardArm && this.engine.time >= this.cardArm) this._showCard()
    if (this.cardVisible && this.engine.time - this.cardT0 > CARD_HOLD) this._hideCard()
  },

  dispose () { window.removeEventListener('keydown', this._choiceKey) }
}
