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

function add3 (a = ZERO, b = ZERO) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

// 여러 층(바닥자세 + 텔)을 관절별로 더한다. 뒤 층이 앞 층을 덮지 않고 얹힌다.
function mix (...layers) {
  const out = {}
  for (const layer of layers) {
    if (!layer) continue
    for (const key of Object.keys(layer)) out[key] = add3(out[key], layer[key])
  }
  return out
}

// ── 팔 2링크 IK ────────────────────────────────────────────────────────
// 텔을 관절 각이 아니라 "손이 어디 있는가"로 쓰기 위한 것. 프런트 카운터 상판이 y=1.09고
// 다이치의 어깨가 y=1.405라, 팔을 각도로 쓰면 손목 높이가 몇 cm만 어긋나도 상판 뒤로
// 숨어 텔이 통째로 관찰 불가가 된다(2차 판정 §0-6의 실체 — 실측: 기본 자세의 손목은 y=0.888).
// fwd = 어깨에서 앞(+z 로컬)으로, down = 어깨에서 아래로. 둘 다 미터.
const UPPER = 0.292
const FORE = 0.263

function armPose (side, fwd, down, base, swing = 0, roll = 0, follow = false) {
  const key = side < 0 ? 'left' : 'right'
  const r = clamp(Math.hypot(fwd, down), Math.abs(UPPER - FORE) + 0.02, UPPER + FORE - 0.012)
  const bend = Math.acos(clamp((r * r - UPPER * UPPER - FORE * FORE) / (2 * UPPER * FORE), -1, 1))
  const aim = Math.atan2(fwd, down)
  const lead = Math.atan2(FORE * Math.sin(bend), UPPER + FORE * Math.cos(bend))
  const upperAngle = aim - lead              // 어깨→팔꿈치 (앞으로 기운 각, 양수 = 앞)
  const foreAngle = upperAngle + bend        // 팔꿈치→손목
  const b = (name) => base?.[name] || ZERO
  // follow=false 는 팔 자세와 무관하게 손등을 아래로 눕힌다(상판에 얹은 손).
  // follow=true 는 손이 팔뚝 방향을 그대로 잇는다 — 늘어뜨린 팔에 눕힌 손을 쓰면
  // 손목이 꺾인 채 손바닥이 앞을 가리켜 인형이 부러진 것처럼 보인다.
  const wrist = (follow ? 0 : foreAngle - 1.62) + roll
  return {
    [`${key}Shoulder`]: [-upperAngle - b(`${key}Shoulder`)[0], swing, 0],
    [`${key}Elbow`]: [-bend - b(`${key}Elbow`)[0], 0, 0],
    [`${key}Wrist`]: [wrist - b(`${key}Wrist`)[0], 0, 0]
  }
}

// 심문 바닥자세 — 두 팔을 프런트 카운터에 올린다. 손목 y≈1.135 (상판 1.09 위).
// STORY §2의 텔은 전부 손에서 시작한다("숙박부 모서리를 맞춘다" · 오른손 하강) —
// 손이 안 보이면 재생돼도 관찰되지 않는다. 이 자세가 텔의 전제조건이다.
const REST_FWD = 0.400
const REST_DOWN = 0.235

// 두 팔을 같은 자리에 얹으면 카운터 위에서 좌우대칭이 되고, 그것이 스틸에서 마네킹으로
// 읽힌다(블라인드 판독: "양팔이 거울상에 가깝게 똑같다").
// **비대칭은 화면에서 읽히는 축에 줘야 한다.** 앞뒤(fwd)로만 벌리면 정면 카메라에서는
// 깊이 차라 거의 안 보인다 — 1차 수정이 그래서 같은 판정을 다시 받았다. 높이(down)를
// 주축으로 쓰고 앞뒤·팔꿈치 벌림을 얹는다. 두 손목 모두 상판(1.09) 위에 남는다 —
// 오른손 y≈1.200 · 왼손 y≈1.143 (손끝 1.171 / 1.114).
const REST_SKEW = { fwd: 0.055, down: -0.030 }

function rest (side) {
  const k = side > 0 ? 1 : -0.9
  return { fwd: REST_FWD + REST_SKEW.fwd * k, down: REST_DOWN + REST_SKEW.down * k }
}

