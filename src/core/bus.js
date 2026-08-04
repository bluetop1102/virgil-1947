// 모듈 간 유일한 통신 경로. 모듈이 서로를 직접 import 하면 병렬 작업에서 순환 의존이 생긴다.

export class EventBus {
  constructor () { this.map = new Map() }

  on (type, fn) {
    if (!this.map.has(type)) this.map.set(type, new Set())
    this.map.get(type).add(fn)
    return () => this.off(type, fn)
  }

  once (type, fn) {
    const un = this.on(type, (p) => { un(); fn(p) })
    return un
  }

  off (type, fn) { this.map.get(type)?.delete(fn) }

  emit (type, payload) {
    const set = this.map.get(type)
    if (set) for (const fn of [...set]) fn(payload)
    const any = this.map.get('*')
    if (any) for (const fn of [...any]) fn({ type, payload })
  }
}
