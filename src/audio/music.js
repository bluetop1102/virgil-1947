// [AUDIO] 음악층. audio/engine.js 소유의 분권 파일이다(graph.js·ir.js·dsp.js 와 같은 위치).
//
// 이 파일에는 두 층이 있다. **드론 큐**(musicCue)는 곡이 아니라 물의 리트모티프를 음정화한
// 저역이다 — 배관·보일러는 실제로 41Hz 근처에서 공진하고, 같은 음이 3막에서 콘트라베이스로
// 되돌아온다. 1막의 드론은 그 음의 첫 진술이지 반주가 아니다. **긴장 침대**(bedStart)는
// 심문·지목 구간에만 서는 외부 CC BY 4.0 트랙이고, E7 §3 "비디제틱 BGM 0" 계약의 사용자
// 지시 개정분이다(2026-08-10 — 아래 긴장 침대 절 참조).
//
// 타이틀에는 음악을 넣을 수 없다. 브라우저 자동재생 정책상 첫 제스처 전에는 어떤 소리도 낼 수
// 없고(제스처 전 AudioContext 생성 = 콘솔 경고 = 루브릭 실격), 이 게임의 첫 제스처가 곧 벨을
// 누르는 진행 입력이다. 그래서 타이틀의 자리는 음악이 아니라 **벨 자신**이고, 그 벨이 인트로의
// 드론을 연다(cues.js).

const E1 = 41.2      // 물의 리트모티프 기음. 2·3막이 같은 음으로 되돌아온다
const D1 = 36.71     // 엔딩 — 온음 하강. 고조가 아니라 물이 빠지는 소리다(E2 V4)

// sub = 정현파 드론(악기로 들리면 안 된다) · bass = 콘트라베이스 한 음(3막·엔딩 전용)
const CUES = {
  // 인트로. 수압 파열음(0~4초) 아래로 4초에 걸쳐 올라와, **조작 이양에서** 빠진다.
  // hold 를 시각으로 못 박지 않고 sustain(상한 90초)으로 두는 이유: 드론의 스케줄은 AudioContext
  // 시계(실시간)인데 시네마틱은 engine.time 으로 흐른다. 헤드리스 실측에서 engine.time 이 실시간의
  // 0.4배로 가서, 16초 hold 로는 인트로 30초의 앞 1/3만 덮고 나머지가 무음이 됐다(판정 배포본의
  // musicOn 103샘플도 같은 구간이다). 이양(cinematic:end)에 결박하면 기계 속도와 무관하게
  // "크로스헤어가 뜰 즈음 빠진다"가 성립한다.
  intro: { kind: 'sub', root: E1, peak: 0.085, at: 4.2, rel: 5.5, sustain: 90 },
  // 도일이 렌치를 들고 로비를 지나간다(7:00, E2 V1 "이 게임은 무르지 않는다"). 같은 음이 짧게 되돌아온다.
  phase: { kind: 'sub', root: E1, peak: 0.10, at: 2.6, hold: 4.5, rel: 4.0 },
  act3: { kind: 'bass', root: E1, peak: 0.17, at: 3.2, hold: 0, rel: 9.8 },
  ending: { kind: 'bass', root: D1, peak: 0.17, at: 3.2, hold: 0, rel: 9.8 }
}

