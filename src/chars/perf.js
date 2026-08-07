import { clamp, damp, rng } from '../core/util.js'

export const PERF_STATES = ['idle', 'anxious', 'lying', 'breaking']

export const DEITCH_CLIPS = Object.freeze({
  idle: 'deitch.idle',
  anxious: 'deitch.register-square',
  lying: 'deitch.flask-reach',
  breaking: 'deitch.glasses-off'
})

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

function deitchPose (state, t, phase) {
  if (state === 'anxious') {
    const align = pulse(t + phase, 0.72)
    const tap = Math.max(0, pulse(t + phase + 0.18, 1.44))
    return {
      head: [-0.08 + align * 0.012, align * 0.018, 0],
      leftShoulder: [0.30, 0, -0.12],
      leftElbow: [-0.72, 0, -0.20 + align * 0.025],
      leftWrist: [0.04, 0, 0.22 + tap * 0.035],
      rightShoulder: [0.28, 0, 0.12],
      rightElbow: [-0.70, 0, 0.20 - align * 0.025],
      rightWrist: [0.04, 0, -0.22 - tap * 0.035]
    }
  }

  if (state === 'lying') {
    const reach = ease(t / 0.72)
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
    const track = {
      npc,
      state,
      clip: npc === 'deitch' ? DEITCH_CLIPS[state] : `${npc}.${state}`,
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
        ? deitchPose(track.state, local, track.phase)
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
    this.history.length = 0
    this.doyleTrack = null
    this.engine = null
  }
}

export default new Performance()
