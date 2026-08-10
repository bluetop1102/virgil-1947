# HOTEL VIRGIL — AI 활용 기술 문서

**NAN 2026 사전 과제 제출물 4**

플레이: <https://bluetop1102.github.io/virgil-1947/>
전체 소스·커밋 이력: <https://github.com/bluetop1102/virgil-1947>
상세 크레딧: <https://github.com/bluetop1102/virgil-1947/blob/main/docs/credits.md>

## 요약

이 프로젝트에서 AI는 한 번의 프롬프트로 게임을 생성하는 도구가 아니라, **계약 안에서 일하고
측정 결과로 수정되는 제작 인력**으로 사용됐다.

1. 사람은 작품의 목표, 범위, 품질 기준, 승인과 중단 결정을 맡았다.
2. AI 에이전트는 기획 초안, 코드, 검증 도구, 문서, 구현과 분리된 리뷰를 산출했다.
3. 산출물은 파일 소유권·이벤트 계약·수용 기준이 적힌 작업 패킷으로 분리했고, 완료 보고가 아니라
   실행 로그·상태·프레임을 통과한 것만 채택했다.

그 결과물은 **1막 로비·프런트 수직 슬라이스**다. 출하 빌드에는 런타임 AI가 없으며 계정, API 키,
유료 라이선스를 요구하지 않는다. 심문 판정은 결정론적 스크립트로 실행된다.

| 제작 질문 | 이 프로젝트의 답 |
|---|---|
| AI에게 무엇을 맡겼나 | 기획·구현·검증·문서의 산출 |
| 사람이 무엇을 통제했나 | 방향·제약·수용 기준·우선순위·최종 승인 |
| 에이전트 간 충돌을 어떻게 막았나 | 파일 단위 배타 소유와 교차 요청 큐 |
| 완료를 어떻게 믿었나 | 브라우저 E2E·상태 직렬화·로그·프레임으로 재검증 |
| 재현 가능한가 | 전체 소스, 프롬프트, 패킷, 커밋 이력, 검증 명령 공개 |

<!-- pagebreak -->

## 1. 사람과 AI의 역할

### 1.1 역할 경계

| 층 | 사람 | AI 에이전트 | 기계 자동화 |
|---|---|---|---|
| 방향 | 장르·톤·핵심 규칙·제출 범위 결정 | 대안 제시·위험 분석 | — |
| 기획 | 최종 사양 승인 | 요소 문서 E0~E10·사건 그래프 초안 | 그래프 무결성 검사 |
| 구현 | 티켓 승인·회수·갈등 판정 | 코드·테스트·문서 작성 | 계약 린트·빌드·완주 봇 |
| 검증 | 루브릭과 통과선 결정 | 구현 비참여 별도 세션 판정·원인 진단 | 로그·상태·프레임 수집 |
| 출하 | 범위 동결·라이선스 승인 | 제출 문서 초안·체크리스트 | 배포 링크·콘솔 검사 |

“사람은 판단만, AI는 작성만”처럼 완전히 분리되지는 않았다. AI도 로그를 근거로 원인을 진단했고,
사람도 프롬프트와 문장을 직접 고쳤다. 실제 경계는 **누가 작성했는가**보다 **누가 채택을 결정하고,
그 결정이 어떤 증거를 요구하는가**에 두었다.

### 1.2 사용 도구

| 도구 | 역할 | 저장소의 흔적 |
|---|---|---|
| Claude Code 세션 | 기획, 구현, 병렬 전담, 통합, 구현에 참여하지 않은 별도 체험 판정 | `PROMPT-*.md`, `docs/design/`, `docs/reviews/` |
| OpenAI Codex 세션 | 교차 코드 리뷰, 캘리브레이션, P0 티켓 구현, 최종 제출 감사 | `tools/calibration/report.md`, P0 머지 커밋, 본 문서 개정 |
| Grok build 세션 | 교차 에이전트 캘리브레이션 대조군 | `tools/calibration/report.md` |
| Codex `image_gen` · gpt-image-2 | 타이틀 배경 이미지 생성 | `assets/title-bg.jpg`, §6.1 |

Claude·Codex·Grok의 세션별 정확한 API model ID와 사용량 원장은 별도로 보존하지 않았다. 따라서
저장소의 별칭만으로 세부 모델 버전을 추정하지 않고 제품/세션 수준으로만 적었다. 타이틀 이미지의
생성 모델만 생성 기록에 남은 `gpt-image-2`로 기재한다.

