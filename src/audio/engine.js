// [AUDIO] WebAudio 그래프 · 공간 리버브 · 발소리 · 룸톤 · 물.
// 오디오 파일을 한 개도 로드하지 않는다(루브릭 N7). 모든 파형은 audio/dsp.js·audio/ir.js가 표본 단위로 만든다.
//
// 모드가 둘이다.
//   실제 실행 — 첫 사용자 제스처에서 AudioContext를 만든다. 제스처 전에 만들면 Chrome이 자동재생 경고를
//               콘솔에 찍는데, QA가 콘솔 경고를 실격으로 읽는다(루브릭). 그래서 반드시 지연 생성한다.
//   QA(?qa=1) — OfflineAudioContext로 그래프를 그대로 조립해 구성 오류를 드러내되 출력은 하지 않는다.
//               렌더를 시작하지 않으므로 소리도, 경고도, CPU 비용도 없다.

import { rng, clamp } from '../core/util.js'
import { footBuffer, sfxBuffer, footKey, SFX } from './dsp.js'
import { renderIR, renderBed, roomKey, ROOM_MIX } from './ir.js'
import { buildGraph } from './graph.js'

const FOOT_VARIANTS = 6
const SFX_VARIANTS = 3
const ACT_WATER = { 1: 0.34, 2: 0.66, 3: 1.0 }

function ramp (param, to, now, dur) {
  param.cancelScheduledValues(now)
  param.setValueAtTime(param.value, now)
  param.linearRampToValueAtTime(to, now + Math.max(dur, 0.01))
}