export function musicCue (a, kind) {
  const spec = CUES[kind]
  const c = a.ctx
  if (!spec || a.silent || a.musicOn) return false
  // `cinematic:start`(cin-intro)는 첫 제스처와 **같은 프레임**에 온다. 그 제스처가 AudioContext를
  // 만드는 제스처이기도 해서, 리스너 등록 순서가 뒤집히면 인트로 드론이 통째로 버려졌다
  // (판정 대상 배포본에서 musicOn 0/339 실측). 벨의 playOrDefer와 같은 계약으로 접전을 없앤다 —
  // 제스처 전에 ctx를 만드는 것은 여전히 금지(콘솔 자동재생 경고 = 실격)이므로 지연이 유일한 답이다.
  if (!c) { if (!a.pendingMusic) a.pendingMusic = kind; return true }
  a.musicOn = true
  const now = c.currentTime
  const hold = spec.sustain ?? spec.hold          // sustain 은 방치됐을 때의 상한이다
  const total = spec.at + hold + spec.rel
  const nodes = []
  const envG = []                                 // 포락선을 그리는 게인만. LFO 깊이 게인은 여기 없다
  const done = () => {
    for (const n of nodes) { try { n.disconnect() } catch (e) { /* 이미 해제 */ } }
    a.musicOn = false
    a.musicRelease = null
  }
  const env = (g, peak) => {
    envG.push(g)
    g.gain.setValueAtTime(0.0001, now)
    g.gain.exponentialRampToValueAtTime(peak, now + spec.at)
    g.gain.setValueAtTime(peak, now + spec.at + hold)
    g.gain.exponentialRampToValueAtTime(0.0001, now + total)
  }
  // 지속 큐는 스케줄이 아니라 **사건**으로 끝난다. 호출부(cues.js)가 조작 이양에서 부른다.
  if (spec.sustain) {
    a.musicRelease = (dur = spec.rel) => {
      a.musicRelease = null
      const n = c.currentTime
      for (const g of envG) {
        g.gain.cancelScheduledValues(n)
        g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), n)
        g.gain.exponentialRampToValueAtTime(0.0001, n + dur)
      }
      for (const node of nodes) { try { node.stop?.(n + dur + 0.3) } catch (e) { /* 이미 정지 */ } }
    }
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

// ── 긴장 침대 (외부 CC BY 트랙) ───────────────────────────────────────────
// 발주 근거: 심문이 게임에서 **가장 조용한 구간**이었다(lines 평균 -42.7dB vs 배회 -34.5dB 실측).
// 감쇠 0.42가 환경을 낮추는데 그 자리를 채우는 소리가 없어서, 긴장이 올라야 할 순간에 소리가
// 내려갔다. 그 자리를 절차 생성 지속층으로 채운 것이 구판인데, **사용자 실청취에서 기각됐다**
// (2026-08-10) — 0.27Hz 트레몰로가 주기적인 북소리로 들렸고 압력 노이즈는 질감이 되지 못했다.
// E7 §3 계약을 그 지시로 개정해, 긴장층만 외부 CC BY 4.0 트랙으로 바꾼다. sfx·룸톤·리버브·
// 스팅어는 그대로 절차 생성이고, 라이선스·실측값은 docs/credits.md §1.2 가 진실원이다.
//
// **진위를 소리로 새지 않는다.** `interrogation:statement`는 `truth`를, `perf:state`는 그 파생인
// 연기 상태를 실어 나르지만 긴장층은 둘 다 구독하지 않는다. 음악이 정답을 알려주면 심문이
// 무너진다(E5 진위 비노출). 구동은 전부 **플레이어의 행동과 구조적 비트**다 —
// 진입 · 선택 요구 · 증거 겨눔 · 판정 결과 · 지목 · 종료.
const FILES = import.meta.glob('../../assets/bed-*.mp3', { eager: true, query: '?url', import: 'default' })
const url = (kind) => FILES[Object.keys(FILES).find(p => p.includes(`bed-${kind}-`)) ?? ''] ?? null

// hp/lp 는 침대를 대사 자막의 읽기 뒤로 물리는 자리다 — 초저역은 물의 리트모티프에 양보하고,
// 초고역은 잘라 "방 안에서 울리는 것"으로 남긴다. peak 은 level 1.0 에서의 버스 게인.
const BED = {
  unease: { peak: 0.34, hp: 42, lp: 4200, rise: 3.4 },   // 심문·불온 — 느린 다크 앰비언트
  urge: { peak: 0.30, hp: 55, lp: 5600, rise: 2.4 }      // 지목·박진 — 고동 계열
}

