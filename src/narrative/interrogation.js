// [INTERROGATION] 심문 상태기계 — docs/STORY.md 4절 규칙의 구현.
// 대사는 script.js, 진위·정답 증거 관계는 case-graph-loader.js에서 온다. 이 파일은 규칙만 소유한다.
//
// 소비하는 script.js 계약 (script.js 상단 주석과 동일한 형태):
//   INTERROGATIONS[npc] = { npc, act, mode?, intro:[{speaker,text}], statements:[…] }
//   statement = { id, truth, correct, evidence:[id], camera:'push|pull|slide', requires:[flag],
//                 text, onTruth, onDoubt, onLieCorrect, onLieWrong,
//                 lieVariants:{[증거id]:분기}, wrongVariants:{[증거id]:분기}, doubtAccepted? }
//   분기 = { detective?, action?, text, grants?, spawns?, flags?, burn?, act? }
//     detective = 형사 선행 대사, text = NPC 응답, action = 연기 지시(자막에 쓰지 않는다)
//     grants = 노트에 즉시 들어오는 증거, spawns = 월드에 출현하는 증거
//   CHARACTERS[npc].name / DETECTIVE.name 으로 화자 이름을 푼다.
//
// script.js가 없어도 이 모듈은 부팅된다(심문만 비활성).

import { damp, clamp } from '../core/util.js'
import { hydrateInterrogations } from './case-graph-loader.js'

export const CHOICES = ['TRUTH', 'DOUBT', 'LIE']

const PHASE = { IDLE: 'idle', LINES: 'lines', CHOICE: 'choice', EVIDENCE: 'evidence' }

// STORY 4-2 점수표. 이 함수가 사양이다. 데이터도 UI도 판정에 관여하지 않는다.
export function judge (truth, choice, evidenceId, correct = []) {
  if (truth) {
    if (choice === 'TRUTH') return { delta: 1, burn: false, correct: true, beat: 'trust' }
    if (choice === 'DOUBT') return { delta: -1, burn: false, correct: false, beat: 'defend' }
    return { delta: -2, burn: true, correct: false, beat: 'burn' }
  }
  if (choice === 'TRUTH') return { delta: 0, burn: false, correct: false, beat: 'pass' }
  if (choice === 'DOUBT') return { delta: 0.5, burn: false, correct: false, beat: 'shaken' }
  const ok = evidenceId != null && correct.indexOf(evidenceId) >= 0
  return ok
    ? { delta: 2, burn: false, correct: true, beat: 'break' }
    : { delta: -2, burn: true, correct: false, beat: 'burn' }
}

// 한 인물에게서 뽑을 수 있는 최대 점수. 종료 등급의 분모다.
export function maxScore (data) {
  return (data.statements || []).reduce((s, st) => s + (st.truth ? 1 : 2), 0)
}

// 진술의 분기 객체를 고른다. script.js 상단이 규정한 소비 규약 그대로다.
export function branch (s, beat, evId) {
  if (beat === 'trust' || beat === 'pass') return s.onTruth || null
  if (beat === 'defend' || beat === 'shaken') return s.onDoubt || null
  if (beat === 'break') return (evId && s.lieVariants && s.lieVariants[evId]) || s.onLieCorrect || null
  return (evId && s.wrongVariants && s.wrongVariants[evId]) || s.onLieWrong || null
}

// 심리 → 카메라. 카메라 로컬(우/상/전방) 오프셋(m)과 fov 증분(도).
const BEAT_CAM = {
  idle: { x: 0, y: 0, z: 0, fov: 0 },
  trust: { x: 0, y: -0.02, z: -0.34, fov: 9 },     // 믿는다 → 물러나며 넓어진다
  defend: { x: 0.30, y: 0, z: -0.06, fov: 2 },     // 의심(진실) → 옆으로 미끄러진다
  shaken: { x: 0.22, y: 0, z: 0.14, fov: -3 },     // 의심(거짓) → 미끄러지며 붙는다
  press: { x: -0.05, y: 0.01, z: 0.32, fov: -8 },  // 거짓 지목 → 밀고 들어간다
  break: { x: 0, y: -0.01, z: 0.22, fov: -5 },
  burn: { x: 0.10, y: -0.03, z: -0.18, fov: 4 },   // 오답 → 반 발짝 물러난다
  pass: { x: 0.06, y: 0, z: -0.04, fov: 1 }
}