const audio = {
  name: 'audio',
  order: 60,

  async init (engine) {
    this.engine = engine
    this.silent = !!engine.qa
    this.rand = rng(48271)
    this.bufs = new Map()
    this.irs = new Map()
    this.beds = new Map()
    this.ctx = null
    this.interro = false
    this.musicOn = false
    this.act = engine.state?.act ?? 1
    this.room = roomKey(engine.state?.room ?? 'lobby')
    this.mix = ROOM_MIX[this.room]
    this.next = { drip: 5, tick: 11, knock: 27 }
    this.tone = [null, null]
    this.toneI = 0
    this.convI = 0
    this._wire(engine.bus)
    if (this.silent) { this._open(this._offlineCtx()); return }
    this._arm()
  },

  update () {
    if (!this.ctx || this.silent) return
    this._listener()
    this._sched(this.engine.time)
  },

  dispose () {
    try { this.ctx?.close?.() } catch (e) { /* 이미 닫힌 컨텍스트 */ }
    this.ctx = null
  },

  // ── 공개 API ────────────────────────────────────────────────────────
  play (id, opts = {}) {
    const c = this.ctx
    if (!c || this.silent || !id) return null
    let buf
    if (String(id).startsWith('foot:')) {
      const m = footKey(String(id).slice(5))
      const v = Math.floor(this.rand() * FOOT_VARIANTS)
      buf = this._cache(`f:${m}:${v}`, () => footBuffer(m, v, c.sampleRate))
    } else {
      const key = SFX[id] ? id : 'ui.tick'
      const v = Math.floor(this.rand() * SFX_VARIANTS)
      buf = this._cache(`s:${key}:${v}`, () => sfxBuffer(key, v, c.sampleRate))
    }
    return this._voice(buf, opts)
  },

  setRoom (name, dur = 0.9) {
    const key = roomKey(name)
    const changed = key !== this.room
    this.room = key
    this.mix = ROOM_MIX[key]
    const c = this.ctx
    if (!c) return
    const now = c.currentTime
    const i = this.convI ^ 1
    this.conv[i].buffer = this._ir(key)
    ramp(this.wetG[i].gain, 1, now, dur)
    ramp(this.wetG[this.convI].gain, 0, now, dur)
    this.convI = i
    if (this.silent) return
    const bed = this._bed(key)
    const j = this.toneI ^ 1
    const src = c.createBufferSource()
    src.buffer = bed
    src.loop = true
    src.connect(this.toneG[j])
    src.start(now + 0.01)
    const old = this.tone[j]
    if (old) { try { old.stop(now + 0.02) } catch (e) { /* 이미 정지 */ } }
    this.tone[j] = src
    ramp(this.toneG[j].gain, 1, now, changed ? dur : 0.05)
    ramp(this.toneG[this.toneI].gain, 0, now, changed ? dur : 0.05)
    const fading = this.tone[this.toneI]
    if (fading && changed) { try { fading.stop(now + dur + 0.4) } catch (e) { /* 이미 정지 */ } }
    this.toneI = j
    this._levels(changed ? dur : 0.05)
  },

  duck (amount = 0.4, dur = 0.6) {
    const c = this.ctx
    if (!c || this.silent) return
    const now = c.currentTime
    const g = this.duckG.gain
    const to = clamp(1 - amount, 0.02, 1)
    g.cancelScheduledValues(now)
    g.setValueAtTime(g.value, now)
    g.linearRampToValueAtTime(to, now + 0.09)
    g.setValueAtTime(to, now + Math.max(dur, 0.12))
    g.linearRampToValueAtTime(1, now + Math.max(dur, 0.12) + 0.35)
  },

  // 완전한 침묵. 이 게임에서 가장 강한 도구다 — 오답 판정 뒤 1.2초.
  silence (dur = 1.2) {
    const c = this.ctx
    if (!c || this.silent) return
    const now = c.currentTime
    const g = this.master.gain
    g.cancelScheduledValues(now)
    g.setValueAtTime(g.value, now)
    g.linearRampToValueAtTime(0.0001, now + 0.035)
    g.setValueAtTime(0.0001, now + Math.max(dur, 0.1))
    g.linearRampToValueAtTime(1, now + Math.max(dur, 0.1) + 0.55)
  },

  // ── 컨텍스트 수명 ───────────────────────────────────────────────────
  // 인자 3개 레거시 생성자는 Chrome이 deprecation 경고를 찍는다. QA는 경고 0이 조건이다.
  _offlineCtx () {
    try { return new OfflineAudioContext({ numberOfChannels: 2, length: 128, sampleRate: 48000 }) } catch (e) { return null }
  },

  _arm () {
    const start = () => {
      off()
      let c = null
      try { c = new (window.AudioContext || window.webkitAudioContext)() } catch (e) { c = null }
      if (!c) return
      this._open(c)
      try { c.resume() } catch (e) { /* 정책상 거부되면 다음 제스처에서 재개된다 */ }
    }
    const evs = ['pointerdown', 'keydown', 'touchstart']
    const off = () => { for (const e of evs) window.removeEventListener(e, start) }
    for (const e of evs) window.addEventListener(e, start, { once: false })
  },

  _open (ctx) {
    if (!ctx || this.ctx) return
    this.ctx = ctx
    try { buildGraph(this) } catch (e) { this.ctx = null; return }
    this.setRoom(this.room, 0.02)
    if (!this.silent) this._prewarm()
  },

  // 방을 처음 밟을 때 IR·룸톤을 구우면 150ms짜리 프레임 히치가 난다. 유휴 시간에 미리 굽는다.
  _prewarm () {
    const rooms = Object.keys(ROOM_MIX).filter(r => r !== this.room)
    const idle = window.requestIdleCallback?.bind(window) ?? ((f) => setTimeout(f, 80))
    const step = () => {
      const r = rooms.shift()
      if (!r || !this.ctx) return
      try { this._ir(r); this._bed(r) } catch (e) { /* 한 방이 실패해도 나머지는 굽는다 */ }
      idle(step)
    }
    idle(step)
  },

  // ── 레벨 ────────────────────────────────────────────────────────────
  _levels (dur = 0.6) {
    const c = this.ctx
    if (!c) return
    const now = c.currentTime
    const m = this.mix
    const quiet = this.interro ? 0.42 : 1
    ramp(this.toneBus.gain, m.tone * quiet * 0.9, now, dur)
    ramp(this.humG.gain, m.hum * 0.05 * quiet, now, dur)
    const lvl = m.water * (ACT_WATER[this.act] ?? 1)
    ramp(this.waterG.flow.gain, lvl * 0.16 * quiet, now, dur)
    ramp(this.waterG.air.gain, lvl * 0.055 * quiet, now, dur)
    ramp(this.waterG.tank.gain, lvl * 0.2 * quiet, now, dur)
  },

  // ── 보이스 ──────────────────────────────────────────────────────────
  _voice (buf, opts) {
    const c = this.ctx
    const now = c.currentTime
    const src = c.createBufferSource()
    src.buffer = buf
    src.playbackRate.value = clamp(opts.rate ?? 1, 0.25, 4)
    const g = c.createGain()
    g.gain.value = clamp(opts.gain ?? 1, 0, 4)
    src.connect(g)
    let tail = g
    if (opts.pos) {
      const p = c.createPanner()
      p.panningModel = 'HRTF'
      p.distanceModel = 'inverse'
      p.refDistance = 1.6
      p.maxDistance = 45
      p.rolloffFactor = 1.1
      if (p.positionX) {
        p.positionX.value = opts.pos[0] ?? 0
        p.positionY.value = opts.pos[1] ?? 0
        p.positionZ.value = opts.pos[2] ?? 0
      }
      g.connect(p)
      tail = p
    }
    tail.connect(this.dry)
    const s = c.createGain()
    s.gain.value = clamp((opts.wet ?? 1) * this.mix.wet, 0, 2)
    tail.connect(s)
    s.connect(this.send)
    src.start(now + clamp(opts.delay ?? 0, 0, 2))
    src.onended = () => {
      try {
        src.disconnect(); g.disconnect(); s.disconnect()
        if (tail !== g) tail.disconnect()
      } catch (e) { /* 이미 해제 */ }
    }
    return src
  },

  _cache (key, make) {
    let b = this.bufs.get(key)
    if (!b) {
      const data = make()
      b = this.ctx.createBuffer(1, data.length, this.ctx.sampleRate)
      b.copyToChannel(data, 0)
      this.bufs.set(key, b)
    }
    return b
  },

  _ir (key) {
    let b = this.irs.get(key)
    if (!b) {
      const ch = renderIR(key, this.ctx.sampleRate)
      b = this.ctx.createBuffer(2, ch[0].length, this.ctx.sampleRate)
      b.copyToChannel(ch[0], 0)
      b.copyToChannel(ch[1], 1)
      this.irs.set(key, b)
    }
    return b
  },

  _bed (key) {
    let b = this.beds.get(key)
    if (!b) {
      const bed = renderBed(key, this.ctx.sampleRate)
      b = this.ctx.createBuffer(2, bed.ch[0].length, this.ctx.sampleRate)
      b.copyToChannel(bed.ch[0], 0)
      b.copyToChannel(bed.ch[1], 1)
      this.beds.set(key, b)
    }
    return b
  },

  // ── 이벤트 ──────────────────────────────────────────────────────────
  _wire (bus) {
    if (!bus) return
    bus.on('room:changed', (p) => this.setRoom(p?.room))
    bus.on('act:enter', (p) => {
      this.act = p?.act ?? this.act
      this._levels(2.5)
      if (this.act === 3) this._music('act3')
    })
    bus.on('player:footstep', (p) => this._footstep(p))
    bus.on('sfx', (p) => { if (p?.id) this.play(p.id, { pos: p.pos, gain: p.gain }) })
    bus.on('evidence:collected', () => this.play('paper.pickup', { gain: 0.55 }))
    bus.on('interrogation:start', () => { this.interro = true; this._levels(0.9); this.duck(0.22, 1.4) })
    bus.on('interrogation:end', () => { this.interro = false; this._levels(2.6) })
    bus.on('interrogation:verdict', (p) => { if (p && p.correct === false) this.silence(1.2) })
    bus.on('cinematic:start', (p) => { if (String(p?.id ?? '').includes('ending')) this._music('ending') })
  },

  _footstep (p) {
    const sp = clamp(p?.speed ?? 1, 0, 2)
    this.play(`foot:${p?.material ?? this.room}`, {
      gain: 0.26 + 0.34 * sp,
      rate: 0.94 + this.rand() * 0.13,
      delay: this.rand() * 0.014
    })
  },

  // 정적 소음층만으로는 공간이 죽는다. 방마다 다른 간격으로 이산 사건을 흩뿌린다.
  _sched (t) {
    const m = this.mix
    if (t > this.next.drip) {
      this.next.drip = t + 1.8 + this.rand() * 7 * (1.2 - m.drip)
      if (m.drip > 0.03) this.play('water.drip', { gain: m.drip * (0.35 + this.rand() * 0.5), rate: 0.8 + this.rand() * 0.45 })
    }
    if (t > this.next.tick) {
      this.next.tick = t + 6 + this.rand() * 16
      if (m.hum > 0.08) this.play('radiator.tick', { gain: 0.1 + this.rand() * 0.14, rate: 0.85 + this.rand() * 0.4 })
    }
    if (t > this.next.knock) {
      this.next.knock = t + 18 + this.rand() * 40
      const lvl = m.water * (ACT_WATER[this.act] ?? 1)
      if (lvl > 0.25) this.play('pipe.knock', { gain: 0.08 + lvl * 0.16, rate: 0.8 + this.rand() * 0.35 })
    }
  },

  _listener () {
    const l = this.ctx.listener
    if (!l.positionX) return
    const cam = this.engine.camera
    const e = cam.matrixWorld.elements
    l.positionX.value = e[12]; l.positionY.value = e[13]; l.positionZ.value = e[14]
    l.forwardX.value = -e[8]; l.forwardY.value = -e[9]; l.forwardZ.value = -e[10]
    l.upX.value = e[4]; l.upY.value = e[5]; l.upZ.value = e[6]
  },

  // 음악은 3막 진입과 엔딩에만. 콘트라베이스 한 음과 현의 하모닉스.
  _music (kind) {
    const c = this.ctx
    if (!c || this.silent || this.musicOn) return
    this.musicOn = true
    const now = c.currentTime
    const root = kind === 'ending' ? 36.71 : 41.2
    const nodes = []
    const bass = c.createOscillator()
    bass.type = 'sawtooth'
    bass.frequency.value = root
    const lp = c.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 210
    lp.Q.value = 0.8
    const body = c.createBiquadFilter()
    body.type = 'peaking'
    body.frequency.value = root * 3
    body.Q.value = 3
    body.gain.value = 7
    const bg = c.createGain()
    bg.gain.value = 0.0001
    bass.connect(lp); lp.connect(body); body.connect(bg); bg.connect(this.musicBus)
    bg.gain.setValueAtTime(0.0001, now)
    bg.gain.exponentialRampToValueAtTime(0.17, now + 3.2)
    bg.gain.exponentialRampToValueAtTime(0.0001, now + 13)
    bass.start(now)
    bass.stop(now + 13.4)
    nodes.push(bass, lp, body, bg)
    ;[[root * 8, 0.03, 2.6], [root * 12, 0.018, 5.2]].forEach(([f, g, at]) => {
      const o = c.createOscillator()
      o.type = 'sine'
      o.frequency.value = f
      const og = c.createGain()
      og.gain.value = 0.0001
      o.connect(og)
      og.connect(this.musicBus)
      og.gain.setValueAtTime(0.0001, now)
      og.gain.exponentialRampToValueAtTime(g, now + at + 2)
      og.gain.exponentialRampToValueAtTime(0.0001, now + 12.6)
      o.start(now + at)
      o.stop(now + 13.2)
      nodes.push(o, og)
    })
    bass.onended = () => {
      for (const n of nodes) { try { n.disconnect() } catch (e) { /* 이미 해제 */ } }
      this.musicOn = false
    }
  }
}

export default audio