<!-- pagebreak -->

## 2. AI 제작 파이프라인

```text
[0 계약] AGENTS.md · ARCHITECTURE.md
    파일 소유권 / 이벤트 어휘 / 잠금 경로 / 결정론
        ↓
[1 사양] docs/design/E0~E10 · case-graph.json
    이야기·증거·진술을 문장뿐 아니라 데이터로 고정
        ↓
[2 위임] manifest JSON 18장 → packet-gen → 자기완결 작업 패킷 18장
    소유 파일 / 선행 의존 / 수용 기준 / 금지 사항 / 중단 조건
        ↓
[3 판정] factcheck · contract lint · E2E 완주 · 샷/오디오 프로브 · 배포 검사
    완료 보고가 아니라 관찰 가능한 결과로 수용/기각
```

### 2.1 계약층 — 공유 작업트리를 안전하게

초기 그래픽 라운드에서는 여러 에이전트가 같은 픽셀을 동시에 바꿔 개선과 회귀의 원인을 가를 수
없었다. 이후 다음 규칙을 계약으로 고정했다.

- 각 파일은 한 소유자만 편집한다. 다른 파일의 수정이 필요하면 `docs/HANDOFF.md`에 요청한다.
- 병렬 세션은 `git add -A`나 `git commit -a`를 쓰지 않고 자기 경로만 명시해 스테이지한다.
- `src/core/*`는 잠그고, 이벤트 이름·재질·조명 생성 경로를 폐집합으로 관리한다.
- `Math.random()`과 `Date.now()`를 금지해 QA 프레임과 상태를 재현 가능하게 만든다.

`tools/lint-contract.mjs`가 재질·조명 팩토리 우회, 직접 난수/시계 호출, 500줄 초과, 구 작품명
표출을 검사한다. 현재 전체 검사에는 훅 도입 이전 잔여 4건이 남아 있으며, 이를 0으로 과장하지
않는다. 새 변경은 스테이지 범위 훅으로 차단한다.

### 2.2 사양층 — 이야기의 형용사를 데이터로

`docs/design/case-graph.json`에는 사실, 증거, 진술, 반박 관계, 지목 링크, 엔딩이 연결돼 있다.
거짓 진술은 반박 증거를 가져야 하고, 괴담은 사건 인과에 들어갈 수 없다. `tools/factcheck.mjs`는
최선 경로뿐 아니라 잘못된 판단이 누적된 경로도 진행 불능 없이 종료 가능한지 검사한다.

이 구조 덕분에 “텔이 거짓말 정답 표시등이 되면 안 된다” 같은 문장을 수치로 바꿀 수 있었다.
현재 데이터에서 거짓 여부와 텔의 상관은 **0.522**, 텔이 있는 진실 진술 비율은 **36%**다.

### 2.3 위임층 — 프롬프트도 생성물로

작업 티켓 18장을 `data/manifest/*.json`으로 전사하고 `tools/packet-gen.mjs`로 18개의 작업 패킷을
만들었다. 패킷은 필요한 계약 절, 사건 그래프 노드, 소유 파일, 명령, 예상 결과를 인라인한다.
현재 저장소에 남은 패킷 18장의 합계는 29,435줄이다. 이것은 후속 계약 수정까지 반영된 **현재
스냅샷**이지 모든 에이전트가 처음 발주받은 순간의 불변 원본은 아니다. 생성기에는 현재 매니페스트와
패킷의 바이트 단위 drift를 판정하는 `--check`가 없으므로, 이를 언제나 최신 상태인 자동 산출물이라고
주장하지 않는다.

`tools/manifest-check.mjs`는 스키마, 파일 소유 중복, 참조 절, 입력, 이벤트 어휘, 의존 순환,
검증 명령, 샷 엔트리의 8규칙을 검사한다. 최종 매니페스트 18장은 fresh 실행에서 전건 통과했다.

<!-- pagebreak -->

## 3. 주요 프롬프트·지시사항

요강이 요구하는 “주요 프롬프트·지시사항”은 실제 실행 문서에서 핵심 줄을 골라 **가독성을 위해
보조 설명과 줄바꿈을 줄인 축약 전사**다. 아래 블록을 글자 단위 원문이라고 부풀리지 않는다. 변경되지
않은 전체 원문은 저장소의 `PROMPT-*.md`와 `packets/PACKET-*.md`에 있다.

### 3.1 구현 패킷 — 목표·통과·중단을 한 묶음으로

