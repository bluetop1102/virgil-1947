// 품질 프리셋. QA 하네스는 항상 cinematic으로 촬영한다.

export const QUALITY = {
  cinematic: {
    name: 'cinematic',
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
