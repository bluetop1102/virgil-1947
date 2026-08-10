import * as THREE from 'three'
import { bevelBox, group, mesh } from '../world/kit.js'
import { EYE, HAND_AMP, InterrogationCamera, smooth, yawTo } from './camera.js'

export const INTRO_DURATION = 30

export const INTRO_BEATS = Object.freeze([
  { at: 0, id: 'black-water' },
  { at: 4, id: 'typewriter' },
  { at: 10, id: 'fade-in' },
  { at: 11.2, id: 'lobby-track' },
  { at: 22, id: 'badge' },
  { at: 27, id: 'handoff' },
  { at: 30, id: 'end' }
])

// 2026-08-10 사용자 지시 개편 2차: 나는 누구다 → 왜 왔다(신고 접수) → 왜 수상한가(호텔은
// 조용) → 먼저 뭘. 형사가 모를 수 없는 것만 말한다 — 수도 단수는 인게임 발견(다이치 S3·
// 민원 장부·수사노트 확인 항목)에 맡긴다. 신고 주체는 정본이 특정하지 않으므로 지어내지
// 않는다("들어왔다"). 행당 26자 이하(타자기 2초 예산).
const COPY = [
  '나는 LAPD 실종계 형사. 1947년 10월 11일.',
  '실종 신고가 들어왔다. 버질 호텔 942호, 이틀째.',
  '신고한 건 호텔이 아니다. 호텔은 조용했다.',
  '가서 들여다보는 게 내 일이다. 프런트부터.'
]

const HANDOFF_AT = 27
const CAMERA_START = new THREE.Vector3(0, EYE, 8.75)
const CAMERA_MID = new THREE.Vector3(0.45, EYE, 3.6)
const CAMERA_END = new THREE.Vector3(-1.25, 1.62, -1.38)
const SOFA_LOOK = new THREE.Vector3(2.85, 0.92, 3.72)
const DESK_LOOK = new THREE.Vector3(-1.35, 1.08, -3.18)
const DEITCH_LOOK = new THREE.Vector3(-3.35, 1.70, -4.25)
const BADGE_POS = new THREE.Vector3(-1.35, 1.105, -3.18)

// 트래킹 구간 경계. 총 길이 30s·`cinematic:end` 시점은 계약이라 건드리지 않고, 이 안에서만
// 시간을 다시 나눈다 — 출발을 페이드 꼬리(veil 35%)로 1초 당겨 1구간이 6.4s 를 쓴다.
const TRACK_IN = 11.2
const TRACK_TURN = 17.6
const TRACK_OUT = 22
// 로비 인형(프라이스) 앞을 스치는 지점의 구간 내 위치. 3차 판정 J1 "셔터가 아니라 속도" —
// 실측으로 이 순간 인형 얼굴이 초당 1727px 흘러 윤곽이 통째로 뭉갰다.
const PASS_AT = 0.60
const PASS_SPAN = 0.32
const PASS_SLOW = 0.62

// ∫₀ˣ smoothstep — 가속 램프가 훑는 거리를 닫힌 식으로 준다(A(1)=0.5).
const rampArea = (x) => x * x * x * (1 - x * 0.5)

// 사다리꼴 속도 프로파일. smoothstep 하나로 한 구간을 다 덮으면 순간속도가 평균의 1.5배까지
// 솟고, 그 첨두가 정확히 구간 한가운데(인형 통과 지점)에 앉는다. 양 끝만 가감속하고 가운데를
// 등속으로 두면 같은 거리·같은 시간에 첨두가 내려간다.
function cruise (u, ramp) {
  const v = 1 / (1 - ramp)
  if (u <= ramp) return v * ramp * rampArea(u / ramp)
  if (u >= 1 - ramp) return 1 - v * ramp * rampArea((1 - u) / ramp)
  return v * (ramp * 0.5 + (u - ramp))
}

// 통과 감속 — 인형 앞 [c-w, c+w] 구간에서만 시간이 느리게 흐른다. 잃은 만큼을 구간 전체가
// 나눠 가지므로(분모) 도착 시각과 총 이동거리는 그대로다. depth<1 이면 항상 단조증가한다.
function slowNear (u, c, w, depth) {
  const s = Math.min(1, Math.max(-1, (u - c) / w))
  const n = 0.5 * (s + 1) + Math.sin(Math.PI * s) / (2 * Math.PI)
  return (u - depth * w * n) / (1 - depth * w)
}


function makeBadge () {
  const root = group('cin-intro.badge')
  root.add(
    mesh(bevelBox(0.22, 0.018, 0.28, 0.018, 3), 'brass.polished', {
      pos: [0, 0, 0], wear: 0.32, seed: 1947
    }),
    mesh(bevelBox(0.075, 0.013, 0.105, 0.012, 3), 'bakelite.black', {
      pos: [0, 0.014, 0], wear: 0.2, seed: 942
    })
  )
  return root
}