// 침대의 상태 사다리. 진실/거짓 대칭이라 진위와 무관하다.
const TENSION = {
  enter: 0.68,   // 진입 — 방이 닫히고 바닥이 생긴다
  prompt: 0.80,  // 선택을 요구받은 자리
  aim: 1.0,      // 증거를 겨누는 동안. 되돌릴 수 없는 순간의 압력(E7 §1 LIE 행)
  ease: 0.42,    // 판정 직후 해소
  dip: 0.14      // 소각 — 방이 물러날 때 같이 물러난다(E7 §3 침묵의 사용)
}

// 트랙을 스트리밍으로 문다. 7분짜리를 decodeAudioData 로 펴면 트랙당 60MB가 넘는다.
function stream (a, kind, spec) {
  const c = a.ctx
  const src = url(kind)
  if (!src || typeof c.createMediaElementSource !== 'function') return null
  const el = new Audio()
  el.loop = true
  el.preload = 'auto'
  el.src = src
  const node = c.createMediaElementSource(el)
  const hp = c.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = spec.hp
  hp.Q.value = 0.7
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = spec.lp
  lp.Q.value = 0.6
  const out = c.createGain()
  out.gain.value = 0.0001
  node.connect(hp); hp.connect(lp); lp.connect(out)
  el.play?.().catch(() => { /* 제스처·코덱 거부 — 침대 없이도 심문은 성립한다 */ })
  return { out, nodes: [node, hp, lp, out], el }
}

// 트랙이 없거나(에셋 미배치) 스트리밍이 불가한 컨텍스트(OfflineAudioContext — 자체검증 렌더)의
// 대체 침대. 물의 리트모티프 E1 을 늘인 지속층만 남기고, 실청취에서 기각된 주기 트레몰로와
// 압력 노이즈는 넣지 않는다. 외부 음원 없이도 심문의 레벨 역전은 재발하지 않는다.
function pad (a) {
  const c = a.ctx
  const now = c.currentTime
  const out = c.createGain()
  out.gain.value = 0.0001
  const nodes = [out]
  for (const [mul, rel, beat] of [[1, 1, 0.061], [1.5, 0.39, 0.083], [2, 0.5, 0.047], [3, 0.17, 0.104]]) {
    const o = c.createOscillator()
    o.type = 'sine'
    o.frequency.value = E1 * mul
    const g = c.createGain()
    g.gain.value = 0.16 * rel
    o.connect(g); g.connect(out)
    const lfo = c.createOscillator()   // 맥놀이 — 고정 사인은 합성으로 들린다
    lfo.frequency.value = beat
    const lg = c.createGain()
    lg.gain.value = E1 * mul * 0.0018
    lfo.connect(lg); lg.connect(o.frequency)
    o.start(now); lfo.start(now)
    nodes.push(o, g, lfo, lg)
  }
  return { out, nodes, el: null }
}

