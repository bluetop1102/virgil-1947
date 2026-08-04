// 게임 진행 상태. 모듈은 여기에 직접 쓰지 말고 제공된 메서드를 쓴다 (버스 이벤트가 자동 발신되어야 하므로).

export class GameState {
  constructor (bus) {
    this.bus = bus
    this.act = 1
    this.room = 'lobby'
    this.evidence = new Map()      // id -> {id, kind, title, body, img, act, source}
    this.interrogated = new Map()  // npc -> {score, answered:[], burned:[]}
    this.flags = new Set()
    this.accusation = null
  }

  addEvidence (e) {
    if (this.evidence.has(e.id)) return false
    this.evidence.set(e.id, e)
    this.bus.emit('evidence:collected', { id: e.id, kind: e.kind })
    return true
  }

  has (id) { return this.evidence.has(id) }
  evidenceList () { return [...this.evidence.values()] }

  setAct (a) { if (a !== this.act) { this.act = a; this.bus.emit('act:enter', { act: a }) } }
  setRoom (r) { if (r !== this.room) { this.room = r; this.bus.emit('room:changed', { room: r }) } }

  flag (f) { this.flags.add(f) }
  is (f) { return this.flags.has(f) }

  npc (id) {
    if (!this.interrogated.has(id)) this.interrogated.set(id, { score: 0, answered: [], burned: [] })
    return this.interrogated.get(id)
  }

  // QA·디버그용 직렬화. 하네스가 상태를 강제 세팅해 특정 장면을 촬영할 때 쓴다.
  serialize () {
    return {
      act: this.act,
      room: this.room,
      evidence: [...this.evidence.keys()],
      flags: [...this.flags],
      npcs: Object.fromEntries(this.interrogated)
    }
  }
}
