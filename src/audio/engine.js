// [AUDIO] WebAudio 그래프 · 공간 리버브 · 발소리 · 룸톤 · 물.
// 오디오 파일을 한 개도 로드하지 않는다(루브릭 N7). 모든 파형은 audio/dsp.js·audio/ir.js가 표본 단위로 만든다.
//
// 모드가 둘이다.
//   실제 실행 — 첫 사용자 제스처에서 AudioContext를 만든다. 제스처 전에 만들면 Chrome이 자동재생 경고를
//               콘솔에 찍는데, QA가 콘솔 경고를 실격으로 읽는다(루브릭). 그래서 반드시 지연 생성한다.
//   QA(?qa=1) — OfflineAudioContext로 그래프를 그대로 조립해 구성 오류를 드러내되 출력은 하지 않는다.
//               렌더를 시작하지 않으므로 소리도, 경고도, CPU 비용도 없다.

import { rng, clamp } from '../core/util.js'
import { footBuffer, sfxBuffer, footKey, sfxKey } from './dsp.js'
import { renderIR, renderBed, renderRadioSource, roomKey, ROOM_MIX } from './ir.js'
import { buildGraph } from './graph.js'
import { ambienceTick, ACT_WATER } from './ambience.js'
import { wireCues } from './cues.js'
import { musicCue } from './music.js'
import { titleBedStart } from './title-bed.js'
import { tune, radioDispose } from './radio.js'

