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

import { clamp } from '../core/util.js'
import { hydrateInterrogations, statementRelation } from './case-graph-loader.js'

export const CHOICES = ['TRUTH', 'DOUBT', 'LIE']

const PHASE = { IDLE: 'idle', LINES: 'lines', CHOICE: 'choice', EVIDENCE: 'evidence' }

// 심문 이탈 사거리. 개시(REACH 3.0)보다 넉넉하게 잡아 경계에서 붙었다 떨어졌다 하지 않는다.
// 시선 이탈은 이탈로 세지 않는다 — 이 판정이 지키는 계약은 "듣지도 보지도 못한 진술에
// 판정이 기록되지 않는다"이고, 고개를 돌려도 자막은 화면 좌표에 그대로 남고 진술 음성도
// 사거리 안이다. 반면 걸어 나가면 둘 다 끊긴다. 시선까지 이탈로 세면 열쇠 걸이를 흘끗 본
// 순간 세션이 끊겨 진술이 되묻기로 돌아간다 — 계약은 못 지키면서 조작만 적대적이 된다.
const LEAVE = 4.2

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

// 배터리와 디버그가 쓰는 이론상 최대 점수. 종료 등급은 상태식으로만 정한다.
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
    this.lore = null
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
    this._off = []
    if (mod) this._useScript(mod)
  }

  _useScript (mod) {
    this.lore = mod.LORE || null
    this.script = mod.INTERROGATIONS ? hydrateInterrogations(mod.INTERROGATIONS) : null
    for (const data of Object.values(this.script || {})) {
      for (const statement of data.statements || []) {
        statement.burnable = statementRelation(statement.graphId).burnable !== false
      }
    }
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
    this._off.push(b.on('interrogation:start', (p) => { if (!this.start(p?.npc) && p?.npc && this.engine.state.npc(p.npc).ended) b.emit('subtitle', { speaker: '', text: '더 물을 것은 없다. 격자문이 열려 있다.', dur: 2.6 }) })) // 완주 후 무반응 E 피드백(실플레이 2026-08-10)
    this._off.push(b.on('interrogation:choose', (p) => this._chooseEvent(p)))
    this._off.push(b.on('player:interact', (p) => this._onInteract(p?.targetId)))
    // 지목 모드 해제(on:false)는 계약상 "제시 취소"인데(ARCH §5) 수신부가 없어 cancel()이
    // 호출되지 않았다. EVIDENCE 단계로 들어간 세션은 선택지가 화면에 남은 채 숫자 입력만
    // 죽는 막다른 상태가 된다. 증거를 확정한 경로에서는 choose가 먼저 판정을 끝내
    // phase가 EVIDENCE를 떠나므로 뒤따르는 이 취소는 무동작이다.
    this._off.push(b.on('interrogation:aiming', (p) => { if (p && p.on === false) this.cancel() }))
    // 괴담 접촉 판정은 gameplay 소유(evidence.js), 원문 발화는 대사 소유인 여기서 한다.
    this._off.push(b.on('lore:heard', (p) => this._lore(p?.id)))
    this.actPhase = null
    this._phase('early')
  }

  isActive () { return this.phase !== PHASE.IDLE }
  isModal () { return false }                  // 이동 이탈 뒤 같은 막에서 재접근할 수 있어야 한다
  _name (id) { return this.names[id] || id }
  _rec () {
    const rec = this.engine.state.npc(this.npc)
    rec.reopen ||= []
    rec.presented ||= []
    rec.refuted ||= []
    rec.scores ||= {}
    return rec
  }

  // ── 진행 ────────────────────────────────────────────────────────
  start (npc) {
    if (!npc || !this.script) return false
    const data = this.script[npc]
    if (!data) return false
    this.npc = npc
    this.data = data
    // 이탈 판정 기준점 — NPC 인터랙트 메시의 월드 좌표. 씬이 없는 환경(배터리)에서는
    // anchorX가 null로 남아 이탈 판정 자체가 꺼진다.
    this.anchorX = null
    this.anchorZ = null
    const anchor = this.engine.scene?.getObjectByName?.(`npc/${npc}`)
    const v = anchor?.position?.clone?.()
    if (v && anchor.getWorldPosition) {
      anchor.getWorldPosition(v)
      this.anchorX = v.x
      this.anchorZ = v.z
    }
    this.list = (data.statements || []).map(s => ({ ...s, reasked: false }))
    this.idx = 0
    this.cur = null
    this.queue = []
    this.now = null
    this.reasking = false
    this.terse = npc === 'deitch' && this.engine.state.is('deitch-clammed') ? 2 : 0
    const rec = this._rec()
    const reopenReady = data.statements.some(s => rec.reopen.includes(s.id) && this._variantAvailable(s))
    if (rec.ended && !reopenReady) return false
    if (!rec.started) {
      rec.started = true
      for (const l of data.intro || []) this._say(this._name(l.speaker), l.text)
    }
    if (npc === 'doyle') this._phase('late')
    else if (this.actPhase?.endsWith(':early')) this._phase('main')
    this._go(PHASE.LINES, data.mode === 'accusation' ? 'accuse' : 'next')
    return true
  }

  _eligible (s, rec) {
    if (rec.burned.indexOf(s.id) >= 0) return false
    const reopened = rec.reopen.indexOf(s.id) >= 0
    if (reopened && !this._variantAvailable(s)) return false
    if ((rec.answered.indexOf(s.id) >= 0 || rec.presented.indexOf(s.id) >= 0) && !reopened) return false
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
      if (rec.presented.indexOf(s.id) < 0) rec.presented.push(s.id)
      // camera = script.js 의 진술별 컷 지시. CINEMATICS 가 구도를 다시 잡는 근거다.
      this.engine.bus.emit('interrogation:statement', { npc: this.npc, line: s.text, truth: !!s.truth, camera: s.camera || null })
      const perf = s.anxiousTell ? 'anxious' : s.truth ? 'idle' : 'lying'
      this.engine.bus.emit('perf:state', { npc: this.npc, state: perf })
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
      statementId: this.cur?.id || null,
      choices: this.phase === PHASE.CHOICE ? (this.reasking ? ['TRUTH', 'LIE'] : [...CHOICES]) : [],
      reasking: this.reasking
    }
  }

  choose (choice, evidence = null) {
    const allowed = this.reasking ? ['TRUTH', 'LIE'] : CHOICES
    if (this.phase !== PHASE.CHOICE || allowed.indexOf(choice) < 0) return false
    if (choice !== 'LIE') { this._resolve(choice, null); return true }
    if (evidence != null) {
      if (!this.engine.state.has(evidence)) return false
      this._resolve('LIE', evidence)
      return true
    }
    const held = this.engine.state.evidenceList().map(e => e.id)
    if (!held.length) return false           // 증거 없이 거짓 지목 불가 (N4)
    this.phase = PHASE.EVIDENCE
    return true
  }

  _chooseEvent (payload) {
    const sid = this.cur?.graphId || this.cur?.id
    if (!payload || payload.sid !== sid) return false
    return this.choose(payload.choice, payload.evidence)
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
    this._prompt()
    return true
  }

  _resolve (choice, evId) {
    const s = this.cur
    const rec = this._rec()
    if (this.reasking && choice === 'TRUTH') {
      this.reasking = false
      this.engine.bus.emit('interrogation:verdict', { npc: this.npc, choice, correct: !!s.truth })
      this._go(PHASE.LINES, 'next')
      return
    }
    const judged = judge(!!s.truth, choice, evId, s.evidence || [])
    const r = { ...judged, burn: judged.burn && s.burnable }
    const previous = rec.scores[s.id] || 0
    rec.scores[s.id] = r.delta
    rec.score += r.delta - previous
    this.engine.bus.emit('interrogation:verdict', { npc: this.npc, choice, correct: r.correct })
    if (evId) this.engine.bus.emit('evidence:presented', { id: evId, npc: this.npc, correct: r.correct })

    const react = branch(s, r.beat, evId)
    if (rec.answered.indexOf(s.id) < 0) rec.answered.push(s.id)
    const rp = rec.reopen.indexOf(s.id)
    if (rp >= 0) rec.reopen.splice(rp, 1)

    if (r.burn) {
      if (rec.burned.indexOf(s.id) < 0) rec.burned.push(s.id)   // grants/spawns는 영구 소실
      this.engine.bus.emit('sfx', { id: 'interrogation-burn' })
      for (const f of react?.flags || []) this._flag(f)
    } else if (react) {
      for (const g of react.grants || []) this._grant(g)
      for (const g of react.spawns || []) this._spawn(g)
      for (const f of react.flags || []) this._flag(f)
      if (r.beat === 'break' && this._laterVariant(s, evId) && rec.reopen.indexOf(s.id) < 0) rec.reopen.push(s.id)
    }
    if (!s.truth && choice === 'LIE' && r.correct && rec.refuted.indexOf(s.id) < 0) rec.refuted.push(s.id)
    if (s.breakingOn && !s.truth && choice === 'LIE' && r.correct) {
      this.engine.bus.emit('perf:state', { npc: this.npc, state: 'breaking' })
    }

    if (react) {
      if (react.detective) this._say(this._name('detective'), react.detective)
      if (react.text) this._say(this._name(this.npc), react.text, true, react.action)
    }
    // 반응 대사는 원문대로 나가고, 축약은 그 다음부터 적용된다 (STORY 4-2)
    if (r.burn) this.terse = 2                                  // 상대가 닫힌다
    else if (r.beat === 'defend' && this.terse === 0) this.terse = 1  // 다음 진술만 짧아진다
    const reask = choice === 'DOUBT' && !this.reasking
    this.reasking = reask
    this._go(PHASE.LINES, reask ? 'reask' : 'next')
  }

  // 뒷막에서만 열리는 분기가 남아 있으면 그 진술은 재심문에서 다시 열린다 (다이치 S4).
  _laterVariant (s, evId) {
    const v = s.lieVariants
    if (!v) return false
    return Object.keys(v).some(k => k !== evId && v[k].act != null && v[k].act > this.engine.state.act)
  }

  _variantAvailable (s) {
    return Object.values(s.lieVariants || {}).some(v => v.act != null && v.act <= this.engine.state.act)
  }

  _grant (id) {
    this.engine.bus.emit('evidence:granted', { id, npc: this.npc })
  }

  // 월드 배치는 GAMEPLAY 소유다. 없으면 플래그만 남겨 레벨이 나중에 읽게 한다.
  _spawn (id) {
    this._flag(`spawn:${id}`)
  }

  _flag (id) {
    if (this.engine.state.is(id)) return
    this.engine.state.flag(id)
    this.engine.bus.emit('flag:set', { id })
  }

  _finish () {
    const rec = this._rec()
    const statements = this.data.statements || []
    const failed = statements.some(s => s.key && rec.burned.indexOf(s.id) >= 0)
    const allLiesRefuted = statements.filter(s => !s.truth).every(s => rec.refuted.indexOf(s.id) >= 0)
    const tier = failed ? '실패' : rec.burned.length === 0 && allLiesRefuted ? '만점' : '부분'
    const outcomeKey = { 만점: 'full', 부분: 'partial', 실패: 'fail' }[tier]
    const out = (this.data.outcomes || {})[outcomeKey]
    this.cur = null
    if (out) {
      if (out.detective) this._say(this._name('detective'), out.detective)
      if (out.text) this._say(this._name(this.npc), out.text, true, out.action)
      for (const g of out.grants || []) this._grant(g)
      for (const f of out.flags || []) this._flag(f)
    }
    rec.ended = true
    this.engine.bus.emit('interrogation:end', { npc: this.npc, score: rec.score, tier })
    this.engine.bus.emit('perf:state', { npc: this.npc, state: 'idle' })
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
      this.engine.bus.emit('subtitle', { speaker: l.speaker, text: l.text, dur: l.dur })
      return
    }
    // 선택을 기다리는 동안에도 마지막 대사는 화면에 남아 있어야 한다 → now를 지우지 않는다
    const after = this.after
    this.after = null
    if (after === 'choice' || after === 'reask') {
      this.phase = PHASE.CHOICE
      this._prompt()
    }
    else if (after === 'next') this._next()
    else if (after === 'accuse') this._end()
    else this._end()
  }

  _end () {
    this.phase = PHASE.IDLE
    this.now = null
  }

  // 사거리 밖 이탈 — 세션을 내려놓는다. 전달만 되고 판정 전인 진술은 presented에서 되돌려
  // 재접근 때 다시 묻는다(STORY 4-5의 '닫힘'은 판정된 진술에만 적용된다). ended는 건드리지
  // 않으므로 같은 막의 재접근(start)이 그대로 성립한다 — isModal() false의 계약 유지.
  _leave () {
    const rec = this._rec()
    if (this.cur && rec.answered.indexOf(this.cur.id) < 0) {
      const i = rec.presented.indexOf(this.cur.id)
      if (i >= 0) rec.presented.splice(i, 1)
    }
    this.cur = null
    this.queue.length = 0
    this.now = null
    this.reasking = false
    this.phase = PHASE.IDLE
    this.engine.bus.emit('interrogation:left', { npc: this.npc })
    // 물을 것이 하나도 안 남았는데 마무리 대사 중에 자리를 뜬 것은 이탈이 아니라 종료다.
    // 여기서 세션을 그냥 버리면 rec.ended 가 서지 않아 막이 열리지 않는다 — E2 골든패스는
    // 마지막 진술 판정 직후 엘리베이터로 걸어간다(완주 봇 실측: interrogation:end 미발화).
    if (!rec.ended && this.list.every(s => !this._eligible(s, rec))) {
      this._finish()
      this.queue.length = 0            // 자리에 없는 사람에게 마무리 대사를 읽어주지 않는다
      this.now = null
      this.phase = PHASE.IDLE
      return
    }
    this.engine.bus.emit('perf:state', { npc: this.npc, state: 'idle' })
  }

  // 괴담 원문 발화 (STORY §7). 매체 접촉은 한 번뿐이라 놓치면 회수할 길이 없다 —
  // 심문 중이라면 즉시 덮지 않고 큐 뒤에 실어 현재 진술이 끝난 뒤 나오게 한다.
  _lore (id) {
    const line = this.lore?.[id]
    if (!line?.text) return
    const l = { speaker: line.speaker || '', text: line.text, dur: lineDur(line.text), action: null }
    if (this.phase !== PHASE.IDLE) { this.queue.push(l); return }
    this.engine.bus.emit('subtitle', { speaker: l.speaker, text: l.text, dur: l.dur })
  }

  _prompt () {
    if (!this.cur) return
    this.engine.bus.emit('interrogation:prompt', {
      npc: this.npc,
      sid: this.cur.graphId || this.cur.id,
      options: this.reasking ? ['TRUTH', 'LIE'] : [...CHOICES]
    })
  }

  _onInteract (targetId) {
    const state = this.engine.state
    if (targetId === 'lobby/elevator' && state.act === 1 && state.npc('deitch').ended) {
      this.engine.bus.emit('subtitle', { speaker: '', text: '격자문이 열린다.', dur: 2.0 })
      state.setAct(2); this._phase('early')
    } else if (targetId === 'lobby/elevator' && state.act === 1) {
      const talked = (state.npc('deitch').presented?.length ?? 0) > 0 // presented 는 _rec() 지연 초기화 — 심문 전엔 없다(감사 P0)
      this.engine.bus.emit('subtitle', { speaker: '', text: talked ? '격자문이 열리지 않는다. 다이치의 진술이 아직 남았다.' : '격자문이 열리지 않는다. 프런트 쪽 일이 먼저다.', dur: 2.4 })
    }
    if (targetId === 'stairs-roof/door' && state.act === 2 &&
      state.npc('ruiz').ended && state.npc('pryce').ended) {
      state.setAct(3)
      this._phase('early')
    }
  }

  _phase (phase) {
    const act = this.engine.state.act
    const key = `${act}:${phase}`
    if (this.actPhase === key) return
    this.actPhase = key
    this.engine.bus.emit('act:phase', { act, phase })
  }

  update (dt, elapsed) {
    this.t = Number.isFinite(elapsed) ? elapsed : this.t + dt
    if (this.engine.state.act === 1 && this.t >= 420) this._phase('late')
    if (this.engine.state.act === 2 && this.t >= 1800) this._phase('late')
    // 심문 중 사거리 이탈 감시 — 세션을 열어둔 채 떠나면 잔류 선택지가 입력을 받아
    // 미청취 진술이 소모되던 결함. anchorX가 null이면(씬 없는 배터리) 꺼진다.
    if (this.phase !== PHASE.IDLE && this.anchorX != null) {
      const p = this.engine.get?.('player')
      if (p?.pos) {
        const dx = p.pos.x - this.anchorX
        const dz = p.pos.z - this.anchorZ
        if (dx * dx + dz * dz > LEAVE * LEAVE) this._leave()
      }
    }
    if (this.phase === PHASE.LINES) this._pump()
  }

  dispose () {
    for (const off of this._off) off()
    this._off = []
  }
}

export default new Interrogation()