const SHOT_CAM = {
  neutral: { x: 0, y: 0, z: 0, fov: 0 },
  push: { x: 0, y: 0, z: 0.18, fov: -4 },
  pull: { x: 0, y: 0, z: -0.22, fov: 6 },
  slide: { x: 0.24, y: 0, z: 0.02, fov: 0 }
}

const lineDur = (text) => clamp(1.3 + text.length * 0.085, 1.3, 7.5)

// 말줄임으로 시작하는 대사가 많다. 선두 '…'는 문장 종결로 세지 않는다.
function firstSentence (t) {
  const lead = (t.match(/^[…\s]*/) || [''])[0]
  const rest = t.slice(lead.length)
  const m = rest.match(/^[^.…?!]*[.…?!]+/)
  return lead + (m ? m[0] : rest)
}

// Vite는 없는 파일을 glob하면 빈 객체를 준다. 정적 dynamic import는 해석 실패로 모듈을 통째로 죽인다.
async function loadScript () {
  try {
    const g = import.meta.glob('./script.js')
    const k = Object.keys(g)[0]
    if (k) return await g[k]()
  } catch (e) { /* Node(테스트) 환경 — 주입으로 받는다 */ }
  return null
}

export class Interrogation {
  constructor (mod = null) {
    this.name = 'interrogation'
    this.order = 40
    this.script = null
    this.names = {}
    this.engine = null
    this.reason = null
    this.phase = PHASE.IDLE
    this.npc = null
    this.data = null
    this.list = []
    this.idx = 0
    this.cur = null
    this.queue = []
    this.now = null
    this.after = null
    this.until = 0
    this.t = 0
    this.terse = 0            // 0=평소, 1=다음 진술만 짧게, 2=끝까지 짧게(닫힘)
    this.rig = null
    this.beat = 'idle'
    this._off = []
    if (mod) this._useScript(mod)
  }

  _useScript (mod) {
    this.script = mod.INTERROGATIONS ? hydrateInterrogations(mod.INTERROGATIONS) : null
    this.names = { detective: mod.DETECTIVE?.name || '형사' }
    for (const [id, c] of Object.entries(mod.CHARACTERS || {})) this.names[id] = c.name || id
  }

  async init (engine) {
    this.engine = engine
    if (!this.script) {
      const mod = await loadScript()
      if (mod) this._useScript(mod)
    }
    if (!this.script) {
      this.reason = 'script.js 없음 — 심문 비활성'
      if (!engine.qa) console.info('[interrogation]', this.reason)
    }
    const b = engine.bus
    this._off.push(b.on('interrogation:start', (p) => this.start(p?.npc)))
    this._off.push(b.on('interrogation:evidencePicked', (p) => this.present(p?.id)))
    this._off.push(b.on('qa:state', (s) => {
      if (s?.interrogating) { this._silent = true; this.start(s.interrogating); this._skipToChoice() }
    }))
  }

  isActive () { return this.phase !== PHASE.IDLE }
  isModal () { return this.isActive() }        // 심문 중에는 플레이어 이동을 막는다 (player.js가 읽는다)
  _name (id) { return this.names[id] || id }
  _rec () { return this.engine.state.npc(this.npc) }

  // ── 진행 ────────────────────────────────────────────────────────
  start (npc) {
    if (!npc || !this.script) return false
    const data = this.script[npc]
    if (!data) return false
    this.npc = npc
    this.data = data
    this.list = (data.statements || []).map(s => ({ ...s, reasked: false }))
    this.idx = 0
    this.cur = null
    this.queue = []
    this.now = null
    this.terse = 0
    this.rig = this._rig()
    this._beat('idle')
    const rec = this._rec()
    if (!rec.reopen) rec.reopen = []
    for (const l of data.intro || []) this._say(this._name(l.speaker), l.text)
    this._go(PHASE.LINES, data.mode === 'accusation' ? 'accuse' : 'next')
    return true
  }

