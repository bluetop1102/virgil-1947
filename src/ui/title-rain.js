// [UI] 타이틀 절차 레인 오버레이. ui/title.js 소유의 분권 파일이다(notebook 의 board.js·type.js 와
// 같은 위치). 파일당 500줄 계약 때문에 분리했다 — 계약상 이 층의 주인은 여전히 title.js 하나다.
//
// 발주 근거: 사용자 실플레이 지적 "새 표지에서 비가 안 내린다". 배경 사진에는 비가 그려져
// 있지만 그것은 **멈춘 비**라, 화면에 시간축이 전무하다는 루브릭 지적(D8 죽은 화면)의 실체가
// 그것이었다.

import { rng } from '../core/util.js'

// [줄 수, 길이, 낙하 속도(화면비/초), 굵기, 알파]. 세 층의 속도·굵기 차가 그대로 원근이 된다 —
// 먼 비는 가늘고 느리고 흐리다.
const LAYERS = [
  [140, 0.050, 0.85, 0.7, 0.09],
  [82, 0.082, 1.30, 1.0, 0.15],
  [36, 0.128, 1.90, 1.5, 0.23]
]
// 사진 안의 광원 — 마키 차양 · 왼쪽 가로등 · 젖은 아스팔트의 반사광. [x, y, 반경, 세기].
// **비는 빛이 있는 데서만 보인다.** 캄캄한 하늘에 흰 줄이 고르게 그어지는 것이 가짜 비의
// 첫 번째 표지다.
const LIGHTS = [[0.545, 0.640, 0.31, 1], [0.163, 0.545, 0.165, 0.58], [0.5, 0.96, 0.56, 0.44]]
// 폭이 좁으면 "조명에 반응하는 비"가 아니라 "화면 위에 얹힌 오버레이"로 읽힌다(블라인드 판독자
// 지적). 0.13~1.9 배는 그 지적을 못 벗어났고, 아래 폭이 실측으로 통과한 값이다.
const FLOOR = 0.08      // 광원 밖 최저 가시도
const GAIN = 2.2        // 광원 한복판의 배수
const STEPS = 5         // 가시도 계단. 줄마다 stroke 하지 않고 계단마다 한 번씩 긋는다
const TILT = 0.085      // 바람. 수직에서 약 5도 — 사진 속 빗줄기의 기울기다
const COLD = '198,208,224'   // 하늘빛을 문 비
const WARM = '242,206,142'   // 마키 텅스텐을 문 비

const dprOf = () => Math.min(2, window.devicePixelRatio || 1)

// 광원 웅덩이. 마키·가로등 근처에서만 빗줄기가 빛을 문다 — 어둠 속의 비는 실제로도 안 보인다.
function lightAt (x, y) {
  let v = 0
  for (const [lx, ly, r, s] of LIGHTS) {
    const d = Math.hypot(x - lx, (y - ly) * 0.62)
    if (d < r) v = Math.max(v, s * (1 - d / r))
  }
  return v
}

export function createRain () {
  const cv = document.createElement('canvas')
  cv.className = 'virgil-rain'
  const ctx = cv.getContext('2d')
  const r = rng(90731)
  const field = LAYERS.map(([count, len, speed, width, alpha]) => ({
    len,
    speed,
    width,
    alpha,
    drops: Array.from({ length: count }, () => ({ x: r(), y: r(), ph: r() * 6.283 }))
  }))
  const still = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
  let painted = false

  return {
    cv,
    still,

    // 활성 화면의 첫 자식으로 들어간다. 스크림(.virgil-glass 배경) 위, 간판·명패 아래 —
    // 화면 둘이 동시에 뜨는 일이 없으므로 캔버스도 하나면 된다.
    mount (screen) {
      if (cv.parentNode !== screen) screen.prepend(cv)
      this.size()
    },

    size () {
      const dpr = dprOf()
      const w = Math.max(1, Math.round(cv.clientWidth * dpr))
      const h = Math.max(1, Math.round(cv.clientHeight * dpr))
      if (cv.width === w && cv.height === h) return
      cv.width = w
      cv.height = h
      painted = false
    },

    // 게임 진입 시 완전 해제 — 타이틀이 내려간 뒤에도 캔버스가 남아 매 프레임 그려지면
    // 인게임 프레임 예산을 이유 없이 먹는다.
    dispose () {
      cv.remove()
      cv.width = cv.height = 0
    },

    // 크기는 여기서 재지 않는다. 호출부가 바로 앞에서 patina 의 transform 을 쓰므로, 매 프레임
    // clientWidth 를 읽으면 쓰기 to 읽기가 물려 강제 레이아웃이 프레임마다 걸린다. 캔버스 크기가
    // 바뀌는 경로는 창 크기 변경뿐이고 그것은 title.js 의 resize() 훅이 잡는다.
    draw (dt, elapsed) {
      if (still && painted) return
      const w = cv.width
      const h = cv.height
      const dpr = dprOf()
      ctx.clearRect(0, 0, w, h)
      ctx.lineCap = 'round'
      for (const layer of field) {
        const len = layer.len * h
        const dx = -len * TILT
        ctx.lineWidth = layer.width * dpr
        // 가시도를 계단으로 끊어 계단마다 한 경로에 모은다 — 줄당 stroke 를 피하면서도
        // 빗줄기가 광원에서 멀어질수록 사라지는 기울기는 남는다(전체 stroke 15회).
        const step = Array.from({ length: STEPS }, () => [])
        const spark = []
        for (const d of layer.drops) {
          if (!still) {
            d.y += layer.speed * dt
            d.x += layer.speed * dt * TILT
            // 되돌아온 줄은 같은 세로줄로 떨어지지 않는다. 0.618 씩 밀면 어느 주기에서도 뭉치지 않는다.
            if (d.y > 1.05) { d.y -= 1.12 + layer.len; d.x += 0.618 }
            if (d.x > 1) d.x -= 1
          }
          const v = lightAt(d.x, d.y)
          step[Math.min(STEPS - 1, Math.floor(v * STEPS))].push(d.x * w, d.y * h)
          // 미광 반짝임 — 광원 한복판의 물방울 하나가 잠깐 빛을 튕긴다.
          // 위상이 줄마다 달라 동시에 켜지지 않는다.
          if (v > 0.62) {
            const tw = 0.5 + 0.5 * Math.sin(elapsed * 5.5 + d.ph)
            if (tw > 0.76) spark.push(d.x * w, d.y * h, v * tw)
          }
        }
        for (let b = 0; b < STEPS; b++) {
          const seg = step[b]
          if (!seg.length) continue
          const v = (b + 0.5) / STEPS
          ctx.beginPath()
          for (let i = 0; i < seg.length; i += 2) {
            ctx.moveTo(seg[i], seg[i + 1])
            ctx.lineTo(seg[i] + dx, seg[i + 1] - len)
          }
          const a = layer.alpha * (FLOOR + (1 - FLOOR) * v * GAIN)
          ctx.strokeStyle = `rgba(${v > 0.45 ? WARM : COLD},${a.toFixed(3)})`
          ctx.stroke()
        }
        for (let i = 0; i < spark.length; i += 3) {
          ctx.beginPath()
          ctx.arc(spark[i], spark[i + 1], layer.width * dpr * 0.9, 0, 6.283)
          ctx.fillStyle = `rgba(255,236,190,${(spark[i + 2] * 0.5).toFixed(3)})`
          ctx.fill()
        }
      }
      painted = true
    }
  }
}