`packets/PACKET-T-P1-04.md`의 심문 티켓은 다음 구조로 시작한다.

```text
/goal 심문 1건 E2E — 소각 직렬화 포함 — T-P1-04
통과 조건: 실행 가능한 수용 기준 전건 통과 · 콘솔 에러/경고 0 · 금지 사항 위반 0
중단 조건: 라운드 상한 1회 · 토큰 상한 도달 시 라운드 경계에서 인수인계

소유 파일: src/narrative/interrogation.js · tools/test-interrogation.mjs
소유 밖 파일은 읽기만 하고, 필요한 수정은 HANDOFF 형식으로 반환
```

핵심은 “기능을 구현하라”가 아니라 다음 다섯 항목을 같은 프롬프트에 넣은 것이다.

1. 정확한 목표와 비목표
2. 편집 가능한 파일의 폐집합
3. 실행할 명령과 기대 결과
4. 실패 시 반환할 증거 형식
5. 무한 반복을 막는 중단 조건

### 3.2 역할 분리 판정 — 구현자와 채점자를 분리

`PROMPT-review-fable-3.md`는 판정 세션에 반대 방향의 제약을 건다.

- 코드를 수정하거나 새 작업을 발주하지 않는다.
- 완료 보고의 PASS를 그대로 수용하지 않는다. 제공된 변경 목록과 기존 실측을 검증 목록으로 삼아
  배포본·프레임·로그를 재관찰한다.
- 배포 브랜치와 심사 대상 번들이 같은지 먼저 확인한다.
- 이미 기각된 가설을 다시 파지 않는다.
- 샷 서버의 낡은 변환 결과, 엔진 시계와 오디오 시계 차이, 공유 워킹트리 오염을 먼저 배제한다.

이것은 변경 내용을 완전히 가린 블라인드 실험이 아니다. 판정 세션은 수정 목록·이전 리뷰·기존 기계
실측을 입력으로 받았고 그 배터리 자체를 재실행하지 않았다. 대신 구현을 수행하지 않고 배포본·프레임·
로그의 재관찰을 중심으로 채점했다. 결과는 “좋다/나쁘다”가 아니라 관찰 위치, 수치, 재현 절차와 함께
`docs/reviews/`에 남긴다.

### 3.3 상위 발사문

| 원문 | 역할 |
|---|---|
| `PROMPT-plan-v1.md`, `PROMPT-plan-v2.md` | 요소 분해·기획 루프 |
| `PROMPT-system-v1.md`~`v4.md` | 매니페스트·패킷·교차 모델 운영 |
| `PROMPT-build-p0.md`, `PROMPT-build-p1.md` | 정지작업과 1막 수직 슬라이스 |
| `PROMPT-judge-plan.md` | 심사자 관점의 개선 우선순위 |
| `PROMPT-review-fable*.md` | 구현에 참여하지 않은 별도 세션의 체험 판정 |

<!-- pagebreak -->

## 4. 검증이 AI의 판단을 뒤집은 사례

### 4.1 개발 서버에서는 되지만 제출 링크는 깨졌다

기본 Vite 빌드는 루트 경로를 가정했다. GitHub Pages 프로젝트 사이트는 서브패스에 배포되므로
실제 정적 서버에서는 에셋 5건이 404가 나고 부팅이 실패했다. 개발 서버가 경로를 보정해 주기
때문에 로컬 플레이만으로는 발견되지 않았다.

| 빌드 | 루트 배포 | `/virgil-1947/` 서브패스 |
|---|---|---|
| `npm run build` | PASS | **FAIL — 에셋 404 5건** |
| `npm run build:pages` | PASS | **PASS** |

이후 `tools/serve-check.mjs`가 루트·서브패스·실배포를 각각 열어 캔버스, 요청 실패, 콘솔을 검사한다.

### 4.2 “코드에 있는 음악”이 실제로는 한 번도 울리지 않았다

인트로 음악 코드는 존재했지만 AudioContext가 첫 사용자 제스처에서 만들어지는 시점과 시작 이벤트가
경합해 음악 요청이 버려졌다. 오디오 프로브의 최초 결과는 `musicOn 0/339`였다. 같은 프로브는
심문이 자유 배회보다 **8.2dB 더 조용한** 역전도 찾았다.

시작을 제스처 지연 큐에 넣고 종료를 고정 초가 아니라 `cinematic:end` 사건에 결박한 뒤, 최종
재판정에서 인트로 평균은 **-17.3dB**, 자유 배회 **-32.6dB**, 심문 **-23.2dB**가 됐다. 심문은
배회보다 **9.4dB 높아졌다.** 근거는 `docs/reviews/fable-experience-2026-08-09-r3.md` §J6이다.

