// [AUDIO] 마스터 체인과 상시 소스(험·물)의 노드 그래프. audio/engine.js가 소유하며 이 파일은 조립만 한다.
// 파일당 500줄 제한 때문에 분리했다 — 계약상 오디오 모듈은 여전히 engine.js 하나다.

import { renderWaterSource } from './ir.js'
import { buildSwell } from './ambience.js'

export function buildGraph (a) {
  const c = a.ctx

  // 마스터 체인: 톤 정리 → 글루 컴프 → 리미터 → 마스터. 클리핑을 리미터에서 막는다.
  a.master = c.createGain()
  a.master.gain.value = a.silent ? 0 : 1
  a.master.connect(c.destination)

  a.limiter = c.createDynamicsCompressor()
  a.limiter.threshold.value = -1.5
  a.limiter.knee.value = 0
  a.limiter.ratio.value = 20
  a.limiter.attack.value = 0.002
  a.limiter.release.value = 0.09
  a.limiter.connect(a.master)

  a.comp = c.createDynamicsCompressor()
  a.comp.threshold.value = -19
  a.comp.knee.value = 9
  a.comp.ratio.value = 3.2
  a.comp.attack.value = 0.008
  a.comp.release.value = 0.24
  a.comp.connect(a.limiter)

  // 1947년 흉내가 아니라 공간감용이다. 초고역만 덜어낸다.
  a.tilt = c.createBiquadFilter()
  a.tilt.type = 'lowpass'
  a.tilt.frequency.value = 11000
  a.tilt.Q.value = 0.5
  a.tilt.connect(a.comp)

  // 일시정지 감쇠 전용. duck() 와 같은 노드를 쓰면 카드를 여는 동안 대사 더킹 스케줄이 덮인다.
  a.pauseG = c.createGain()
  a.pauseG.connect(a.tilt)

  a.duckG = c.createGain()
  a.duckG.connect(a.pauseG)

  a.dry = c.createGain()
  a.wet = c.createGain()
  a.toneBus = c.createGain()
  a.waterBus = c.createGain()
  a.musicBus = c.createGain()
  for (const n of [a.dry, a.wet, a.toneBus, a.waterBus, a.musicBus]) n.connect(a.duckG)

  // 심문 긴장층. musicBus **아래**에 다는 것이 계약이다 — 붕괴(breaking) 중 음악 버스가 0이 되면
  // 긴장층도 같이 죽고(E7 §3 "붕괴 중 BGM 0"), 심문 감쇠(_levels의 quiet 0.42)는 toneBus·waterBus·
  // 라디오만 건드리므로 이 버스를 지나가지 않는다. 환경은 낮아지고 긴장만 남는 구조가 여기서 나온다.
  a.tensionBus = c.createGain()
  a.tensionBus.connect(a.musicBus)

  a.send = c.createGain()
  a.conv = [c.createConvolver(), c.createConvolver()]
  a.wetG = [c.createGain(), c.createGain()]
  a.wetG[0].gain.value = 1
  a.wetG[1].gain.value = 0
  for (let i = 0; i < 2; i++) {
    a.conv[i].normalize = false
    a.send.connect(a.conv[i])
    a.conv[i].connect(a.wetG[i])
    a.wetG[i].connect(a.wet)
  }

  // 룸톤 스웰 전단(ambience.js). 느린 요동을 toneBus.gain 에 직접 걸면 _levels()가 세운 방별
  // 레벨과 합산돼 값이 뒤집힌다 — 험이 밟은 함정이라 여기서도 상시값 1인 배율 노드로 받는다.
  a.toneSwell = c.createGain()
  a.toneSwell.connect(a.toneBus)

  a.toneG = [c.createGain(), c.createGain()]
  a.toneG[0].gain.value = 1
  a.toneG[1].gain.value = 0
  for (const g of a.toneG) g.connect(a.toneSwell)

  buildHum(a)
  buildWater(a)
  buildSwell(a)
}