  _eligible (s, rec) {
    if (rec.burned.indexOf(s.id) >= 0) return false
    if (rec.answered.indexOf(s.id) >= 0 && rec.reopen.indexOf(s.id) < 0) return false
    if (s.act != null && this.engine.state.act < s.act) return false
    for (const f of s.requires || []) if (!this.engine.state.is(f)) return false
    return true
  }

  _next () {
    const rec = this._rec()
    while (this.idx < this.list.length) {
      const s = this.list[this.idx++]
      if (!this._eligible(s, rec)) continue
      this.cur = s
      this.engine.bus.emit('interrogation:statement', { npc: this.npc, line: s.text, truth: !!s.truth })
      this._beat(SHOT_CAM[s.camera] ? s.camera : 'neutral', SHOT_CAM)
      this._say(this._name(this.npc), s.text, true)
      if (this.terse === 1) this.terse = 0          // 방어적 축약은 한 진술만 간다
      this._go(PHASE.LINES, 'choice')
      return
    }
    this._finish()
  }

  // UI가 보는 상태. 진위·정답 증거는 절대 노출하지 않는다 (STORY 4-5).
  getState () {
    return {
      active: this.isActive(),
      npc: this.npc,
      name: this.npc ? this._name(this.npc) : null,
      phase: this.phase,
      speaker: this.now?.speaker || null,
      line: this.now?.text || null,
      action: this.now?.action || null,
      statementId: this.cur?.id || null,
      choices: this.phase === PHASE.CHOICE ? CHOICES : [],
      canLie: this.engine ? this.engine.state.evidence.size > 0 : false,
      held: this.engine ? this.engine.state.evidenceList().map(e => e.id) : [],
      score: this.npc ? this._rec().score : 0
    }
  }

  choose (choice) {
    if (this.phase !== PHASE.CHOICE || CHOICES.indexOf(choice) < 0) return false
    if (choice !== 'LIE') { this._resolve(choice, null); return true }
    const held = this.engine.state.evidenceList().map(e => e.id)
    if (!held.length) return false           // 증거 없이 거짓 지목 불가 (N4)
    this.phase = PHASE.EVIDENCE
    this._beat('press')                      // 거짓 지목 = 전진 + 망원 (N5)
    const ui = this._picker()
    if (ui) {
      const r = ui.pickEvidence({ npc: this.npc, statement: this.cur.id, available: held })
      if (r && typeof r.then === 'function') r.then(id => { if (id) this.present(id); else this.cancel() })
    } else {
      this.engine.bus.emit('interrogation:needEvidence', { npc: this.npc, statement: this.cur.id, available: held })
    }
    return true
  }

  // 노트를 여는 모듈 이름이 프로젝트에서 'notebook'이다. 'ui'는 계약상의 이름이라 둘 다 본다.
  _picker () {
    for (const n of ['ui', 'notebook']) {
      const m = this.engine.get(n)
      if (m && typeof m.pickEvidence === 'function') return m
    }
    return null
  }

  // 미획득 증거는 제시 자체가 불가능하다 (루브릭 N4).
  present (id) {
    if (this.phase !== PHASE.EVIDENCE || !id) return false
    if (!this.engine.state.has(id)) return false
    this._resolve('LIE', id)
    return true
  }

  cancel () {
    if (this.phase !== PHASE.EVIDENCE) return false
    this.phase = PHASE.CHOICE
    this._beat(SHOT_CAM[this.cur?.camera] ? this.cur.camera : 'neutral', SHOT_CAM)
    return true
  }