function makeHand () {
  const root = group('cin-intro.hand')
  root.add(
    mesh(bevelBox(0.22, 0.105, 0.32, 0.045, 4), 'leather.worn.brown', {
      pos: [0, 0, 0], wear: 0.76, seed: 701
    }),
    mesh(bevelBox(0.075, 0.07, 0.26, 0.03, 3), 'leather.worn.brown', {
      pos: [-0.12, -0.005, -0.06], rot: [0, 0.18, -0.08], wear: 0.8, seed: 702
    }),
    mesh(bevelBox(0.075, 0.07, 0.26, 0.03, 3), 'leather.worn.brown', {
      pos: [-0.04, 0.002, -0.09], rot: [0, 0.08, -0.025], wear: 0.78, seed: 703
    }),
    mesh(bevelBox(0.075, 0.07, 0.25, 0.03, 3), 'leather.worn.brown', {
      pos: [0.045, 0.002, -0.08], rot: [0, -0.04, 0.02], wear: 0.78, seed: 704
    }),
    mesh(bevelBox(0.073, 0.068, 0.22, 0.03, 3), 'leather.worn.brown', {
      pos: [0.125, -0.004, -0.045], rot: [0, -0.14, 0.07], wear: 0.8, seed: 705
    })
  )
  return root
}


function buildOverlay () {
  const style = document.createElement('style')
  style.textContent = `
    .virgil-intro-veil{position:fixed;inset:0;z-index:92;background:#000;pointer-events:none;opacity:1}
    .virgil-intro-crosshair{position:fixed;left:50%;top:50%;z-index:91;width:16px;height:16px;transform:translate(-50%,-50%);pointer-events:none;opacity:0;transition:opacity 1.15s ease}
    .virgil-intro-crosshair:before,.virgil-intro-crosshair:after{content:'';position:absolute;background:rgba(218,208,187,.62);box-shadow:0 0 4px rgba(205,187,151,.16)}
    .virgil-intro-crosshair:before{left:7px;top:1px;width:1px;height:14px}
    .virgil-intro-crosshair:after{left:1px;top:7px;width:14px;height:1px}
  `
  const veil = document.createElement('div')
  veil.className = 'virgil-intro-veil'
  veil.hidden = true
  const crosshair = document.createElement('div')
  crosshair.className = 'virgil-intro-crosshair'
  crosshair.hidden = true
  document.head.appendChild(style)
  document.body.append(veil, crosshair)
  return { style, veil, crosshair }
}