### 4.3 게임이 아니라 게이트가 틀렸다

조작 카드 프로브가 카드 미표시를 FAIL로 냈지만 프레임에는 카드가 있었다. 프로브가 고정 엔진
시각에 상태를 읽는 동안 인트로 종료가 실행마다 `t=30.3~34.84`로 흔들렸기 때문이다. 판정점을
고정 시각이 아니라 `cinematic:end` 사건으로 바꾸었다. **게이트를 신뢰하되 게이트도 검증한다**는
규칙이 이 사례에서 생겼다.

<!-- pagebreak -->

## 5. 최종 제출 감사가 찾은 사각지대

2026-08-10 제출 문서 감사에서 단위 테스트 108건과 완주 봇이 모두 통과한 상태로도 핵심 계약이
어긋날 수 있음을 확인했다.

- 기존 설계와 UI: “제시한 증거는 회수되지 않는다.”
- 구현: `evidence:presented` 이벤트를 발화하지만 증거를 제거하는 구독자와 상태 API가 없다.
- 완주 봇: 거짓 판단에 사용한 `register`·`keyrack`이 끝까지 남아 있어야 오히려 PASS한다.

즉 테스트가 실패한 것이 아니라 **반대 기대값을 성공으로 인증**하고 있었다. 이 발견은
`docs/HANDOFF.md`의 `SUBMISSION-AUDIT` P0에 등록했다.

소유 세션은 실제 동작을 규칙으로 채택했다. 증거 아이템은 남고, 한 번 내민 판정과 오답이 닫은
진술은 되돌릴 수 없다. `42a3814`에서 E1·E8과 노트 고지를 이 의미로 고쳤고, fresh 기본 배터리
108/0·소각 배터리 9/0·1막 완주를 통과했다. 소개서·영상 대본도 같은 규칙을 쓴다.

> **현재 제출 판정: `{{EVIDENCE_CONTRACT_STATUS}}`**
> 이 계약은 해소됐다. final PDF 빌더도 변경 커밋이 현재 HEAD의 조상인지 확인하고 기본·소각·완주
> 회귀를 fresh 재실행한 뒤에만 두 제출 PDF를 공개한다.

> **격자문 3상태 제출 판정: `{{ELEVATOR_GATE_STATUS}}`**
> 심문 전·실제 중단·완료 뒤 입력을 별도 상태에서 재현한다. 사전·중단 경로는 1막과 `act:enter`
> 횟수를 보존하고 서로 다른 거절 문구를 내야 하며, 완료 경로만 2막에 정확히 한 번 진입해야 한다.

이 사례는 AI 활용의 성공담만 남기지 않는 이유를 보여 준다. 자동화된 PASS는 검사한 주장에만
유효하고, 검사가 잘못된 주장을 품으면 결과도 잘못된다. 최종 감사에서는 요강의 문장, 문서의 카피,
UI 고지, 런타임 상태, 테스트 기대값을 하나의 추적선으로 대조했다.

### 5.1 2026-08-10 fresh 검증 기록

| 검사 | 실제 결과 |
|---|---|
| `node tools/manifest-check.mjs` | 티켓 18장 · 8규칙 · 발견 0 |
| `node tools/factcheck.mjs` | 사실 그래프 14항목 PASS |
| `node tools/test-interrogation.mjs` | 112 passed · 0 failed |
| `node tools/test-interrogation.mjs --burn` | 소각 직렬화·재접근·하류 unlock 차단 9 passed · 0 failed |
| `node tools/playthrough.mjs --fast --act 1` | 1막 전환 1:04 · 증거 4종 · 괴담 3건 · 콘솔 0 |
| `node tools/serve-check.mjs --url …` | 공개 링크 부팅 · 요청 실패 0 · 콘솔 0 |
| `node tools/lint-contract.mjs` | **FAIL — 훅 도입 이전 잔여 4건** |

위 표는 “모두 통과했다”는 장식이 아니다. 마지막 두 행처럼 실패와 범위 한계를 함께 적어 어떤
주장이 실제로 검증됐는지를 구분한다.

### 5.2 커밋 이력

