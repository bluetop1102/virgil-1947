// [LEVEL-TRANSIT] 2막 플레이 루프. 엘리베이터(act:enter{act:2}) → 9층 복도 → 942호 수색 → 종막.
//
// 공간은 새로 짓지 않는다. `world/atmo/spaces.js` 의 프로브 공간(corridor-night · room-dusk)을
// main.js 의 `?scene=` 배관과 **똑같은 방식**으로 켠다 — `qa:state{scene:'atmo-probe', mood}` 한 발이
// atmosphere(공간·광원)·audio(리버브·룸톤)·testbed(퇴장)를 모두 몰기 때문이다. 그래서 이 파일이
// 소유하는 것은 지오메트리가 아니라 **전환 규칙**뿐이다.
//
// 좌표 규약: 프로브 공간은 월드 y=-500(probe.js OY)에 격리돼 있다. 로비(y=0)와 겹치지 않으므로
// 언로드가 필요 없고, 대신 플레이어를 그 층으로 내려보낼 때 AGENTS.md 의 씬 모드 규약을 그대로
// 따른다 — `player.body=null` · `physFail=true` · `floorY=OY` · `teleport()`(pos 직접 대입 금지).

import { group } from './kit.js'
import { doorUnit, journal, keyBrass, ledger } from './props.js'
import { OY } from './atmo/probe.js'

// 공간 정의. spawn 은 공간 로컬 좌표(바닥 0)이고 yaw 는 player 규약(0 = -z 방향).
const SPACES = {
  corridor: {
    mood: 'corridor-night',
    room: 'corridor9',            // ARCHITECTURE §5 room:changed 정본 어휘
    spawn: [0.4, 6.2],            // main.js SPAWN['corridor-night'] 과 같은 자리
    yaw: 0,
    line: '9층'
  },
  room942: {
    mood: 'room-dusk',
    room: 'room942',
    spawn: [3.8, 4.0],            // main.js SPAWN['room-dusk']
    yaw: 0.67,                    // 창(우측 뒤)을 등지고 방 안쪽을 본다
    line: '942호'
  }
}

// 복도 좌측 벽(카메라 기준 우측) z=1.9 문 = 942호. spaces.js corridor() 의 문 배치와 같은 값이다.
const DOOR942 = [-1.40, 1.9]

const T_942_DOOR = 'corridor9/942-door'
const T_HALL_DOOR = 'room942/hall-door'

// 942호 수색 증거 3종. 위치는 spaces.js roomDusk() 의 침대(-2.5,-1.4 · rotY=PI/2)와
// 여행가방(1.2,2.4)에 붙인다 — script.js EVIDENCE 의 foundIn(침대 밑·매트리스·여행가방) 그대로다.
const FINDS = [
  { id: 'journal', make: () => journal(901).root, pos: [-1.34, 0.012, -1.08], rot: 0.42 },
  { id: 'roofkey', make: () => keyBrass(902, { len: 0.11 }).root, pos: [-2.86, 0.525, -1.58], rot: -0.9, lay: true },
  { id: 'autopsy', make: () => ledger(903).root, pos: [1.16, 0.212, 2.36], rot: -0.4 }
]

// 종막 개방 조건. 일기와 옥상 열쇠 두 점이 2막의 실질 소득이다(부검 사본은 프라이스 심문용).
const EXIT_KEYS = ['journal', 'roofkey']

// 프로브 공간의 직계 자식 중 이름이 같고 가장 가까운 것. 문·소품은 spaces.js 가 세운 실물이라
// 상호작용은 그 위에 얹는다(보이지 않는 히트박스를 새로 만들지 않는다 — 재질 계약 6.5·D4).
function nearestNamed (root, name, x, z, max = 0.9) {
  let best = null
  let bd = max * max
  for (const child of root.children) {
    if (child.name !== name) continue
    const dx = child.position.x - x
    const dz = child.position.z - z
    const d = dx * dx + dz * dz
    if (d < bd) { bd = d; best = child }
  }
  return best
}

function tag (obj, id, data) {
  if (!obj) return null
  obj.userData.qaId = id
  obj.userData.interact = { id, ...data }
  return obj
}

