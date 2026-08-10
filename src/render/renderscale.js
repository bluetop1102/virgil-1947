// 렌더 스케일 예산 — 내부 해상도(드로잉 버퍼)를 프리셋 예산 안으로 맞춘다.
// 소비하는 값은 core/config.js `QUALITY.maxPixelRatio`(장치 배율 상한)와 `pixelBudget`
// (총 픽셀 상한) 둘뿐이고, 더 빡빡한 쪽이 이긴다. 0 은 무제한.
//
// 왜 이것 하나인가 (S-L 실측, headless ANGLE Metal · M2 · 로비 와이드 p50):
//   DPR 2(3200×1800) 85.0ms → 1.5(2400×1350) 51.7ms → 1.25 38.4ms → 1(1600×900) 26.7ms
//   회귀하면 ms ≈ 7.3 + 13.5·Mpx — **DPR 2 프레임의 91%가 픽셀 비례분**이다.
// 반면 포스트 패스를 하나씩 뺀 기여는 SSR 7.1ms · 볼류메트릭 6.9ms · 컨택트 6.7ms 로 전부
// 한 자릿수고, 그림자는 드로우콜 569개를 굽고도 0.7ms 다. 즉 드로우콜 병합도 그림자 캐시도
// 레버가 아니고, 프리셋이 기능만 껐지 픽셀은 한 번도 줄이지 않은 것이 medium/low 가
// 실기기에서 안 싸졌던 이유다(85.0 / 66.7 / 58.4ms — 프리셋 3단이 렌더 스케일 한 단만 못하다).
//
// CSS 크기는 건드리지 않는다. 캔버스 백스토어만 줄고 화면까지의 업스케일은 브라우저 합성기가
// 하므로 별도 업샘플 패스가 필요 없다.
//
// **QA 모드는 예외 없이 빠져나간다.** `?qa=1` 은 shots/base-r4 기준선을 찍는 경로라 여기서 배율이
// 한 번이라도 바뀌면 픽셀 회귀 게이트가 통째로 무의미해진다. 심사 프레임 경로(judge-probes,
// 1600×900 · deviceScaleFactor 1)는 배율이 1 이라 어느 상한에도 걸리지 않아 그대로 통과한다 —
// 실측으로 15샷이 base-r4 와 **바이트 동일**이다.
export function fitRenderScale (engine, width, height) {
  if (engine.qa) return false
  const q = engine.quality
  const maxRatio = q.maxPixelRatio || 0
  const budget = q.pixelBudget || 0
  if (!maxRatio && !budget) return false

  const renderer = engine.renderer
  const w = width || engine.size?.w || 1
  const h = height || engine.size?.h || 1
  // 기준은 언제나 engine.js 가 처음 고른 배율이다. 여기서 그 위로 올리는 일은 없고, 창이
  // 작아지거나 저해상도 모니터로 옮겨가면 상한까지 다시 올라온다.
  const base = Math.min(window.devicePixelRatio || 1, 2)
  let ratio = maxRatio ? Math.min(base, maxRatio) : base
  if (budget > 0) {
    const px = w * h * ratio * ratio
    // 0.5 바닥이 없으면 5K 창에서 배율이 0.4 밑으로 내려가 프레임보다 화질이 먼저 무너진다.
    if (px > budget) ratio = Math.max(0.5, ratio * Math.sqrt(budget / px))
  }
  if (Math.abs(ratio - renderer.getPixelRatio()) < 1e-3) return false

  renderer.setPixelRatio(ratio)
  renderer.setSize(w, h, false)
  // engine.size.dpr 는 "렌더러의 장치 배율"로 공표된 값이다(ARCH §4). 배율을 바꾸는 곳이
  // 여기 하나뿐이므로 여기서 같이 갱신하지 않으면 그 값이 거짓이 된다 — 실소비처가 있다:
  // atmosphere 가 `uMaxPx = 4 * dpr` 로 모티 스프라이트 상한을 4 CSS px 로 환산하는데,
  // 2 로 굳어 있으면 버퍼만 줄어들어 근경 모티가 화면에서 그만큼 커진다.
  if (engine.size) engine.size.dpr = ratio
  return true
}
