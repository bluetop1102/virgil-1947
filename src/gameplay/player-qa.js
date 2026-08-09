// player.js 의 QA 하네스 면 중 **엔진 상수를 쓰지 않는 부분**(이벤트 로그·방 스코프·상태 덤프)만
// 갈라 놓은 파일이다. 계약상 gameplay 모듈은 여전히 player 하나다 — default export 1개, order 20
// 불변. 파일만 나눈 이유는 500줄 상한이고(AUDIO 가 graph.js → music.js·cues.js 로 나눈 것과 같은
// 이유), player.js 가 상한에 정확히 닿아 있어서 J5 수정분이 들어갈 자리가 없었다.
// 여기 메서드는 전부 player 객체에 스프레드되어 `this` 가 player 다 — 독립 실행 단위가 아니다.

const QA_EVENT_CAP = 512

// qaId 접두사 → 그 방에서만 보이는 대상. 꺼진 방의 NPC 를 로비에서 조작하지 못하게 막는다.
const ROOM_SCOPES = {
  lobby: ['lobby/', 'radio-lobby', 'lobby-frame', 'npc/deitch'],
  elevator: ['lobby/elevator'],
  corridor9: ['corridor9/'],
  linen: ['linen/', 'linen-wall', 'npc/ruiz'],
  room942: ['room942/'],
  bathroom942: ['bathroom942/'],
  room944: ['room944/', 'npc/pryce'],
  'stairs-roof': ['stairs-roof/'],
  rooftop: ['rooftop/', 'npc/doyle']
}

export const playerQa = {
  _qaRecord (type, payload) {
    if (type === 'room:changed' && payload?.room) this.qaRoom = payload.room
    this.qaLog.push({ index: this.qaNextIndex++, time: this.engine.time, type, payload: this._qaCopy(payload) })
    if (this.qaLog.length > QA_EVENT_CAP) this.qaLog.splice(0, this.qaLog.length - QA_EVENT_CAP)
  },

  _qaCopy (value, depth = 0) {
    if (value == null || typeof value !== 'object') return value
    if (depth >= 5) return null
    if (Array.isArray(value)) return value.map(v => this._qaCopy(v, depth + 1))
    const copy = {}
    for (const [key, item] of Object.entries(value)) copy[key] = this._qaCopy(item, depth + 1)
    return copy
  },

  _qaInRoom (id) {
    const allowed = ROOM_SCOPES[this.qaRoom]
    return !allowed || allowed.some(prefix => id === prefix || id.startsWith(prefix))
  },

  _qaState () {
    const state = this.engine.state
    const burned = new Set()
    for (const npc of state.interrogated.values()) {
      for (const item of npc.burned ?? []) burned.add(typeof item === 'string' ? item : item?.id)
    }
    burned.delete(undefined)
    return {
      act: state.act,
      evidence: [...state.evidence.keys()],
      burned: [...burned],
      flags: [...state.flags],
      room: this.qaRoom
    }
  },

  _qaEvents (since) {
    const start = Number.isFinite(since) ? Math.max(0, since) : -Infinity
    return this.qaLog.filter(event => event.index >= start).map(event => this._qaCopy(event))
  }
}
