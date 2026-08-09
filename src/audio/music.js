// [AUDIO] 음악층. audio/engine.js 소유의 분권 파일이다(graph.js·ir.js·dsp.js 와 같은 위치).
//
// 이 게임의 계약은 "비디제틱 BGM 0, 예외는 엔딩뿐"이다(E7 §3). 그래서 여기서 만드는 것은 곡이
// 아니라 **물의 리트모티프를 음정화한 저역**이다. 배관·보일러는 실제로 41Hz 근처에서 공진하고,
// 같은 음이 3막에서 콘트라베이스로 되돌아온다 — 1막의 드론은 그 음의 첫 진술이지 반주가 아니다.
//
// 타이틀에는 음악을 넣을 수 없다. 브라우저 자동재생 정책상 첫 제스처 전에는 어떤 소리도 낼 수
// 없고(제스처 전 AudioContext 생성 = 콘솔 경고 = 루브릭 실격), 이 게임의 첫 제스처가 곧 벨을
// 누르는 진행 입력이다. 그래서 타이틀의 자리는 음악이 아니라 **벨 자신**이고, 그 벨이 인트로의
// 드론을 연다(cues.js).

const E1 = 41.2      // 물의 리트모티프 기음. 2·3막이 같은 음으로 되돌아온다
const D1 = 36.71     // 엔딩 — 온음 하강. 고조가 아니라 물이 빠지는 소리다(E2 V4)

// sub = 정현파 드론(악기로 들리면 안 된다) · bass = 콘트라베이스 한 음(3막·엔딩 전용)
const CUES = {
  // 인트로 30초. 수압 파열음(0~4초) 아래로 4초에 걸쳐 올라와, 크로스헤어가 뜨기 전에 빠진다.
  intro: { kind: 'sub', root: E1, peak: 0.085, at: 4.2, hold: 16, rel: 5.5 },
  // 도일이 렌치를 들고 로비를 지나간다(7:00, E2 V1 "이 게임은 무르지 않는다"). 같은 음이 짧게 되돌아온다.
  phase: { kind: 'sub', root: E1, peak: 0.10, at: 2.6, hold: 4.5, rel: 4.0 },
  act3: { kind: 'bass', root: E1, peak: 0.17, at: 3.2, hold: 0, rel: 9.8 },
  ending: { kind: 'bass', root: D1, peak: 0.17, at: 3.2, hold: 0, rel: 9.8 }
}

export function musicCue (a, kind) {
  const spec = CUES[kind]
  const c = a.ctx
  if (!spec || !c || a.silent || a.musicOn) return false
  a.musicOn = true
  const now = c.currentTime
  const total = spec.at + spec.hold + spec.rel
  const nodes = []
  const done = () => {
    for (const n of nodes) { try { n.disconnect() } catch (e) { /* 이미 해제 */ } }
    a.musicOn = false
  }
  const env = (g, peak) => {
    g.gain.setValueAtTime(0.0001, now)
    g.gain.exponentialRampToValueAtTime(peak, now + spec.at)
    g.gain.setValueAtTime(peak, now + spec.at + spec.hold)
    g.gain.exponentialRampToValueAtTime(0.0001, now + total)
  }

  if (spec.kind === 'sub') {
    // 기음 + 완전5도. 배음이 둘뿐이라 음정은 서되 선율로 뭉치지 않는다.
    ;[[spec.root, 1], [spec.root * 1.5, 0.28], [spec.root * 2, 0.16]].forEach(([f, rel], i) => {
      const o = c.createOscillator()
      o.type = 'sine'
      o.frequency.value = f
      const g = c.createGain()
      g.gain.value = 0.0001
      o.connect(g)
      g.connect(a.musicBus)
      env(g, spec.peak * rel)
      // 완전히 고정된 사인은 합성으로 들린다. 아주 얕게 흔든다(맥놀이 0.07~0.11Hz).
      const lfo = c.createOscillator()
      lfo.frequency.value = 0.07 + i * 0.021
      const lg = c.createGain()
      lg.gain.value = f * 0.0016
      lfo.connect(lg)
      lg.connect(o.frequency)
      o.start(now)
      lfo.start(now)
      o.stop(now + total + 0.3)
      lfo.stop(now + total + 0.3)
      nodes.push(o, g, lfo, lg)
      if (i === 0) o.onended = done
    })
    return true
  }

  // 콘트라베이스 한 음과 현의 하모닉스.
  const bass = c.createOscillator()
  bass.type = 'sawtooth'
  bass.frequency.value = spec.root
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 210
  lp.Q.value = 0.8
  const body = c.createBiquadFilter()
  body.type = 'peaking'
  body.frequency.value = spec.root * 3
  body.Q.value = 3
  body.gain.value = 7
  const bg = c.createGain()
  bg.gain.value = 0.0001
  bass.connect(lp); lp.connect(body); body.connect(bg); bg.connect(a.musicBus)
  env(bg, spec.peak)
  bass.start(now)
  bass.stop(now + total + 0.4)
  nodes.push(bass, lp, body, bg)
  ;[[spec.root * 8, 0.03, 2.6], [spec.root * 12, 0.018, 5.2]].forEach(([f, g, at]) => {
    const o = c.createOscillator()
    o.type = 'sine'
    o.frequency.value = f
    const og = c.createGain()
    og.gain.value = 0.0001
    o.connect(og)
    og.connect(a.musicBus)
    og.gain.setValueAtTime(0.0001, now)
    og.gain.exponentialRampToValueAtTime(g, now + at + 2)
    og.gain.exponentialRampToValueAtTime(0.0001, now + total - 0.4)
    o.start(now + at)
    o.stop(now + total)
    nodes.push(o, og)
  })
  bass.onended = done
  return true
}

export const MUSIC_CUES = CUES
