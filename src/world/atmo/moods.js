// 무드 프리셋. 색은 전부 선형 RGB(작업 색공간)로 적는다 — sRGB 값을 넣으면 IBL이 밝게 뜬다.
// 한 무드는 [안개 · 룩 오버라이드 · IBL · 앰비언트 리그 · 파티클 · 광축 세기]를 한 덩어리로 묶는다.
//
// fog 필드의 의미 (atmosphere.js의 syncVolumetric이 소비)
//   density        소광계수의 원천. 클수록 원경이 빨리 소멸한다
//   albedo         단일산란 알베도. 안개가 "얼마나 우유빛인가". 1을 넘길 수 없다
//   ambient        광원 없는 방향의 바닥 산란. 낮을수록 어둠이 진짜 어둠이 된다
//   heightFalloff  고도 1m당 밀도 감쇠. 0에 가까우면 하늘까지 안개에 잠긴다
//   maxDist        레이마치 최대 거리. 실내에 90m를 쓰면 벽 너머까지 적분해 낭비다.
//                  volumetric.js 가 안개 시작 거리를 이 값의 비율(nearFadeK)로 잡으므로,
//                  방 크기보다 크게 잡으면 근경 전체가 페이드 구간에 들어가 광축이 죽는다.
//                  대략 그 공간의 대각선 길이로 맞춘다(particles.box 참조).
//
// shaftScale — fixtures.js 의 additive ConeGeometry 셸(광축 껍데기) 세기.
//   볼류메트릭 패스는 마치 비용 때문에 광원 상위 4개만 돌고, 그중 가장 가까운 하나가 인스캐터를
//   독점한다(복도 실측: 천장등 기여가 최근접 벽등의 8%). 그래서 "광원별 산란 세기가 다르게
//   보인다"(G2)는 볼류메트릭 단독으로 못 만든다 — 셸은 fixture 마다 sqrt(cd/25) 가 붙으므로
//   그 몫이다. 셸이 납작한 삼각형이던 시절의 기각 근거(프레임 평균 3.7배)는 fbm 밀도 얼룩 ·
//   VSM 오클루전 · 소프트 파티클 페이드가 들어간 지금은 성립하지 않는다(corridor 항목 참조).
//   아직 0 인 무드는 이 라운드에 재촬영으로 검증하지 못해 유보한 것이지, 0 이 결론이라서가 아니다.