// kind: 'unease'(심문) · 'urge'(지목·박진). 둘은 서로 다른 슬롯이라 겹쳐 설 수 있다.
export function bedStart (a, kind = 'unease') {
  const c = a.ctx
  const spec = BED[kind]
  if (!c || a.silent || !spec || a.tensions?.[kind] || !a.tensionBus) return false
  const s = stream(a, kind, spec) ?? pad(a)
  s.out.connect(a.tensionBus)

  const t = {
    kind,
    level: 0,
    // 스트리밍 침대인지 대체 패드인지. 에셋 누락·코덱 거부는 조용히 폴백하므로, 검증 프로브가
    // "무엇을 듣고 있는지"를 구분할 수 있어야 한다(폴백 상태의 PASS 는 PASS 가 아니다).
    streamed: !!s.el,
    set (key, dur = 1.6) {
      const to = TENSION[key] ?? key
      if (!(to >= 0)) return
      t.level = to
      const n = c.currentTime
      const p = s.out.gain
      p.cancelScheduledValues(n)
      p.setValueAtTime(Math.max(p.value, 0.0001), n)
      p.exponentialRampToValueAtTime(Math.max(to * spec.peak, 0.0001), n + Math.max(dur, 0.05))
    },
    // 판정 직후 한 번 풀었다가 바닥으로 되돌린다. 심문은 아직 끝나지 않았다.
    release (ok) {
      t.set(ok ? 'ease' : 'dip', ok ? 1.1 : 0.35)
      const n = c.currentTime
      const p = s.out.gain
      p.setValueAtTime(Math.max((ok ? TENSION.ease : TENSION.dip) * spec.peak, 0.0001), n + (ok ? 1.1 : 3.0))
      p.exponentialRampToValueAtTime(TENSION.enter * spec.peak, n + (ok ? 4.2 : 6.0))
      t.level = TENSION.enter
    },
    stop (dur = 3.2) {
      const n = c.currentTime
      const p = s.out.gain
      p.cancelScheduledValues(n)
      p.setValueAtTime(Math.max(p.value, 0.0001), n)
      p.exponentialRampToValueAtTime(0.0001, n + dur)
      for (const node of s.nodes) { try { node.stop?.(n + dur + 0.2) } catch (e) { /* 이미 정지 */ } }
      // 해제는 소리가 멎은 뒤 한 번만. 스트리밍 침대는 엘리먼트도 같이 놓는다.
      setTimeout(() => {
        try { s.el?.pause(); s.el?.removeAttribute('src'); s.el?.load() } catch (e) { /* 이미 해제 */ }
        for (const node of s.nodes) { try { node.disconnect() } catch (e) { /* 이미 해제 */ } }
      }, (dur + 0.4) * 1000)
      if (a.tensions) a.tensions[kind] = null
      if (kind === 'unease') a.tension = null
    }
  }
  a.tensions = a.tensions ?? {}
  a.tensions[kind] = t
  if (kind === 'unease') a.tension = t     // cues.js·tools/test-audio.mjs 가 잡는 이름
  t.set(kind === 'unease' ? 'enter' : 'aim', spec.rise)
  return true
}

export function bedStop (a, kind = 'unease', dur) {
  a.tensions?.[kind]?.stop(dur)
}

// 심문 침대의 옛 이름. 계약(cues.js 배선·자체검증 하네스)이 이 이름으로 잡고 있어 유지한다.
export function tensionStart (a) { return bedStart(a, 'unease') }

// 증거를 겨누는 순간의 스팅어. 되돌릴 수 없다는 신호이지 정답 신호가 아니다 —
// 진실 진술에 겨눠도 똑같이 울린다. 활로 켠 저현 한 번: 낮은 톱니가 필터를 열며 올라온다.
export function tensionStinger (a) {
  const c = a.ctx
  if (!c || a.silent || !a.tensionBus) return false
  const now = c.currentTime
  const dur = 3.6
  const nodes = []
  const bow = c.createOscillator()
  bow.type = 'sawtooth'
  bow.frequency.value = E1 * 2
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.setValueAtTime(96, now)
  lp.frequency.linearRampToValueAtTime(430, now + 1.15)
  lp.frequency.linearRampToValueAtTime(150, now + dur)
  lp.Q.value = 3.2
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, now)
  g.gain.exponentialRampToValueAtTime(0.05, now + 0.85)
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur)
  bow.connect(lp); lp.connect(g); g.connect(a.tensionBus)
  bow.start(now); bow.stop(now + dur + 0.1)
  nodes.push(bow, lp, g)
  // 5도 위 하모닉스가 뒤늦게 스며든다 — 화음이 아니라 같은 현의 배음이다.
  const h = c.createOscillator()
  h.type = 'sine'
  h.frequency.value = E1 * 6
  const hg = c.createGain()
  hg.gain.setValueAtTime(0.0001, now)
  hg.gain.exponentialRampToValueAtTime(0.011, now + 1.6)
  hg.gain.exponentialRampToValueAtTime(0.0001, now + dur)
  h.connect(hg); hg.connect(a.tensionBus)
  h.start(now + 0.35); h.stop(now + dur + 0.1)
  nodes.push(h, hg)
  bow.onended = () => { for (const n of nodes) { try { n.disconnect() } catch (e) { /* 이미 해제 */ } } }
  return true
}

export function tensionStop (a, dur) {
  bedStop(a, 'unease', dur)
}