// 팔 비틀림에 맞춘 상체 비틀림. 카운터 자세를 쓰는 모든 상태가 같이 얹어야 진술이
// 시작될 때 몸통이 풀렸다 다시 잡히는 팝이 안 생긴다.
// **어깨 x 회전은 여기에 두지 않는다.** armPose 가 REST_SKEW 로 만든 좌우 높이차를
// 정확히 상쇄해서, 의도한 5.7cm 가 렌더에서 1.2cm 로 죽어 있었다(실측). 블라인드 판독
// 3회가 연속으로 "양팔 대칭"이라고 한 것이 맞았다 — 두 레이어가 서로를 지우고 있었다.
// 벌림(z)과 고개만 남긴다.
const COUNTER_TWIST = Object.freeze({
  head: [0, 0.16, 0.06],
  leftShoulder: [0, 0, -0.07],
  rightShoulder: [0, 0, 0.02]
})

function counterRest (base, side = 0) {
  const one = (s) => armPose(s, rest(s).fwd, rest(s).down, base, -0.04 * s, 0.06 * s)
  if (side > 0) return one(1)
  if (side < 0) return one(-1)
  return mix(one(-1), one(1), COUNTER_TWIST)
}

// phase 하나에서 인물별 값을 여러 개 뽑는다. 시드를 새로 들이지 않아 결정론이 유지되고
// 같은 인물은 늘 같은 자세로 선다.
function spread (phase, k) {
  const x = Math.sin((phase + 1) * (12.9898 + k * 4.137)) * 43758.5453
  return x - Math.floor(x)
}

// 서 있는 인물의 **정지 자세**. 마네킹으로 읽히는 것은 움직임이 없어서가 아니라 자세가
// 좌우대칭이어서다 — 스틸 프레임에서는 호흡이 안 보이고 늘어뜨린 두 팔의 대칭만 남는다
// (블라인드 채점자가 로비 프레임의 최대 데모 신호로 지목). 한쪽 팔을 더 굽혀 앞으로,
// 어깨를 비틀고, 고개를 돌려 대칭을 깬다.
function relaxedStance (phase, base) {
  // 좌우 이진 뒤집기는 인물이 셋뿐일 때 둘이 같은 자세를 뽑는다(실측: pryce 0.507 ·
  // ruiz 0.922 가 같은 쪽이었다). 두 팔의 목표점을 연속값으로 잡고 왼팔을 오른팔에서
  // 0.35~0.65 떨어뜨려, 조건 분기 없이 한쪽 팔이 반드시 더 굽고 앞으로 나오게 한다.
  const r = spread(phase, 0)
  const l = (r + 0.35 + 0.30 * spread(phase, 1)) % 1   // 분리를 조건 없이 보장한다(≥0.35)
  const turn = spread(phase, 2) - 0.5
  const arm = (v) => ({ fwd: 0.05 + v * 0.15, down: 0.535 - v * 0.09 })
  const right = arm(r)
  const left = arm(l)
  return mix(
    armPose(1, right.fwd, right.down, base, -0.05 * (r - 0.5), 0.16 * (r - 0.5), true),
    armPose(-1, left.fwd, left.down, base, 0.05 * (l - 0.5), -0.16 * (l - 0.5), true),
    {
      head: [-0.02 - 0.05 * r, 0.46 * turn, 0.07 * (r - l)],
      leftShoulder: [0.13 * (l - 0.5), 0, -0.06 * (l - 0.5)],
      rightShoulder: [0.13 * (r - 0.5), 0, 0.06 * (r - 0.5)]
    }
  )
}

// 배경 인형·비심문 NPC용 상시 미동. 호흡(0.20Hz)·시선 이동(0.09Hz)에 더해 아주 느린
// 체중 이동을 어깨 롤로 준다 — 정지 프레임에서 "세워둔 마네킹"으로 읽히던 3인(도일·
// 루이즈·프라이스) 대응(JUDGE J3 `j1-33-look180`).
function standIdle (t, phase) {
  const breath = pulse(t + phase, 0.20)
  const glance = pulse(t + phase * 0.5, 0.09)
  const shift = pulse(t + phase * 1.7, 0.043)
  return {
    head: [breath * 0.011 - shift * 0.006, glance * 0.026 + shift * 0.018, glance * 0.005],
    leftShoulder: [breath * 0.008, shift * 0.010, -breath * 0.005 - shift * 0.014],
    rightShoulder: [breath * 0.008, shift * 0.010, breath * 0.005 - shift * 0.014],
    leftElbow: [shift * 0.012, 0, 0],
    rightElbow: [-shift * 0.012, 0, 0]
  }
}