export const MOODS = {
  'lobby-night': {
    exposure: 1.00,
    envIntensity: 0.58,
    shaftScale: 0,
    background: false,
    fog: {
      density: 0.018, albedo: 0.62, ambient: 0.38, heightFalloff: 0.16,
      color: [0.042, 0.033, 0.026], scattering: 1.30, anisotropy: 0.62,
      windDir: [0.055, 0.012, 0.030], baseHeight: 0.0,
      noiseScale: 0.075, spark: 3.4, sparkScale: 1.30, maxDist: 20
    },
    look: {
      lift: [-0.010, 0.002, 0.020], gamma: [1.00, 0.99, 0.965], gain: [1.10, 1.00, 0.88],
      saturation: 0.90, contrast: 1.14, halation: 0.28, vignette: 0.44,
      grainAmount: 0.042, chromatic: 0.0022, volumetricIntensity: 1.10
    },
    hemi: { sky: [0.024, 0.019, 0.015], ground: [0.010, 0.007, 0.005], intensity: 0.45 },
    particles: { dust: 0.55, smoke: 1.0, rain: 0, splash: 0, box: [16, 5.2, 16] },
    ibl: {
      zenith: [0.005, 0.005, 0.007], horizon: [0.030, 0.022, 0.013], ground: [0.021, 0.015, 0.010],
      glow: [0.085, 0.048, 0.020], glowPow: 2.6, glowHeight: 0.60, stars: 0, seed: 0.7,
      sun: null,
      blobs: [
        { dir: [0.15, 0.86, -0.48], col: [1.35, 0.78, 0.30], size: 26 },
        { dir: [-0.90, 0.05, 0.42], col: [0.13, 0.17, 0.22], size: 5 },
        { dir: [0.72, -0.22, 0.66], col: [0.26, 0.17, 0.09], size: 7 }
      ]
    }
  },

  'corridor-night': {
    // 1.10 → 0.75. 자동노출이 흡수하지 못하는 유일한 레버다 — expo.measure 는 노출 적용 전
    // HDR 을 읽고 이 값은 그 뒤에 곱해진다(pipeline.js:450). 안개 밀도로 복도 끝을 누르려던
    // 시도는 전부 measure 가 되받아 올려 오히려 나빠졌다(실측: density 0.0833→0.150 에서
    // 복도끝/근경벽 51.6% → 73.7%, ev 42.4 → 67.6). 이 값만 내리면 프레임 전체가 톤커브
    // 아래쪽으로 내려가 암부가 살아나고 원경이 실제로 소멸한다.
    // 0.75 → 0.62. 위 fog/GTAO 수정이 프레임에서 뺀 광량을 expo.measure 가 그대로 되받아
    // 올린다(실측 ev 40.9 → 59.1, +45%) — 원경이 어두워진 몫이 자동노출에 흡수돼 배달되는
    // 그림에서는 원/근 사다리가 그대로였다. measure 뒤에 곱해지는 이 값만이 그 되먹임 밖에 있고,
    // 톤커브가 비선형이라 암부가 밝은 쪽보다 빨리 떨어져 사다리 자체도 같이 벌어진다.
    // 0.62 → 0.68. 라운드5 의 안개색 하향이 프레임에서 뺀 광량은 자동노출이 되받지 못하는
    // 영역(원경)이라, 그대로 두면 휘도 6 이하 픽셀이 7.31% → 10.42% 로 D6 게이트(10%)를 넘었다.
    // 노출을 올리면 톤커브의 가파른 구간에 있는 **근경만 크게 올라오고** 어깨에 있는 원경은
    // 거의 안 움직인다 — 게이트와 사다리를 동시에 회복하는 유일한 방향이었다
    // (자유노출 A/B scratchpad/lit2/gate: dark 11.88% → 10.30%, 근/원 평균비 0.62 → 0.70,
    //  근경 벽지 국소대비 4.72 → 4.98, 원경 끝벽 40.8 → 36.8).
    exposure: 0.74,
    // 0.44 → 0.78. 라운드5 실측이 뒤집은 전제: 원경 끝벽(15m)은 FogExp2 로 99.4% 안개색이라
    // **표면 정보가 없고 밝기가 안개색×노출에 고정**돼 있다. 그래서 IBL/hemi 를 올리면 근경
    // 표면만 올라오고 원경은 그대로다 — 프레임에서 유일한 "사다리 전용 레버"다.
    // 노출 고정 A/B(scratchpad/lit2/fin): env 0.44→0.62 에서 근경 벽지 국소대비 3.68→4.33(+18%),
    // 원경 웨인스코트 50.6→52.1(+3%). 0.85 까지 올리면 근경 5.15 / 원경 4.91 이 된다.
    // 대신 앰비언트는 접촉부를 씻으므로 GTAO uPower 로 되받는다(gtao.js 4.2).
    envIntensity: 0.78,
    // 0 → 0.65. r2 에서 0 으로 내린 근거(납작한 additive 삼각형이 프레임 평균을 3.7배로
    // 들어올린다)는 그 시점 셸을 잰 것이고 지금은 사실이 아니다. 재측정(노출 고정, 먼지 숨김):
    // 셸 0 → 0.8 에서 좌측 근경 벽 35.6 → 40.1, 근경 하부 벽 108.8 → 110.8, 카펫 121.6 → 123.9,
    // 광축 밖 124.9 → 124.2 — 베일이 아니다. 자동노출도 28.19 → 25.72(-9%)에 그친다(r2: 3.7배).
    // 반대급부는 명확하다: 천장 돔 아래 60.0 → 76.7(+28%)로 **두 번째 광축이 생긴다.**
    // 볼류메트릭은 가장 가까운 벽등 하나만 지배해(마치 광원 4개 중 천장등 기여가 8%)
    // "광원별 산란 세기 차"를 만들지 못한다 — 그건 fixture 마다 sqrt(cd/25)가 붙는 셸의 몫이다.
    shaftScale: 0.65,
    background: false,
    fog: {
      // 역할 분담: scene.fog(FogExp2)가 대기 원근을, 볼류메트릭이 광축을 맡는다.
      //
      // 직전 리비전은 maxDist 5.5 로 볼류메트릭을 근경에만 남겨 복도 끝을 근경 벽의 47%까지
      // 눌렀지만, 그 대가로 광축이 사라졌다 — 인스캐터 기여의 코어/광축밖 비가 0.38:1 이라
      // 실제로는 "화면 왼쪽 가장자리에 낀 김"만 남았다(좌측 4열 raw 대비 +23%). G2 6점(균일
      // 안개 오버레이)과 같은 상태다. maxDist 10 으로 천장등(카메라에서 8.5m)의 콘을 다시
      // 마치 구간에 넣고, 대신 아래 세 가지로 베일만 걷어낸다.
      //
      // heightFalloff 1.10 → 0.85, density 0.046 → 0.0833. 소광을 1.8배로 올려 복도 끝을
      // 인스캐터가 아니라 투과율로 죽인다. density 는 scene.fog(FogExp2) 밀도이기도 해서
      // 원경 표면도 같이 어두운 청록으로 잠긴다.
      //
      // anisotropy 0.74 → 0.62. 0.74 는 전방산란이 너무 뾰족해서, 광원을 정면으로 보는
      // 화면 밖 근거리 벽등만 15배 이득을 먹고 시선과 직교하는 복도 광축은 안 보였다.
      //
      // color 는 FogExp2 색이기도 하다. 복도 끝 표면의 HDR 값보다 낮아야 안개가 낄수록
      // 원경이 어두워진다 — 높으면 "안개로 소멸"의 반대가 된다.
      //
      // albedo 0.90 → 0.42. 여기가 G2 의 진짜 레버다. 단일산란 알베도가 0.9 면 안개가 흡수한
      // 만큼을 거의 그대로 되돌려줘서, 거리가 멀어질수록 표면이 어두워지는 게 아니라 **회색으로
      // 수렴**한다 — 근경 벽지와 원경 웨인스코트가 같은 우유빛 바닥을 깔고 앉아 대비 사다리가
      // 무너진다. 0.42 면 소광이 인스캐터를 이겨 원경이 실제로 어둠으로 소멸하고, 근경은
      // exp(-σd)≈1 이라 아무 영향도 받지 않는다("근거리 소광계수를 0에 수렴").
      // density 0.0833 → 0.105 는 그 거리 기울기를 세우는 쪽이다(scene.fog 색이 거의 흑이라
      // FogExp2 도 같은 방향으로 원경만 누른다).
      //
      // 그런데 0.105/albedo 0.42 에서도 원경 웨인스코트(15m)가 근경 좌측 벽지의 2.03배로
      // **더 밝았다** — 대기 원근이 거꾸로 서 있었다. 세 값을 함께 옮긴다(노출 고정 A/B):
      //   albedo 0.42→0.24, ambient 0.030→0.012 : 원경 웨인스코트 53.4 → 44.9 (근경 26.5 불변)
      //   density 0.105→0.150 + extinctK 1.1     : 원경 웨인스코트 73.9 → 57 이하
      // extinctK 가 핵심이다 — 밀도를 올리면서 마치 소광 배율을 2.4 → 1.1 로 내리면
      // 근경에 얹히던 1차 지수 상수항이 빠지고 거리 곡선은 FogExp2 의 2차항이 맡는다.
      // 되돌리기 A/B(노출 고정, 같은 리비전): 근경 웨인스코트 126.8 → 125.2(불변),
      // 근경 벽지 27.0 → 27.9(불변), 원경 웨인스코트 73.9 → 57.3. 근/원 사다리 1.72 → 2.18.
      //
      // 라운드5. 밀도는 이미 충분했다 — 15m 에서 FogExp2 는 1-exp(-(0.15·15)²)=99.4% 다.
      // 그런데 원경이 근경보다 **3배 밝았다**(원경 웨인스코트 78 vs 근경 벽지 26, 사다리 0.32).
      // 원인은 밀도가 아니라 **안개색 자체의 배달 밝기**다: color 를 ×43 자동노출로 곱하고
      // AgX·lift·gain 을 통과시키면 [0.0010,0.0014,0.0018] 이 화면에서 76 으로 나온다.
      // 즉 "원경을 소멸시킨다"고 깔아둔 안개가 화면에서는 근경보다 밝은 **우유빛 바닥**이었고,
      // 근경(2m)도 8.6% 만큼 그 바닥을 얹어 받고 있었다("근거리 소광계수 0 수렴"의 실패 지점).
      // 색만 ×0.20 으로 내린다(밀도·albedo·extinctK 는 라운드4 값이 맞았으므로 그대로).
      // 노출 고정 A/B(scratchpad/lit2/fin): 원경 웨인스코트 76.4 → 50.6(×0.30) / 42.3(×0.12),
      // 근경 벽지 24.8 → 18.7 — 근경에서 빠진 6 이 그 상수 리프트였다. 사다리 0.32 → 0.42.
      density: 0.170, albedo: 0.24, ambient: 0.012, extinctK: 1.1, heightFalloff: 0.85,
      color: [0.00020, 0.00028, 0.00036], scattering: 0.62, anisotropy: 0.62,
      windDir: [0.020, 0.006, 0.075], baseHeight: 0.0,
      noiseScale: 0.10, spark: 4.5, sparkScale: 2.20, maxDist: 10.0
    },
    look: {
      lift: [-0.016, 0.003, 0.030], gamma: [1.00, 0.985, 0.945], gain: [1.08, 1.00, 0.90],
      // 0.24 → 0.17. 헐레이션은 발광부 주변 반경 수십 px 에 상수 리프트를 얹는다 —
      // 천장 형광 캡슐이 반자틀 두 개를 동시에 덮어 보와 보 사이의 명암차를 눌렀다
      // (같은 리비전 A/B: 보밑 함몰 49% → 헐레이션 0 에서 63%). 광학은 남기고 폭만 줄인다.
      saturation: 0.80, contrast: 1.20, halation: 0.17, vignette: 0.54,
      // 1.72 → 0.55. 1.72 는 셸이 만든 베일 위에서 광축을 읽히게 하려고 올린 값이었다.
      // 셸을 끄고 0 에서부터 다시 올렸다. 기준선은 패스 제거가 아니라 uIntensity=0 이다 —
      // 소광(대기 원근)은 양쪽에 그대로 두고 인스캐터 단독 기여만 재야 베일 판정이 성립한다.
      // exposure 와 함께 잰 파레토(전부 자동노출 수렴 후 고정, 먼지 숨김):
      //   exposure  게인   같은배경 광축안/밖   광축밖 밝기   복도끝/근경벽   광축코어sd/주변sd
      //     1.10    0.40        1.89            +1.7%          51.6%            1.56
      //     0.85    0.40        1.88            +2.2%          47.3%            1.77
      //     0.85    0.55        2.21            -1.9%          52.2%            1.77
      //     0.75    0.55        2.13            +2.8%          49.4%            2.28   ← 채택
      //     0.75    0.70        2.39            +4.2%          54.4%            2.39
      // 게인만 올리면 광축 대비는 좋아지지만 인스캐터가 복도 끝을 되살려 "안개로 소멸"이 깨진다.
      // 노출을 같이 내려야 세 기준이 동시에 선다.
      //
      // 0.55 → 0.30. 셸을 되살린 만큼(위 shaftScale) 인스캐터를 덜어 총 산란 예산을 유지한다.
      // uIntensity 는 volApply 에서 인스캐터 rgb 에만 곱하고 투과율(a)은 건드리지 않으므로
      // 대기 원근(소광)은 그대로다. 셸 0.65 + 인스캐터 0.30 실측: 복도끝/근경벽 46.1% → 51.6%,
      // 상인방 계단 끊김(행간 최대 점프) 21.35 → 14.45, 프레임 평균 68.6 → 69.6.
      //
      // 0.30 → 0.22. 위 fog 항의 extinctK 로 마치의 소광 몫을 줄인 만큼 인스캐터 몫도 같이
      // 줄여야 근경 상수항이 실제로 빠진다(둘 중 하나만 내리면 산란/소광 비가 깨져 안개가
      // 다시 우유빛이 된다). 셸(shaftScale 0.65)이 광축을 계속 책임지므로 G2 광축은 유지된다.
      grainAmount: 0.052, chromatic: 0.0026, volumetricIntensity: 0.22
    },
    // envIntensity 와 같은 이유로 올린다(근경 전용 레버). 하늘색은 청록을 유지해 원경 안개색이
    // 빠진 자리를 그림자 쪽 색이 대신 잡게 한다 — 값이 아니라 색으로 원/근을 가른다(G7).
    hemi: { sky: [0.016, 0.022, 0.028], ground: [0.008, 0.007, 0.007], intensity: 0.70 },
    particles: { dust: 0.75, smoke: 0.35, rain: 0, splash: 0, box: [7, 3.4, 26] },
    ibl: {
      zenith: [0.003, 0.004, 0.006], horizon: [0.012, 0.014, 0.016], ground: [0.010, 0.008, 0.007],
      glow: [0.030, 0.020, 0.010], glowPow: 3.4, glowHeight: 0.42, stars: 0, seed: 2.1,
      sun: null,
      blobs: [
        { dir: [0.0, 0.30, -0.95], col: [0.55, 0.31, 0.12], size: 34 },
        { dir: [0.0, 0.20, 0.98], col: [0.04, 0.09, 0.12], size: 12 }
      ]
    }
  },

  'room-dusk': {
    exposure: 0.88,
    envIntensity: 0.52,
    shaftScale: 0,
    background: false,
    fog: {
      density: 0.015, albedo: 0.88, ambient: 0.30, heightFalloff: 0.20,
      color: [0.050, 0.041, 0.035], scattering: 1.70, anisotropy: 0.80,
      windDir: [0.09, 0.02, 0.02], baseHeight: 0.0,
      noiseScale: 0.13, spark: 5.0, sparkScale: 2.10, maxDist: 12
    },
    look: {
      lift: [-0.008, 0.004, 0.024], gamma: [1.00, 0.99, 0.96], gain: [1.12, 1.00, 0.86],
      saturation: 0.92, contrast: 1.12, halation: 0.32, vignette: 0.42,
      grainAmount: 0.040, chromatic: 0.0020, volumetricIntensity: 1.15
    },
    hemi: { sky: [0.030, 0.026, 0.026], ground: [0.014, 0.010, 0.008], intensity: 0.45 },
    particles: { dust: 1.35, smoke: 0.5, rain: 0, splash: 0, box: [9, 3.2, 9] },
    ibl: {
      zenith: [0.014, 0.020, 0.038], horizon: [0.13, 0.075, 0.038], ground: [0.030, 0.022, 0.016],
      glow: [0.30, 0.14, 0.045], glowPow: 2.0, glowHeight: 0.72, stars: 0, seed: 4.3,
      sun: { dir: [0.62, 0.22, -0.75], col: [3.4, 1.55, 0.62], sharp: 220 },
      blobs: [
        { dir: [0.60, 0.30, -0.74], col: [1.10, 0.62, 0.28], size: 10 },
        { dir: [-0.55, -0.10, 0.83], col: [0.10, 0.10, 0.13], size: 5 }
      ]
    }
  },

  bathroom: {
    exposure: 0.94,
    envIntensity: 0.80,
    shaftScale: 0,
    background: false,
    fog: {
      density: 0.009, albedo: 0.52, ambient: 0.42, heightFalloff: 0.28,
      color: [0.036, 0.043, 0.048], scattering: 0.95, anisotropy: 0.36,
      windDir: [0.01, 0.05, 0.01], baseHeight: 0.0,
      noiseScale: 0.16, spark: 2.0, sparkScale: 1.90, maxDist: 6
    },
    look: {
      lift: [-0.006, 0.001, 0.014], gamma: [0.99, 1.00, 1.00], gain: [0.94, 1.00, 1.04],
      saturation: 0.72, contrast: 1.18, halation: 0.14, vignette: 0.36,
      grainAmount: 0.034, chromatic: 0.0014, volumetricIntensity: 0.85
    },
    hemi: { sky: [0.038, 0.043, 0.048], ground: [0.020, 0.022, 0.024], intensity: 0.60 },
    particles: { dust: 0.30, smoke: 0.20, rain: 0, splash: 0, box: [4, 2.8, 4] },
    ibl: {
      zenith: [0.10, 0.113, 0.126], horizon: [0.055, 0.062, 0.070], ground: [0.040, 0.044, 0.048],
      glow: [0.02, 0.026, 0.030], glowPow: 4.0, glowHeight: 0.30, stars: 0, seed: 6.9,
      sun: null,
      blobs: [
        { dir: [0.0, 0.98, 0.20], col: [1.55, 1.72, 1.90], size: 9 },
        { dir: [0.0, -0.85, 0.53], col: [0.10, 0.11, 0.12], size: 4 }
      ]
    }
  },

  'rooftop-rain': {
    exposure: 0.92,
    envIntensity: 0.56,
    shaftScale: 0.85,
    background: true,
    // 비가 오는 밤 옥상은 "우유빛 균일 헤이즈"가 아니다 — 소광은 살리되 단일산란 알베도와
    // 바닥 산란을 낮춰야 콘크리트가 흰 무한 바닥으로 뜨지 않는다(G2/D6).
    fog: {
      density: 0.019, albedo: 0.58, ambient: 0.20, heightFalloff: 0.12,
      color: [0.028, 0.033, 0.045], scattering: 1.40, anisotropy: 0.52,
      windDir: [0.28, -0.05, 0.10], baseHeight: 0.0,
      noiseScale: 0.045, spark: 2.4, sparkScale: 0.85, maxDist: 62
    },
    look: {
      lift: [-0.014, 0.002, 0.034], gamma: [1.00, 0.995, 0.975], gain: [1.02, 1.00, 0.98],
      saturation: 0.84, contrast: 1.16, halation: 0.30, vignette: 0.48,
      grainAmount: 0.050, chromatic: 0.0030, volumetricIntensity: 1.00
    },
    hemi: { sky: [0.024, 0.029, 0.042], ground: [0.010, 0.010, 0.011], intensity: 0.65 },
    particles: { dust: 0.10, smoke: 0.22, rain: 1.0, splash: 1.0, lens: 1.0, box: [22, 9, 22] },
    ibl: {
      zenith: [0.010, 0.014, 0.026], horizon: [0.055, 0.045, 0.040], ground: [0.014, 0.014, 0.016],
      glow: [0.36, 0.20, 0.085], glowPow: 3.2, glowHeight: 0.34, stars: 0.35, seed: 1.4,
      sun: { dir: [-0.42, 0.60, 0.68], col: [2.6, 2.9, 3.6], sharp: 900 },
      blobs: [
        { dir: [-0.40, 0.58, 0.71], col: [0.34, 0.40, 0.52], size: 12 },
        { dir: [0.88, -0.06, -0.47], col: [0.42, 0.16, 0.20], size: 6 },
        { dir: [-0.72, -0.10, -0.68], col: [0.16, 0.26, 0.34], size: 6 }
      ]
    }
  },

  interrogation: {
    exposure: 0.86,
    envIntensity: 0.14,
    shaftScale: 0,
    background: false,
    fog: {
      density: 0.024, albedo: 0.88, ambient: 0.14, heightFalloff: 0.14,
      color: [0.026, 0.026, 0.030], scattering: 1.85, anisotropy: 0.82,
      windDir: [0.035, 0.020, 0.015], baseHeight: 0.0,
      noiseScale: 0.16, spark: 4.4, sparkScale: 2.30, maxDist: 6
    },
    look: {
      lift: [-0.018, 0.000, 0.022], gamma: [1.00, 0.985, 0.955], gain: [1.09, 1.00, 0.89],
      saturation: 0.76, contrast: 1.28, halation: 0.22, vignette: 0.62,
      grainAmount: 0.056, chromatic: 0.0024, volumetricIntensity: 1.15
    },
    hemi: { sky: [0.006, 0.006, 0.008], ground: [0.003, 0.003, 0.003], intensity: 0.22 },
    particles: { dust: 0.85, smoke: 1.35, rain: 0, splash: 0, box: [6, 3.0, 6] },
    ibl: {
      zenith: [0.002, 0.002, 0.003], horizon: [0.006, 0.006, 0.007], ground: [0.006, 0.005, 0.004],
      glow: [0.012, 0.008, 0.005], glowPow: 4.5, glowHeight: 0.25, stars: 0, seed: 3.3,
      sun: null,
      blobs: [{ dir: [0.05, 0.95, -0.30], col: [0.95, 0.62, 0.30], size: 40 }]
    }
  }
}

// 방 이름 → 기본 무드. 레벨이 setMood를 명시 호출하지 않아도 대기는 항상 의도된 상태를 유지한다.
export const ROOM_MOOD = {
  lobby: 'lobby-night',
  corridor: 'corridor-night',
  room942: 'room-dusk',
  room944: 'room-dusk',
  bathroom: 'bathroom',
  rooftop: 'rooftop-rain'
}

export const DEFAULT_MOOD = 'lobby-night'