  _resolve (choice, evId) {
    const s = this.cur
    const rec = this._rec()
    const r = judge(!!s.truth, choice, evId, s.evidence || [])
    rec.score += r.delta
    this.engine.bus.emit('interrogation:verdict', { npc: this.npc, choice, correct: r.correct })
    if (evId) this.engine.bus.emit('evidence:presented', { id: evId, npc: this.npc, correct: r.correct })

    const react = branch(s, r.beat, evId)
    if (rec.answered.indexOf(s.id) < 0) rec.answered.push(s.id)
    const rp = rec.reopen.indexOf(s.id)
    if (rp >= 0) rec.reopen.splice(rp, 1)

    if (r.burn) {
      if (rec.burned.indexOf(s.id) < 0) rec.burned.push(s.id)   // grants/spawns는 영구 소실
      this.engine.bus.emit('sfx', { id: 'interrogation-burn' })
    } else if (react) {
      for (const g of react.grants || []) this._grant(g)
      for (const g of react.spawns || []) this._spawn(g)
      for (const f of react.flags || []) this.engine.state.flag(f)
      if (r.beat === 'break' && this._laterVariant(s, evId)) rec.reopen.push(s.id)
    }

    this._beat(r.beat)
    if (react) {
      if (react.detective) this._say(this._name('detective'), react.detective)
      if (react.text) this._say(this._name(this.npc), react.text, true, react.action)
    }
    // 반응 대사는 원문대로 나가고, 축약은 그 다음부터 적용된다 (STORY 4-2)
    if (r.burn) this.terse = 2                                  // 상대가 닫힌다
    else if (r.beat === 'defend' && this.terse === 0) this.terse = 1  // 다음 진술만 짧아진다
    const reask = r.beat === 'shaken' && !s.reasked && !s.doubtAccepted
    if (reask) s.reasked = true
    this._go(PHASE.LINES, reask ? 'reask' : 'next')
  }

  // 뒷막에서만 열리는 분기가 남아 있으면 그 진술은 재심문에서 다시 열린다 (다이치 S4).
  _laterVariant (s, evId) {
    const v = s.lieVariants
    if (!v) return false
    return Object.keys(v).some(k => k !== evId && v[k].act != null && v[k].act > this.engine.state.act)
  }

  _grant (id) {
    const ev = this.engine.get('evidence')
    if (ev && typeof ev.grant === 'function') { ev.grant(id, this.npc); return }   // evidence.grant(id, source)
    if (this.engine.state.has(id)) return
    this.engine.state.addEvidence({ id, kind: 'testimony', title: id, source: this.npc, act: this.engine.state.act })
  }

  // 월드 배치는 GAMEPLAY 소유다. 없으면 플래그만 남겨 레벨이 나중에 읽게 한다.
  _spawn (id) {
    const ev = this.engine.get('evidence')
    if (ev && typeof ev.spawn === 'function') ev.spawn(id, this.npc)
    this.engine.state.flag(`spawn:${id}`)
  }

  _finish () {
    const rec = this._rec()
    const max = maxScore(this.data)
    const tiers = this.data.tiers || { full: max * 0.75, partial: max * 0.35 }
    const tier = max <= 0 ? 'none' : rec.score >= tiers.full ? 'full' : rec.score >= tiers.partial ? 'partial' : 'fail'
    const out = (this.data.outcomes || {})[tier]
    this.cur = null
    if (out) {
      if (out.detective) this._say(this._name('detective'), out.detective)
      if (out.text) this._say(this._name(this.npc), out.text, true, out.action)
      for (const g of out.grants || []) this._grant(g)
      for (const f of out.flags || []) this.engine.state.flag(f)
    }
    this.engine.bus.emit('interrogation:end', { npc: this.npc, score: rec.score, tier })
    this._beat('idle')
    this._go(PHASE.LINES, 'end')
  }

  // ── 대사 큐 ─────────────────────────────────────────────────────
  _say (speaker, text, npcLine = false, action = null) {
    if (!text) return
    const t = this.terse && npcLine ? firstSentence(text) : text
    this.queue.push({ speaker, text: t, dur: lineDur(t), action })
  }

  _go (phase, after) {
    this.phase = phase
    this.after = after
    this.until = this.t
    this._pump()
  }

  _pump () {
    if (this.phase !== PHASE.LINES || this.t < this.until) return
    const l = this.queue.shift()
    if (l) {
      this.now = l
      this.until = this.t + l.dur
      if (!this._silent) this.engine.bus.emit('subtitle', { speaker: l.speaker, text: l.text, dur: l.dur })
      return
    }
    // 선택을 기다리는 동안에도 마지막 대사는 화면에 남아 있어야 한다 → now를 지우지 않는다
    const after = this.after
    this.after = null
    if (after === 'choice' || after === 'reask') this.phase = PHASE.CHOICE
    else if (after === 'next') this._next()
    else if (after === 'accuse') { this._end(); this.engine.bus.emit('deduction:open', { npc: this.npc }) }
    else this._end()
  }

