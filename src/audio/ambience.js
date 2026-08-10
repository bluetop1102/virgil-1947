// [AUDIO] 환경층 — 이산 사건 스케줄러와 배회 구간의 기복.
// audio/engine.js 소유의 분권 파일이다(graph.js·music.js·radio.js 와 같은 위치).
// 물방울·라디에이터 틱·배관 노크의 스케줄이 스웰 위상을 읽어야 해서 둘이 한 파일에 있다.
//
// 발주 근거: 자유 배회가 -32.6dB 평탄대였다(3차 판정 J6③). 구간 평균이 상수라는 말은
// "아무 일도 일어나지 않는다"가 아니라 **"아무 일도 일어날 것 같지 않다"**로 들린다는 뜻이다.
// 공포는 사건이 아니라 예감이라서, 사건 없이 바닥만 흔든다.
//
// **왜 룸톤 진폭만으로는 안 되는가(실측).** 배회 구간의 RMS 를 지배하는 것은 룸톤이 아니라
// 이산 사건(라디에이터 틱·물방울)과 로비 라디오다 — 룸톤 배율을 0 으로 내려도 마스터 RMS 는
// 2.45dB 밖에 안 떨어진다(`shots/sj/swell-test.json`). 그래서 스웰은 룸톤 배율과 **이산 사건의
// 크기·간격**을 같이 민다. 마루에서는 잦고 크게, 골에서는 드물고 작게 — 총량이 아니라 밀도가
// 흔들려야 사람이 기복으로 듣는다.
//
// **그 균형을 2026-08-10 에 되잡았다(사용자 실청취 기각).** 위 실측이 옳았지만 결론이 한 칸
// 지나쳤다 — "이산 사건이 RMS 를 지배한다"에서 "그러니 이산 사건을 많이 놓자"로 갔고, 로비에서
// 물방울 5.9초·원거리 단발음 29초에 한 번이 됐다. 사람은 그것을 기복이 아니라 소음으로 듣는다.
// 지금은 사건을 수 분 단위로 되돌리고 기복은 BED_DEPTH(연속층)가 진다. 계측상 같은 표준편차를
// 만드는 방법이 둘인데, 귀에는 전혀 다르다는 것이 이 되잡음의 내용이다.
//
// **점프스케어 금지.** 단발음은 바닥 위 5~8dB 안이고, 원점은 벽 너머 5~9m 라 소리 나는 쪽을
// 돌아봐도 아무것도 없다. 놀래키는 장치가 아니라 이 건물이 비어 있지 않다는 신호다.

const TAU = Math.PI * 2
// 주기 97초·143초. 마디가 맞지 않아 같은 자리로 돌아오지 않는다(공약수 없음).
const SWELL = [[97, 0.62], [143, 0.38]]
// 룸톤 배율 0.38~1.62. 사건 밀도를 대폭 낮춘 대신(아래 DRIP_*·FAR_*) 기복을 연속층이 진다 —
// 이쪽이 원래 옳은 자리였다. 들리는 사건 하나가 아니라 방의 숨이 흔들려야 "예감"이 된다.
const BED_DEPTH = 0.62
const TICK_DT = 0.25      // 배율 갱신 간격(초). 매 프레임 쓰면 지퍼 노이즈가 난다
// 마루에서 42~90초, 골로 갈수록 3분까지 벌어지고 -0.15 아래에서는 아예 끊긴다.
// 구판은 7~14초 기준이라 실측 **29초에 1회**였다(2026-08-10 배회 4.4분 로그). "드물어야
// 예감이고 잦으면 소음"이 판정 기준인데 29초는 소음 쪽이다 — 수 분에 1회로 되돌린다.
const FAR_BASE = 42
const FAR_SPAN = 48
const FAR_GATE = -0.15

// [스펙 id, 게인, 재생비, 리버브 배수]. 재생비를 내려 크기를 키우고 젖은 성분을 올려 멀리 둔다.
const FAR = [
  ['pipe.knock', 0.50, 0.62, 2.6],      // 벽 속 배관이 한 번 튕긴다 (실측 바닥 위 4.1dB)
  ['pipe.knock', 0.42, 0.80, 2.2],      // 같은 배관, 더 먼 마디
  // 엘리베이터는 0.36 에서도 바닥 위 10.6dB 로 솟는다(실측). 목표대는 3~8dB, 즉 "저쪽에서
  // 뭔가 났다"이지 "무언가 튀어나왔다"가 아니다.
  ['elevator.motor', 0.26, 0.56, 2.4],  // 케이블이 제 무게로 삐걱인다 — 부른 사람은 없다
  ['tank.hollow', 0.28, 0.74, 2.8]      // 위층 물탱크. 이 사건의 원점이 내는 소리다 (5.9dB)
]

// 물방울·라디에이터 틱의 간격 계수. **구판의 실결함이 여기 있었다**: 간격이
// `1.8 + rand*7*(1.2 - m.drip)` 라 방의 젖은 정도가 간격의 *분산*만 바꾸고 *빈도*는 못 바꿨다 —
// 로비(m.drip 0.05)와 욕실(0.85)의 평균 간격이 5.8초 대 3.0초로, 17배 차이나는 습기가 2배로
// 눌렸다. 그래서 마른 로비에서 물방울이 **5.9초에 한 번**(실측, 4.4분 배회 45회) 떨어졌고
// 사용자 실청취의 "걸을 때 물 떨어지는 소리"가 이것이다. 젖은 정도로 나눠 빈도 자체를 가른다:
// 로비 15~47초 · 복도 10~31초 · 942호 6~19초 · 욕실 2.7~8.2초.
const DRIP_BASE = 2.6
const DRIP_SPAN = 5.4
const DRIP_FLOOR = 0.12   // 완전히 마른 방에서도 0 으로 나누지 않는다(수압 서사 결박 — 0 금지)

