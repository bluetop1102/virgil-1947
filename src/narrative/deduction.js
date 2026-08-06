// [INTERROGATION] 증거판 — docs/STORY.md 5.4의 링크 3개와 엔딩 분기.
// 상태와 규칙만 소유한다. 렌더는 UI가 getBoardState()를 읽어 그린다.
// script.js가 있으면 링크 표출/엔딩/도일 도입부를 가져오며, 증거 관계는 case-graph-loader.js에서 푼다.

// 내부 표현: { id, evidence:[a,b], claim, line, action, detective }
import { hydrateLinks } from './case-graph-loader.js'

const LINK_PRESENTATION = [
  {
    id: 'L1',
    claim: '자살이 아니다 — 해치는 바깥에서 잠겼고 구두는 가지런히 놓여 있었다',
    line: '가지런히요. 그건 그 여자가 그렇게 해놓은 겁니다. 요새 애들이 그럽디다.'
  },
  {
    id: 'L2',
    claim: '10월 9일 밤 탱크에 접근한 사람은 한 명뿐이다',
    action: '웃는다',
    line: '일지는 제가 씁니다. 제가 쓴 걸 저한테 들이대시는 겁니까.'
  },
  {
    id: 'L3',
    claim: '14개월 전에도 같은 사람이 같은 자리에 있었다',
    action: '웃음을 멈추지 않는다',
    line: '…삼촌한테 전화 좀 하겠습니다.',
    detective: '받는 사람이 없을 겁니다.'
  }
]

export const LINKS = hydrateLinks(LINK_PRESENTATION).map(link => ({ ...link, evidence: link.needs }))

export const ENDINGS = {
  full: { id: 'full', title: '완전', text: '도일 체포. 넬 밴스 사건 재수사 개시.', last: '물탱크의 물이 빠지는 소리', caption: null },
  partial: { id: 'partial', title: '부분', text: '도일 구금 48시간. 소유주 변호사가 온다.', last: '프런트에 걸린 942호 열쇠', caption: null },
  cold: { id: 'cold', title: '미제', text: '사건 종결.', last: '새 손님이 942호 열쇠를 받아 간다', caption: '버질은 계속 영업했다. 9층 이야기가 하나 늘었다.' }
}

export const INTRO = [
  { speaker: '에멧 도일', text: '형사님이 여기까지 올라오실 줄은 몰랐습니다. 사다리가 미끄럽죠.' },
  { speaker: '에멧 도일', text: '그 아가씨요? 못 봤습니다. 저는 밸브만 봅니다.' }
]

const key = (a, b) => [a, b].sort().join('|')
const dur = (t) => Math.min(7.5, Math.max(1.3, 1.3 + t.length * 0.085))

async function loadScript () {
  try {
    const g = import.meta.glob('./script.js')
    const k = Object.keys(g)[0]
    if (k) return await g[k]()
  } catch (e) { /* Node(테스트) 환경 */ }
  return null
}

export class Deduction {
  constructor (mod = null) {
    this.name = 'deduction'
    this.order = 40
    this.engine = null
    this.open = false
    this.links = LINKS
    this.intro = INTRO
    this.endings = ENDINGS
    this.made = []          // 성립한 링크 id
    this.last = null        // 마지막 시도 결과 (UI 피드백용)
    this.ending = null
    this._off = []
    if (mod) this._useScript(mod)
  }

  async init (engine) {
    this.engine = engine
    this._useScript(await loadScript())
    const b = engine.bus
    this._off.push(b.on('deduction:open', () => this.start()))
    this._off.push(b.on('qa:state', (s) => { if (s?.ui === 'deduction') this.start() }))
  }

  _useScript (mod) {
    if (!mod) return
    const names = { detective: mod.DETECTIVE?.name || '형사' }
    for (const [id, c] of Object.entries(mod.CHARACTERS || {})) names[id] = c.name || id
    if (Array.isArray(mod.LINKS)) {
      this.links = hydrateLinks(mod.LINKS).map(l => ({
        id: l.id,
        evidence: [...(l.needs || l.evidence || [])],
        claim: l.claim,
        line: l.reaction || l.line,
        action: l.reactionAction || l.action || null,
        detective: l.followUp?.text || l.detective || null
      }))
    }
    if (mod.ENDINGS) {
      // 사본을 바닥에 깔고 덮어쓴다 — script.js가 키를 하나 빠뜨려도 분기가 비지 않는다
      this.endings = { ...ENDINGS }
      for (const [k, e] of Object.entries(mod.ENDINGS)) {
        this.endings[k] = { id: e.id || k, title: e.title, text: e.text, last: e.finalShot || e.last || null, caption: e.subtitle || e.caption || null }
      }
    }
    const intro = mod.INTERROGATIONS?.doyle?.intro
    if (intro) this.intro = intro.map(l => ({ speaker: names[l.speaker] || l.speaker, text: l.text }))
    this.names = names
  }