function deitchPose (state, t, phase, variant = 0, base = null) {
  if (state === 'anxious') {
    // 숙박부 모서리를 반복해서 맞춘다 (STORY §2). 손은 상판에 붙어 있고 앞뒤로 밀었다
    // 당긴다 — 팔 길이(0.555)가 상한이라 왕복은 8cm다. 진폭은 손목 롤과 어깨 스윙으로
    // 보탠다. variant 0은 양손으로 좌우를 맞추고, 1은 오른손만 위 모서리를 민다.
    const solo = variant % 2 === 1
    const cycle = solo ? 3.8 : 3.0
    const local = (t + phase * cycle) % cycle
    const burst = ease(local / 0.42) * (1 - ease((local - (cycle - 1.15)) / 0.55))
    const beat = pulse(local, solo ? 0.85 : 1.25) * burst
    const push = 0.042 * burst + 0.026 * beat
    const lift = 0.014 * burst
    return mix(
      COUNTER_TWIST,
      armPose(1, rest(1).fwd + push, rest(1).down - lift, base, -0.05 * burst, 0.20 * burst + 0.16 * beat),
      armPose(-1, rest(-1).fwd + (solo ? 0 : push), rest(-1).down - (solo ? 0 : lift), base,
        0.05 * burst, solo ? 0 : 0.20 * burst - 0.16 * beat),
      { head: [0.10 * burst, (solo ? 0.075 : 0.028) * burst + beat * 0.045, -0.02 * beat] }
    )
  }

  if (state === 'lying') {
    // 오른손이 숙박부를 떠나 몸쪽으로 물러나며 내려간다 (STORY §2 "데스크 아래로").
    // **하강은 상판 선(y≈1.10)에서 멈춘다** — 그 아래로 더 내리면 상판이 손을 통째로
    // 가려 텔이 관찰 불가가 되기 때문이다(카메라로 풀 수 없는 세트 기하). 진폭은 27cm
    // 후퇴 + 어깨 스윙 + 시선 회피로 채운다. variant 1은 내려갔다가 스스로 거둔다.
    const reach = variant % 2 === 1
      ? ease(t / 0.62) * (1 - ease((t - 1.9) / 0.85))
      : ease(t / 0.78)
    const search = pulse(Math.max(0, t - 0.78), 0.42)
    return mix(
      COUNTER_TWIST,
      counterRest(base, -1),
      armPose(1, rest(1).fwd - 0.265 * reach, rest(1).down + 0.030 * reach, base,
        0.30 * reach, -0.34 * reach + search * 0.06),
      {
        head: [-0.05 - 0.12 * reach, -0.30 * reach, -0.05 * reach],
        leftShoulder: [0.03 * reach, 0, -0.04 * reach]
      }
    )
  }

  if (state === 'breaking') {
    // 안경을 벗고 눈두덩을 누른다 (STORY §2). 두 손이 카운터에서 얼굴로 올라온다.
    const reach = ease(t / 0.85)
    const press = ease((t - 1.20) / 0.72)
    const lerp = (a, b) => a + (b - a) * reach
    return mix(
      armPose(-1, lerp(rest(-1).fwd, 0.19), lerp(rest(-1).down, -0.15) - 0.03 * press,
        base, 0.10 * reach, -0.55 * reach),
      armPose(1, lerp(rest(1).fwd, 0.19), lerp(rest(1).down, -0.15) - 0.03 * press,
        base, -0.10 * reach, -0.55 * reach),
      { head: [-0.10 * reach - 0.20 * press, 0.02 * reach, -0.055 * press] }
    )
  }

  return mix(counterRest(base), standIdle(t, phase))
}

// 지나치는 카메라 쪽으로 고개를 반 박자 돌렸다 되돌린다. "세워둔 소품"과 "지나치는 사람"을
// 가르는 것은 자세의 정교함이 아니라 이쪽을 한 번 봤다는 사건 하나다(3차 판정 J3 배경 인형).
// 상시 미동(standIdle) 위에 얹히는 1회성 층이라 호흡·체중 이동은 그대로 돈다.
const GLANCE_T = 1.55

