// test-interrogation.mjs 전용 하네스. three/WebGL 없이 심문 상태기계를 구동한다.
import { EventBus } from '../src/core/bus.js'
import { GameState } from '../src/core/state.js'
import { Interrogation } from '../src/narrative/interrogation.js'
import * as SCRIPT from '../src/narrative/script.js'

const I = SCRIPT.INTERROGATIONS

export function fakeCamera () {
  return {
    position: { x: 0, y: 0, z: 0, set (x, y, z) { this.x = x; this.y = y; this.z = z } },
    fov: 50,
    matrixWorld: { elements: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] },
    updateMatrixWorld () {},
    updateProjectionMatrix () {}
  }
}

export async function fresh ({ camera = null, scene = null, flags = [], evidence = [], act = 1, mod = SCRIPT, mods = {} } = {}) {
  const bus = new EventBus()
  const state = new GameState(bus)
  const engine = { bus, state, camera, scene, qa: true, time: 0, get: (n) => mods[n] }
  const m = new Interrogation(mod)
  await m.init(engine)
  state.setAct(act)
  for (const f of flags) state.flag(f)
  for (const id of evidence) state.addEvidence({ id, kind: 'doc', title: id })
  const events = []
  bus.on('*', e => events.push(e))
  return { m, engine, state, bus, events }
}

export function pump (m, limit = 900) {
  let t = m.t
  for (let i = 0; i < limit && m.phase === 'lines'; i++) { t += 0.4; m.update(0.4, t) }
  return m
}

export function requiredFlags () {
  const out = new Set()
  for (const d of Object.values(I)) for (const s of d.statements || []) for (const f of s.requires || []) out.add(f)
  return [...out]
}
export const FLAGS = requiredFlags()

export async function driveTo (npc, stId, opts = {}) {
  const ctx = await fresh({ flags: FLAGS, ...opts })
  ctx.m.start(npc)
  pump(ctx.m)
  let guard = 0
  while (ctx.m.cur && ctx.m.cur.id !== stId && guard++ < 40) { ctx.m.choose('TRUTH'); pump(ctx.m) }
  return ctx.m.cur && ctx.m.cur.id === stId ? ctx : null
}

export function walk (ctx, choice = 'TRUTH') {
  const seen = []
  let guard = 0
  while (ctx.m.cur && guard++ < 40) { seen.push(ctx.m.cur.id); ctx.m.choose(choice); pump(ctx.m) }
  return seen
}
