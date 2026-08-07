import { Engine } from './core/engine.js'

// 모듈은 파일 존재 여부로 자동 등록된다. 병렬 작업 중 아직 없는 모듈이 있어도 앱은 부팅해야 한다.
// default export가 {name, order, init, update} 형태인 파일만 모듈로 취급한다 (library/kit 등은 제외).
const found = import.meta.glob([
  './render/*.js',
  './materials/*.js',
  './world/*.js',
  './chars/*.js',
  './gameplay/*.js',
  './narrative/*.js',
  './audio/*.js',
  './ui/*.js',
  './physics/*.js'
])

const canvas = document.getElementById('stage')
const engine = new Engine(canvas)
window.__ENGINE__ = engine

const boot = document.getElementById('boot')
const bootMsg = document.getElementById('boot-msg')

const errors = []
window.addEventListener('error', e => errors.push(String(e.message)))
window.addEventListener('unhandledrejection', e => errors.push(String(e.reason)))

const loaded = []
for (const [path, load] of Object.entries(found)) {
  try {
    const m = await load()
    const d = m.default
    if (d && typeof d === 'object' && d.name && (d.init || d.update)) {
      engine.register(d)
      loaded.push(d.name)
    }
  } catch (e) {
    console.error(`[load] ${path}`, e)
    errors.push(`load ${path}: ${e.message}`)
  }
}

const bootModules = [...engine.modules.values()].filter(mod => typeof mod.init === 'function')
const bootState = { done: 0, total: bootModules.length + 1 }
window.__VIRGIL_BOOT__ = bootState
const reportBootProgress = () => {
  bootState.done = Math.min(bootState.done + 1, bootState.total)
  engine.bus.emit('boot:progress', { done: bootState.done, total: bootState.total })
}
for (const mod of bootModules) {
  const init = mod.init
  mod.init = async function (activeEngine) {
    try { return await init.call(this, activeEngine) } finally { reportBootProgress() }
  }
}

if (bootMsg) bootMsg.textContent = `${loaded.length} systems online`
await engine.init()
engine.frame(1 / 60)
reportBootProgress()

const harness = engine.harness()
harness.errors = errors
harness.loaded = loaded
window.__CECIL__ = harness

// ?scene=corridor-night 처럼 무드 이름을 주면 그 공간을 짓고 거기서 시작한다.
// 실제 레벨(lobby/corridor/room942/rooftop 모듈)이 나오기 전까지, 지금까지 만들어진 공간을
// 직접 걸어다니며 확인하기 위한 진입로다. 공간은 QA 프로브와 같은 것이라 월드 y=-500에 있다.
const scene = new URLSearchParams(location.search).get('scene')
if (scene) {
  const SPAWN = {
    'corridor-night': [0.4, 6.2],
    'lobby-night': [4.6, 5.4],
    'room-dusk': [3.8, 4.0],
    bathroom: [2.6, 3.4],
    'rooftop-rain': [5.2, 5.6],
    interrogation: [0.05, 1.15]
  }
  const [sx, sz] = SPAWN[scene] || [0, 6]
  const y = -500 + 1.68
  engine.bus.emit('qa:shot', { name: `scene-${scene}` })   // testbed가 스스로 물러난다
  engine.bus.emit('qa:state', { scene: 'atmo-probe', mood: scene })
  engine.camera.position.set(sx, y, sz)
  engine.camera.lookAt(sx * 0.2, y - 0.2, sz - 8)
  const p = engine.get('player')
  if (p) {
    // 플레이어는 init 때 충돌 대상을 수집한다. 프로브는 방금 생겼으니 다시 훑지 않으면
    // 바닥이 없는 것으로 보고 그대로 낙하한다.
    // 프로브 지오메트리는 rapier 월드에 콜라이더가 없다. 물리 캐릭터를 그대로 두면
    // 허공을 짚고 끝없이 낙하하므로, 씬 모드에서는 플레이어 자체의 레이캐스트 충돌로 폴백시킨다.
    p.body = null
    p.physFail = true
    p.floorY = -500
    p._scan?.()
    p.pos?.set(sx, -500, sz)   // pos는 발 위치. 공간 로컬 바닥이 0이므로 월드로는 -500
    p.vy = 0
  }
  console.log(`[virgil] scene=${scene} — 진입`)
}

if (boot) {
  boot.classList.add('gone')
  setTimeout(() => boot.remove(), 900)
}

engine.start()
console.log('[virgil] modules:', loaded.join(', ') || '(none)')