// 지금 이 순간의 스웰(-1~1). engine.time 을 쓴다 — 일시정지에 같이 멈추는 것이 게임의 시간이다.
export function swellAt (t) {
  let v = 0
  for (const [period, w] of SWELL) v += Math.sin(TAU * t / period) * w
  return v
}

export function buildSwell (a) {
  // 배율 노드만 세운다. 값은 roamTick 이 JS 로 그린다 — 같은 위상을 이산 사건 스케줄러가
  // 함께 읽어야 하는데, LFO 노드의 순간값은 JS 에서 읽을 수 없기 때문이다.
  a.toneSwell.gain.value = 1
  a.swellNext = 0
}

// 룸톤 배율. _levels 가 세우는 toneBus·waterG 를 건드리지 않으므로 방별 레벨·심문 감쇠·
// 소각 딥이 전부 그대로 살아 있다.
function bed (a, t) {
  if (t < a.swellNext) return
  a.swellNext = t + TICK_DT
  const g = a.toneSwell.gain
  const now = a.ctx.currentTime
  g.cancelScheduledValues(now)
  g.setValueAtTime(g.value, now)
  g.linearRampToValueAtTime(1 + swellAt(t) * BED_DEPTH, now + 0.42)
}

// 막이 오를수록 물이 올라온다. 방별 수위에 곱해지는 계수 — engine.js `_levels` 도 같이 쓴다.
export const ACT_WATER = { 1: 0.34, 2: 0.66, 3: 1.0 }

// 정적 소음층만으로는 공간이 죽는다. 방마다 다른 간격으로 이산 사건을 흩뿌린다.
// 배회 스웰이 이 층의 크기와 간격을 함께 민다 — 마루에서는 잦고 크게, 골에서는 드물고 작게.
// 배회 구간의 마스터 RMS 를 지배하는 것이 룸톤이 아니라 이 사건들이라(파일 머리주석 실측),
// 여기를 흔들지 않으면 어떤 기복도 사람 귀에도 계측에도 잡히지 않는다.
function sched (a, t) {
  const m = a.mix
  const s = a.roam && !a.interro ? swellAt(t) : 0
  const lift = 1 + s * 0.55
  const gap = 1 - s * 0.45
  if (t > a.next.drip) {
    a.next.drip = t + (DRIP_BASE + a.rand() * DRIP_SPAN) / (DRIP_FLOOR + m.drip) * gap
    // 재생비를 0.62~0.95 로 내린 이유: 구판 0.8~1.25 의 스펙트럼 정점이 2004Hz 로 사람 귀가
    // 가장 민감한 대역에 정확히 얹혔다(단독 재생 실측 바닥 위 16.8dB). 낮은 물방울은 더 크고
    // 더 먼 것으로 읽힌다 — 크기를 줄이면서 존재감은 남기는 유일한 축이다.
    if (m.drip > 0.03) a.play('water.drip', { gain: m.drip * (0.22 + a.rand() * 0.32) * lift, rate: 0.62 + a.rand() * 0.33 })
  }
  if (t > a.next.tick) {
    // 틱도 정점이 1816Hz 에 있다(단독 17~19dB). 12.6초에 한 번은 스케줄러로 들린다 — 14~44초.
    a.next.tick = t + (14 + a.rand() * 30) * gap
    if (m.hum > 0.08) a.play('radiator.tick', { gain: (0.06 + a.rand() * 0.09) * lift, rate: 0.85 + a.rand() * 0.4 })
  }
  if (t > a.next.knock) {
    a.next.knock = t + (18 + a.rand() * 40) * gap
    const lvl = m.water * (ACT_WATER[a.act] ?? 1)
    if (lvl > 0.25) a.play('pipe.knock', { gain: (0.08 + lvl * 0.16) * lift, rate: 0.8 + a.rand() * 0.35 })
  }
}

export function ambienceTick (a, t) {
  sched(a, t)
  if (!a.roam || a.interro) return
  bed(a, t)
  // 단발음은 마루 쪽에서만 온다. 골에서 건물이 조용해지는 것 자체가 다음 마루의 준비다.
  const s = swellAt(t)
  if (t < a.next.far || s < FAR_GATE) return
  a.next.far = t + (FAR_BASE + a.rand() * FAR_SPAN) * (1.9 - s)
  // 같은 소리가 연달아 오면 스케줄러로 들린다. 직전 것을 뺀 나머지에서 고른다.
  let i = Math.floor(a.rand() * FAR.length)
  if (i === a.lastFar) i = (i + 1 + Math.floor(a.rand() * (FAR.length - 1))) % FAR.length
  a.lastFar = i
  const [id, gain, rate, wet] = FAR[i]
  const ang = a.rand() * TAU
  const dist = 5 + a.rand() * 3.5
  const p = a.engine.camera.position
  a.play(id, {
    gain,
    wet,
    rate: rate * (0.94 + a.rand() * 0.12),
    // 위아래로도 흩는다 — 배관은 층을 관통하고, 탱크는 언제나 머리 위에 있다.
    pos: [p.x + Math.cos(ang) * dist, p.y + a.rand() * 5 - 2.2, p.z + Math.sin(ang) * dist]
  })
}
