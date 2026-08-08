import { clamp, damp, rng } from '../core/util.js'

export const PERF_STATES = ['idle', 'anxious', 'lying', 'breaking']

export const DEITCH_CLIPS = Object.freeze({
  idle: 'deitch.idle',
  anxious: 'deitch.register-square',
  lying: 'deitch.flask-reach',
  breaking: 'deitch.glasses-off'
})

// 실행 변주를 두는 상태. 같은 신호가 한 막에 두 번 나오는 것이 이 둘뿐이다
// (deitch 1막: S1·S3 anxious · S2·S4 lying).
const VARIED = new Set(['anxious', 'lying'])

const JOINTS = [
  'head',
  'leftShoulder', 'leftElbow', 'leftWrist',
  'rightShoulder', 'rightElbow', 'rightWrist'
]

const ZERO = Object.freeze([0, 0, 0])

function ease (t) {
  const x = clamp(t, 0, 1)
  return x * x * (3 - 2 * x)
}

function pulse (t, rate = 1) {
  return Math.sin(t * Math.PI * 2 * rate)
}

function deitchPose (state, t, phase, variant = 0) {
  if (state === 'anxious') {
    // 숙박부 모서리를 반복해서 맞춘다 (STORY §2). 예전 값은 손목 ±2°라 데스크 너머에서
    // 아무것도 읽히지 않았다 — 팔이 장부로 올라갔다 내려오는 왕복 자체를 신호로 쓴다.
    // variant 는 같은 신호의 다른 실행이다: 0은 양손으로 좌우를 맞추고, 1은 오른손만 위
    // 모서리를 민다. 신호를 새로 만들지 않는다(STORY 가 진실원) — 치는 방식만 바꾼다.
    const solo = variant % 2 === 1
    const cycle = solo ? 3.8 : 3.0
    const local = (t + phase * cycle) % cycle
    const burst = ease(local / 0.42) * (1 - ease((local - (cycle - 1.15)) / 0.55))
    // 손은 데스크를 떠나지 않는다(E4 — 다이치는 프런트를 벗어나지 않는다). 자세는 유지한
    // 채 맞추는 동작만 주기적으로 커진다. hold 하한 0.55가 팔이 옆으로 떨어지는 것을 막는다.
    const hold = 0.55 + 0.45 * burst
    const beat = pulse(local, solo ? 0.85 : 1.25) * burst
    const pose = {
      head: [0.085 * hold, (solo ? 0.055 : 0.018) * hold + beat * 0.03, 0],
      rightShoulder: [0.30 * hold + (solo ? 0.09 * beat : 0), 0, 0.12 * hold - (solo ? 0 : 0.10 * beat)],
      rightElbow: [-0.70 * hold, 0, 0.18 * hold],
      rightWrist: [0.14 * hold + 0.13 * beat, 0, -0.12 * hold]
    }
    if (solo) {
      pose.leftShoulder = [0.30 * hold, 0, -0.12 * hold]
      pose.leftElbow = [-0.70 * hold, 0, -0.18 * hold]
      pose.leftWrist = [0.14 * hold, 0, 0.12 * hold]
    } else {
      pose.leftShoulder = [0.30 * hold, 0, -0.12 * hold + 0.10 * beat]
      pose.leftElbow = [-0.70 * hold, 0, -0.18 * hold]
      pose.leftWrist = [0.14 * hold - 0.13 * beat, 0, 0.12 * hold]
    }
    return pose
  }

  if (state === 'lying') {
    // 오른손이 데스크 아래로 내려간다 (STORY §2). variant 1은 내려갔다가 스스로 거둔다 —
    // 같은 신호의 다른 실행. 두 번째 거짓이 첫 번째의 복사로 읽히지 않게 하는 것이 목적이다.
    const reach = variant % 2 === 1
      ? ease(t / 0.5) * (1 - ease((t - 1.55) / 0.7))
      : ease(t / 0.72)
    const search = pulse(Math.max(0, t - 0.72), 0.42)
    return {
      head: [-0.035, -0.055 * reach, -0.014],
      leftShoulder: [0.025, 0, -0.025],
      rightShoulder: [0.34 * reach, 0.04, 0.16 * reach],
      rightElbow: [0.58 * reach, 0, -0.12 + search * 0.025],
      rightWrist: [-0.18 * reach, 0, -0.18 * reach]
    }
  }

  if (state === 'breaking') {
    const reach = ease(t / 0.85)
    const remove = ease((t - 0.65) / 0.65)
    const press = ease((t - 1.20) / 0.72)
    return {
      head: [-0.10 * reach - 0.18 * press, 0.02 * remove, -0.055 * press],
      leftShoulder: [-0.46 * reach, 0, -0.24 * reach],
      leftElbow: [-1.20 * reach, 0, -0.28 * reach],
      leftWrist: [-0.38 * reach - 0.12 * press, 0, 0.34 * reach],
      rightShoulder: [-0.44 * reach, 0, 0.24 * reach],
      rightElbow: [-1.16 * reach, 0, 0.28 * reach],
      rightWrist: [-0.34 * reach - 0.16 * press, 0, -0.34 * reach + 0.10 * remove]
    }
  }

  const breath = pulse(t + phase, 0.20)
  const glance = pulse(t + phase * 0.5, 0.09)
  return {
    head: [breath * 0.009, glance * 0.018, glance * 0.004],
    leftShoulder: [breath * 0.006, 0, -breath * 0.004],
    rightShoulder: [breath * 0.006, 0, breath * 0.004]
  }
}

