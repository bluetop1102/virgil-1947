# 크레딧 — 오픈소스·AI 도구·에셋 출처

> NAN 2026 제출물 4번(AI 활용 기술 문서)의 **필수 항목**이다. 누락은 심사 제외 사유가 된다.
> 이 파일이 진실원이고, 제출 PDF는 여기서 파생한다. 의존성을 추가하면 **같은 커밋에서** 여기도 고친다.

## 1. 외부 에셋 — 0건

이 프로젝트는 **텍스처·지오메트리·오디오·폰트를 하나도 내려받지 않는다.** 전부 런타임 절차 생성이다.

| 종류 | 조달 방식 | 근거 |
|---|---|---|
| 텍스처(알베도·노멀·러프니스·AO) | GPU 셰이더로 절차 생성 | `src/materials/procedural.js` · 계약: ARCHITECTURE §7 "모든 텍스처는 절차 생성. 외부 에셋 다운로드 금지" |
| 재질(PBR 24종) | 절차 텍스처 조합 레시피 | `src/materials/recipes.a.js` · `recipes.b.js` |
| 지오메트리(소품 40종·가구·몰딩) | 코드 생성 + 시드 변주 | `src/world/kit.js` · `props*.js` |
| 환경광(IBL) | 절차 생성 PMREM — **HDR 파일 로드 금지** | `src/world/atmo/ibl.js` · 계약: ARCHITECTURE §6.5 |
| 오디오(리버브 IR·발소리·룸톤) | WebAudio DSP로 합성 | `src/audio/dsp.js` · `ir.js` |
| 폰트 | 시스템 폰트 스택만(`ui-serif, Georgia, serif`) — 웹폰트 파일 없음 | `index.html` |
| 인물 리그 | 절차 휴머노이드 + 스키닝, 모션 파일 없음 | 계약: E4 §3 |

검증: `git ls-files` 에 이미지·오디오·폰트·모델 바이너리가 없다.
`git ls-files | grep -icE '\.(png|jpg|hdr|exr|mp3|wav|ogg|glb|gltf|fbx|woff2?|ttf)$'` → 0
(과거 커밋의 `scratchpad/` 스크린샷은 QA 진단 산출물이고 게임 에셋이 아니다.)

**왜 이 제약을 걸었나**: 오프라인 재현성과 라이선스 리스크 0. 심사자가 어떤 계정·키·네트워크
없이 링크만으로 실행할 수 있어야 한다는 요건과 같은 방향이다.

## 2. 오픈소스 의존성

런타임에 실제로 번들되는 것은 위 2개뿐이다.

| 패키지 | 버전 | 라이선스 | 용도 | 출처 |
|---|---|---|---|---|
| three | 0.185.1 | MIT | WebGL 렌더러·씬 그래프. 포스트프로세스 파이프라인은 자체 구현 | https://threejs.org/ |
| @dimforge/rapier3d-compat | 0.19.3 | Apache-2.0 | 강체·캐릭터 컨트롤러 물리 (WASM) | https://rapier.rs |

개발·검증 전용 (번들 미포함):

| 패키지 | 버전 | 라이선스 | 용도 | 출처 |
|---|---|---|---|---|
| vite | 8.2.0 | MIT | 개발 서버·정적 빌드 | https://vite.dev |
| playwright | 1.62.1 | Apache-2.0 | 헤드리스 스크린샷 하네스·배포 검증 | https://playwright.dev |

라이선스 원문은 각 패키지의 `node_modules/<name>/LICENSE` 에 있다.
`npm ls --omit=dev --depth=0` 으로 런타임 트리를 재확인할 수 있다.

## 3. AI 도구 사용 내역

이 프로젝트는 AI를 **보조 작성기가 아니라 제작 공정 그 자체**로 썼다. 사람이 한 일은
목표·루브릭·게이트 설계와 판정이고, 코드·문서·검증기는 에이전트가 썼다.

| 도구 | 모델 | 역할 | 산출 흔적 |
|---|---|---|---|
| Claude Code | Claude Opus 5 / Fable 5 | 기획 라운드(E0~E10 요소 문서)·구현 라운드·통합·판정·시스템 구축 | 커밋 이력 전체 · `docs/design/**` · `PROMPT-*.md` |
| Claude Code (서브에이전트) | Opus 5 / Sonnet 5 | 병렬 전담(재질·파이프라인·이펙트·소품·대기)·블라인드 채점자·반증 에이전트 | `docs/ROUNDS.md` 라운드 로그 · `docs/HANDOFF.md` 교차 요청 큐 |
| OpenAI Codex | — | 독립 2차 코드 리뷰·외부 배정 티켓(예정) | `tools/calibration/report.md` |
| Grok build | — | 외부 배정 티켓(예정) | `tools/calibration/report.md` |

- **프롬프트 원문은 저장소에 있다**: `PROMPT-plan-v1.md`(기획) · `PROMPT-build-p0.md`·
  `PROMPT-build-p1.md`(구현) · `PROMPT-system-v1.md`(위임 시스템) · `packets/PACKET-*.md`
  (티켓별 자동 생성 발사문 15장). 제출물 4번의 "주요 프롬프트·지시사항" 항목은 이 파일들을 인용한다.
- **런타임 AI 없음**: 출하 빌드는 API 키를 요구하지 않는다. 심문 판정은 전 스크립트이고,
  자유 서술 판정(2단 커널)은 별도 플래그로 분리된 후속 단계다(E5 §6). 제출 요건
  "별도 유료 라이선스 없이 심사자가 실행 가능"의 이행이다.

## 4. 소재의 지위 (표절·도용 조항 대응)

인물·사건·호텔은 전부 허구다. 실존 사건·실존 업체를 지목하는 조합은 해체했다
(재허구화 계약: `docs/MASTER-PLAN.md` §1, 명칭 검증: `docs/design/E0-index.md` §0).
로딩 화면이 허구 고지문을 타자기로 찍는 것이 이 계약의 화면 측 이행이다(E8 §3).

**미해소 잔여 1건**: 배포 산출물의 `<title>`·부트 화면에 구 작품명이 남아 있다.
`docs/HANDOFF.md` 큐 등재분이며, 제출 전 체크리스트(`docs/submission/checklist.md`)의
차단 항목이다.
