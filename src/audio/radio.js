// [AUDIO] 로비 라디오의 편성. audio/engine.js 소유의 분권 파일이다(graph.js·music.js 와 같은 위치).
//
// 이 게임의 계약은 "비디제틱 BGM 0, 예외는 엔딩뿐"이다(E7 §3). 그래서 음악은 스피커가 아니라
// **소품에서** 나온다 — 로비 사이드테이블의 라디오 한 대. 트랙은 그 라디오의 패널·거리 감쇠·
// 룸 리버브·오답 -6dB 딥·심문 감쇠를 전부 통과한 뒤에야 귀에 닿는다. 곡을 깔았다기보다
// **방에 소리나는 물건을 하나 켜 둔 것**이고, 그래서 계약을 건드리지 않는다.
//
// 트랙 파일만 외부 에셋이다(AGENTS.md 에셋 예외 ② — BGM 한정, 사용자 승인 2026-08-09).
// 라이선스·출처는 docs/credits.md §1.2 가 진실원이고, 누락하면 제출물 4번이 불성립한다.

// 편성표. 파일명 앞자리가 다이얼 순서고, `null` 은 절차 생성 괴담 방송(engine.js 의 voice 루프)이다.
// 순서가 [음악1 · 방송 · 음악2 · 음악3] 인 이유: 인트로에서는 방송(1번)이 돌고, 조작 이양에서
// 편성이 음악(0번)으로 넘어가며, **플레이어의 첫 다이얼이 방송으로 되돌아온다** — "주파수를
// 맞춘다" 프롬프트의 보상이 괴담 전문(E7 §4)이어야 하기 때문이다.
const FILES = import.meta.glob('../../assets/radio-*.mp3', { eager: true, query: '?url', import: 'default' })
const MUSIC = Object.keys(FILES).sort().map(k => FILES[k])
export const STATIONS = [MUSIC[0] ?? null, null, MUSIC[1] ?? null, MUSIC[2] ?? null]
export const HAS_MUSIC = MUSIC.length > 0
// 방송(절차 생성 웅얼거림)과 같은 자리에서 균형을 잡은 값이다. 자막 낭독을 덮으면 안 되고
// (judge-plan §5-4), 라디오 앞까지 걸어갔을 때 "음악이 나온다"가 성립해야 한다.
const MUSIC_LEVEL = 0.62

function ramp (param, to, now, dur) {
  param.cancelScheduledValues(now)
  param.setValueAtTime(param.value, now)
  param.linearRampToValueAtTime(to, now + Math.max(dur, 0.01))
}

// 종이 콘의 포화. 클리핑이 아니라 살짝 눌리는 정도 — 1947년 탁상 라디오는 크게 틀면 뭉갠다.
function coneCurve () {
  const n = 1024
  const curve = new Float32Array(n)
  const k = Math.tanh(1.7)
  for (let i = 0; i < n; i++) curve[i] = Math.tanh(((i / (n - 1)) * 2 - 1) * 1.7) / k
  return curve
}

// 트랙 하나를 흘려보내는 스트리밍 경로. 3분짜리를 decodeAudioData 로 펴면 트랙당 30MB가
// 넘는다 — MediaElement 로 스트리밍하고 노드 그래프에만 물린다.
function ensureMusic (a) {
  const r = a.radio
  if (r.music) return r.music
  const c = a.ctx
  if (!HAS_MUSIC || a.silent || typeof c.createMediaElementSource !== 'function') return null
  const el = new Audio()
  el.loop = true
  el.preload = 'none'
  el.addEventListener('error', () => { r.music.failed = true })
  const node = c.createMediaElementSource(el)
  // 라디오라이즈: AM 대역으로 좁히고(320~3300Hz), 종이 콘의 중역 혹을 세우고, 약하게 포화시킨다.
  const hp = c.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 320
  hp.Q.value = 0.7
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 3300
  lp.Q.value = 0.9
  const honk = c.createBiquadFilter()
  honk.type = 'peaking'
  honk.frequency.value = 1750
  honk.Q.value = 1.4
  honk.gain.value = 6
  const cone = c.createWaveShaper()
  cone.curve = coneCurve()
  cone.oversample = '2x'
  const g = c.createGain()
  g.gain.value = 0.0001
  node.connect(hp); hp.connect(lp); lp.connect(honk); honk.connect(cone); cone.connect(g)
  g.connect(r.tuneG)
  r.music = { el, gain: g, url: null, failed: false }
  return r.music
}

// 다이얼. index 는 STATIONS 의 자리이고, 범위를 벗어나면 감아 돈다.
export function tune (a, index, dur = 1.4) {
  const r = a.radio
  const c = a.ctx
  if (!r || !c) return false
  const n = STATIONS.length
  const i = ((Math.round(index) % n) + n) % n
  const url = STATIONS[i]
  const now = c.currentTime
  r.station = i

  // 주파수 사이는 비어 있다. 훑고 지나가는 0.3초의 공백이 "돌렸다"를 만든다.
  const tg = r.tuneG.gain
  tg.cancelScheduledValues(now)
  tg.setValueAtTime(tg.value, now)
  tg.linearRampToValueAtTime(0.12, now + 0.1)
  tg.setValueAtTime(0.12, now + 0.34)
  tg.linearRampToValueAtTime(1, now + 0.34 + Math.min(dur, 0.9))

  const m = url ? ensureMusic(a) : a.radio.music
  ramp(r.voiceG.gain, url ? 0 : 1, now + 0.1, dur)
  if (!m) return !url                       // 트랙이 없으면 방송만 남는다 — 게임은 그대로 성립한다
  ramp(m.gain.gain, url && !m.failed ? MUSIC_LEVEL : 0, now + 0.1, dur)
  if (!url) { stopSoon(m, dur + 0.6); return true }
  if (m.url !== url) { m.url = url; m.el.src = url }
  m.el.play?.().catch(() => { /* 제스처·코덱 거부 — 방송 쪽으로 남는다 */ })
  return true
}

function stopSoon (m, delay) {
  clearTimeout(m.timer)
  m.timer = setTimeout(() => { try { m.el.pause() } catch (e) { /* 이미 정지 */ } }, delay * 1000)
}

export function radioDispose (a) {
  const m = a.radio?.music
  if (!m) return
  clearTimeout(m.timer)
  try { m.el.pause(); m.el.removeAttribute('src'); m.el.load() } catch (e) { /* 이미 해제 */ }
}