전체 이력은 공개 저장소에 유지했다. 7월 31일~8월 3일 초기 구축은 8월 4일의 단일 스냅샷에서
시작하므로 그 이전의 세부 커밋은 없다. 이후에는 작업·문서·검증·판정 단위의 커밋을 유지했고,
squash나 filter-repo로 이력을 다시 쓰지 않았다. 최종 수치는 계속 변하므로 PDF에는 고정 숫자를
박지 않고 아래 명령과 저장소 링크를 제시한다.

```bash
git rev-list --count HEAD
git log --date=short --oneline
git log --stat -- docs/design tools src
```

<!-- pagebreak -->

## 6. 외부 에셋·오픈소스 출처

### 6.1 AI 생성 에셋 — 타이틀 배경 1장

| 항목 | 내용 |
|---|---|
| 파일 | `assets/title-bg.jpg` · 2048×1152 JPEG |
| 용도 | 타이틀/재입장 화면 배경 · 인게임 월드에는 미사용 |
| 생성 도구 | Codex `image_gen` |
| 모델 | `gpt-image-2` · quality high |
| 생성일 | 2026-08-09 |
| 후처리 | macOS `sips`로 PNG→JPEG q72 변환 · 그 외 편집 없음 |
| 폴백 | 파일이 없으면 인게임 로비 렌더를 타이틀 배경으로 사용 |
| 권리·주의 | [OpenAI 이용약관](https://openai.com/policies/row-terms-of-use/) Content 조항에 따라 당사자 사이 출력 권리를 사용자에게 배정. 출력의 고유성이나 제3자 권리 비침해를 보장한다는 뜻은 아니며, 사람 검수로 실존 인물·상표·텍스트를 배제 |

생성 프롬프트 전문:

```text
Exterior of a 1940s Art Deco hotel facade at night in the rain, Los Angeles 1947,
film noir. Wet asphalt street reflecting a dim amber marquee and a few lit windows;
the rest of the building falls into deep near-black shadow. Streetlight haze,
drifting rain, iron fire escape, low fog at street level. Heavy vignette, 35mm film
grain, muted sepia-amber and cold slate-grey palette only. Wide cinematic
street-level shot. The upper third of the frame is almost empty and very dark,
reserved for a title overlay. No people, no figures, no text, no letters, no logos,
no signage, no watermark.
```

게임 월드의 텍스처, PBR 재질, 지오메트리, 환경광, 효과음, 룸톤, 리버브, 발소리는 코드와 셰이더로
절차 생성한다. 타이틀 배경 외에 AI 생성 시각 에셋은 없다.

### 6.2 외부 라이선스 음원 — 라디오 3곡·긴장층 2곡

다섯 곡은 Kevin MacLeod(incompetech.com)의 **CC BY 4.0** 음원이다. 라디오 3곡은 로비 소품에서
거리 감쇠·룸 리버브·심문 감쇠를 통과하고, 긴장층 2곡은 심문·최종 지목에 배정됐다.

| 용도 | 곡명 | 공식 출처 |
|---|---|---|
| 라디오 | Night on the Docks - Sax | [Incompetech · USUAN1100137](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100137) |
| 라디오 | Dark Times | [Incompetech · USUAN1100747](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100747) |
| 라디오 | Vanishing | [Incompetech · USUAN1600050](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1600050) |
| 심문 | Long note One | [Incompetech · USUAN1100418](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100418) |
| 지목(3막·런타임 프로브) | Impending Boom | [Incompetech · USUAN1100198](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100198) |

라이선스: <https://creativecommons.org/licenses/by/4.0/> ·
법적 전문: <https://creativecommons.org/licenses/by/4.0/legalcode.en>

현재 후보는 라디오를 모노 22.05kHz·48kbps, 긴장층을 모노 32kHz·64kbps MP3로 내보냈다. 다섯
파일 모두 오디오 스트림 1개·커버아트 0이며 fresh I는 **-19.7/-22.5/-21.1/-21.1/-19.0 LUFS**,
true peak는 위 표 순서로 **-1.4/-3.6/-3.2/-1.2/-1.9 dBTP**다. 라디오는 런타임에서 AM 대역
필터·중역 EQ·약한 포화·곡별 trim을, 긴장층은 high/low-pass와 gain automation을 거친다.

> **DRAFT 외부 게이트:** `fe11510`·`docs/reports/SM-final.md`의 처리·trim·스트림·실측은 fresh
> 재측정과 일치한다. 단, 실제 `measured_*`가 없어 완전한 명령 재현성은 부분이다. 17:13 KST 5줄
> 설정안의 넘침은 17:28 KST 3줄 안으로 줄여 1280×720·콘솔 0·가시 귀속을 통과했다.
> `Impending Boom`도 지목판 `ui:open`에 배선돼 17:22 KST `streamed=true`·요청 실패 0이었다.
> 1막 밖 3막 곡이라 사람의 헤드폰 청감과 final Pages 확인은 아직 남았다. 통과 뒤 이 문단을 지운다.
> final 빌더는 5파일의 스트림·peak·귀속·지목 연결을 재검사하고 측정값을 manifest에 기록한다.

> **음원 귀속 제출 판정: `{{AUDIO_ATTRIBUTION_STATUS}}`**

<!-- pagebreak -->

## 7. 오픈소스·재현성과 한계

### 7.1 오픈소스 의존성

| 구분 | 패키지 | 버전 | 라이선스 | 용도 |
|---|---|---:|---|---|
| 런타임 | three | 0.185.1 | MIT | WebGL 렌더러·씬 그래프 |
| 런타임 | @dimforge/rapier3d-compat | 0.19.3 | Apache-2.0 | 물리·캐릭터 컨트롤러 |
| 개발 | vite | 8.2.0 | MIT | 개발 서버·정적 빌드 |
| 검증 | playwright | 1.62.1 | Apache-2.0 | 브라우저 E2E·샷·배포 검사 |

출처: <https://threejs.org/> · <https://rapier.rs/> · <https://vite.dev/> ·
<https://playwright.dev/>. 런타임 의존성은 `npm ls --omit=dev --depth=0`으로 재확인할 수 있다.

### 7.2 재현 명령

```bash
npm install
node tools/manifest-check.mjs
node tools/factcheck.mjs
node tools/test-interrogation.mjs
node tools/playthrough.mjs --fast --act 1
npm run build:pages
node tools/serve-check.mjs --prefix /virgil-1947
```

### 7.3 만들지 못한 것과 판정 한계

- 제출본은 1막 수직 슬라이스다. 2·3막 레벨과 최종 증거판은 플레이할 수 없다.
- 1막 끝의 격자문 입력은 **「격자문이 열린다.」** 자막과 함께 내부 상태를 2막으로 바꾸지만 문·공간·
  종료 화면은 전환하지 않는다. 소개서와 영상은 이 입력을 가시적인 2막 공간처럼 주장하지 않는다.
- 진행 저장/불러오기는 없다. 새로고침하면 새 회차다.
- 기계는 오디오 레벨과 시간 곡선을 측정하지만 “무섭게 들리는가”까지 판정하지 못한다. 사람의
  헤드폰 청감표를 별도로 둔 이유다.
- 자체 그래픽 루브릭의 최고 목표에 도달했다고 주장하지 않는다. 제출 프레임은 통제된 대표 장면이며
  자유 배회의 모든 시점이 같은 품질이라는 뜻이 아니다.
- 계약 린트 잔여 4건은 정확히 기록한다. §5의 증거 계약은 해소됐고 final 빌더가 회귀를 다시
  실행한다. 격자문 3상태와 §6.2의 음원 귀속은 검토본에서 판정을 공개하고 final 빌더가 실제 PASS를
  확인한 뒤에만 해소 문구로 바꾼다.

## 8. 출처 인벤토리

- 제작 계약: <https://github.com/bluetop1102/virgil-1947/blob/main/AGENTS.md>
- 아키텍처·소유권: <https://github.com/bluetop1102/virgil-1947/blob/main/docs/ARCHITECTURE.md>
- 설계와 사건 그래프: <https://github.com/bluetop1102/virgil-1947/tree/main/docs/design>
- 실제 프롬프트: <https://github.com/bluetop1102/virgil-1947/tree/main>
- 자동 생성 작업 패킷: <https://github.com/bluetop1102/virgil-1947/tree/main/packets>
- 검증·캘리브레이션: <https://github.com/bluetop1102/virgil-1947/tree/main/tools>
- 독립 판정 기록: <https://github.com/bluetop1102/virgil-1947/tree/main/docs/reviews>
- 에셋·AI·라이선스 상세: <https://github.com/bluetop1102/virgil-1947/blob/main/docs/credits.md>

런타임·소스·수치 주장은 위 공개 자료와 §5의 명령으로 재확인할 수 있다. 세션별 정확 모델·사용량처럼
원장을 보존하지 않은 항목은 재현 가능하다고 주장하지 않으며, 이미지 생성 모델·인간 승인 경계는
제작 당시의 세션 기록과 제작자 자기기록에 근거한다고 구분했다.
