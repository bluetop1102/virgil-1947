// QA 스크린샷 카메라 목록. 레벨/시네마틱 에이전트는 여기에 **추가만** 한다. 기존 엔트리 수정 금지.
// pos/target은 월드 좌표(m), time은 결정론적 게임 시각(초), state는 촬영 전 강제할 게임 상태.

export const SHOTS = {
  'testbed-materials': {
    pos: [0, 1.55, 5.6], target: [0, 1.1, -1.2], fov: 38, time: 8, act: 1,
    state: { scene: 'testbed' },
    note: '재질 쇼케이스 — 대리석/황동/목재/타일/젖은면 스펙큘러 비교. G3 단독 판정'
  },
  'testbed-props': {
    pos: [2.4, 1.35, 3.2], target: [-0.6, 0.85, -0.8], fov: 44, time: 9, act: 1,
    state: { scene: 'testbed' },
    note: '소품 근접 — 베벨·마모·컨택트 섀도. G6/G10/D4/D5 판정'
  },
  'lobby-wide': {
    pos: [0, 1.68, 9.2], target: [0, 1.5, -2], fov: 34, time: 12, act: 1,
    note: '로비 전경 — 대리석 반사·샹들리에·프런트데스크. G5/G9 판정 기준 샷'
  },
  'lobby-desk': {
    pos: [-1.1, 1.62, 1.6], target: [-3.4, 1.35, -3.2], fov: 42, time: 14, act: 1,
    note: '프런트데스크 근접 — 황동/목재/숙박부. G3/G6 판정'
  },
  'lobby-elevator': {
    pos: [4.2, 1.66, 2.0], target: [6.8, 1.5, -1.2], fov: 38, time: 16, act: 1,
    note: '엘리베이터 로비 — 황동 도어·인디케이터. 볼류메트릭 광축 G2'
  },
  'lobby-ceiling': {
    pos: [0, 1.68, 1.2], target: [0, 3.62, -2.0], fov: 46, time: 13, act: 1,
    note: '로비 천장 앙각 — 펜던트 위 광 기둥 아티팩트 회귀 감시(fable 83-ceiling.jpg). G8/G2'
  },
  'corridor-long': {
    pos: [0, 1.66, 14.0], target: [0, 1.55, -6], fov: 30, time: 22, act: 2,
    deferred: 'P2 정식 9층 복도 레벨 미구현',
    note: '9층 복도 원경 — 안개 소멸·벽등 반복 변주. G2/G10 핵심 샷'
  },
  'corridor-942': {
    pos: [1.3, 1.64, 4.2], target: [-1.4, 1.5, 1.4], fov: 40, time: 24, act: 2,
    deferred: 'P2 정식 9층 복도 레벨 미구현',
    note: '942호 문 앞 — 카펫·문틀 몰딩·번호판. G6'
  },
  'room942-bed': {
    pos: [2.6, 1.55, 2.8], target: [-0.8, 1.0, -1.0], fov: 38, time: 30, act: 2,
    deferred: 'P2 정식 942호 레벨 미구현',
    note: '942호 침대·창 — 블라인드 광선, 먼지. G1/G2'
  },
  'room942-bath': {
    pos: [0.6, 1.5, 1.4], target: [-1.0, 1.15, -1.6], fov: 44, time: 32, act: 2,
    deferred: 'P2 정식 942호 욕실 레벨 미구현',
    note: '욕실 — 육각타일·세면대·거울 반사. G3/G5'
  },
  'rooftop-tanks': {
    pos: [-6.5, 2.2, 8.0], target: [1.0, 3.2, -1.0], fov: 36, time: 44, act: 3,
    deferred: 'P2 정식 옥상 레벨 미구현',
    note: '옥상 물탱크 — 야경·달빛·비. G1/G7/G9'
  },
  'rooftop-ladder': {
    pos: [1.8, 3.4, 3.0], target: [0.4, 4.6, -0.6], fov: 40, time: 46, act: 3,
    deferred: 'P2 정식 옥상 레벨 미구현',
    note: '탱크 사다리 앙각 — 실루엣·림라이트. G10'
  },
  'interrogation-deitch': {
    pos: [0, 1.42, 1.35], target: [0, 1.40, -0.4], fov: 50, time: 18, act: 1,
    state: { interrogating: 'deitch' },
    note: '마를로 다이치 심문 클로즈업 — 텔 가독성 N2/N5'
  },
  'rig-ground-check': {
    pos: [0.9, 0.55, 0.95], target: [0, 0.4, -0.42], fov: 55, time: 18, act: 1,
    state: { interrogating: 'deitch' },
    note: '리그 하체·접지 검증 보조 앵글 — D5 판정용 (품질 이터레이션 실험, grader-rig.md)'
  },
  'notebook-open': {
    pos: [0, 1.5, 1.0], target: [0, 1.3, 0], fov: 45, time: 26, act: 2,
    state: { ui: 'notebook' },
    note: '수사노트 UI — 1947 물성 N8/D7'
  },
  'deduction-board': {
    pos: [0, 1.5, 1.0], target: [0, 1.3, 0], fov: 45, time: 50, act: 3,
    state: { ui: 'deduction' },
    note: '증거판 — N4/N8'
  },
  // ATMOSPHERE 단독 검증 프로브. 레벨과 겹치지 않도록 월드 y=-500에 격리해 짓는다(y좌표에 -500이 이미 반영됨).
  'atmo-lobby-night': {
    pos: [4.6, -498.38, 5.4], target: [-0.6, -498.95, -2.2], fov: 40, time: 11, act: 1,
    state: { scene: 'atmo-probe', mood: 'lobby-night' },
    note: '[ATMOSPHERE QA] lobby-night — 텅스텐 샹들리에 vs 형광 프런트등 색온도 분리, 담배연기. G1/G2'
  },
  'atmo-corridor-night': {
    pos: [0.4, -498.40, 6.2], target: [-0.4, -498.65, -6.0], fov: 32, time: 15, act: 2,
    state: { scene: 'atmo-probe', mood: 'corridor-night' },
    note: '[ATMOSPHERE QA] corridor-night — 원경 소멸·청록 그림자·벽등 광축. G2'
  },
  'atmo-room-dusk': {
    pos: [3.8, -498.45, 4.0], target: [-1.4, -499.15, -2.6], fov: 42, time: 19, act: 2,
    state: { scene: 'atmo-probe', mood: 'room-dusk' },
    note: '[ATMOSPHERE QA] room-dusk — 블라인드 슬랫 광축·먼지 밀도 최대. G2'
  },
  'atmo-bathroom': {
    pos: [2.6, -498.45, 3.4], target: [-0.8, -499.25, -2.0], fov: 44, time: 23, act: 2,
    state: { scene: 'atmo-probe', mood: 'bathroom' },
    note: '[ATMOSPHERE QA] bathroom — 4500K 단일광 차가운 룩·러프니스 램프. G3/G7'
  },
  'atmo-rooftop-rain': {
    pos: [5.2, -498.15, 5.6], target: [-1.6, -498.90, -3.0], fov: 38, time: 27, act: 3,
    state: { scene: 'atmo-probe', mood: 'rooftop-rain' },
    note: '[ATMOSPHERE QA] rooftop-rain — 달빛+광해 IBL 배경·비·네온. G1/G7'
  },
  'atmo-interrogation': {
    pos: [0.05, -498.58, 1.15], target: [0, -498.76, -0.4], fov: 50, time: 31, act: 1,
    state: { scene: 'atmo-probe', mood: 'interrogation' },
    note: '[ATMOSPHERE QA] interrogation — 단일 실광원 명암비·배경 폴오프. G1'
  },
  // UI 단독 검증. 카메라는 notebook-open과 같고 DOM 오버레이 상태만 다르다.
  'notebook-present': {
    pos: [0, 1.5, 1.0], target: [0, 1.3, 0], fov: 45, time: 27, act: 2,
    state: { ui: 'present' },
    note: '[UI QA] 심문 중 증거 제시 모드 — 펜으로 두른 선택 표시. N1/N8'
  },
  'notebook-photos': {
    pos: [0, 1.5, 1.0], target: [0, 1.3, 0], fov: 45, time: 28, act: 2,
    state: { ui: 'photos' },
    note: '[UI QA] 엘리베이터 사진 스크럽 뷰어 — 인화지 계조·4장 넘김. N8'
  },
  'hud-prompt': {
    pos: [1.3, 1.64, 4.2], target: [-1.4, 1.5, 1.4], fov: 40, time: 25, act: 2,
    state: { ui: 'prompt' },
    note: '[UI QA] HUD — 크로스헤어 없음, 타자체 프롬프트와 증거 슬립. D7'
  },
  'ui-loading': {
    pos: [0, 1.5, 1.0], target: [0, 1.3, 0], fov: 45, time: 2, act: 1,
    state: { ui: 'loading' },
    note: '[UI QA] 허구 고지문 타건 중 · 객실 열쇠 고리 부트 진행률. P6/D7'
  },
  'ui-title': {
    pos: [0, 1.5, 1.0], target: [0, 1.3, 0], fov: 45, time: 3, act: 1,
    state: { ui: 'title' },
    note: '[UI QA] 정문 유리 금박 각인 · 놋쇠 명패 두 장. P6/D7'
  },
  'ui-settings': {
    pos: [0, 1.5, 1.0], target: [0, 1.3, 0], fov: 45, time: 4, act: 1,
    state: { ui: 'settings' },
    note: '[UI QA] 프런트 서류함 카드 설정 오버레이. P6/D7'
  },
  'ui-resume': {
    pos: [0, 1.5, 1.0], target: [0, 1.3, 0], fov: 45, time: 5, act: 1,
    state: { ui: 'resume' },
    note: '[UI QA] 재입장 제스처 · 타자기 두 줄과 놋쇠 벨. P6/D7'
  },
  // [LEVEL-LOBBY] 근접 검수 4종. 체험 리뷰의 D3/D4/G6/G10 지적은 전부 원경 샷에서는
  // 판독 자체가 불가한 거리에 있었다 — 라디오·서랍·팔걸이 마모·몰딩은 이 거리에서만 채점된다.
  'lobby-radio': {
    pos: [1.28, 1.06, -0.80], target: [2.02, 0.86, -1.85], fov: 32, time: 12, act: 1,
    note: '[LOBBY] 라디오 근접 — 놋쇠 다이얼·패브릭 그릴·바니시 캐비닛. D4/G3/G6/N6'
  },
  'lobby-cornice': {
    pos: [0.55, 1.62, 2.20], target: [-2.10, 3.95, -7.10], fov: 42, time: 12, act: 1,
    note: '[LOBBY] 벽-천장 접합 — 크라운 몰딩·프리즈·픽처레일·기둥 주두. G10/G6'
  },
  'lobby-sofa': {
    pos: [1.05, 1.26, 2.15], target: [3.10, 0.62, 4.05], fov: 44, time: 12, act: 1,
    note: '[LOBBY] 소파 사분면 정면 — 닳은 팔걸이 명도차·라운지 소품 밀도. N6/G6'
  },
  'lobby-desk-front': {
    // 어두운 목재 전면만 꽉 채우면 darkPct 10.14 로 게이트(≤10)를 넘긴다 — 조명 받는
    // 근무대 상판과 바닥을 프레임에 함께 넣어 값 분포를 연다(1차 실측).
    pos: [-2.05, 1.36, -1.15], target: [-2.55, 0.84, -3.30], fov: 44, time: 12, act: 1,
    note: '[LOBBY] 데스크 전면 근접 — 서랍 패널 목재·놋쇠 풋레일·바닥 마모 매트. D4/G5/G6'
  }
}

export function shotNames () { return Object.keys(SHOTS) }