function glancePose (glance, t) {
  if (!glance) return null
  const age = t - glance.startedAt
  if (age < 0 || age > GLANCE_T) return null
  const turn = ease(age / 0.34) * (1 - ease((age - 0.80) / 0.72)) * glance.yaw
  return {
    head: [-0.05 * Math.abs(turn), turn, turn * 0.13],
    leftShoulder: [0, turn * 0.17, 0],
    rightShoulder: [0, turn * 0.17, 0]
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
    this.ambient = new Map()
    this.glances = new Map()
  }

  async init (engine) {
    this.engine = engine
    this.off.push(engine.bus.on('perf:state', ({ npc, state } = {}) => this.play(npc, state)))
    this.off.push(engine.bus.on('deduction:link', (payload = {}) => this.reactToLink(payload)))
    this.off.push(engine.bus.on('perf:glance', ({ npc } = {}) => this.glanceAt(npc)))
  }

  // 고개를 돌릴 각은 지금 카메라가 있는 쪽에서 잰다 — 고정 각으로 주면 카메라가 어느 쪽으로
  // 지나가든 같은 방향으로 돌아 "이쪽을 봤다"가 성립하지 않는다. 로컬 +z 가 얼굴 방향이라
  // 월드 행렬 3열이 그대로 정면 벡터다(THREE 를 새로 들일 필요가 없다). 목 가동범위로 제한한다.
  glanceAt (npc) {
    const rig = this.engine?.get('characters')?.rigs?.get(npc)
    const cam = this.engine?.camera
    if (!rig?.root || rig.root.visible === false || !cam) return false
    const e = rig.root.matrixWorld.elements
    const facing = Math.atan2(e[8], e[10])
    const toCam = Math.atan2(cam.position.x - e[12], cam.position.z - e[14])
    let yaw = toCam - facing
    while (yaw > Math.PI) yaw -= Math.PI * 2
    while (yaw < -Math.PI) yaw += Math.PI * 2
    this.glances.set(npc, {
      startedAt: Number.isFinite(this.engine.time) ? this.engine.time : 0,
      yaw: clamp(yaw, -0.62, 0.62)
    })
    return true
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

  // 신호를 아직 안 받은 인물의 상시 트랙. 배경 인형이 미동 없이 서 있어 마네킹으로
  // 읽히던 것(JUDGE J3)을 여기서 푼다 — 재생 중인 클립이 없어도 호흡은 돈다.
  _ambient (npc) {
    let track = this.ambient.get(npc)
    if (!track) {
      track = {
        npc, state: 'idle', clip: `${npc}.idle`, startedAt: 0, plays: 0, variant: 0,
        phase: rng(this.seedFor(npc))(), seed: this.seedFor(npc), joints: null, base: null
      }
      this.ambient.set(npc, track)
    }
    return track
  }

  update (dt, elapsed) {
    const time = Number.isFinite(elapsed) ? elapsed : (this.engine?.time || 0)
    const rigs = this.engine?.get('characters')?.rigs
    if (!rigs) return

    for (const [npc, rig] of rigs) {
      if (rig?.root?.visible === false) continue
      const track = this.tracks.get(npc) ?? this._ambient(npc)
      if (!this.bindRig(track, rig)) continue
      const local = Math.max(0, time - track.startedAt)
      const reaction = npc === 'doyle' ? doylePose(this.doyle.reaction, time) : null
      let pose
      if (reaction) pose = mix(relaxedStance(track.phase, track.base), standIdle(local, track.phase), reaction)
      else if (npc === 'deitch') pose = deitchPose(track.state, local, track.phase, track.variant, track.base)
      else if (track.state === 'breaking') pose = deitchPose('breaking', local, track.phase, 0, track.base)
      else {
        pose = mix(relaxedStance(track.phase, track.base), standIdle(local, track.phase),
          glancePose(this.glances.get(npc), time))
      }
      applyPose(track, pose, dt)
      rig.root.userData.performance = {
        state: reaction ? 'reaction' : track.state,
        clip: reaction ? `doyle.link-${this.doyle.reaction.ok ? this.doyle.successes : 'wrong'}` : track.clip,
        startedAt: reaction ? this.doyle.reaction.startedAt : track.startedAt,
        plays: reaction ? 1 : track.plays
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
    this.ambient.clear()
    this.glances.clear()
    this.engine = null
  }
}

export default new Performance()
