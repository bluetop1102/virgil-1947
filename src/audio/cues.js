// [AUDIO] 상호작용·연출 큐 배선. audio/engine.js 소유의 분권 파일이다.
//
// 발주 근거: 상호작용이 있는데 소리가 없는 지점이 실제로 많았다. `player:interact` 는 어떤 모듈도
// 소리로 받지 않아서 격자문·라디오 다이얼·압지·팔걸이가 전부 무음이었고, 수사노트 개폐·조서
// 서명도 마찬가지였다. 소리를 다는 쪽은 오디오 소유자다 — 레벨·UI 파일을 건드리지 않고
// 기존 이벤트만 구독해서 붙인다.

import { musicCue } from './music.js'

// 상호작용 대상 id → 소리. 정확 일치가 먼저고, 없으면 아래 부분 일치로 떨어진다.
const TARGET = {
  'lobby/elevator': ['gate.slide', 0.7],
  'radio-lobby': ['radio.dial', 0.55],
  'lobby-frame': ['cloth.rustle', 0.3],
  'lobby/blotter': ['paper.pickup', 0.34],
  'lobby/sofa-arm': ['cloth.rustle', 0.4]
}

// 2·3막 공간(P2 범위)이 붙을 때 무음으로 돌아가지 않게 하는 폴백. 명시 등재가 언제나 이긴다.
const TARGET_PART = [
  ['gate', ['gate.slide', 0.7]],
  ['elevator', ['gate.slide', 0.7]],
  ['drawer', ['drawer.pull', 0.5]],
  ['door', ['door.open', 0.5]],
  ['radio', ['radio.dial', 0.55]],
  ['hatch', ['tank.hollow', 0.55]],
  ['wrench', ['wrench.clank', 0.5]],
  ['valve', ['pipe.knock', 0.45]]
]

export function cueFor (targetId) {
  const s = String(targetId ?? '').toLowerCase()
  if (TARGET[targetId]) return TARGET[targetId]
  for (const [k, v] of TARGET_PART) if (s.includes(k)) return v
  return null
}

export function wireCues (a, bus) {
  bus.on('player:interact', (p) => {
    const cue = cueFor(p?.targetId)
    if (cue) a.play(cue[0], { gain: cue[1] })
  })

  // 게임의 첫 소리. 벨을 누르라고 써 있는데 벨이 울리지 않았다.
  // 이 이벤트는 첫 제스처와 같은 프레임에 온다 — 컨텍스트가 아직 없으면 engine 이 열릴 때 흘려보낸다.
  bus.on('title:proceed', (p) => {
    if (p?.mode !== 'new') return
    a.playOrDefer('desk.bell', { gain: 0.62 })
    a.playOrDefer('desk.bell', { gain: 0.2, rate: 1.008, delay: 0.185 })
  })

  bus.on('ui:open', () => a.play('notebook.open', { gain: 0.45 }))
  bus.on('ui:close', () => a.play('notebook.close', { gain: 0.42 }))

  // 심문 선택은 UI 클릭이 아니라 형사가 노트에 적는 소리다.
  bus.on('interrogation:choose', () => a.play('note.scribble', { gain: 0.18, rate: 1.15 }))
  bus.on('deduction:link', (p) => {
    if (p?.ok) a.play('paper.pickup', { gain: 0.42, rate: 0.9 })
    else a.play('note.scribble', { gain: 0.22, rate: 0.85 })
  })
  bus.on('deduction:sign', () => a.play('note.scribble', { gain: 0.6, rate: 0.8 }))

  // 음악 — 계약상 1막 비디제틱 BGM 0. 여기서 도는 것은 물의 리트모티프의 음정 진술뿐이다(music.js).
  bus.on('cinematic:start', (p) => {
    const id = String(p?.id ?? '')
    if (id.includes('ending')) musicCue(a, 'ending')
    else if (id === 'cin-intro') musicCue(a, 'intro')
  })
  bus.on('act:enter', (p) => { if (p?.act === 3) musicCue(a, 'act3') })
  bus.on('act:phase', (p) => { if (p?.act === 1 && p?.phase === 'late') musicCue(a, 'phase') })
}