const cinematics = {
  name: 'cinematics',
  order: 50,

  async init (engine) {
    this.engine = engine
    this.playing = false
    this.paused = false
    this.clock = 0
    this.fired = new Set()
    this.typed = ''
    this.handedOff = false
    this.off = []
    this.overlay = buildOverlay()

    this.badge = makeBadge()
    this.badge.visible = false
    this.badge.position.copy(BADGE_POS)
    this.badge.rotation.set(0, -0.08, 0.035)
    engine.scene.add(this.badge)

    this.hand = makeHand()
    this.hand.visible = false
    engine.scene.add(this.hand)

    this.off.push(engine.bus.on('title:proceed', ({ mode }) => {
      if (mode === 'new') this._startIntro()
    }))
    this.off.push(engine.bus.on('game:pause', ({ on }) => { this.paused = !!on }))
    this.interrogation = new InterrogationCamera(engine)
  },

  _startIntro () {
    if (this.playing) return
    this.playing = true
    this.paused = false
    this.clock = 0
    this.fired.clear()
    this.typed = ''
    this.handedOff = false
    this.badge.visible = false
    this.hand.visible = false
    this.overlay.veil.hidden = false
    this.overlay.veil.style.opacity = '1'
    this.overlay.crosshair.hidden = false
    this.overlay.crosshair.style.opacity = '0'
    this.engine.camera.fov = 40
    this.engine.camera.updateProjectionMatrix()
    this._syncPlayer(CAMERA_START, 0)
    this._frameCamera(0)
    this.engine.bus.emit('cinematic:start', { id: 'cin-intro' })
    this.engine.bus.emit('sfx', { id: 'pipe.knock', gain: 0.52 })
  },

  _once (id, fn) {
    if (this.fired.has(id)) return
    this.fired.add(id)
    fn()
  },

  _soundBeats (t) {
    if (t >= 1.25) this._once('pipe-thin', () => this.engine.bus.emit('sfx', { id: 'pipe.knock', gain: 0.25 }))
    if (t >= 2.35) this._once('drip-a', () => this.engine.bus.emit('sfx', { id: 'water.drip', gain: 0.48 }))
    if (t >= 3.35) this._once('drip-b', () => this.engine.bus.emit('sfx', { id: 'water.drip', gain: 0.31 }))
    if (t >= 11.9) this._once('radio-a', () => this.engine.bus.emit('sfx', { id: 'light.buzz', pos: [2, 0.9, -1.85], gain: 0.32 }))
    if (t >= 16.2) this._once('radio-b', () => this.engine.bus.emit('sfx', { id: 'light.buzz', pos: [2, 0.9, -1.85], gain: 0.22 }))
    if (t >= 22) this._once('badge-hit', () => {
      this.engine.bus.emit('sfx', { id: 'key.jingle', pos: BADGE_POS.toArray(), gain: 0.48 })
      this.engine.bus.emit('sfx', { id: 'door.close', pos: BADGE_POS.toArray(), gain: 0.16 })
      // E2 0:22 "라디오가 잦아든다". 지금은 AUDIO 가 `cinematic:start` 에서 +22 를 자체
      // 예약해 우회 중이라(HANDOFF 종결분) 이 통지를 아직 아무도 안 듣는다 — 그래도 시각의
      // 진실원은 이 비트다. AUDIO 가 여기에 결박하면 자체 타이머를 지울 수 있다.
      this.engine.bus.emit('cinematic:beat', { id: 'cin-intro', beat: 'radio-fade', at: 22 })
    })
  },

  _typeCopy (t) {
    if (t < 4 || t >= 12) return
    const row = Math.min(3, Math.floor((t - 4) / 2))
    const local = (t - 4) - row * 2
    const source = COPY[row]
    const count = Math.min(source.length, 1 + Math.floor(local / 2 * source.length))
    const next = source.slice(0, count)
    const key = `${row}:${next}`
    if (!next || key === this.typed) return
    this.typed = key
    // dur 하한 0.9 — 행 끝(local≈2)에서 dur 이 0.05까지 줄면 타이핑 줄이 행 전환 전에
    // 사라져 깜빡인다. 다음 partial 의 show() 가 즉시 대체하므로 하한이 길어도 겹치지 않는다.
    this.engine.bus.emit('subtitle', { speaker: '', text: next, dur: Math.max(2.05 - local, 0.9) })
    this.engine.bus.emit('sfx', { id: 'ui.tick', gain: 0.13 })
  },

  _cameraPose (t, pos, look) {
    if (t < TRACK_IN) {
      pos.copy(CAMERA_START)
      look.copy(DESK_LOOK)
      return
    }
    if (t < TRACK_TURN) {
      const u = (t - TRACK_IN) / (TRACK_TURN - TRACK_IN)
      const p = cruise(slowNear(u, PASS_AT, PASS_SPAN, PASS_SLOW), 0.18)
      pos.lerpVectors(CAMERA_START, CAMERA_MID, p)
      // 소파 쪽 스윙 진폭. 1.0(소파 정면)이면 왕복 각속도가 47°/s 까지 올라가 지나치는 것이
      // 전부 흐른다 — 팔걸이가 프레임에 남는 선까지만 돌린다(E2 0:12 "스치고").
      look.lerpVectors(DESK_LOOK, SOFA_LOOK, Math.sin(p * Math.PI) * 0.82)
      return
    }
    if (t < TRACK_OUT) {
      // 시선은 1구간이 이미 데스크로 돌려놓았다. 옛 판은 여기서 소파를 다시 집어 t=18 에
      // 한 프레임 2164°/s 스냅(시선 표적 8m 순간이동)이 났다 — 실측. 2구간은 데스크를 문
      // 채로 들어가는 순수 달리다.
      pos.lerpVectors(CAMERA_MID, CAMERA_END, cruise((t - TRACK_TURN) / (TRACK_OUT - TRACK_TURN), 0.24))
      look.copy(DESK_LOOK)
      return
    }
    pos.copy(CAMERA_END)
    look.lerpVectors(DESK_LOOK, DEITCH_LOOK, smooth((t - 23.3) / 2.2))
  },

  _frameCamera (t) {
    if (this.handedOff) return
    const camera = this.engine.camera
    const pos = new THREE.Vector3()
    const look = new THREE.Vector3()
    this._cameraPose(t, pos, look)
    camera.position.copy(pos)
    camera.lookAt(look)
    camera.rotateY(Math.sin(t * Math.PI * 0.8) * HAND_AMP)
    camera.rotateX(Math.cos(t * Math.PI * 0.8 + 0.7) * HAND_AMP * 0.36)
    camera.updateMatrixWorld(true)
    this._syncPlayer(pos, yawTo(pos, look))
  },

  _syncPlayer (cameraPos, yaw) {
    const player = this.engine.get('player')
    if (!player) return
    player.teleport?.([cameraPos.x, cameraPos.y - EYE, cameraPos.z], yaw)
    player.body?.setPosition?.(cameraPos.x, (player.body.height ?? 1.78) * 0.5, cameraPos.z)
  },

  _frameProps (t) {
    if (t < 21.35 || t >= 25.15) {
      this.hand.visible = false
      return
    }
    const camera = this.engine.camera
    const arrive = smooth((t - 21.35) / 1.1)
    const leave = smooth((t - 23.2) / 1.95)
    const local = new THREE.Vector3(
      THREE.MathUtils.lerp(0.48, 0.12, arrive) + leave * 0.5,
      THREE.MathUtils.lerp(-0.43, -0.23, arrive) - leave * 0.2,
      THREE.MathUtils.lerp(-0.78, -1.38, arrive) + leave * 0.45
    )
    this.hand.position.copy(local.applyMatrix4(camera.matrixWorld))
    this.hand.quaternion.copy(camera.quaternion)
    this.hand.rotateX(-0.32)
    this.hand.rotateY(0.16)
    this.hand.visible = true
    if (t >= 22) this.badge.visible = true
  },

  _storyBeats (t) {
    // 트래킹이 지나갈 때 로비 인형이 한 번씩 이쪽을 본다. 프레임 밖에서 도는 반응은
    // 아무것도 아니라, 시각은 각자 **화면 안에 있는 동안**의 실측으로 잡았다 —
    // 프라이스 t=12.4~13.8(최근접 2.1m) · 루이즈 t=11.9~16.2(화면 x 1120~1257 로 가장
    // 안쪽인 구간이 13.4~15.0). 반응 길이는 1.55s(perf.js GLANCE_T)라 여기서 0.35s 뒤에 선다.
    if (t >= 12.5) this._once('glance-pryce', () => this.engine.bus.emit('perf:glance', { npc: 'pryce' }))
    if (t >= 13.4) this._once('glance-ruiz', () => this.engine.bus.emit('perf:glance', { npc: 'ruiz' }))
    if (t >= 17.15) this._once('radio-line', () => {
      this.engine.bus.emit('subtitle', { speaker: '라디오', text: '…9층에서 물소리가 나면…', dur: 2.15 })
    })
    if (t >= 22) this._once('badge-visible', () => { this.badge.visible = true })
    if (t >= 24.05) this._once('deitch-greeting', () => {
      this.engine.bus.emit('subtitle', { speaker: 'deitch', text: '…형사님. 또 오셨군요.', dur: 2.55 })
    })
    if (t >= HANDOFF_AT) this._once('handoff', () => this._handoff())
    // 이양 직후 첫 목표. 조작을 넘겨받은 화면에 읽을 것이 한 줄도 없어서 신선 플레이어가
    // 어디로 가야 하는지 알 길이 없었다(JUDGE §0-3 실측 — 가시 텍스트 0건). 목표 제시와
    // 첫 상호작용 유도를 형사 독백 한 줄이 겸한다.
    if (t >= 29.75) this._once('first-goal', () => {
      this.engine.bus.emit('subtitle', { speaker: '', text: '신고를 안 한 건 프런트다. 숙박부부터.', dur: 4.2 })
    })
  },

  _handoff () {
    const pos = CAMERA_END
    const yaw = yawTo(pos, DEITCH_LOOK)
    this._syncPlayer(pos, yaw)
    this.handedOff = true
    this.hand.visible = false
    this.overlay.crosshair.style.opacity = '1'
    this.engine.bus.emit('subtitle', { speaker: 'deitch', text: '그 방은 열려 있습니다.', dur: 2.65 })
  },

  _finish () {
    if (!this.playing) return
    this.playing = false
    this.hand.visible = false
    this.overlay.veil.hidden = true
    this.engine.bus.emit('cinematic:end', { id: 'cin-intro' })
  },

  update (dt) {
    if (!this.paused) this.interrogation?.update(dt)
    if (!this.playing || this.paused) return
    this.clock = Math.min(INTRO_DURATION, this.clock + dt)
    const t = this.clock
    this.overlay.veil.style.opacity = String(1 - smooth((t - 10) / 2))
    this._soundBeats(t)
    this._typeCopy(t)
    this._frameCamera(t)
    this._frameProps(t)
    this._storyBeats(t)
    if (t >= INTRO_DURATION) this._finish()
  },

  dispose () {
    for (const off of this.off ?? []) off()
    this.interrogation?.dispose()
    this.badge?.parent?.remove(this.badge)
    this.hand?.parent?.remove(this.hand)
    this.overlay?.veil?.remove()
    this.overlay?.crosshair?.remove()
    this.overlay?.style?.remove()
  }
}

export default cinematics