export default {
  name: 'transit',
  order: 72,          // lobby(70) 뒤 · ui(80) 앞

  engine: null,
  where: null,        // null(로비) | 'corridor' | 'room942'
  busy: false,
  settle: 0,
  queue: null,
  off: null,
  root: null,
  props: null,
  finds: null,
  loreDone: false,

  async init (engine) {
    this.engine = engine
    this.queue = []
    this.off = []
    this.finds = []

    // ?scene= 진입로는 이미 프로브에 서 있는 상태다. 그 위에 전환을 겹치면 진입로가 깨진다.
    this.disabled = new URLSearchParams(location.search).has('scene')

    this.root = group('level/transit')
    this.root.position.y = OY
    this.root.visible = false
    engine.scene.add(this.root)
    this._buildRoom(engine)

    this.off.push(engine.bus.on('act:enter', ({ act }) => {
      if (act === 2 && !this.disabled) this.go('corridor')
    }))
    this.off.push(engine.bus.on('player:interact', ({ targetId }) => this._onInteract(targetId)))
    this.off.push(engine.bus.on('evidence:collected', () => this._loreBeat()))
  },

  // 942호에 실물로 더해지는 것들. 방을 나가는 문은 프로브 공간에 없어서 여기서 세운다.
  _buildRoom (engine) {
    this.props = group('transit/room942')
    this.props.visible = false
    this.root.add(this.props)

    const hall = doorUnit(910, { w: 0.90, h: 2.08 }).root
    hall.position.set(3.5, 0, 5.36)
    hall.rotation.y = Math.PI                 // Z1 벽에 붙어 방 안쪽(-z)을 본다
    tag(hall, T_HALL_DOOR, { kind: 'transition', prompt: '복도로 나간다' })
    this.props.add(hall)

    const evidence = engine.get('evidence')
    for (const find of FINDS) {
      const obj = find.make()
      obj.position.fromArray(find.pos)
      obj.rotation.y = find.rot
      if (find.lay) obj.rotation.x = -Math.PI / 2   // keyBrass 는 -y 로 뻗는다 — 눕힌다
      this.props.add(obj)
      evidence?.registerPickup?.(obj, find.id)
      obj.userData.qaId = `room942/${find.id}`
      this.finds.push(obj)
    }
  },

  // ── 전환 ────────────────────────────────────────────────────────
  // 암전에 층수를 얹는다. 새 공간의 첫 렌더는 셰이더 컴파일·섀도맵 때문에 실측 11.5초까지
  // 걸리는데(S-P 계측), 그동안 순흑이면 멎은 화면이다 — 같은 시간을 막 표제로 쓴다.
  go (name) {
    if (this.busy || this.where === name || !SPACES[name]) return false
    this.busy = true
    this.engine.bus.emit('transit:veil', { on: true, dur: 0.5, caption: SPACES[name].line })
    this._at(this.engine.time + 0.62, () => this._arrive(name))
    return true
  },

  _arrive (name) {
    const sp = SPACES[name]
    const e = this.engine

    // 로비는 언로드하지 않는다(y=0 vs -500 격리). 다만 꺼두지 않으면 player._scan 이 로비의
    // 전 메시를 충돌 후보로 계속 긁어모아, 레이캐스트 폴백 이동이 그만큼 느려진다.
    const lobby = e.scene.getObjectByName('level/lobby')
    if (lobby) lobby.visible = false

    e.state.setRoom(sp.room)
    e.bus.emit('qa:state', { scene: 'atmo-probe', mood: sp.mood })

    this.root.visible = true
    this.props.visible = name === 'room942'
    if (name === 'corridor') this._bindCorridor()

    const p = e.get('player')
    if (p) {
      // 프로브 지오메트리에는 rapier 콜라이더가 없다 — 물리 캐릭터를 그대로 두면 허공을 짚고
      // 낙하한다. 씬 모드와 같은 폴백으로 내린다(AGENTS.md `?scene=` 진입로 규약).
      p.body = null
      p.physFail = true
      p.floorY = OY
      p.teleport([sp.spawn[0], OY, sp.spawn[1]], sp.yaw)
      // teleport 는 yaw 만 잡는다 — 직전 행동(문고리를 내려다보기)의 피치가 그대로 남으면
      // 새 공간의 첫 프레임이 바닥을 보고 시작한다.
      p.pitch = p.pitchT = 0
      p._scan?.()
    }

    this.where = name
    // 암전 해제는 **프레임 수**로 센다. 새 공간의 첫 프레임은 셰이더 컴파일·섀도맵 때문에
    // 통째로 히치가 나고, 그동안 engine.time 은 dt 클램프에 걸려 거의 멈춘다 — 시간 기반으로
    // 걸면 화면은 검은 채로 몇 초를 버틴다(S-P 1차 실측: 1.4s 뒤에도 veil=1).
    this.settle = 4
    this.settleTotal = 0
  },

  // delay 0.6 은 두 번째 방문(이미 컴파일된 공간)에서 표제가 스치듯 지나가지 않게 잡는 하한이다.
  _settled () {
    this.engine.bus.emit('transit:veil', { on: false, dur: 0.9, delay: 0.6 })
    this.busy = false
  },

  // 복도 공간이 서고 나서야 문 실물이 존재한다 — 도착 시점에 한 번만 태그를 얹는다.
  _bindCorridor () {
    if (this.doorTagged) return
    const space = this.engine.scene.getObjectByName('atmo.space.corridor-night')
    const door = space ? nearestNamed(space, 'doorUnit', DOOR942[0], DOOR942[1]) : null
    if (!door) return
    tag(door, T_942_DOOR, { kind: 'transition', prompt: '942호. 문을 연다' })
    this.doorTagged = true
  },

  _onInteract (targetId) {
    if (this.busy) return
    if (targetId === T_942_DOOR && this.where === 'corridor') { this.go('room942'); return }
    if (targetId !== T_HALL_DOOR || this.where !== 'room942') return
    const state = this.engine.state
    if (EXIT_KEYS.every(id => state.has(id))) { this._finale(); return }
    this.engine.bus.emit('subtitle', { speaker: '', text: '아직 이 방에서 볼 것이 남았다.', dur: 2.4 })
  },

  // 괴담 비트. 942호에서 두 번째 증거가 손에 들어오는 순간 한 줄. 원문은 script.js LORE 가
  // 소유하고 발화는 interrogation._lore 가 한다 — 여기서 대사를 짓지 않는다(STORY §7).
  _loreBeat () {
    if (this.loreDone || this.where !== 'room942') return
    const state = this.engine.state
    if (FINDS.filter(f => state.has(f.id)).length < 2) return
    this.loreDone = true
    // 로비 숙박부 여백에서 이미 들은 사람에게는 같은 줄을 두 번 읽어주지 않는다.
    const heard = this.engine.get('evidence')?.heardLore
    const id = heard && [...heard].some(k => k.startsWith('lore.lightwell')) ? 'lore.linen' : 'lore.lightwell'
    this.engine.bus.emit('lore:heard', { id, medium: 'linen-wall' })
  },

  // 카드 등장은 벽시계(ui/finale.js 의 CSS 지연)가 잡는다 — 암전이 다 덮이기 전에 글자가
  // 뜨면 종막이 아니라 팝업이 된다.
  _finale () {
    this.busy = true
    this.engine.bus.emit('transit:veil', { on: true, dur: 1.0 })
    this.engine.bus.emit('finale:show', { delay: 1.15 })
  },

  // ── engine.time 기반 지연 큐 (Date.now 금지 계약) ────────────────
  _at (time, run) { this.queue.push({ time, run }) },

  update (dt, elapsed) {
    const t = Number.isFinite(elapsed) ? elapsed : this.engine.time
    while (this.queue.length && t >= this.queue[0].time) this.queue.shift().run()
    if (this.settle > 0) {
      // dt 가 엔진 클램프 상한(0.05)에 붙은 프레임은 셰이더 컴파일 히치다 — 그 동안 걸으면
      // 이동이 먹통으로 체감된다(배포 실기기 보고 2026-08-10). 매끈한 4프레임 연속까지 유지,
      // 240프레임 상한으로 영구 암전은 방지.
      if (dt >= 0.045) this.settle = 4
      else if (--this.settle === 0) { this._settled(); return }
      if (++this.settleTotal > 240) { this.settle = 0; this._settled() }
    }
  },

  dispose () {
    for (const off of this.off ?? []) off()
    const evidence = this.engine?.get('evidence')
    for (const obj of this.finds ?? []) evidence?.unregister?.(obj)
    this.root?.parent?.remove(this.root)
  }
}