// 형광등 험 60Hz + 2고조파, 그리고 기계실 저역. 방마다 세기가 다르다.
function buildHum (a) {
  const c = a.ctx
  a.humG = c.createGain()
  a.humG.gain.value = 0
  // 요동은 전용 전단(humMod)에 건다. LFO를 humG.gain에 직접 물리면 출력이 합산되어
  // _levels()가 세운 방별 레벨을 덮어쓰고 값이 음수로도 넘어간다(위상 반전).
  const mod = c.createGain()
  mod.gain.value = 1
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 420
  lp.Q.value = 0.7
  lp.connect(mod)
  mod.connect(a.humG)
  a.humG.connect(a.toneBus)
  const parts = [[60, 'sine', 1], [120, 'triangle', 0.34], [38, 'sine', 0.55]]
  a.humOsc = []
  for (const [f, type, g] of parts) {
    const o = c.createOscillator()
    o.type = type
    o.frequency.value = f
    const og = c.createGain()
    og.gain.value = g
    o.connect(og)
    og.connect(lp)
    if (!a.silent) o.start()
    a.humOsc.push(o)
  }
  // 험이 완전히 정지해 있으면 합성으로 들린다. 아주 느린 진폭 요동을 준다.
  const lfo = c.createOscillator()
  lfo.frequency.value = 0.13
  const lg = c.createGain()
  lg.gain.value = 0.18
  lfo.connect(lg)
  lg.connect(mod.gain)
  if (!a.silent) lfo.start()
  a.humLfo = lfo
}

// 이 게임의 시그니처. 배관 흐름 · 수압 저하 시 공기 혼입 · 탱크 울림.
function buildWater (a) {
  const c = a.ctx
  const w = renderWaterSource(c.sampleRate)
  const buf = c.createBuffer(1, w.ch[0].length, c.sampleRate)
  buf.copyToChannel(w.ch[0], 0)
  a.waterG = { flow: c.createGain(), air: c.createGain(), tank: c.createGain() }
  for (const k in a.waterG) a.waterG[k].gain.value = 0
  const spec = [
    ['flow', 'bandpass', 620, 1.2, 0.9],
    ['air', 'bandpass', 2300, 2.6, 0.55],
    ['tank', 'bandpass', 86, 7.0, 1.0]
  ]
  a.waterSrc = []
  spec.forEach(([k, type, f, q, g], i) => {
    const s = c.createBufferSource()
    s.buffer = buf
    s.loop = true
    s.playbackRate.value = 0.82 + i * 0.19
    const bp = c.createBiquadFilter()
    bp.type = type
    bp.frequency.value = f
    bp.Q.value = q
    const post = c.createGain()
    post.gain.value = g
    s.connect(bp)
    bp.connect(post)
    post.connect(a.waterG[k])
    a.waterG[k].connect(a.waterBus)
    if (k === 'air') a.airMod = post
    // 필터 주파수를 아주 느리게 흔든다 — 흐름이 굳지 않게
    const lfo = c.createOscillator()
    lfo.frequency.value = 0.041 + i * 0.037
    const lg = c.createGain()
    lg.gain.value = f * 0.22
    lfo.connect(lg)
    lg.connect(bp.frequency)
    if (!a.silent) { s.start(); lfo.start() }
    a.waterSrc.push(s, lfo)
  })
  // 공기 혼입은 연속이 아니라 간헐적이다. 저주파 발진기로 게이트를 만든다.
  // 게이트도 전단(airMod)에 건다 — waterG.air는 막·방별 수위 전용으로 남겨야 한다.
  const gate = c.createOscillator()
  gate.frequency.value = 0.19
  const gg = c.createGain()
  gg.gain.value = 0.45
  gate.connect(gg)
  gg.connect(a.airMod.gain)
  if (!a.silent) gate.start()
  a.waterSrc.push(gate)
  a.waterBus.connect(a.send)
}