  _end () {
    this.phase = PHASE.IDLE
    this.now = null
    this.rig = null
  }

  // QA 촬영은 프레임 예산이 없다. 대사 시간을 건너뛰고 선택 대기 화면을 만든다.
  // 건너뛴 대사로 자막 큐를 채우면 촬영 시점에 도입부가 걸려 있으므로 마지막 줄만 내보낸다.
  _skipToChoice () {
    this._silent = true
    let guard = 0
    while (this.phase === PHASE.LINES && guard++ < 200) { this.until = this.t; this._pump() }
    this._silent = false
    const l = this.now
    if (l) this.engine.bus.emit('subtitle', { speaker: l.speaker, text: l.text, dur: l.dur })
  }

  update (dt, elapsed) {
    this.t = Number.isFinite(elapsed) ? elapsed : this.t + dt
    if (this.phase === PHASE.LINES) this._pump()
    if (this.phase !== PHASE.IDLE) this._camera(dt)
  }

  // ── 카메라 (루브릭 N5) ──────────────────────────────────────────
  _beat (name, table = BEAT_CAM) {
    this.beat = name
    const cine = this.engine?.get('cinematics')
    if (cine && typeof cine.interrogationBeat === 'function') {
      cine.interrogationBeat({ npc: this.npc, beat: name, statement: this.cur?.id || null })
      this.rig = null
      return
    }
    if (!this.rig) this.rig = this._rig()
    const o = table[name] || BEAT_CAM.idle
    if (this.rig) this.rig.tgt = { x: o.x, y: o.y, z: o.z, fov: o.fov }
  }

  _rig () {
    const cam = this.engine?.camera
    if (!cam || !cam.matrixWorld) return null
    cam.updateMatrixWorld()
    const e = cam.matrixWorld.elements
    return {
      base: { x: cam.position.x, y: cam.position.y, z: cam.position.z },
      right: { x: e[0], y: e[1], z: e[2] },
      up: { x: e[4], y: e[5], z: e[6] },
      fwd: { x: -e[8], y: -e[9], z: -e[10] },
      baseFov: cam.fov,
      cur: { x: 0, y: 0, z: 0, fov: 0 },
      tgt: { x: 0, y: 0, z: 0, fov: 0 },
      last: { x: cam.position.x, y: cam.position.y, z: cam.position.z, fov: cam.fov }
    }
  }

  _camera (dt) {
    const r = this.rig
    const cam = this.engine?.camera
    if (!r || !cam) return
    const drift = Math.abs(cam.position.x - r.last.x) + Math.abs(cam.position.y - r.last.y) +
      Math.abs(cam.position.z - r.last.z) + Math.abs(cam.fov - r.last.fov)
    if (drift > 1e-4) { this.rig = this._rig(); return }   // 외부(플레이어·QA 하네스)가 잡았다 → 기준 갱신
    r.cur.x = damp(r.cur.x, r.tgt.x, 3.0, dt)
    r.cur.y = damp(r.cur.y, r.tgt.y, 3.0, dt)
    r.cur.z = damp(r.cur.z, r.tgt.z, 2.6, dt)
    r.cur.fov = damp(r.cur.fov, r.tgt.fov, 2.2, dt)
    cam.position.set(
      r.base.x + r.right.x * r.cur.x + r.up.x * r.cur.y + r.fwd.x * r.cur.z,
      r.base.y + r.right.y * r.cur.x + r.up.y * r.cur.y + r.fwd.y * r.cur.z,
      r.base.z + r.right.z * r.cur.x + r.up.z * r.cur.y + r.fwd.z * r.cur.z
    )
    const fov = r.baseFov + r.cur.fov
    if (Math.abs(cam.fov - fov) > 0.005) { cam.fov = fov; cam.updateProjectionMatrix() }
    r.last = { x: cam.position.x, y: cam.position.y, z: cam.position.z, fov: cam.fov }
  }

  dispose () {
    for (const off of this._off) off()
    this._off = []
  }
}

export default new Interrogation()