  start () {
    if (this.open) return false
    this.open = true
    this.ending = null
    for (const l of this.intro) this._say(l.speaker, l.text)
    return true
  }

  close () { this.open = false }

  _say (speaker, text) {
    this.engine?.bus.emit('subtitle', { speaker, text, dur: dur(text) })
  }

  _doyle () { return this.names?.doyle || '에멧 도일' }
  held (id) { return !!this.engine?.state.has(id) }

  // 보유 증거로만 링크가 걸린다 (루브릭 N4). 오답은 성립하지 않을 뿐 페널티가 없다.
  // 실패는 false를 돌려준다 — UI(board.js)가 `=== false`로 거르므로 이 규약을 깨면 결박이 풀린다.
  // 실패 사유는 getBoardState().last로 읽는다.
  link (a, b) {
    if (!this.open || !a || !b || a === b) { this.last = { a, b, ok: false, reason: 'invalid' }; return false }
    if (!this.held(a) || !this.held(b)) {
      this.last = { a, b, ok: false, reason: 'not-held' }
      return false
    }
    const found = this.links.find(l => key(l.evidence[0], l.evidence[1]) === key(a, b))
    if (!found) {
      this.last = { a, b, ok: false, reason: 'no-link' }
      this.engine.bus.emit('deduction:link', { id: null, a, b, ok: false })
      return false
    }
    if (this.made.indexOf(found.id) >= 0) {
      this.last = { a, b, ok: false, reason: 'already', id: found.id }
      return false
    }
    this.made.push(found.id)
    this.last = { a, b, ok: true, id: found.id, claim: found.claim }
    this.engine.bus.emit('deduction:link', { id: found.id, a, b, ok: true })
    if (found.line) this._say(this._doyle(), found.line)
    if (found.detective) this._say(this.names?.detective || '형사', found.detective)
    return this.last
  }

  unlink (id) {
    const i = this.made.indexOf(id)
    if (i < 0) return false
    this.made.splice(i, 1)
    return true
  }

  // 지목 확정. 성립한 링크 수로만 갈린다. 미제도 정식 엔딩이다.
  resolve () {
    const n = this.made.length
    const e = n >= 3 ? this.endings.full : n === 2 ? this.endings.partial : this.endings.cold
    this.ending = e
    if (this.engine) {
      this.engine.state.accusation = n >= 2 ? 'doyle' : null
      this.engine.bus.emit('deduction:resolve', { links: [...this.made], ending: e.id })
      this._say(null, e.text)
      if (e.caption) this._say(null, e.caption)
    }
    return e
  }

  // UI(board.js)가 그리는 데이터. nodes는 실제 보유 증거만 담는다 — 판에 없는 카드는 걸 수 없다 (N4).
  // links는 핀 자리 표이므로 조합 자체는 담기되, made가 아닌 슬롯을 화면에 그리는 것은 힌트 노출이다(STORY 4-5).
  getBoardState () {
    const ev = this.engine ? this.engine.state.evidenceList() : []
    return {
      open: this.open,
      nodes: ev.map(e => ({ id: e.id, title: e.title || e.id, kind: e.kind || 'doc' })),
      links: this.links.map(l => ({
        id: l.id,
        a: l.evidence[0],
        b: l.evidence[1],
        claim: l.claim,
        made: this.made.indexOf(l.id) >= 0
      })),
      made: [...this.made],
      last: this.last,
      ending: this.ending ? { id: this.ending.id, title: this.ending.title, text: this.ending.text, last: this.ending.last } : null
    }
  }

  update () {}

  dispose () {
    for (const off of this._off) off()
    this._off = []
  }
}

export default new Deduction()