function doylePose (reaction, t) {
  if (!reaction) return null
  const age = t - reaction.startedAt
  if (age < 0 || age > 2.4) return null
  const attack = ease(age / 0.24)
  const release = 1 - ease((age - 1.45) / 0.85)
  const weight = attack * release
  const success = reaction.ok ? reaction.successes : 0
  const wrong = reaction.ok ? 0 : reaction.wrongIndex + 1
  const laugh = pulse(age, 2.3 + success * 0.32) * weight
  return {
    head: [(-0.035 * wrong + 0.025 * success) * weight, laugh * (0.035 - success * 0.008),
      laugh * (0.018 + wrong * 0.005)],
    leftShoulder: [laugh * 0.018 * (4 - success), 0, -0.025 * weight],
    rightShoulder: [laugh * 0.018 * (4 - success), 0, 0.025 * weight],
    rightElbow: [0.08 * success * weight, 0, -0.04 * wrong * weight]
  }
}

function captureBase (joints) {
  const base = {}
  for (const name of JOINTS) {
    const joint = joints[name]
    if (!joint) continue
    base[name] = [joint.rotation.x, joint.rotation.y, joint.rotation.z]
  }
  return base
}

function applyPose (track, pose, dt) {
  for (const name of JOINTS) {
    const joint = track.joints[name]
    if (!joint) continue
    const base = track.base[name] || ZERO
    const offset = pose?.[name] || ZERO
    joint.rotation.x = damp(joint.rotation.x, base[0] + offset[0], 12, dt)
    joint.rotation.y = damp(joint.rotation.y, base[1] + offset[1], 12, dt)
    joint.rotation.z = damp(joint.rotation.z, base[2] + offset[2], 12, dt)
  }
}

export class Performance {
  constructor () {
    this.name = 'performance'
    this.order = 30
    this.engine = null
    this.off = []
    this.tracks = new Map()
    this.variants = new Map()
    this.history = []
    this.doyle = { successes: 0, wrongIndex: -1, reaction: null }
    this.doyleTrack = null
  }

  async init (engine) {
    this.engine = engine
    this.off.push(engine.bus.on('perf:state', ({ npc, state } = {}) => this.play(npc, state)))
    this.off.push(engine.bus.on('deduction:link', (payload = {}) => this.reactToLink(payload)))
  }