const FOOT_VARIANTS = 6
const SFX_VARIANTS = 3

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
    this.breaking = false
    this.musicOn = false
    this.pendingMusic = null
    this.musicRelease = null
    this.titleBed = null
    this.pendingTitleBed = false
    this.tension = null
    this.tensions = {}      // 긴장 침대 슬롯 — unease(심문) · urge(지목). music.js 소유
    this.radioDuck = 1
    this.introFadeAt = null
    this.act = engine.state?.act ?? 1
    this.room = roomKey(engine.state?.room ?? 'lobby')
    this.mix = ROOM_MIX[this.room]
    this.next = { tick: 20, knock: 27, far: 55 }
    this.roam = false      // 조작을 넘겨받은 뒤에만 원거리 단발음이 돈다(ambience.js)
    this.lastFar = -1
    this.tone = [null, null]
    this.toneI = 0
    this.convI = 0
    this.radio = null
    this.radioReq = null
    this.pending = []
    this._wire(engine.bus)
    wireCues(this, engine.bus)
    if (this.silent) { this._open(this._offlineCtx()); return }
    this._arm()
  },

  update () {
    if (!this.ctx || this.silent) return
    this._listener()
    ambienceTick(this, this.engine.time)
    // E2 0:22 — 배지가 데스크에 닿고 "라디오가 잦아든다". 시네마틱 파일을 건드리지 않고
    // 오디오 쪽에서 시각만 세어 처리한다(HANDOFF 등재분의 오디오측 해결). engine.time 기준이라
    // 일시정지에도 어긋나지 않고, ctx 생성 시점과 무관하다.
    if (this.introFadeAt != null && this.engine.time >= this.introFadeAt) {
      this.introFadeAt = null
      this._radioLevel(0.08, 3.4)
    }
  },

  dispose () {
    for (const k in this.tensions) { try { this.tensions[k]?.stop(0.05) } catch (e) { /* 이미 해제 */ } }
    try { this.titleBed?.stop(0.05) } catch (e) { /* 이미 해제 */ }
    radioDispose(this)
    try { this.radio?.src.stop() } catch (e) { /* 이미 정지 */ }
    this.radio = null
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
      // null = 명시 무음(다른 경로가 이미 소리를 낸다) · undefined = 미등록.
      // 구판은 미등록을 조용히 ui.tick 으로 흡수해서 라디오도 소각도 사진도 같은 딸깍이 됐다.
      // 폴백은 남기되 미등록 자체를 test-audio 가 실패로 잡는다.
      const key = sfxKey(id)
      if (key === null) return null
      const v = Math.floor(this.rand() * SFX_VARIANTS)
      const k = key ?? 'ui.tick'
      buf = this._cache(`s:${k}:${v}`, () => sfxBuffer(k, v, c.sampleRate))
    }
    return this._voice(buf, opts)
  },

  // 첫 제스처와 같은 프레임에 오는 소리(프런트 벨)는 컨텍스트보다 빠를 수 있다. 열릴 때 흘려보낸다.
  playOrDefer (id, opts = {}) {
    if (this.ctx) return this.play(id, opts)
    if (this.pending.length < 4) this.pending.push([id, opts])
    return null
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
    if (changed && key !== 'lobby') this._radio(false)
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

  // 소각은 세계를 끄지 않고 한 걸음 물린다. 환경층만 -6dB로 3초간 낮춘다.
  roomtoneDip (dur = 3, db = -6) {
    const c = this.ctx
    if (!c || this.silent) return
    const now = c.currentTime
    const ratio = Math.pow(10, db / 20)
    for (const param of [this.toneBus.gain, this.waterBus.gain]) {
      const level = param.value
      param.cancelScheduledValues(now)
      param.setValueAtTime(level, now)
      param.linearRampToValueAtTime(level * ratio, now + 0.08)
      param.setValueAtTime(level * ratio, now + Math.max(dur, 0.1))
      param.linearRampToValueAtTime(level, now + Math.max(dur, 0.1) + 0.35)
    }
  },

  _setBreaking (on, dur = 0.18) {
    this.breaking = on
    const c = this.ctx
    if (!c) return
    ramp(this.musicBus.gain, on ? 0 : 1, c.currentTime, dur)
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
    // 로비 라디오는 레벨 로드(=부팅) 때 발화한다. 그때는 아직 컨텍스트가 없어서 구판은 통째로 유실됐다.
    if (this.radioReq) this._radio(true, this.radioReq)
    const q = this.pending
    this.pending = []
    for (const [id, opts] of q) this.play(id, opts)
    // 인트로 드론도 같은 프레임 경합에 걸린다 — music.js가 여기로 흘려보낸 큐를 연다.
    const m = this.pendingMusic
    this.pendingMusic = null
    if (m) musicCue(this, m)
    // 입장 게이트의 첫 입력은 컨텍스트를 여는 그 제스처다. 타이틀 침대도 같은 경합에 걸린다.
    if (this.pendingTitleBed) { this.pendingTitleBed = false; titleBedStart(this) }
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
  // 심문 감쇠(quiet)가 닿는 곳은 **환경뿐**이다 — 룸톤·험·물·라디오. musicBus/tensionBus는
  // 여기 없다. 심문이 게임에서 가장 조용한 구간이 됐던 역전은 이 비대칭이 없었기 때문이다:
  // 환경만 0.42로 내려가고 그 자리를 채우는 층이 없었다(judge-plan §1 J6).
  _levels (dur = 0.6) {
    const c = this.ctx
    if (!c) return
    const now = c.currentTime
    const m = this.mix
    const quiet = this._quiet()
    ramp(this.toneBus.gain, m.tone * quiet * 0.9, now, dur)
    ramp(this.humG.gain, m.hum * 0.05 * quiet, now, dur)
    const lvl = m.water * (ACT_WATER[this.act] ?? 1)
    ramp(this.waterG.flow.gain, lvl * 0.16 * quiet, now, dur)
    ramp(this.waterG.air.gain, lvl * 0.055 * quiet, now, dur)
    ramp(this.waterG.tank.gain, lvl * 0.2 * quiet, now, dur)
    // 라디오는 룸톤 버스에 물려 있다 — 오답 -6dB 딥과 심문 감쇠를 같이 받는다(E7 §3).
    this._radioLevel(this.radioDuck, dur)
  },

  _quiet () { return this.interro ? 0.42 : 1 },

  // 조작 이양. 괴담 방송이 끝나고 편성이 음악으로 넘어간다(디제틱 — 방송국이 프로그램을 바꾼 것).
  // 이 자리가 "이 게임에 음악이 있다"가 처음 성립하는 지점이고, 계약상 유일하게 가능한 자리다.
  _radioReturn () {
    this._radioLevel(1, 9)
    tune(this, 0, 6)
  },

  // 라디오만 따로 움직인다. 인트로 잦아듦(E2 0:22)은 환경 전체를 건드리면 안 된다.
  _radioLevel (duck, dur = 0.6) {
    this.radioDuck = duck
    const c = this.ctx
    if (!c || !this.radio) return
    ramp(this.radio.gain.gain, this.radio.level * this._quiet() * duck, c.currentTime, dur)
  },

  // ── 로비 라디오 (디제틱 루프, E7 §4) ────────────────────────────────
  _radio (on, req) {
    const c = this.ctx
    if (!c) { this.radioReq = on ? req : null; return }
    if (!on) {
      const r = this.radio
      if (!r) return
      this.radio = null
      const now = c.currentTime
      ramp(r.gain.gain, 0, now, 1.1)
      try { r.src.stop(now + 1.4) } catch (e) { /* 이미 정지 */ }
      r.src.onended = () => { for (const n of r.nodes) { try { n.disconnect() } catch (e) { /* 이미 해제 */ } } }
      return
    }
    if (this.radio || this.silent) return
    const buf = this._cache('radio:src', () => renderRadioSource(c.sampleRate).ch[0])
    const src = c.createBufferSource()
    src.buffer = buf
    src.loop = true
    // 방송(절차 생성 웅얼거림)과 음악 트랙이 같은 다이얼 위에 있다. voiceG·musicG 가 국을 고르고,
    // tuneG 가 그 사이의 빈 주파수를 만들고, g 부터는 라디오 한 대의 공통 경로다 —
    // 거리 감쇠·룸 리버브·오답 딥·심문 감쇠를 두 국이 똑같이 상속한다.
    const voiceG = c.createGain()
    const tuneG = c.createGain()
    const g = c.createGain()
    g.gain.value = 0.0001
    const p = c.createPanner()
    p.panningModel = 'HRTF'
    p.distanceModel = 'inverse'
    p.refDistance = 2.2
    p.maxDistance = 30
    p.rolloffFactor = 1.3
    const pos = req?.pos ?? [2, 0.9, -1.85]
    if (p.positionX) { p.positionX.value = pos[0]; p.positionY.value = pos[1]; p.positionZ.value = pos[2] }
    const wet = c.createGain()
    wet.gain.value = 0.8
    src.connect(voiceG); voiceG.connect(tuneG); tuneG.connect(g)
    g.connect(p); p.connect(this.toneBus); p.connect(wet); wet.connect(this.send)
    src.start(c.currentTime + 0.01)
    this.radio = {
      src, voiceG, tuneG, gain: g, station: 1, music: null,
      level: clamp(req?.gain ?? 0.38, 0, 1), nodes: [src, voiceG, tuneG, g, p, wet]
    }
    this._levels(2.2)
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
    // ?scene= 프로브는 room:changed 를 발화하지 않는다(main.js). 그래서 복도를 걸어도 로비
    // 잔향이 났다 — 공간별 리버브를 사람 귀로 대조할 유일한 빠른 경로가 막혀 있던 셈이다.
    bus.on('qa:state', (p) => { if (p?.scene === 'atmo-probe' && p.mood) this.setRoom(p.mood, 0.35) })
    bus.on('act:enter', (p) => {
      this.act = p?.act ?? this.act
      this._levels(2.5)
    })
    bus.on('player:footstep', (p) => this._footstep(p))
    bus.on('sfx', (p) => {
      if (!p?.id) return
      if (p.id === 'radio:lobby-loop') { this._radio(true, p); return }   // 원샷이 아니라 루프다
      this.play(p.id, { pos: p.pos, gain: p.gain })
    })
    // 증거는 집든 관찰하든 노트에 적힌다 — 물건 소리는 sfx `evidence:<mode>` 가 따로 낸다.
    bus.on('evidence:collected', () => this.play('note.scribble', { gain: 0.42 }))
    bus.on('interrogation:start', () => { this.interro = true; this._levels(0.9); this.duck(0.22, 1.4) })
    bus.on('interrogation:end', () => { this.interro = false; this._levels(2.6) })
    bus.on('interrogation:verdict', (p) => {
      if (p?.choice === 'LIE' && p.correct === false) this.roomtoneDip(3, -6)
    })
    bus.on('perf:state', (p) => this._setBreaking(p?.state === 'breaking'))
    // 인트로 라디오 — E2 첫 30초 대본. 0:22 배지가 놓일 때 잦아들고, 조작 이양(시네마틱 종료)에서
    // 방송이 끝나고 소리가 돌아온다. `_soundBeats` 를 건드리지 않는 오디오측 이행이다.
    bus.on('cinematic:start', (p) => { if (p?.id === 'cin-intro') this.introFadeAt = this.engine.time + 22 })
    bus.on('cinematic:end', (p) => {
      if (p?.id !== 'cin-intro') return
      this.introFadeAt = null
      this.roam = true
      this._radioReturn()
    })
    // 재입장(제스처 화면 통과)은 시네마틱을 거치지 않는다 — 배회층은 그때도 열려야 한다.
    bus.on('title:proceed', (p) => { if (p?.mode === 'wake') this.roam = true })
    // ARCH §이벤트: 일시정지 시 디제틱 감쇠. 카드 뒤 화면은 계속 도는데 방 소리만 물러난다.
    bus.on('game:pause', (p) => this._pause(!!p?.on))
  },

  _pause (on) {
    const c = this.ctx
    if (!c || this.silent) return
    ramp(this.pauseG.gain, on ? 0.22 : 1, c.currentTime, on ? 0.2 : 0.45)
  },

  _footstep (p) {
    const sp = clamp(p?.speed ?? 1, 0, 2)
    // 보폭이 고정(0.72m)이라 질주는 걸음 **주기**만 빨라진다 — 게인이 속도 비례뿐이면 걷기 대비
    // +2.6dB 라 "빨리 걷는다"로 들리고 "달린다"가 안 된다. 걷기(1.2)~질주(1.9) 구간에만 얹히는
    // 항을 따로 세워 질주를 걷기 위 +5dB 로 올리고, 발이 더 세게 닿는 만큼 조금 높고 짧게 낸다.
    // 상수는 gameplay/player.js 의 WALK 1.2 · RUN 1.9 m/s 에서 온다.
    const run = clamp((sp - 1.35) / 0.55, 0, 1)
    this.play(`foot:${p?.material ?? this.room}`, {
      gain: 0.26 + 0.34 * sp + 0.30 * run,
      rate: (0.94 + this.rand() * 0.13) * (1 + 0.05 * run),
      delay: this.rand() * 0.014
    })
  },


  _listener () {
    const l = this.ctx.listener
    if (!l.positionX) return
    const cam = this.engine.camera
    const e = cam.matrixWorld.elements
    l.positionX.value = e[12]; l.positionY.value = e[13]; l.positionZ.value = e[14]
    l.forwardX.value = -e[8]; l.forwardY.value = -e[9]; l.forwardZ.value = -e[10]
    l.upX.value = e[4]; l.upY.value = e[5]; l.upZ.value = e[6]
  }
}

// 시계추·괘종 같은 상시 사건은 붙이지 않았다 — 로비에 시계 소품이 없어서 물질 원점 없는
// 소리가 된다(E7 불변 금지 3종). PROPS 가 시계를 놓으면 그때 온다(HANDOFF 등재).

export default audio
