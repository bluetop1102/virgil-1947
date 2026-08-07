import * as THREE from 'three'
import { bevelBox, group, mesh } from '../world/kit.js'

export const INTRO_DURATION = 30

export const INTRO_BEATS = Object.freeze([
  { at: 0, id: 'black-water' },
  { at: 4, id: 'typewriter' },
  { at: 10, id: 'fade-in' },
  { at: 12, id: 'lobby-track' },
  { at: 22, id: 'badge' },
  { at: 27, id: 'handoff' },
  { at: 30, id: 'end' }
])

const COPY = [
  '1947년 10월 11일.',
  '버질 호텔, 버질 애비뉴.',
  '9층까지 물이 오르지 않는다.',
  '942호 손님이 이틀째 보이지 않는다.'
]

const EYE = 1.68
const HANDOFF_AT = 27
const CAMERA_START = new THREE.Vector3(0, EYE, 8.75)
const CAMERA_MID = new THREE.Vector3(0.45, EYE, 3.6)
const CAMERA_END = new THREE.Vector3(-1.25, 1.62, -1.38)
const SOFA_LOOK = new THREE.Vector3(2.85, 0.92, 3.72)
const DESK_LOOK = new THREE.Vector3(-1.35, 1.08, -3.18)
const DEITCH_LOOK = new THREE.Vector3(-3.35, 1.70, -4.25)
const BADGE_POS = new THREE.Vector3(-1.35, 1.105, -3.18)
const HAND_AMP = THREE.MathUtils.degToRad(0.15)

function clamp01 (v) {
  return Math.min(1, Math.max(0, v))
}

function smooth (v) {
  const x = clamp01(v)
  return x * x * (3 - 2 * x)
}

function yawTo (from, target) {
  return Math.atan2(-(target.x - from.x), -(target.z - from.z))
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
    this.engine.bus.emit('subtitle', { speaker: '', text: next, dur: 2.05 - local })
    this.engine.bus.emit('sfx', { id: 'ui.tick', gain: 0.13 })
  },

  _cameraPose (t, pos, look) {
    if (t < 12) {
      pos.copy(CAMERA_START)
      look.copy(DESK_LOOK)
      return
    }
    if (t < 18) {
      const p = smooth((t - 12) / 6)
      pos.lerpVectors(CAMERA_START, CAMERA_MID, p)
      look.lerpVectors(DESK_LOOK, SOFA_LOOK, Math.sin(p * Math.PI))
      return
    }
    if (t < 22) {
      const p = smooth((t - 18) / 4)
      pos.lerpVectors(CAMERA_MID, CAMERA_END, p)
      look.lerpVectors(SOFA_LOOK, DESK_LOOK, p)
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
    if (t >= 17.15) this._once('radio-line', () => {
      this.engine.bus.emit('subtitle', { speaker: '라디오', text: '…9층에서 물소리가 나면…', dur: 2.15 })
    })
    if (t >= 22) this._once('badge-visible', () => { this.badge.visible = true })
    if (t >= 24.05) this._once('deitch-greeting', () => {
      this.engine.bus.emit('subtitle', { speaker: 'deitch', text: '…형사님. 또 오셨군요.', dur: 2.55 })
    })
    if (t >= HANDOFF_AT) this._once('handoff', () => this._handoff())
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
    this.badge?.parent?.remove(this.badge)
    this.hand?.parent?.remove(this.hand)
    this.overlay?.veil?.remove()
    this.overlay?.crosshair?.remove()
    this.overlay?.style?.remove()
  }
}

export default cinematics