  play (npc, state) {
    if (typeof npc !== 'string' || !PERF_STATES.includes(state)) return false
    const startedAt = Number.isFinite(this.engine?.time) ? this.engine.time : 0
    const previous = this.tracks.get(npc)
    const seeded = rng(previous?.seed ?? this.seedFor(npc))
    // 같은 신호의 n번째 발화. 두 번째부터는 같은 신호를 다르게 친다 — 반복이 아니라
    // 변주로 읽혀야 텔 표본이 성립한다(N2).
    const key = `${npc}:${state}`
    const variant = this.variants.get(key) ?? 0
    this.variants.set(key, variant + 1)
    const track = {
      npc,
      state,
      variant,
      clip: npc === 'deitch'
        ? DEITCH_CLIPS[state] + (VARIED.has(state) && variant % 2 === 1 ? '.b' : '')
        : `${npc}.${state}`,
      startedAt,
      plays: (previous?.plays || 0) + 1,
      phase: previous?.phase ?? seeded(),
      seed: previous?.seed ?? this.seedFor(npc),
      joints: previous?.joints || null,
      base: previous?.base || null
    }
    this.tracks.set(npc, track)
    this.record({ type: 'clip', npc, state, clip: track.clip, at: startedAt })
    return true
  }

  reactToLink ({ id, ok } = {}) {
    const startedAt = Number.isFinite(this.engine?.time) ? this.engine.time : 0
    if (ok) this.doyle.successes = Math.min(3, this.doyle.successes + 1)
    else this.doyle.wrongIndex = (this.doyle.wrongIndex + 1) % 4
    this.doyle.reaction = {
      id: ok && typeof id === 'string' ? id : null,
      ok: Boolean(ok),
      successes: this.doyle.successes,
      wrongIndex: this.doyle.wrongIndex,
      startedAt
    }
    this.record({ type: 'deduction', npc: 'doyle', ...this.doyle.reaction, at: startedAt })
    return true
  }

  seedFor (npc) {
    let seed = 2166136261
    for (let i = 0; i < npc.length; i++) seed = Math.imul(seed ^ npc.charCodeAt(i), 16777619)
    return seed >>> 0
  }

  record (entry) {
    this.history.push(entry)
    if (this.history.length > 32) this.history.shift()
  }

  bindRig (track, rig) {
    if (!rig?.joints) return false
    if (track.joints !== rig.joints) {
      track.joints = rig.joints
      track.base = captureBase(rig.joints)
    }
    return true
  }

  update (dt, elapsed) {
    const time = Number.isFinite(elapsed) ? elapsed : (this.engine?.time || 0)
    const rigs = this.engine?.get('characters')?.rigs
    if (!rigs) return

    for (const track of this.tracks.values()) {
      const rig = rigs.get(track.npc)
      if (!this.bindRig(track, rig)) continue
      const local = Math.max(0, time - track.startedAt)
      const pose = track.npc === 'deitch'
        ? deitchPose(track.state, local, track.phase, track.variant)
        : deitchPose(track.state === 'breaking' ? 'breaking' : 'idle', local, track.phase)
      applyPose(track, pose, dt)
      rig.root.userData.performance = {
        state: track.state,
        clip: track.clip,
        startedAt: track.startedAt,
        plays: track.plays
      }
    }

    const doyleRig = rigs.get('doyle')
    if (!this.doyleTrack) this.doyleTrack = {
      npc: 'doyle', state: 'idle', clip: 'doyle.idle', startedAt: 0,
      plays: 0, phase: 0, seed: this.seedFor('doyle'), joints: null, base: null
    }
    const doyleTrack = this.tracks.get('doyle') || this.doyleTrack
    if (this.bindRig(doyleTrack, doyleRig)) {
      const pose = doylePose(this.doyle.reaction, time)
      if (pose) applyPose(doyleTrack, pose, dt)
      if (doyleRig?.root) doyleRig.root.userData.performance = {
        state: pose ? 'reaction' : doyleTrack.state,
        clip: pose ? `doyle.link-${this.doyle.reaction.ok ? this.doyle.successes : 'wrong'}` : doyleTrack.clip,
        startedAt: pose ? this.doyle.reaction.startedAt : doyleTrack.startedAt,
        plays: pose ? 1 : doyleTrack.plays
      }
    }
  }

  getState (npc) {
    const track = this.tracks.get(npc)
    if (!track) return null
    return { state: track.state, clip: track.clip, startedAt: track.startedAt, plays: track.plays }
  }

  dispose () {
    for (const off of this.off) off()
    this.off.length = 0
    this.tracks.clear()
    this.variants.clear()
    this.history.length = 0
    this.doyleTrack = null
    this.engine = null
  }
}

export default new Performance()
