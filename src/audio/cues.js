// [AUDIO] 상호작용·연출 큐 배선. audio/engine.js 소유의 분권 파일이다.
//
// 발주 근거: 상호작용이 있는데 소리가 없는 지점이 실제로 많았다. `player:interact` 는 어떤 모듈도
// 소리로 받지 않아서 격자문·라디오 다이얼·압지·팔걸이가 전부 무음이었고, 수사노트 개폐·조서
// 서명도 마찬가지였다. 소리를 다는 쪽은 오디오 소유자다 — 레벨·UI 파일을 건드리지 않고
// 기존 이벤트만 구독해서 붙인다.

import { musicCue, tensionStart, tensionStinger, tensionStop, bedStart, bedStop } from './music.js'
import { titleBedStart, titleBedStop } from './title-bed.js'
import { tune } from './radio.js'

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
    // "주파수를 맞춘다" — 다이얼이 실제로 국을 바꾼다(radio.js 편성표). 딸깍만 나고 아무것도
    // 안 바뀌던 상호작용이 여기서 결과를 갖는다.
    if (cue?.[0] === 'radio.dial') tune(a, (a.radio?.station ?? 0) + 1)
  })

  // 입장 게이트의 첫 입력이 이 게임의 첫 제스처다(ui/title.js). 그 제스처가 AudioContext 를 열고
  // 같은 프레임에 이 사건이 온다 — 컨텍스트가 아직 없으면 engine 이 열릴 때 흘려보낸다
  // (playOrDefer 와 같은 계약). 여는 것은 곡이 아니라 화면 안의 비다(title-bed.js).
  bus.on('title:gate', () => {
    if (a.ctx) titleBedStart(a)
    else a.pendingTitleBed = true
  })

  // 게임의 첫 소리. 벨을 누르라고 써 있는데 벨이 울리지 않았다.
  // 이 이벤트는 첫 제스처와 같은 프레임에 온다 — 컨텍스트가 아직 없으면 engine 이 열릴 때 흘려보낸다.
  bus.on('title:proceed', (p) => {
    // 문이 열리면 비는 인트로의 물소리로 넘어간다. 끊지 않고 겹쳐 보낸다.
    titleBedStop(a)
    if (p?.mode !== 'new') return
    a.playOrDefer('desk.bell', { gain: 0.62 })
    a.playOrDefer('desk.bell', { gain: 0.2, rate: 1.008, delay: 0.185 })
  })

  // 종이를 쥐는 소리는 한 겹이 아니다. 획득 경로가 내는 타격(evidence:pickup → paper.pickup)
  // 위에 손가락이 섬유를 쓸며 나는 마찰을 겹친다 — 가로채지 않고 같은 사건에 얹는다.
  // 두 번째 겹은 종이가 손에서 자리를 잡는 자리다(검분 컷이 올라오는 구간과 겹친다).
  bus.on('sfx', (p) => {
    if (p?.id !== 'evidence:pickup') return
    a.play('paper.friction', { gain: 0.34, delay: 0.035 })
    a.play('paper.friction', { gain: 0.17, rate: 0.84, delay: 0.21 })
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
  // 지목판이 열리는 자리가 이 게임의 박진 구간이다 — 증거를 다 모아 놓고 이름 하나를 고른다.
  // 심문의 불온한 침대와 다른 결(고동 계열)을 세운다.
  // **`deduction:open` 에 물리면 안 된다** — 아무도 발화하지 않는 이름이고(narrative/deduction.js
  // 가 구독만 한다) 실제 지목판은 수사노트가 `ui:open{ui:'deduction'}` 으로 연다. 그 이름에 걸면
  // 번들만 되고 게임에서는 영영 안 들린다(제출 감사 지적, 2026-08-10).
  bus.on('ui:open', (p) => { if (p?.ui === 'deduction') bedStart(a, 'urge') })
  // 판정 없이 판을 닫으면 같이 닫히고, 판정이 나면 엔딩 쪽으로 넘기며 더 길게 물러난다.
  bus.on('ui:close', (p) => { if (p?.ui === 'deduction') bedStop(a, 'urge', 3.0) })
  bus.on('deduction:resolve', () => bedStop(a, 'urge', 5.5))

  // 음악 — 계약상 1막 비디제틱 BGM 0. 여기서 도는 것은 물의 리트모티프의 음정 진술뿐이다(music.js).
  bus.on('cinematic:start', (p) => {
    const id = String(p?.id ?? '')
    if (id.includes('ending')) musicCue(a, 'ending')
    else if (id === 'cin-intro') musicCue(a, 'intro')
  })
  // 조작 이양 = 드론이 빠지는 자리(E2 0:27–0:30 "룸톤만 남는다"). 시각이 아니라 사건에 결박한다.
  bus.on('cinematic:end', (p) => { if (p?.id === 'cin-intro') a.musicRelease?.() })
  bus.on('act:enter', (p) => { if (p?.act === 3) musicCue(a, 'act3') })
  bus.on('act:phase', (p) => { if (p?.act === 1 && p?.phase === 'late') musicCue(a, 'phase') })

  // 심문 긴장층(music.js). 구동은 전부 구조적 비트 — 진위·연기 상태는 구독하지 않는다.
  bus.on('interrogation:start', () => tensionStart(a))
  bus.on('interrogation:prompt', () => a.tension?.set('prompt', 1.2))
  bus.on('interrogation:aiming', (p) => {
    if (p?.on) { a.tension?.set('aim', 0.9); tensionStinger(a) } else a.tension?.set('prompt', 1.4)
  })
  bus.on('interrogation:verdict', (p) => a.tension?.release(p?.correct !== false))
  bus.on('interrogation:end', () => tensionStop(a, 4.5))
  bus.on('interrogation:left', () => tensionStop(a, 2.4))
}
