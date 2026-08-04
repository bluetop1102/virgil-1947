import * as THREE from 'three'
import { EventBus } from './bus.js'
import { GameState } from './state.js'
import { pickQuality, LOOK } from './config.js'
import { SHOTS } from './shotlist.js'

const TONE = {
  agx: THREE.AgXToneMapping,
  aces: THREE.ACESFilmicToneMapping,
  neutral: THREE.NeutralToneMapping,
  none: THREE.NoToneMapping
}

export class Engine {
  constructor (canvas) {
    this.canvas = canvas
    this.qa = new URLSearchParams(location.search).get('qa') === '1'
    this.quality = pickQuality(location.search)
    this.look = { ...LOOK }

    const dpr = this.qa ? 2 : Math.min(window.devicePixelRatio, 2)
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,          // TAA가 처리한다. MSAA와 병용하면 지터가 뭉갠다
      powerPreference: 'high-performance',
      stencil: false,
      depth: true
    })
    this.renderer.setPixelRatio(dpr)
    this.renderer.setSize(window.innerWidth, window.innerHeight, false)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = TONE[this.look.toneMapping] ?? THREE.AgXToneMapping
    this.renderer.toneMappingExposure = this.look.exposure
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.VSMShadowMap
    this.renderer.shadowMap.autoUpdate = true
    this.renderer.info.autoReset = false

    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.05, 400)
    this.camera.position.set(0, 1.68, 8)

    this.bus = new EventBus()
    this.state = new GameState(this.bus)
    this.modules = new Map()
    this.ordered = []
    this.time = 0
    this.frameIndex = 0
    this.size = { w: window.innerWidth, h: window.innerHeight, dpr }
    this._running = false
    this._lastRaf = 0

    window.addEventListener('resize', () => this._onResize())
  }

  register (mod) {
    if (!mod || !mod.name) throw new Error('module must have a name')
    if (this.modules.has(mod.name)) throw new Error(`duplicate module: ${mod.name}`)
    this.modules.set(mod.name, mod)
    return mod
  }

  get (name) { return this.modules.get(name) }

  async init () {
    this.ordered = [...this.modules.values()].sort((a, b) => (a.order ?? 50) - (b.order ?? 50))
    for (const m of this.ordered) {
      if (m.init) {
        try { await m.init(this) } catch (e) { console.error(`[init:${m.name}]`, e) }
      }
    }
    this._onResize()
    this.bus.emit('game:ready')
  }

  // 단일 프레임. QA 모드에서는 하네스가 이 함수를 고정 스텝으로 직접 호출한다.
  frame (dt) {
    this.time += dt
    this.frameIndex++
    this.renderer.info.reset()   // 프레임 시작에 리셋해야 stats()가 직전 프레임 수치를 읽는다
    for (const m of this.ordered) {
      if (m.update) {
        try { m.update(dt, this.time) } catch (e) { console.error(`[update:${m.name}]`, e) }
      }
    }
    const pipeline = this.modules.get('pipeline')
    if (pipeline && pipeline.render) pipeline.render(dt)
    else this.renderer.render(this.scene, this.camera)
  }

  start () {
    if (this.qa) return          // QA 모드는 하네스가 프레임을 몬다
    this._running = true
    const loop = (t) => {
      if (!this._running) return
      const dt = Math.min((t - this._lastRaf) / 1000 || 0.016, 0.05)
      this._lastRaf = t
      this.frame(dt)
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
  }

  stop () { this._running = false }

  _onResize () {
    const w = this.qa ? this.size.w : window.innerWidth
    const h = this.qa ? this.size.h : window.innerHeight
    this.size.w = w; this.size.h = h
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h, false)
    for (const m of this.ordered) m.resize?.(w, h)
  }

  // ── QA 하네스 API ───────────────────────────────────────────────
  // tools/shoot.mjs가 이 인터페이스에만 의존한다. 시그니처 변경 금지.
  harness () {
    const self = this
    return {
      ready: true,
      engine: self,
      shots: SHOTS,

      // 지정 시각까지 고정 스텝으로 시뮬레이션을 전진시킨다 (결정론)
      advanceTo (t, step = 1 / 60) {
        const target = Math.max(t, self.time)
        let guard = 0
        while (self.time < target && guard++ < 20000) self.frame(step)
      },

      // TAA/SSR 누적 수렴용. 카메라 정지 상태로 n프레임 더 돌린다
      settle (n = 24, step = 1 / 60) {
        for (let i = 0; i < n; i++) self.frame(step)
      },

      // 첫 샷 전 1회. 셰이더 컴파일과 재질 베이크를 여기서 다 끝내야 이후 샷이 타임아웃 없이 돈다.
      async warmup () {
        try { await self.renderer.compileAsync(self.scene, self.camera) } catch (e) { console.warn('[warmup]', e.message) }
        self.frame(1 / 60)
        return { calls: self.renderer.info.render.calls, programs: self.renderer.info.programs?.length ?? 0 }
      },

      setCamera ({ pos, target, fov }) {
        if (pos) self.camera.position.set(pos[0], pos[1], pos[2])
        if (fov) { self.camera.fov = fov; self.camera.updateProjectionMatrix() }
        if (target) self.camera.lookAt(target[0], target[1], target[2])
        self.camera.updateMatrixWorld(true)
      },

      async goto (name) {
        const s = SHOTS[name]
        if (!s) throw new Error(`unknown shot: ${name}`)
        self.state.setAct(s.act ?? 1)
        self.bus.emit('qa:shot', { name, shot: s })
        if (s.state) self.bus.emit('qa:state', s.state)
        await new Promise(r => setTimeout(r, 60))   // 레벨 스트리밍/시네마틱 반응 대기
        this.advanceTo(s.time ?? 10)
        this.setCamera(s)
        // 카메라를 순간이동시켰으므로 TAA 히스토리는 전부 무효다. 버리지 않으면 이전 위치의
        // 프레임이 리프로젝션돼 광원 주변에 복제 고스트와 가로 막대로 남는다 — 플레이 중에는
        // 생기지 않는, 촬영 하네스가 만들어낸 인공물이다.
        const taa = self.modules.get('pipeline')?.taa
        if (taa?.clear) { try { taa.clear(self.modules.get('pipeline').ctx) } catch {} }
        this.settle(self.quality.taa ? 48 : 4)
        return true
      },

      errors: [],
      stats () {
        return {
          time: self.time, frames: self.frameIndex,
          calls: self.renderer.info.render.calls,
          tris: self.renderer.info.render.triangles,
          textures: self.renderer.info.memory.textures,
          modules: [...self.modules.keys()]
        }
      }
    }
  }
}
