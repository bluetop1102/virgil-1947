// 품질 프리셋. QA 하네스는 항상 cinematic으로 촬영한다.
//
// 렌더 스케일 예산 — `maxPixelRatio`(장치 배율 상한) · `pixelBudget`(드로잉 버퍼 총 픽셀 상한).
// 둘 중 더 빡빡한 쪽이 이긴다. 0 은 무제한. 소비는 render/pipeline.js `applyRenderScale()` 하나뿐이고
// **QA 모드(`?qa=1`)에서는 적용되지 않는다** — shots/base-r4 기준선이 그 픽셀 위에 서 있다.
// 값의 근거(S-L 실측, headless ANGLE Metal · M2 · 로비 와이드 p50):
//   HIGH   ms ≈ 7.3 + 13.5·Mpx   MEDIUM ms ≈ 6.0 + 10.5·Mpx   LOW ms ≈ 7.7 + 8.8·Mpx
// DPR 2 프레임의 91%가 픽셀 비례분이라 포스트 패스를 전부 꺼도(−59.5%) 렌더 스케일 한 단계
// (2.0→1.5, −39%)에 못 미친다. 프리셋이 기능만 껐지 픽셀은 한 번도 줄이지 않은 것이
// medium/low 가 실기기에서 안 싸졌던 이유다.
export const QUALITY = {
  cinematic: {
    name: 'cinematic',
    maxPixelRatio: 0,
    pixelBudget: 0,
    texRes: 2048,
    shadowMap: 2048,
    cascades: 4,
    taa: true,
    taaSamples: 16,
    gtao: true,
    gtaoSlices: 4,
    gtaoSteps: 12,
    ssr: true,
    ssrSteps: 48,
    volumetric: true,
    volSteps: 64,
    bloom: true,
    bloomMips: 6,
    dof: true,
    motionBlur: true,
    grain: true,
    parallax: true,
    parallaxSteps: 32,
    particles: 1.0,
    maxLights: 24
  },
  high: {
    name: 'high',
    // 2.3Mpx ≈ 38ms. 16.7ms 는 이 셰이더로 0.7Mpx 를 뜻해 룩이 무너진다 — HIGH 는 룩 프리셋이라
    // 예산을 30fps 근처에 두고, 그 아래를 원하면 medium 이 받는다.
    maxPixelRatio: 1.5,
    pixelBudget: 2300000,
    texRes: 1024,
    shadowMap: 1024,
    cascades: 3,
    taa: true,
    taaSamples: 8,
    gtao: true,
    gtaoSlices: 3,
    gtaoSteps: 8,
    ssr: true,
    ssrSteps: 24,
    volumetric: true,
    volSteps: 32,
    bloom: true,
    bloomMips: 5,
    dof: true,
    motionBlur: true,
    grain: true,
    parallax: true,
    parallaxSteps: 16,
    particles: 0.6,
    maxLights: 16
  },
  medium: {
    name: 'medium',
    // 2.1Mpx ≈ 28ms — 33.3ms 예산 안. 상한이 high 와 같은 1.5 인 것은 의도다:
    // 같은 픽셀에서 셰이더가 더 싸므로 작은 창에서는 굳이 더 흐릴 이유가 없다.
    maxPixelRatio: 1.5,
    pixelBudget: 2100000,
    texRes: 512,
    shadowMap: 1024,
    cascades: 2,
    taa: false,
    taaSamples: 1,
    gtao: true,
    gtaoSlices: 2,
    gtaoSteps: 6,
    ssr: false,
    ssrSteps: 0,
    volumetric: true,
    volSteps: 16,
    bloom: true,
    bloomMips: 4,
    dof: false,
    motionBlur: false,
    grain: true,
    parallax: false,
    parallaxSteps: 0,
    particles: 0.3,
    maxLights: 8
  },
  low: {
    name: 'low',
    // 1.3Mpx ≈ 19ms. 여기까지 내려온 기기는 창이 커도 프레임을 먼저 지킨다.
    maxPixelRatio: 1.25,
    pixelBudget: 1300000,
    texRes: 256,
    shadowMap: 512,
    cascades: 1,
    taa: false,
    taaSamples: 1,
    gtao: false,
    gtaoSlices: 1,
    gtaoSteps: 2,
    ssr: false,
    ssrSteps: 0,
    volumetric: false,
    volSteps: 0,
    bloom: true,
    bloomMips: 3,
    dof: false,
    motionBlur: false,
    grain: true,
    parallax: false,
    parallaxSteps: 0,
    particles: 0,
    maxLights: 4
  }
}

// 전역 룩 튜너블. 그레이딩·대기 파라미터는 여기 한 곳에서만 바꾼다.
export const LOOK = {
  exposure: 1.0,
  toneMapping: 'agx',
  fogDensity: 0.022,
  fogColor: [0.030, 0.038, 0.050],
  volumetricIntensity: 1.0,
  grainAmount: 0.045,
  halation: 0.35,
  chromatic: 0.0022,
  vignette: 0.42,
  // 느와르 룩: 그림자는 청록으로 밀고 하이라이트는 호박색으로 당긴다 (루브릭 G7)
  lift: [-0.012, 0.004, 0.022],
  gamma: [1.00, 0.99, 0.97],
  gain: [1.06, 1.00, 0.92],
  saturation: 0.86,
  contrast: 1.10
}

export function pickQuality (search = '') {
  const p = new URLSearchParams(search)
  const q = p.get('q')
  if (q && QUALITY[q]) return QUALITY[q]
  if (q) console.warn(`[config] unknown quality preset: ${q}`)
  return p.get('qa') === '1' ? QUALITY.cinematic : QUALITY.high
}
