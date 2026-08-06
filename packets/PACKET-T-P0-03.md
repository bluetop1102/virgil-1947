# 패킷 T-P0-03 — script.js v2 이행 — case-graph 정합·소비자 적응

> 이 문서 하나로 완결된다. **패킷 밖 문서를 열지 마라** — 필요한 계약 원문·데이터·규약은
> 전부 아래에 인라인돼 있다. 그래도 질문이 생기면 그건 이 패킷의 결함이니,
> 추측해서 진행하지 말고 §10 반환 형식의 `CONTRACT_CHANGE_REQUEST` 로 되돌려라.
> 자동 생성물 — 손으로 고치지 않는다. 원천: `data/manifest/T-P0-03.json` · 생성기: `tools/packet-gen.mjs`

## 1. goal 계약

```
/goal script.js v2 이행 — case-graph 정합·소비자 적응 — T-P0-03
통과 조건: §8 수용 기준 5건 전건 통과 · 콘솔 에러·경고 0 · §9 금지 사항 위반 0
중단 조건: 라운드 상한 2회 · 서브에이전트 토큰 상한 100만
           (PROMPT-build-p0.md 의 P0 전체 상한 10회·500만을 티켓 5장으로 나눈 몫)
           상한 도달 시 라운드 경계에서 끊고 §10 형식으로 인수인계한다. 중단 조건 없는 루프 금지.
```

- **타입**: interrogation · **배정 모델**: codex · **상태**: todo
- **라운드 규율**: 단일 담당 · 단일 목표 · 사전 기준선 → 사후 기계 게이트 · 라운드 단위 커밋.
  회귀면 롤백한다. 판 갱신은 개선일 때만.

## 2. 소유 파일 (배타)

이 목록 밖의 파일은 **읽기만** 한다. 남의 파일을 고쳐야 하면 §10.1 형식으로 반환한다 —
"그 담당이 지금 안 보인다"는 안전 신호가 아니다.

- `src/narrative/script.js` — 파일 전체
- `src/narrative/case-graph-loader.js` — 파일 전체 · 신설
- `src/narrative/interrogation.js` — **구역 한정** — 데이터 접근층 — 관계 필드 참조 (이 구역 밖은 남의 것이다)
- `src/narrative/deduction.js` — **구역 한정** — 데이터 접근층 — 관계 필드 참조 · 표출 문자열 1건 (이 구역 밖은 남의 것이다)
- `src/ui/casebook.js` — **구역 한정** — 표출 문자열 — 노트 표지 1건 (이 구역 밖은 남의 것이다)

## 3. 선행 의존

없다. 다른 티켓의 산출을 기다리지 않는다.

## 4. 소비 계약 — 원문 인라인

### 4.1 E10 §2 P0 표

*왜 읽는가: 이 티켓의 정본 행. 내용·소유 파일·수용 기준·모델 배정의 원천이며, 패킷과 어긋나면 이 표가 이긴다.*

<!-- 원문: docs/design/E10-production.md § P0 — 정지작업 (T-P0-02→T-P0-04 의존 · T-P0-03만 E3 산출 의존 · 나머지 상호 독립) ⊂ E10 — 제작·위임 ⊂ 2. 티켓 보드 (의존 순서 — 위상 정렬 가능, 순환 0) -->
| 티켓 | 내용 | 소유 파일(배타) | 수용 기준(기계) | 모델 |
|---|---|---|---|---|
| T-P0-01 | 계약 린트 커밋 훅 — grep 5종(materials 밖 재질 생성·atmosphere 밖 광원·랜덤/시계 직호출·500줄 초과·화면 표출 "세실"). **검사 범위(`index.html` 포함)·표출 판별·훅 공존 정책은 E9 §2 판별 규칙이 정본** — `src/` 만 훑는 구현은 수용 불가 | `tools/lint-contract.mjs` + `.git/hooks` 설치 스크립트 | 위반 5종 각각 주입 시 커밋 차단 재현(`index.html` 표출 주입 포함) | 외부 |
| T-P0-02 | 재질·조명 계약 예외 청소(kit-mat 폴백·glow, props 광원 3건, testbed 1건) — 팩토리 경유화, 불가한 것만 §6/§6.5 예외 등재. **의존: T-P0-04**(분할 후의 파일에서 청소한다 — 동시 발주 금지) | `src/world/kit-mat.js` `props.js` `testbed.js` + ARCH §6 예외 절 | T-P0-01 린트 통과 + `pix diff` 기준선 대비 무변화 | 외부 (회귀 게이트 필수) |
| T-P0-03 | script.js v2 이행 — STORY v2 대사 반영(종료 노트 문구 포함)·case-graph id 정합·관계 중복 기재 제거 · **소비자 적응 포함**: interrogation.js/deduction.js의 관계 필드 접근을 case-graph 로더 경유로 전환(`narrative/case-graph-loader.js` 신설 허용) · `room:changed` 이형 표기(`corridor` 등)를 ARCH §5 정본 어휘로 수렴 · **표출 문자열 재허구화 2건(구역 소유 — 문자열만, 로직 무수정)**: `ui/casebook.js:101` "실종 · 세실 호텔 942호"→"실종 · 호텔 버질 942호" · `deduction.js:33` "세실은 계속 영업했다."→"버질은 계속 영업했다."(E2 부록 A 원문 그대로 — 창작 불요) | `src/narrative/script.js` + `interrogation.js`·`deduction.js`의 데이터 접근층 + `case-graph-loader.js`(신설) + `src/ui/casebook.js`·`deduction.js`의 표출 문자열 구역 | factcheck PASS · `test-interrogation.mjs` 통과 · 표출 "세실" grep 0(범위: E9 §2 판별 규칙) | 외부 |
| T-P0-04 | 500줄 초과 4파일 분할(atmosphere 574 · recipes.a 528 · atmo/fixtures 506 · props 504) | 해당 4파일 + 분할 신규 파일 | 전 파일 ≤500 · `pix diff` 무변화 · 콘솔 0 | 외부 |
| T-P0-05 | P5 텔 상관 검사기 — factcheck 확장, script v2의 텔 발화 상관 측정 | `tools/factcheck.mjs` §P5 절 | 완전판별기 변이 주입 시 FAIL 재현 | 외부 |
| T-P0-06 | `QUALITY.low` 프리셋 신설 — `volumetric: false` · `gtao: false` · `ssr: false` · `bloom: true`(느와르 룩 최소선) · `texRes: 256` · `shadowMap: 512` · `cascades: 1` · `particles: 0` · `maxLights: 4` + `pickQuality` 미지 값 폴백에 콘솔 경고(미지 값 유입 시에만 — 콘솔 0 게이트 양립). E8 §2 설정 표·E9 §2 프레임 예산이 소비 | `src/core/config.js` (**core 잠금 예외 — 이 티켓 한정**, ARCH §2) | `?q=low` 부트 콘솔 0 + volumetric·gtao·ssr 비활성 확인 · 미지 값(`?q=zzz`) 주입 시 경고 1건 재현 · `?q=` 무지정 기본 경로 `pix diff` 무변화 | 외부 |

### 4.2 ARCH §2 디렉터리 소유권

*왜 읽는가: 자기 소유 파일의 경계 — 표에 없는 파일은 남의 것이다.*

<!-- 원문: docs/ARCHITECTURE.md § 2. 디렉터리 소유권 ⊂ VIRGIL — 아키텍처 계약 v2 (모든 에이전트 필독) -->
각 파일은 **정확히 한 에이전트**가 소유한다. 남의 파일을 편집하지 않는다.

```
src/
  main.js          [CORE] 부트스트랩·씬 모드 진입로 (?scene= 경로 보존 — AGENTS.md).
                   잠금 대상은 core/ 디렉터리만 — main.js의 부트 훅(boot:progress 발화) 추가는
                   T-P1-05 범위로 허용 *(v2)*
  core/            [CORE — 잠김. 읽기 전용. 절대 수정 금지]
    engine.js      Engine 클래스, 모듈 레지스트리, 렌더 루프
    bus.js         이벤트 버스
    state.js       게임 상태 저장소 (직렬화. 역직렬화는 gameplay/save.js 소유 — core 무수정)
    config.js      품질 프리셋·튜너블. 잠금 예외: QUALITY.low 신설 + pickQuality 미지 값
                   콘솔 경고는 T-P0-06 범위로 허용 (E8 §2·E9 §2 소비 — main.js 부트 훅
                   예외와 같은 형식) *(v2.1)*
    shotlist.js    QA 스크린샷 카메라 위치 목록 (추가만 허용)
    util.js        공통 수학·랜덤(시드 고정)
  render/
    pipeline.js    [PIPELINE-CORE] 포스트프로세스 그래프
    exposure.js    [PIPELINE-CORE] 오토노출
    bluenoise.js   [PIPELINE-CORE] 블루노이즈 텍스처
    pcss.js        [PIPELINE-CORE] 소프트 섀도 공유 유틸
    contact.js     [PIPELINE-CORE] 컨택트 섀도
    passes/prepass.js taa.js composite.js          [PIPELINE-CORE]
    passes/gtao.js ssr.js volumetric.js volmarch.js volnoise.js bloom.js dof.js motionblur.js  [PIPELINE-EFFECTS]
  materials/
    procedural.js  [MATERIALS] GPU 텍스처 생성기
    library.js     [MATERIALS] 명명된 PBR 재질 레지스트리
    glsl.js        [MATERIALS] 공유 셰이더 청크
    recipes.a.js   [MATERIALS] 재질 레시피 1권 (500줄 초과 — P0 분할 대상)
    recipes.b.js   [MATERIALS] 재질 레시피 2권
  world/
    kit.js         [PROPS] 공유 지오메트리 키트(몰딩·베벨·가구)
    kit-mat.js     [PROPS] 재질 클론 게이트 — 재질 복제는 반드시 cloneMat() 경유 (RESUME §3.0)
    props.js       [PROPS] 소품 팩토리 (500줄 초과 — P0 분할 대상)
    props-corridor.js props-detail.js props-fixtures.js  [PROPS] 소품 분권
    testbed.js     [PROPS] 재질·소품 쇼케이스 룸
    atmosphere.js  [ATMOSPHERE] IBL 환경·안개·볼류메트릭·실광원 팩토리 (500줄 초과 — P0 분할 대상)
    atmo/          [ATMOSPHERE] 분권: moods.js ibl.js rain.js particles.js shell.js roof.js
                   fixtures.js(500줄 초과 — P0 분할 대상) corridor-detail.js corridor-finish.js
                   probe.js spaces.js(QA 프로브 6종 — 정식 레벨 완성까지 병존)
    lobby.js       [LEVEL-LOBBY]    ※ P1 신설 예정 — 현재 없음
    corridor.js    [LEVEL-CORRIDOR] ※ P2 신설 예정 — 현재 없음
    room942.js     [LEVEL-ROOM]     ※ P2 신설 예정 — 현재 없음 (942·욕실·944 포함, E6 §0)
    rooftop.js     [LEVEL-ROOFTOP]  ※ P2 신설 예정 — 현재 없음
  chars/           ※ P1~P2 신설 예정 — 현재 디렉터리 없음
    rig.js         [CHARACTERS] 절차적 휴머노이드 + 스키닝
    perf.js        [CHARACTERS] 미세신호(tell) 연기 시스템 (E4 §3 계약)
  gameplay/
    player.js      [GAMEPLAY] 컨트롤러·카메라·상호작용 레이캐스트
    evidence.js    [GAMEPLAY] 증거 모델·수집
    save.js        [GAMEPLAY] ※ P2 신설 예정 — 체크포인트 역직렬화 (E8 §4)
  narrative/
    script.js      [NARRATIVE] 전체 대사·스토리 데이터 (코드 없음, 데이터만. id는 case-graph.json과 1:1)
    interrogation.js [INTERROGATION] 심문 상태기계 (규칙: docs/design/E5-interrogation.md)
    deduction.js   [INTERROGATION] 증거판
    cinematics.js  [CINEMATICS] ※ P1 신설 예정(T-P1-07·08) — 카메라 시퀀스·타임라인·심문 카메라 (E7 §1·§2)
    case-graph-loader.js [NARRATIVE] ※ P0 신설 허용(T-P0-03) — case-graph.json 관계 데이터 로더
  audio/
    engine.js      [AUDIO] WebAudio 그래프·공간 리버브·발소리
    dsp.js graph.js ir.js  [AUDIO] 분권
  ui/
    hud.js         [UI] 크로스헤어·프롬프트
    notebook.js    [UI] 수사노트 (+ board.js casebook.js casefile.js paper.js photos.js sketch.js type.js wall.js 분권)
    subtitles.js   [UI] 자막
    settings.js    [UI] ※ P1 신설 예정 — 설정 (order 80, E8 §2)
  physics/
    world.js       [PHYSICS] rapier3d 통합
    shapes.js      [PHYSICS] 콜라이더 셰이프
```

재질·조명 계약 예외(kit-mat 폴백·`glow()`, props 광원 3건, testbed 1건)의 청소 또는 §6/§6.5
예외 명문화는 P0 코드 라운드 소관(MASTER-PLAN §7.4.2) — 이 표는 소유권만 확정한다.

### 4.3 ARCH §5 이벤트 버스 계약

*왜 읽는가: 이벤트 이름·payload·발신자 정본. 표에 없는 이름을 만들지 않는다.*

<!-- 원문: docs/ARCHITECTURE.md § 5. 이벤트 버스 계약 ⊂ VIRGIL — 아키텍처 계약 v2 (모든 에이전트 필독) -->
```js
engine.bus.on('evidence:collected', ({id}) => {})
engine.bus.emit('interrogation:start', {npc: 'deitch'})
```

**표준 이벤트 (이 이름만 사용)**

| 이벤트 | payload | 발신 |
|---|---|---|
| `game:ready` | — | core |
| `act:enter` | `{act: 1\|2\|3}` | narrative — **발화 파일: interrogation.js (판정 상태기계와 함께 막·페이즈 진행 상태기계를 소유, E5 §4)** *(v2에서 소유 명시)* |
| `evidence:collected` | `{id, kind}` | gameplay |
| `evidence:presented` | `{id, npc, correct}` | interrogation |
| `interrogation:start` | `{npc}` | gameplay |
| `interrogation:statement` | `{npc, line, truth}` | interrogation |
| `interrogation:verdict` | `{npc, choice, correct}` | interrogation |
| `interrogation:end` | `{npc, score, tier}` | interrogation — tier ∈ 만점/부분/실패(E5 §2.4 상태식). 노트 인물 면이 소비 *(v2에서 tier 추가)* |
| `player:interact` | `{targetId}` | gameplay |
| `player:footstep` | `{material, speed}` | gameplay |
| `cinematic:start` / `cinematic:end` | `{id}` | cinematics |
| `subtitle` | `{speaker, text, dur}` | any |
| `sfx` | `{id, pos?, gain?}` | any |
| `room:changed` | `{room}` | levels |
| `act:phase` | `{act, phase}` | narrative(발화 파일: interrogation.js — act:enter와 동일 소유) — 막 내 페이즈 전환(조명·오디오 무드 연동). **phase 정본 어휘: `early` / `main` / `late` 3값 공통** — E2 결박: act1 late=7:00 도일 통과 개시 · act2 late=30:00 보일러 소리 · act3 late=지목 개시 *(v2)* |
| `lore:heard` | `{id, medium}` | gameplay — 괴담 유닛 접촉, 노트 괴담 면 축적 *(v2)* |
| `npc:sighted` | `{npc, kind}` | levels — 프리젠스 목격, 정보 없는 존재감 (E4 §1 도일) *(v2)* |
| `checkpoint:saved` | `{act}` | gameplay/save — 막 경계 저장 *(v2)* |
| `settings:changed` | `{key, value}` | ui/settings *(v2)* |
| `interrogation:prompt` | `{npc, sid, options}` | interrogation — UI에 3선택(또는 재질문 2선택) 요구. 렌더는 [UI] 소유 *(v2)* |
| `interrogation:choose` | `{sid, choice, evidence?}` | ui — 플레이어 선택 반환(단일 발화 — LIE는 증거 확정 시점에만, 판정도 그때만) *(v2)* |
| `interrogation:aiming` | `{sid, on}` | ui — LIE 증거 지목 모드 진입(on:true)/취소(on:false). 카메라 푸시인·롤백(E7 §1 3행)의 트리거. 판정 아님 *(v2)* |
| `deduction:present` | `{linkId, evidence}` | ui(board) — 증거판에 링크 제시 입력. 판정·`deduction:link` 발화는 deduction 소유 *(v2)* |
| `deduction:sign` | `{}` | ui(board) — 조서 서명 = 지목 종결 선언. deduction이 성립 링크 수로 엔딩 분기(E5 §5) *(v2)* |
| `deduction:end` | `{ending, links, flags}` | deduction — 지목 종결 확정 통지(ending ∈ full/partial/cold). cinematics(cin-end-* 개시)·save(**엔딩을 비가역 레코드에 기록, 회차 종결 — "이어서" 소멸, E8 §4**)가 소비 *(v2)* |
| `boot:progress` | `{done, total}` | main.js — 부트 진행(모듈 init 계수+첫 프레임). 로딩 화면(E8 §3)이 구독 *(v2)* |
| `title:proceed` | `{mode}` | ui(title) — 타이틀·재입장 통과 신호. mode `new`(첫 입력/처음부터) → cinematics가 cin-intro 개시. mode `resume` → title.js 자신이 `?resume=1` 재작성+리로드(수신자 없음, 로그 목적). mode `wake`(재제스처 화면 첫 입력 — E8 §4) → 각 모듈이 제스처 후 재개(audio 컨텍스트 활성·입력 홀드 해제·복원 지점 플레이 개시) *(v2)* |
| `game:pause` | `{on}` | ui(settings 카드) — 일시정지 전파. **구독·정지 대상: physics·chars(perf)·cinematics·interrogation·audio(디제틱 감쇠) — 각 모듈이 자기 update를 스킵한다(core 무수정, engine.time은 계속 흐른다). 렌더·pipeline은 지속** — FOV·감도 즉시 반영을 카드 뒤 화면으로 확인하는 것이 목적이다. 시네마틱 재생 중 pause = 재생 정지(스킵 아님) *(v2)* |
| `perf:state` | `{npc, state}` | interrogation — 연기 상태 idle/anxious/lying/breaking. perf.js는 이것만 구독하며 진위를 모른다. 산출 규칙(기계): 진술 제시 중 `truth:false`→lying, `anxiousTell:true`→anxious, 그 외→idle. **breaking은 case-graph `breakingOn:true` 진술의 lieCorrect 판정 직후에만**(현행 3건: deitch.S4·ruiz.S4·pryce.S3) *(v2)* |
| `deduction:link` | `{id, ok}` | deduction — 지목판 링크 성립/실패. perf(도일 반응)·cinematics(광각화)가 구독 *(v2)* |
| `camera:dof` | `{bias, ms}` | cinematics — LIE 푸시인의 조리개 개방(보케 붕괴) 요청. 수신·보간은 [PIPELINE-CORE]가 dof 패스에 전달(수신부 구현은 HANDOFF 큐 경유 — E10 T-P1-08 비고) *(v2)* |

**`room:changed` 값 어휘 (정본 — v2)**: `lobby` · `elevator` · `corridor9` · `linen` ·
`room942` · `bathroom942` · `room944` · `stairs-roof` · `rooftop`. 오디오 리버브 전환(E7 §3)·
완주 봇 로그가 이 문자열을 그대로 소비한다. 기존 코드의 `corridor` 등 이형 표기는
T-P0-03 정합 라운드에서 이 어휘로 수렴한다. `elevator`는 이동 공간이라 case-graph 셀이
아니며, `boiler`는 진입 불가 공간이라 room 값으로 발화되지 않는다(소리 원점 전용, E6 §0).

### 4.4 E3 §4 소비 계약

*왜 읽는가: script.js는 case-graph id를 그대로 쓰고 관계를 중복 기재하지 않는다 — 소비자 접근은 로더 경유.*

<!-- 원문: docs/design/E3-case-graph.md § 4. 소비 계약 ⊂ E3 — 사건·사실 그래프 (지휘 문서) -->
- **script.js v2 이행(T-P0-03)**: `src/narrative/script.js`의 진술·증거 객체는 case-graph.json의
  id를 그대로 쓴다(`deitch.S2`, `register`). 원산지·반박 관계를 script.js에 중복 기재하지
  않는다 — 게임 코드는 대사·연출만, 관계는 그래프만. 소비자(interrogation.js·deduction.js)의
  관계 접근은 `narrative/case-graph-loader.js`(T-P0-03 신설 허용) 경유로 전환한다.
- **텔 배정 데이터**: 진실 진술의 불안 발화는 statements의 `anxiousTell` 필드가 진실원
  (현행 4건 — factcheck P5d가 비율 ≥30%를 정적 감시, 본검사는 T-P0-05). 핵심 진술은
  `key:true`(종료 3단 판정이 소비, E5 §2.4).
- **2단 커널(E5 §4)**: 자유 서술 지목의 의미 매칭 대상이 FACT 노드의 `text`다. 명제가 문장
  단위로 존재하는 것이 스왑의 전제 조건 — 이 그래프가 곧 2단의 정답지다.
- **factcheck 실행 시점**: 내러티브 데이터 변경마다 (커밋 게이트, E9 §기계 게이트 총목록).

---

### 4.5 E5 [위임] 승인 조항

*왜 읽는가: interrogation.js·deduction.js 데이터 접근층 편집을 소유자가 승인한 범위 — 판정 로직·이벤트 발화 절은 범위 밖이다.*

<!-- 원문: docs/design/E5-interrogation.md § [위임] ⊂ E5 — 심문·판정 시스템 -->
- 선행 의존: E3(진술·링크 데이터) · E1(U1 정의).
- 배타 소유 파일: `docs/design/E5-interrogation.md` · (구현 시) `src/narrative/interrogation.js`,
  `src/narrative/deduction.js`. **승인 조항**: T-P0-03(E10)이 두 파일의 **데이터 접근층**
  (관계 필드 참조를 `case-graph-loader.js` 경유로 전환)을 편집하는 것을 소유자로서
  승인한다 — 판정 로직·이벤트 발화 절은 T-P0-03 범위 밖이다.
- 수용 기준: 위 [구현] 4항 (전건 기계 판정).
- 권장 모델 클래스: 상태기계·증거판은 계약 두껍고 테스트 배터리가 수용 기준 — **외부 모델
  가능**. 2단 커널 스왑은 판정 배터리 설계 포함 — **단일 최강 모델**(E10).

### 4.6 STORY §5 심문 스크립트

*왜 읽는가: 대사 원문 정본. 창작 금지 — 이 문장을 그대로 옮긴다.*

<!-- 원문: docs/STORY.md § 5. 심문 스크립트 ⊂ VIRGIL — 사건 성서 v2 (NARRATIVE / INTERROGATION 구현 명세) -->
### 5.1 마를로 다이치 (1막, 프런트데스크)

> 상황: 새벽 2시. 로비. 다이치는 카운터 뒤에 서 있다. 형사가 배지를 놓는다.

**도입**
- 형사: "942호."
- 다이치: "그 방은 열려 있습니다. 청소도 안 들어갔고요. 필요하신 게 뭡니까."

**S1 — 진실**
- 다이치: "밴다이버 양은 10월 2일에 들어왔습니다. 2주치를 현금으로 내셨죠. 그런 손님이 요샌 드물어요."
- 정답: **TRUTH**
- TRUTH → "여기 손님들은 보통 사흘을 못 넘깁니다. 2주치를 미리 내는 사람은 뭔가를 기다리는 겁니다."
- DOUBT → "장부에 그렇게 적혀 있습니다. 제가 지어낸 게 아니고요."
- LIE(`flask`) → 소각. "…근무 중에 마신 적 없습니다." 이후 진술이 전부 한 문장으로 줄어든다.

**S2 — 거짓** (핵심)
- 다이치: "9일 밤에 나가시는 걸 봤습니다. 열한 시쯤이었을 겁니다. 제 기억으론."
- 정답: **LIE + `register`**
- LIE+`register` → "…객실 청구가 붙었죠. 10일에도, 11일에도. 나간 사람 방에 왜 물수건 값이 붙습니까."
  다이치: "…제가 봤다고 한 건 그 여자가 아닐 수도 있습니다. 로비가 어둡습니다. 그 시간엔 다들 비슷해 보여요."
- LIE+오답 → 소각. "형사님이 뭘 들고 오시든 저는 본 걸 말한 겁니다."
- DOUBT → "…열한 시였는지는 확실치 않습니다. 그 시간대는 다 비슷해서요."
- TRUTH → 넘어감.

**S3 — 진실**
- 다이치: "9일부터 수압이 떨어졌습니다. 3층 위로는 물이 안 올라갔어요. 민원 장부가 여기 있습니다."
- 정답: **TRUTH**
- TRUTH → 장부를 내준다. `pressure-log` 획득. "도일 씨가 봤습니다. 늘 그 사람이 봅니다."
- DOUBT → 장부는 주지만 도일 이야기는 안 나온다.

**S4 — 거짓** (핵심)
- 다이치: "옥상 열쇠는 관리인만 가집니다. 손님한테 나갈 물건이 아닙니다."
- 정답: **LIE + `keyrack`** (1막) 또는 **LIE + `roofkey`** (2막 재심문)
- LIE+`keyrack` → "고리가 비었더군요."
  다이치: "…분실입니다. 그런 건 늘 있습니다."  *(부분 성공 — 2막 재심문 개방)*
- LIE+`roofkey` (2막) → "그 여자 매트리스 밑에서 나왔습니다. 당신 필적으로 태그가 붙어 있고."
  다이치: (안경을 벗는다) "…20달러였습니다. 딸 학비가 밀렸습니다. 그 여자가 옥상에서 뭘 하려는지
  내가 어떻게 압니까. 사진을 찍는다고 했습니다. 야경을."
  → `deitch-confession` 플래그. 3막 도일 지목 시 정황 보강.
- LIE+오답 → 소각. 2막 재심문 불가.

**S5 — 진실**
- 다이치: "944호 프라이스 씨. 그 양반은 여기 4년 살았습니다. 전에는 호텔에서 일했고요."
- 정답: **TRUTH** → "왜 그만뒀는지는 안 묻는 게 좋습니다. 물어보면 대답을 해버리거든요."

**심문 종료 — 노트 요약 문구** (3단 판정 규칙은 E5 §2.4)
- 만점: "프런트는 다 내놨다. 장부도, 열쇠 이야기도."
- 부분: "프런트는 반쯤 열렸다. 나머지는 데스크 아래에 있다."
- 실패: "프런트는 닫혔다. 내가 닫았다."

---

### 5.2 콘수엘라 루이즈 (2막, 9층 복도 린넨실)

> 상황: 린넨 카트. 그녀는 일하던 손을 멈추지 않는다.

**S1 — 진실**
- 루이즈: "942호는 8일부터 안 들어갔어요. 문에 팻말이 걸려 있었으니까."
- 정답: **TRUTH** → "그 팻말, 손님이 건 게 아니에요. 우리 팻말은 파란색인데 그건 회색이었어요. 창고 거예요."

**S2 — 거짓**
- 루이즈: "그날 밤엔 아무 소리도 못 들었어요. 저는 6시면 퇴근하니까."
- 정답: **LIE + `pressure-log`**
- LIE+`pressure-log` → "9일 밤 열한 시에 902호 민원을 당신이 받았습니다. 여기 서명이 있고."
  루이즈: (천을 비튼다) "…네. 남아 있었어요. 물 때문에. 위층에서 소리가 났어요. 두 사람이었어요.
  한 사람은 여자였고, 다른 사람은… 말을 안 했어요. 걷는 소리만 났어요."
  → `two-voices` 플래그. 복도에 `footprints` 출현.
- LIE+오답 → 소각. 발자국 증거를 영영 못 얻는다.
- DOUBT → "…늦게까지 있는 날도 있어요. 그날이 그날인지는 모르겠어요."

**S3 — 진실** (`two-voices` 이후에만 등장)
- 루이즈: "카펫이 젖어 있었어요. 942호 앞에서 계단 쪽으로요. 아침에 제가 닦았어요. 그게 제 일이니까."
- 정답: **TRUTH** → "닦으면서 생각했어요. 이 물은 위에서 내려온 게 아니라, 위로 올라간 거구나."

**S4 — 거짓**
- 루이즈: "도일 씨요? 그냥 관리인이에요. 저는 그 사람이랑 말도 잘 안 해요."
- 정답: **LIE + `footprints`** 또는 **DOUBT**
- LIE+`footprints` → "이 발자국은 작업화입니다. 265mm. 여기 사람 중에 이 신발 신는 사람은 하나뿐이고."
  루이즈: (앉는다) "…작년에도 그랬어요. 밴스 아가씨 때도요. 그때도 물이 이상했어요. 아무도 안 물어봤어요."
  → `doyle-pattern` 플래그. 3막 지목 시 필수는 아니지만 엔딩 텍스트가 달라진다.
- DOUBT → "…무섭냐고 물으시면, 네. 이유는 말 못 해요."

**심문 종료 — 노트 요약 문구** (3단 판정 규칙은 E5 §2.4)
- 만점: "그녀는 전부 들었다. 이제 나도 들었다."
- 부분: "그녀는 반만 말했다. 나머지는 짜다 만 천 안에 있다."
- 실패: "그녀는 일로 돌아갔다. 손은 다시 멈추지 않을 것이다."

---

### 5.3 월터 프라이스 (2막, 944호)

> 상황: 커튼이 닫힌 방. 스탠드 하나. 재떨이에 꽁초는 없는데 재떨이는 닳아 있다.

**S1 — 거짓**
- 프라이스: "그 아가씨하고는 인사만 했습니다. 복도에서 두어 번. 그게 답니다."
- 정답: **LIE + `journal`**
- LIE+`journal` → "당신 이름이 세 번 나옵니다. 마지막 장에는 이 방 호수가 적혀 있고."
  프라이스: (반박자 늦게) "…들어온 적 있습니다. 두 번. 세 번인가."
- LIE+오답 → 소각. 사진을 얻지 못한다. **게임 최대의 손실.**
- DOUBT → "복도에서 마주친 사람 얼굴을 다 기억할 나이는 지났습니다."

**S2 — 진실**
- 프라이스: "저는 여기 하우스 디텍티브였습니다. 이 방엔 4년 살았고, 배지는 작년까지 달았죠.
  지금은 그냥 세입자고요."
- 정답: **TRUTH** → "그만둔 게 아니라 잘렸습니다. 이유는 서류에 안 적혀 있습니다.
  그런 건 원래 안 적습니다."

**S3 — 거짓** (핵심)
- 프라이스: "넬 밴스 사건은 제 소관이 아니었습니다. 그때 저는 이미 나온 뒤였고요."
- 정답: **LIE + `photos`** — 단 `photos`는 S1을 통과해야 얻는다.
  (S1 실패 시 이 진술은 **DOUBT**이 최선이며 자백에 도달하지 못한다)
- LIE+`photos` → "이 사진들, 당신 카메라입니다. 그리고 넬 밴스가 죽은 날 찍혔고."
  프라이스: (사진을 뒤집는다) "…제가 찍었습니다. 아무도 안 봤습니다. 제출했더니 이틀 뒤에 잘렸습니다.
  4장을 빼돌린 건 그때가 처음이자 마지막입니다."
  → `photos-4` 개방. 4번째 사진의 유리 반사에 **두 번째 형체**가 있다(플레이어가 스크럽하며 발견).
- DOUBT → "…제 소관이 아니었다는 말은 취소하겠습니다. 그 이상은 말 안 합니다."

**S4 — 거짓** (핵심)
- 프라이스: "저는 그 아가씨한테 아무것도 준 적 없습니다."
- 정답: **LIE + `autopsy`** 또는 **LIE + `water-log`**
- LIE+`autopsy` → "언니 부검 사본이 그 방에 있었습니다. 유족한테는 안 나가는 서류입니다.
  나갈 수 있는 사람은 이 호텔에 하나뿐이고."
  프라이스: "…줬습니다. 급수 일지도 줬습니다. 그 아가씨가 그걸 들고 뭘 할지 알면서 줬습니다.
  나는 늙었고 그 아가씨는 젊었습니다. 그게 다입니다. 그게 제가 한 겁니다."
  → `pryce-confession`. `water-log` 획득(2막 잔여).
- LIE+오답 → 소각. `water-log`는 944호 수색으로만 얻어야 한다(난이도 상승).

**S5 — 진실**
- 프라이스: "탱크 해치는 안에서 못 잠급니다. 걸쇠가 바깥에 있습니다. 4년간 매달 봤습니다."
- 정답: **TRUTH** → "그러니 형사님, 그 아가씨가 혼자 들어갔다면, 뚜껑은 열려 있어야 합니다."
  → 3막 `hatch-lock` 관찰 시 자살 배제가 성립한다.

**심문 종료 — 노트 요약 문구** (3단 판정 규칙은 E5 §2.4)
- 만점: "4년 만에 944호의 커튼이 걷혔다. 전부 나왔다."
- 부분: "노인은 반쯤 고백했다. 나머지는 스크랩 뒤에 있다."
- 실패: "944호는 다시 14개월 전으로 돌아갔다."

---

### 5.4 에멧 도일 (3막, 옥상)

> 상황: 비. 탱크 캣워크 아래. 도일이 렌치를 들고 서 있다. 심문이 아니라 **지목**이다.

- 도일: "형사님이 여기까지 올라오실 줄은 몰랐습니다. 사다리가 미끄럽죠."
- 도일: "그 아가씨요? 못 봤습니다. 저는 밸브만 봅니다."

**지목 단계 (증거판)**
플레이어는 3개 링크를 걸어야 한다. 하나라도 없으면 미제 엔딩.

| 링크 | 필요 증거 | 명제 |
|---|---|---|
| L1 | `hatch-lock` + `shoes` | 자살이 아니다 — 해치는 바깥에서 잠겼고 구두는 가지런히 놓여 있었다 |
| L2 | `water-log` + `pressure-log` | 10월 9일 밤 탱크에 접근한 사람은 한 명뿐이다 |
| L3 | `photos` + `wrench` | 14개월 전에도 같은 사람이 같은 자리에 있었다 |

- L1 성립 → 도일: "가지런히요. 그건 그 여자가 그렇게 해놓은 겁니다. 요새 애들이 그럽디다."
- L2 성립 → 도일: (웃는다) "일지는 제가 씁니다. 제가 쓴 걸 저한테 들이대시는 겁니까."
- L3 성립 → 도일: (웃음을 멈추지 않는다) "…삼촌한테 전화 좀 하겠습니다."
  형사: "받는 사람이 없을 겁니다."

**엔딩**
- **완전(3링크)**: 도일 체포. 넬 밴스 사건 재수사 개시. 마지막 컷 — 물탱크의 물이 빠지는 소리.
- **부분(2링크)**: 도일 구금 48시간. 소유주 변호사가 온다. 마지막 컷 — 프런트에 걸린 942호 열쇠.
- **미제(1링크 이하)**: 사건 종결. 마지막 컷 — 새 손님이 942호 열쇠를 받아 간다.
  로비 라디오가 다시 흐른다: "9층에서 물소리가 나면 비가 온다죠."
  자막: "버질은 계속 영업했다. 9층 이야기가 하나 늘었다."
  미제는 실패 화면이 아니라 정식 엔딩이다 — 사건이 괴담이 되어 호텔에 흡수되는 과정을
  플레이어가 목격한다(§7 괴담 유닛이 이 흡수의 수신처다).

**엔딩 자막의 플래그 변주 (E5 §2.3 소비 — 성립 플래그당 1줄, 기본 자막 뒤에
deitch → ruiz → pryce 순으로 덧붙는다)**

| 플래그 | 완전 | 부분 | 미제 |
|---|---|---|---|
| `deitch-confession` | "다이치의 진술이 조서에 실렸다. 20달러도." | "다이치는 진술을 반복했다. 변호사 앞에서는 반만." | "프런트의 진술은 조서에 남았다. 조서는 서랍에 남았다." |
| `doyle-pattern` | "넬 밴스 파일에 루이즈의 증언이 첨부됐다." | "루이즈의 증언은 48시간 뒤 철회됐다." | "루이즈는 다시, 아무것도 못 들은 사람이 됐다." |
| `pryce-confession` | "프라이스는 증인석에 앉겠다고 했다. 4년 만의 외출이다." | "프라이스의 진술서는 변호사 책상에서 멈췄다." | "944호의 커튼은 다시 닫혔다." |

**v2 정합 조항 — script.js v1 분기 응답 대사의 지위**: §5가 재수록하지 않은 v1의 분기
응답 대사(onTruth/onDoubt 후속 문장 등)는 **캐논으로 유지**한다 — "TRUTH → 넘어감" 류
표기는 생략 표기이지 삭제 지시가 아니다. 단 아래 교체 목록은 v2 캐논 정합을 위해 강제
적용한다(T-P0-03):
- `pryce.S2 onDoubt` "…4년 전 3월입니다…" → **"…46년 8월입니다. 날짜까지 대셔야 합니까."**
  (해고 14개월 전 정합 — FA9. 과잉 정밀 텔 유지)
- `deduction.js` 내장 미제 자막 "세실은 계속 영업했다." → 위 §5.4 정본으로 교체.

### 4.7 ARCH §5 room:changed 정본 어휘

*왜 읽는가: 기존 코드의 corridor 등 이형 표기를 corridor9 등 정본 어휘로 수렴시킨다.*

<!-- 원문: docs/ARCHITECTURE.md § 5. 이벤트 버스 계약 ⊂ VIRGIL — 아키텍처 계약 v2 (모든 에이전트 필독) -->
```js
engine.bus.on('evidence:collected', ({id}) => {})
engine.bus.emit('interrogation:start', {npc: 'deitch'})
```

**표준 이벤트 (이 이름만 사용)**

| 이벤트 | payload | 발신 |
|---|---|---|
| `game:ready` | — | core |
| `act:enter` | `{act: 1\|2\|3}` | narrative — **발화 파일: interrogation.js (판정 상태기계와 함께 막·페이즈 진행 상태기계를 소유, E5 §4)** *(v2에서 소유 명시)* |
| `evidence:collected` | `{id, kind}` | gameplay |
| `evidence:presented` | `{id, npc, correct}` | interrogation |
| `interrogation:start` | `{npc}` | gameplay |
| `interrogation:statement` | `{npc, line, truth}` | interrogation |
| `interrogation:verdict` | `{npc, choice, correct}` | interrogation |
| `interrogation:end` | `{npc, score, tier}` | interrogation — tier ∈ 만점/부분/실패(E5 §2.4 상태식). 노트 인물 면이 소비 *(v2에서 tier 추가)* |
| `player:interact` | `{targetId}` | gameplay |
| `player:footstep` | `{material, speed}` | gameplay |
| `cinematic:start` / `cinematic:end` | `{id}` | cinematics |
| `subtitle` | `{speaker, text, dur}` | any |
| `sfx` | `{id, pos?, gain?}` | any |
| `room:changed` | `{room}` | levels |
| `act:phase` | `{act, phase}` | narrative(발화 파일: interrogation.js — act:enter와 동일 소유) — 막 내 페이즈 전환(조명·오디오 무드 연동). **phase 정본 어휘: `early` / `main` / `late` 3값 공통** — E2 결박: act1 late=7:00 도일 통과 개시 · act2 late=30:00 보일러 소리 · act3 late=지목 개시 *(v2)* |
| `lore:heard` | `{id, medium}` | gameplay — 괴담 유닛 접촉, 노트 괴담 면 축적 *(v2)* |
| `npc:sighted` | `{npc, kind}` | levels — 프리젠스 목격, 정보 없는 존재감 (E4 §1 도일) *(v2)* |
| `checkpoint:saved` | `{act}` | gameplay/save — 막 경계 저장 *(v2)* |
| `settings:changed` | `{key, value}` | ui/settings *(v2)* |
| `interrogation:prompt` | `{npc, sid, options}` | interrogation — UI에 3선택(또는 재질문 2선택) 요구. 렌더는 [UI] 소유 *(v2)* |
| `interrogation:choose` | `{sid, choice, evidence?}` | ui — 플레이어 선택 반환(단일 발화 — LIE는 증거 확정 시점에만, 판정도 그때만) *(v2)* |
| `interrogation:aiming` | `{sid, on}` | ui — LIE 증거 지목 모드 진입(on:true)/취소(on:false). 카메라 푸시인·롤백(E7 §1 3행)의 트리거. 판정 아님 *(v2)* |
| `deduction:present` | `{linkId, evidence}` | ui(board) — 증거판에 링크 제시 입력. 판정·`deduction:link` 발화는 deduction 소유 *(v2)* |
| `deduction:sign` | `{}` | ui(board) — 조서 서명 = 지목 종결 선언. deduction이 성립 링크 수로 엔딩 분기(E5 §5) *(v2)* |
| `deduction:end` | `{ending, links, flags}` | deduction — 지목 종결 확정 통지(ending ∈ full/partial/cold). cinematics(cin-end-* 개시)·save(**엔딩을 비가역 레코드에 기록, 회차 종결 — "이어서" 소멸, E8 §4**)가 소비 *(v2)* |
| `boot:progress` | `{done, total}` | main.js — 부트 진행(모듈 init 계수+첫 프레임). 로딩 화면(E8 §3)이 구독 *(v2)* |
| `title:proceed` | `{mode}` | ui(title) — 타이틀·재입장 통과 신호. mode `new`(첫 입력/처음부터) → cinematics가 cin-intro 개시. mode `resume` → title.js 자신이 `?resume=1` 재작성+리로드(수신자 없음, 로그 목적). mode `wake`(재제스처 화면 첫 입력 — E8 §4) → 각 모듈이 제스처 후 재개(audio 컨텍스트 활성·입력 홀드 해제·복원 지점 플레이 개시) *(v2)* |
| `game:pause` | `{on}` | ui(settings 카드) — 일시정지 전파. **구독·정지 대상: physics·chars(perf)·cinematics·interrogation·audio(디제틱 감쇠) — 각 모듈이 자기 update를 스킵한다(core 무수정, engine.time은 계속 흐른다). 렌더·pipeline은 지속** — FOV·감도 즉시 반영을 카드 뒤 화면으로 확인하는 것이 목적이다. 시네마틱 재생 중 pause = 재생 정지(스킵 아님) *(v2)* |
| `perf:state` | `{npc, state}` | interrogation — 연기 상태 idle/anxious/lying/breaking. perf.js는 이것만 구독하며 진위를 모른다. 산출 규칙(기계): 진술 제시 중 `truth:false`→lying, `anxiousTell:true`→anxious, 그 외→idle. **breaking은 case-graph `breakingOn:true` 진술의 lieCorrect 판정 직후에만**(현행 3건: deitch.S4·ruiz.S4·pryce.S3) *(v2)* |
| `deduction:link` | `{id, ok}` | deduction — 지목판 링크 성립/실패. perf(도일 반응)·cinematics(광각화)가 구독 *(v2)* |
| `camera:dof` | `{bias, ms}` | cinematics — LIE 푸시인의 조리개 개방(보케 붕괴) 요청. 수신·보간은 [PIPELINE-CORE]가 dof 패스에 전달(수신부 구현은 HANDOFF 큐 경유 — E10 T-P1-08 비고) *(v2)* |

**`room:changed` 값 어휘 (정본 — v2)**: `lobby` · `elevator` · `corridor9` · `linen` ·
`room942` · `bathroom942` · `room944` · `stairs-roof` · `rooftop`. 오디오 리버브 전환(E7 §3)·
완주 봇 로그가 이 문자열을 그대로 소비한다. 기존 코드의 `corridor` 등 이형 표기는
T-P0-03 정합 라운드에서 이 어휘로 수렴한다. `elevator`는 이동 공간이라 case-graph 셀이
아니며, `boiler`는 진입 불가 공간이라 room 값으로 발화되지 않는다(소리 원점 전용, E6 §0).

### 4.8 ARCH §0 작품 정의 — 재허구화

*왜 읽는가: 표출 문자열의 정본 명칭. 화면에 나오는 "세실"은 0이어야 하고, 코드 식별자 잔존은 허용된다.*

<!-- 원문: docs/ARCHITECTURE.md § 0. 작품 정의 ⊂ VIRGIL — 아키텍처 계약 v2 (모든 에이전트 필독) -->
**VIRGIL(가제 확정) — 1947 · Room 942**
1947년 로스앤젤레스. LAPD 강력계 형사가 버질 애비뉴의 호텔 버질에서 9일간 실종된 투숙객 아이리스 밴스(Iris Vance, 22)를 수사한다.
투숙객들의 수도에서 검은 물이 나오고, 압력이 떨어진다. 답은 옥상 물탱크에 있다.

- 인물·사건·호텔은 전부 허구다. 실제 사건·실존 업체를 지목하는 조합은 해체됐다(재허구화 계약: MASTER-PLAN §1, 명칭 검증: docs/design/E0-index.md §0). 시작 화면에 허구 고지문 필수.
- 톤: 필름 느와르 + 조용한 공포. 점프 스케어 금지. 초자연은 괴담(대기·발화)으로만 — 증거 그래프 침투 0 (factcheck F4).
- 플레이 타임 목표 40~60분, 3막. 코어 선언: docs/design/E1-core.md (비가역 대면).

**막 구성**
| 막 | 공간 | 핵심 |
|---|---|---|
| I | 로비 · 프런트데스크 · 엘리베이터 | 숙박부 확인, 야간 프런트 마를로 다이치 심문, 하우스 디텍티브가 찍은 엘리베이터 사진 4장 입수 |
| II | 9층 복도 · 942호 · 944호 | 현장 수색, 하우스키퍼 콘수엘라 루이즈 / 944호 투숙객 월터 프라이스 심문 |
| III | 옥상 · 물탱크 | 발견, 증거판 최종 지목 |

## 5. 입력 데이터

### 5.1 case-graph 노드 (`docs/design/case-graph.json` 발췌 — 이 값이 정본이다)

```json
// statements
{
  "id": "deitch.S1",
  "npc": "deitch",
  "act": 1,
  "truth": true,
  "burnable": true,
  "unlocks": {
    "onLieWrong": {
      "flags": [
        "deitch-clammed"
      ]
    }
  },
  "anxiousTell": true
}
// statements
{
  "id": "deitch.S2",
  "npc": "deitch",
  "act": 1,
  "truth": false,
  "hides": [
    "FB4"
  ],
  "refutedBy": [
    "register"
  ],
  "burnable": true,
  "unlocks": {
    "lieCorrect": {
      "flags": [
        "deitch-recanted"
      ]
    }
  },
  "key": true
}
// statements
{
  "id": "deitch.S3",
  "npc": "deitch",
  "act": 1,
  "truth": true,
  "burnable": true,
  "unlocks": {
    "truth": {
      "grants": [
        "pressure-log"
      ]
    },
    "doubt": {
      "grants": [
        "pressure-log"
      ]
    }
  },
  "anxiousTell": true
}
// statements
{
  "id": "deitch.S4",
  "npc": "deitch",
  "act": 1,
  "reAct": 2,
  "truth": false,
  "hides": [
    "FB2",
    "FB3"
  ],
  "refutedBy": [
    "keyrack",
    "roofkey"
  ],
  "burnable": true,
  "unlocks": {
    "lieCorrect": {
      "flags": [
        "deitch-confession"
      ],
      "requiresEvidence": "roofkey"
    }
  },
  "key": true,
  "breakingOn": true
}
// statements
{
  "id": "deitch.S5",
  "npc": "deitch",
  "act": 1,
  "truth": true,
  "burnable": false,
  "unlocks": {}
}
// statements
{
  "id": "ruiz.S1",
  "npc": "ruiz",
  "act": 2,
  "truth": true,
  "burnable": false,
  "unlocks": {},
  "anxiousTell": true
}
// statements
{
  "id": "ruiz.S2",
  "npc": "ruiz",
  "act": 2,
  "truth": false,
  "hides": [
    "FB6"
  ],
  "refutedBy": [
    "pressure-log"
  ],
  "burnable": true,
  "unlocks": {
    "lieCorrect": {
      "flags": [
        "two-voices"
      ],
      "spawns": [
        "footprints"
      ]
    }
  },
  "key": true
}
// statements
{
  "id": "ruiz.S3",
  "npc": "ruiz",
  "act": 2,
  "truth": true,
  "burnable": false,
  "requiresFlag": "two-voices",
  "unlocks": {}
}
// statements
{
  "id": "ruiz.S4",
  "npc": "ruiz",
  "act": 2,
  "truth": false,
  "hides": [
    "FA1"
  ],
  "refutedBy": [
    "footprints"
  ],
  "burnable": true,
  "unlocks": {
    "lieCorrect": {
      "flags": [
        "doyle-pattern"
      ]
    }
  },
  "breakingOn": true
}
// statements
{
  "id": "pryce.S1",
  "npc": "pryce",
  "act": 2,
  "truth": false,
  "hides": [
    "FB0"
  ],
  "refutedBy": [
    "journal"
  ],
  "burnable": true,
  "unlocks": {
    "lieCorrect": {
      "grants": [
        "photos"
      ]
    }
  },
  "key": true
}
// statements
{
  "id": "pryce.S2",
  "npc": "pryce",
  "act": 2,
  "truth": true,
  "burnable": false,
  "unlocks": {},
  "anxiousTell": true
}
// statements
{
  "id": "pryce.S3",
  "npc": "pryce",
  "act": 2,
  "truth": false,
  "hides": [
    "FA5",
    "FA9"
  ],
  "refutedBy": [
    "photos"
  ],
  "burnable": true,
  "unlocks": {
    "lieCorrect": {
      "flags": [
        "photos-4"
      ]
    }
  },
  "key": true,
  "breakingOn": true
}
// statements
{
  "id": "pryce.S4",
  "npc": "pryce",
  "act": 2,
  "truth": false,
  "hides": [
    "FB0"
  ],
  "refutedBy": [
    "autopsy",
    "water-log"
  ],
  "burnable": true,
  "unlocks": {
    "lieCorrect": {
      "flags": [
        "pryce-confession"
      ],
      "grants": [
        "water-log"
      ]
    }
  },
  "key": true
}
// statements
{
  "id": "pryce.S5",
  "npc": "pryce",
  "act": 2,
  "truth": true,
  "burnable": false,
  "unlocks": {}
}
```

그래프가 틀렸다고 판단되면 고치지 말고 §10.1 로 반환한다 — case-graph 는 E3 소유다.

## 6. 이벤트 계약

이 티켓은 버스를 발화하지도 구독하지도 않는다. 새 이벤트 이름을 만들지 마라 —
필요하면 §10.1 로 반환한다.

## 7. 샷

이 티켓은 샷 엔트리를 쓰지 않는다(로그·배터리로 판정). `core/shotlist.js` 를 건드리지 마라.

## 8. 수용 기준 (기계 판정 — 전건 통과가 완료 조건)

형용사로 자평하지 않는다. 아래 명령을 실제로 돌리고 출력을 결과 보고에 붙인다.

**A1.**

```bash
node tools/factcheck.mjs
```
→ F1~F4·R1~R3 전건 PASS — script.js의 id가 case-graph와 1:1로 해결되고 관계 중복 기재가 0이다

**A2.**

```bash
node tools/test-interrogation.mjs
```
→ 기존 배터리 전건 통과 — 데이터 접근층 전환이 판정 동작을 바꾸지 않았다

**A3.**

```bash
grep -n '세실' src/ui/casebook.js src/narrative/deduction.js src/narrative/script.js
```
→ 0건 — 노트 표지 "실종 · 호텔 버질 942호" · 미제 엔딩 캡션·자막 "버질은 계속 영업했다"(E2 부록 A 원문 그대로). 문자열만 교체하고 로직은 건드리지 않는다

**A4.**

```bash
grep -rn '세실' src/ --include=*.js
```
→ 화면 표출 문자열에서 0건 (코드 식별자 __CECIL__ 등은 잔존 허용)

**A5.**

```bash
node tools/lint-contract.mjs
```
→ display-name 규칙 위반 0(화면 표출 "세실" 소멸) · 자기 소유 파일의 max-500-lines 위반 0. 다른 규칙의 기존 위반(재질·조명·분할·tools 범위)은 T-P0-02/04와 계약 재획정 소관이라 이 티켓의 판정 대상이 아니다

## 9. 금지 사항

### 9.1 이 티켓 고유

- STORY §5 대사 원문의 각색·요약·재창작 — 진실원은 STORY이고 script.js는 전사(轉寫)다.
- interrogation.js·deduction.js의 판정 로직·이벤트 발화 절 편집 — 승인 범위는 데이터 접근층뿐이다(E5 [위임]).
- case-graph.json 수정 — 그래프는 E3 소유다. 그래프가 틀렸다면 CONTRACT_CHANGE_REQUEST로 반환한다.
- script.js에 원산지·반박 관계를 다시 적는 것 — 관계는 그래프에만 산다.
- 표출 문자열 교체를 빌미로 주변 로직·서식을 손보는 것 — 구역 소유는 그 문자열 1건씩이다.

### 9.2 전역 (프로젝트 전체 불변)

<!-- 원문: AGENTS.md § 안전 규칙 ⊂ CECIL — 1947 · Room 942 -->
- 남이 소유한 파일을 편집하지 않는다. **다른 소유자의 파일을 고쳐야 하면 `docs/HANDOFF.md` 큐에 항목을
  추가**하고 자기 소유분만 진행한다. "그 에이전트가 지금 안 보인다"는 안전 신호가 아니다 — 여러 워크플로가
  동시에 돌고 소유자는 라운드 사이에 다시 살아난다.
- `src/core/*`는 잠김. 예외 2건만 허용 — `core/shotlist.js` 엔트리 추가 ·
  `core/config.js` QUALITY.low 신설(T-P0-06 담당 한정, ARCH §2).
- **병렬 세션 커밋 규약**: `git commit -a` 와 무인자 `git add -A` 금지.
  **자기 소유 경로를 명시해 스테이지한다** — 예: `git add docs/design docs/ROUNDS.md`.
  커밋 이력이 제출물(AI 활용 기술 문서)의 재료라, 한 커밋에 두 세션의 작업이 섞이면
  라운드↔변경 대응이 깨지고 이력 재작성은 요건 위반이라 되돌릴 수 없다.
- 외부 에셋 다운로드 금지. 모든 텍스처·지오메트리·오디오는 절차 생성.
- `Math.random()` / `Date.now()` 직접 호출 금지 (`core/util.js`의 `rng`, `engine.time` 사용).
- 실제 사건 피해자를 재현하지 않는다. 인물·사건은 전부 허구.

## 10. 반환 형식

### 10.1 계약 변경이 필요할 때

코드를 고치지 말고 `docs/HANDOFF.md` **하단에 항목을 추가**한다(남의 항목 수정·삭제 금지).
그리고 자기 소유분만 진행한다. 형식:

<!-- 원문: docs/HANDOFF.md § 형식 ⊂ 소유권 교차 요청 (CONTRACT_CHANGE_REQUEST 큐) -->
```
### [ ] <요청자> → <대상 소유자>
- **파일**: src/...
- **루브릭**: G8 / D3 ...
- **문제**: 스크린샷 어느 지점에서 무엇이 잘못 보이는가
- **지시**: 구체적 기술 지시
- **요청자가 처리한 부분**: 자기 소유 파일에서 이미 한 것(중복 작업 방지)
```

---

### 10.2 결과 보고

- 수용 기준 A1~A5 각각의 **실제 명령 출력**을 붙인다. 요약 서술로 대체하지 않는다.
- 커밋은 자기 소유 파일만, 라운드 단위로. squash·force push 금지 — 커밋 이력 자체가 제출물이다.
- 중단했다면 무엇이 남았는지·다음 담당이 어디서 이어받는지를 적는다.

## 11. 공통 규약 (전 패킷 공통 — 인라인)

### 11.1 AGENTS.md § 명령

<!-- 원문: AGENTS.md § 명령 ⊂ CECIL — 1947 · Room 942 -->
```bash
npm run dev                       # 개발 서버 http://localhost:5173
npm run shot                      # 전체 QA 스크린샷 → shots/
npm run shot -- lobby-wide        # 단일 샷
npm run shot -- --out shots/r03   # 반복 사이클별 출력 분리
```

### 직접 걸어보기 (수동 확인용)

```
npm run dev
http://127.0.0.1:5173/?scene=corridor-night
```

`?scene=` 값: `corridor-night` · `lobby-night` · `room-dusk` · `bathroom` · `rooftop-rain` · `interrogation`
(값 없이 열면 재질 테스트베드). 조작: 클릭으로 마우스 잠금, **WASD** 이동, **E** 상호작용, **Tab** 수사노트, **Esc** 해제.

이 공간들은 QA 프로브와 같은 것이라 월드 y=-500에 격리돼 있다. `src/main.js`가 진입 시
프로브를 세우고 플레이어를 그 바닥에 놓는다. **이 경로를 깨지 마라** — 특히:
- `player.floorY` — 레이캐스트가 바닥을 못 찾았을 때의 최종 바닥. 기본 0이고 씬 모드에서 -500으로 옮긴다.
  하드코딩 `pos.y < 0` 으로 되돌리면 진입 즉시 플레이어가 원래 층으로 튕긴다.
- 씬 모드는 `player.body = null`로 물리 캐릭터를 끄고 자체 레이캐스트 충돌로 폴백한다.
  프로브에는 rapier 콜라이더가 없기 때문이다.
- `world/testbed.js`는 `qa:state`의 `scene === 'atmo-probe'`에서 스스로 숨는다.

### 샷 하네스 규약 (병렬 작업 중 필수)

- **GPU 락이 자동으로 걸린다.** 동시에 한 프로세스만 실행되며, 다른 실행이 돌고 있으면
  "GPU 락 대기 중" 로그를 찍고 기다린다. 이건 정상이다 — 죽이지 말고 기다려라.
  단독 실행 기준 warmup 20~30초 + 첫 샷 ~25초, 이후 샷 ~2초다.
- **필요한 샷만 찍어라.** 전체 샷은 배선/검수 담당만 돌린다. 자기 담당 1~2개만 지정해서 찍는다.
- **`--out shots/<자기이름>`을 써라.** 기본 출력(`shots/`)은 공유되므로 report.json이 서로 덮인다.
  리포트에 `runner` 필드로 실행 주체가 찍히니 남의 리포트를 자기 것으로 읽지 마라.
- `SHOT_PORT=<고유번호>`를 지정해 포트 충돌을 피한다.
- 샷 도중 vite는 HMR·파일 워처가 꺼진 채로 뜬다(`SHOT=1`). 그래서 다른 에이전트가 파일을 저장해도
  페이지가 리로드되지 않는다. 이 동작에 의존하지 말고, 자기 샷은 자기 수정이 끝난 뒤에 찍어라.

### 11.2 AGENTS.md § 샷 하네스 규약 (병렬 작업 중 필수)

<!-- 원문: AGENTS.md § 샷 하네스 규약 (병렬 작업 중 필수) ⊂ CECIL — 1947 · Room 942 ⊂ 명령 -->
- **GPU 락이 자동으로 걸린다.** 동시에 한 프로세스만 실행되며, 다른 실행이 돌고 있으면
  "GPU 락 대기 중" 로그를 찍고 기다린다. 이건 정상이다 — 죽이지 말고 기다려라.
  단독 실행 기준 warmup 20~30초 + 첫 샷 ~25초, 이후 샷 ~2초다.
- **필요한 샷만 찍어라.** 전체 샷은 배선/검수 담당만 돌린다. 자기 담당 1~2개만 지정해서 찍는다.
- **`--out shots/<자기이름>`을 써라.** 기본 출력(`shots/`)은 공유되므로 report.json이 서로 덮인다.
  리포트에 `runner` 필드로 실행 주체가 찍히니 남의 리포트를 자기 것으로 읽지 마라.
- `SHOT_PORT=<고유번호>`를 지정해 포트 충돌을 피한다.
- 샷 도중 vite는 HMR·파일 워처가 꺼진 채로 뜬다(`SHOT=1`). 그래서 다른 에이전트가 파일을 저장해도
  페이지가 리로드되지 않는다. 이 동작에 의존하지 말고, 자기 샷은 자기 수정이 끝난 뒤에 찍어라.

### 11.3 docs/ARCHITECTURE.md § 10. 결정론

<!-- 원문: docs/ARCHITECTURE.md § 10. 결정론 ⊂ VIRGIL — 아키텍처 계약 v2 (모든 에이전트 필독) -->
- `Math.random()` 직접 호출 금지. `core/util.js`의 `rng(seed)` 사용.
- `Date.now()` / `performance.now()` 직접 호출 금지. `engine.time` 사용.
- QA 모드(`?qa=1`)에서 시간은 하네스가 고정 스텝으로 전진시킨다.

### 11.4 docs/ARCHITECTURE.md § 11. 코드 스타일

<!-- 원문: docs/ARCHITECTURE.md § 11. 코드 스타일 ⊂ VIRGIL — 아키텍처 계약 v2 (모든 에이전트 필독) -->
- ESM, 세미콜론 없음, 2스페이스, 작은따옴표.
- 파일당 500줄 이하. 넘으면 같은 소유 디렉터리 안에서 분할.
- 주석은 "왜"만. "무엇"은 코드로.
- 콘솔 에러/경고 0 — QA가 콘솔을 읽고 실격 처리한다.

### 11.5 docs/design/E9-gates.md § 3. goal 계약 형식 (전 구현 Phase 공통 — 중단 조건 없는 goal 루프 금지)

<!-- 원문: docs/design/E9-gates.md § 3. goal 계약 형식 (전 구현 Phase 공통 — 중단 조건 없는 goal 루프 금지) ⊂ E9 — 게이트·루브릭 -->
```
/goal {목표 1문장}
통과 조건: {위 §2 은행의 부분집합} + {루브릭 항목 지목}
중단 조건: 라운드 상한 N회 · 토큰 상한 M · 세션 한도 근처 팬아웃 금지(직렬 전환)
```

세 필드 전부 **필수**다 — 토큰 상한이 빠진 goal은 발사 금지(에이전트 팬아웃 비용 게이트
승계). 기준 수치: P0 = 서브에이전트 토큰 500만 · P1 = 1,500만(CECIL 복도 실측이 기준) ·
이후 Phase는 발사문 작성 시 직전 Phase 실측으로 갱신. 상한 도달 시 라운드 경계에서 중단하고
ROUNDS.md에 인수인계를 남긴다.

라운드 규율(승계): 라운드 = 단일 담당 · 단일 목표 · 사전 기준선 → 사후 기계 게이트.
커밋은 라운드 단위 세분. 회귀면 롤백 — 판 갱신은 개선일 때만.

### 11.6 docs/HANDOFF.md § 형식

<!-- 원문: docs/HANDOFF.md § 형식 ⊂ 소유권 교차 요청 (CONTRACT_CHANGE_REQUEST 큐) -->
```
### [ ] <요청자> → <대상 소유자>
- **파일**: src/...
- **루브릭**: G8 / D3 ...
- **문제**: 스크린샷 어느 지점에서 무엇이 잘못 보이는가
- **지시**: 구체적 기술 지시
- **요청자가 처리한 부분**: 자기 소유 파일에서 이미 한 것(중복 작업 방지)
```

---

## 12. 부록 A — 본문이 직접 가리키는 계약 절

§1~§11 이 가리키는 절이다. **이 티켓과 직접 관계가 있다.**

### E5 §2 — 2. 소각 경제 — 비가역의 규칙 (E1 U1의 시스템 본체)

<!-- 원문: docs/design/E5-interrogation.md § 2. 소각 경제 — 비가역의 규칙 (E1 U1의 시스템 본체) ⊂ E5 — 심문·판정 시스템 -->
1. **소각 = unlocks 영구 무효.** 소각된 진술의 grants/spawns/flags는 이 회차에서 다시
   얻을 수 없다. 게임은 계속 진행된다 — 진행 불능은 구조적으로 불가(factcheck F3).
2. **긴장의 수치 설계 — 단일/이중 경로 배분** ([E3 §3](E3-case-graph.md)가 데이터 진실원):
   심문 성과에만 걸린 단일 경로 증거 3종(`pressure-log`·`photos`·`footprints`)이 연쇄
   손실의 축이고, `water-log`는 이중 경로(수색 회수 가능)로 숨통이다. 배분 변경은
   case-graph.json 수정 + factcheck 재검증으로만.
3. **손실의 서사적 인정** — 손실은 반드시 보이게 남는다(몰랐던 함정이 아니라 내 선택의
   결과로 읽히게):
   - 소각된 진술은 수사노트에 **줄이 그어진 채 잔존**한다. 지워지지 않는다(E8 §2).
   - `deitch-clammed`: 이후 다이치 전 진술이 한 문장으로 준다(STORY §5.1).
   - 소각으로 닫힌 재심문은 노트의 인물 면에 "더 묻지 않는다"로 표기된다.
   - 엔딩 텍스트가 플래그(`deitch-confession`·`doyle-pattern`·`pryce-confession`) 유무로
     변주된다 — 도달 상태의 다양성은 분기 트리가 아니라 이 플래그 변주로 저작한다.
4. **심문 종료 3단 — 기계 판정 규칙**: 종료 상태는 점수가 아니라 상태식으로 갈린다(점수는
   내부 집계용·비표시) —
   - **만점**: 소각 0 ∧ 해당 인물의 모든 거짓 진술이 정답 반박됨.
   - **실패**: 핵심 진술(case-graph `key:true` — 다이치 S2·S4, 루이즈 S2, 프라이스
     S1·S3·S4)이 1건 이상 소각됨.
   - **부분**: 그 외 전부.
   결과 텍스트는 대사가 아니라 **형사의 노트 요약 문구**(3단, 인물별 원문은 STORY §5 각
   인물 말미)로 표기된다. 재심문 재판정의 점수는 기존 판정을 **대체**한다 — 같은 진술의
   후속 정답 반박은 점수 추가 없이 플래그만 발화한다(deitch.S4: keyrack 부분 성공 후
   roofkey 재반박 = 플래그 `deitch-confession`만). 종료 상태는 3막 증거 가용성에 영향이
   없다 — 가용성은 오직 획득/소각 상태가 정한다(책임 분리: 판정은 드라마, 소지품은 사실).

### E8 §4 — 4. 저장 (체크포인트 — 비가역 코어의 지지대)

<!-- 원문: docs/design/E8-ui.md § 4. 저장 (체크포인트 — 비가역 코어의 지지대) ⊂ E8 — UI·부수 기능 -->
- **자동 저장만. 수동 저장·로드 없음. 슬롯 1개.** 저장 트리거는 정확히 4건 —
  **회차 개시**(cin-intro 종료·조작권 이양 직후, `act:enter {act:1}` 발화와 함께 —
  1막 도중 종료해도 소각이 남으려면 개시 스냅샷이 있어야 한다, U1) · **1→2 경계** ·
  **2→3 경계** · **엔딩 종결**(비가역 레코드 기록). 수동 세이브/로드는 소각 회피
  루트가 되어 U1(비가역)을 무너뜨린다 — 이 제한은 편의 기능 누락이 아니라 코어 설계다.
  타이틀 화면 선택지: "이어서"(마지막 체크포인트) / "처음부터"(슬롯 덮어쓰기 경고 1회).
- 구현: `state.js` 직렬화 활용 + **역직렬화 신설** — core 잠금 회피를 위해 역직렬화는
  gameplay 측 모듈이 소유(`gameplay/save.js` 신설, `checkpoint:saved {act}` 발화).
- **"이어서" 복원 재개 프로토콜(정본)**: 품질 프리셋의 `?q=` 전례를 준용해 **리로드
  방식** — 타이틀에서 "이어서" 선택 = URL `?resume=1` 재작성 + 리로드. 부트 시 save.js가
  init 단계에서 스냅샷+비가역 레코드를 로드해 state를 복원하고, 이후의 부트 파이프라인
  (레벨 활성화·`act:enter` 발화·무드 전환)은 **신규 이벤트 없이 정상 초기화 경로를
  그대로 탄다** — interrogation.js가 복원된 막으로 act:enter를 발화하고, 해당 막의 첫
  레벨이 `spawn/act#` 앵커에 플레이어를 놓는다. 복원 직후 체크포인트 재저장은 하지
  않는다(동일 상태 중복 기록 방지).
- **재개 부트의 재제스처(정본)**: 리로드는 브라우저 사용자 활성화를 소멸시키므로,
  `?resume=1` 부트는 로딩 후 **타이틀을 재표시하지 않고**(선택은 이미 끝났다) 최소
  재입장 제스처 화면 한 장을 띄운다 — 타자기 한 줄 "돌아오셨습니까 — 벨을 누르십시오"
  (§3 벨 도상 재사용). 첫 입력 = `title:proceed {mode:'wake'}` 발화(ARCH §5) —
  AudioContext·포인터록 재활성과 입력 홀드 해제는 각 모듈이 이 신호를 구독해 수행한다.
  이 화면은 P6 정지샷 판정 대상에 포함된다(title.js 소유).
- **이중 레이어 영속 규칙**: 소각·플래그 같은 **비가역 데이터는 발생 즉시 write-through
  영속**하고, 위치·막·점수는 막 경계 스냅샷에만 담는다. 복원 = 막 경계 스냅샷 + 비가역
  레코드 병합. **복원 시작 위치 = 해당 막의 `spawn/act#` 앵커**(ARCH §8 — 각 막 첫 레벨이
  배치, save.js는 앵커를 조회만 한다). 막 중간 소각 후 종료→"이어서"를 해도 소각은 남는다 — 막 재플레이를 비용으로
  한 소각 회피조차 불가능해야 E1 코어("복원해도 소각은 유지된다")가 저장 층에서 성립한다.
- 직렬화 범위: 증거 소지·소각 상태·플래그·**괴담 접촉 기록(`lore:heard` 누적 — 비가역
  레코드로 write-through, 복원 시 괴담 면 재구축. 노트는 지워지지 않는 소품이다)**·막·
  심문 점수.
- **증거판 서명(E5 §5)**: 지목 종결의 물성은 조서 말미의 서명란 — 만년필 서명 상호작용
  (`deduction:sign` 발신, board 소유). 서명 전 경고·잔여 링크 표시 없음(무힌트).
- **엔딩 = 회차 종결(정본)**: save는 `deduction:end {ending}`을 소비해 엔딩을 **비가역
  레코드에 기록**하고 회차를 종결한다 — 서명이라는 종결 선언은 재플레이로 되돌릴 수
  없다(U1의 저장 층 완결). 크레딧 종료 후 타이틀 복귀. 종결된 슬롯의 타이틀은
  "처음부터" 명패 하나만 남고, 금박 각인 아래 지난 회차의 기록 한 줄이 새겨진다
  ("지난 투숙: 미제" — 엔딩 id의 표출명은 STORY §5.4). "이어서"는 소멸 — 3막 재입장으로
  서명을 다시 쓸 수 있는 경로는 존재하지 않는다.

### E9 §2 — 2. 기계 게이트 총목록 (goal 루프가 소비하는 통과 조건 은행)

<!-- 원문: docs/design/E9-gates.md § 2. 기계 게이트 총목록 (goal 루프가 소비하는 통과 조건 은행) ⊂ E9 — 게이트·루브릭 -->
| 게이트 | 도구 | 실행 시점 | 상태 |
|---|---|---|---|
| 사실 그래프 F1~F4+R1~R3 | `tools/factcheck.mjs` | 내러티브 데이터 변경마다 (커밋 게이트) | **가동 중 (PASS)** |
| 픽셀 회귀 | `tools/pix.mjs diff` + `shots/_baseline/` | 시각 변경 라운드마다 | 가동 중 (동결 감시) |
| 완주 봇 3경로 | `tools/playthrough.mjs` (신설) — 판정용 시퀀스 캡처(`--capture`)도 이 도구가 소유 | 게임플레이 변경마다 | P1 티켓 |
| 텔 상관 (P5) | factcheck 확장 — script v2의 텔 발화 상관 | 스크립트 변경마다 | P1 티켓 |
| 콘솔 에러·경고 0 | 샷 하네스 기존 | 전 라운드 | 가동 중 |
| 계약 린트 | 커밋 훅 grep 5종: materials 밖 `Mesh*Material` · atmosphere 밖 `*Light` · `Math.random(`/`Date.now(`/`performance.now(` · 500줄 초과 · 화면 표출 "세실" — 검사 범위·판별법·훅 공존은 표 아래 판별 규칙이 정본 | 커밋마다 | P0 티켓 |
| 프레임 예산 | `?stats=1` 통계 오버레이(frametime p50/p95·드로우콜·메모리 — QA 전용·플레이어 비노출·D7 면제) + 샷 하네스 게이트: high 60fps / medium 30fps / **low 30fps @ CPU 4× 스로틀링**(저사양 리허설 기준 — 프리셋 신설은 T-P0-06). 구현 티켓 T-P1-05 (E8 §5에서 이관) | 레벨 라운드마다 | P1 티켓 |
| 판정 배터리 (2단) | 정답/오답/무관 60건 오판 0 | 커널 스왑 머지 조건 | P4 티켓 |

**계약 린트 판별 규칙 (T-P0-01 정본 — 규칙 5종의 적용 범위·판별법. 이 절이 없으면
에이전트마다 다른 판정이 난다. 2에이전트 캘리브레이션 실측으로 보강 —
`tools/calibration/report.md` §1.3):**

- **검사 범위**: `src/**` · `tools/**` · `index.html` 의 `.js`/`.mjs`/`.html`.
  500줄 초과 규칙만 `.js`/`.mjs` 로 한정.
- **화면 표출 "세실" 판별**: 표출 sink 추적은 정적으로 결정 불가 — 검사 범위 내
  **문자열 리터럴·HTML 텍스트 전수 검사**가 정본이다. 표출이 아닌 잔존 허용분
  (코드 식별자·`cecil*` 접두 재질명 등 — ARCH §0)은 해당 행의
  `// lint-allow: display-name` 주석(HTML은 `<!-- lint-allow: display-name -->`)
  화이트리스트로 제외한다.
- **pre-commit 훅 공존**: 기존 훅이 이 설치기의 산출이면 멱등 갱신, 아니면
  덮어쓰지 않고 exit 1.
- **훅 "자기 산출" 식별**: 설치기는 훅 머리(셔뱅 직후)에 고정 마커 줄
  `# virgil-contract-lint managed` 를 쓴다. 자기 산출 판별은 **이 문자열의 포함
  여부로만** 한다 — 버전 접미·도구 경로 표기 등 변형 금지(실측에서 에이전트마다
  다른 마커를 임의 채택해 상호 오인이 난 지점).
- **`--staged` 수집 의미론**: 검사 대상 수집은
  `git diff --cached --name-only --diff-filter=ACM --no-renames` —
  rename·copy 는 신규로 취급, 삭제는 제외. 수집된 파일은 변경 줄만이 아니라
  **파일 전체**를 검사한다(500줄 초과 파일은 무관한 변경도 차단된다 —
  분할을 강제하는 의도된 동작).
- **허용 경로 집합**: "atmosphere 밖 `*Light`" 의 허용 경로는
  `src/world/atmosphere.js` + `src/world/atmo/**`, "materials 밖 `Mesh*Material`" 의
  허용 경로는 `src/materials/**`. atmo/ 분권 파일은 팩토리 구현부 그 자체다
  (ARCH §2 [ATMOSPHERE] 소유 · §6.5 계약의 공급 측 — T-P0-04 분할 후에도 성립) —
  팩토리 허용 경계를 소유권 경계와 여기서 일치시킨다. 분권 파일 내부의 직접 생성은
  위반이 아니다.
- **주석·문자열 취급**: 패턴 규칙 4종(재질·광원·랜덤/시계·표출)은 줄 주석(`//`)·
  블록 주석(`/* */`) 제거 후 검사한다 — 주석 속 예시 오탐과 주석 우회 미탐을 함께
  닫는다. `lint-allow` 화이트리스트 주석은 **제거 전에 수집**한다. 문자열 리터럴은
  검사 대상으로 유지한다(표출 규칙이 리터럴을 본다). 500줄 규칙만 주석 제거 전
  **원문 물리 줄 수** 기준.

### E8 §2 — 2. 설정 (`ui/settings.js` 신규 — order 80, 자동 등록)

<!-- 원문: docs/design/E8-ui.md § 2. 설정 (`ui/settings.js` 신규 — order 80, 자동 등록) ⊂ E8 — UI·부수 기능 -->
물성: 프런트 서류함 카드 + 객실 안내판 스타일 — 항목은 타자된 카드, 값 변경은 카드를
넘기거나 놋쇠 다이얼을 돌리는 상호작용.

**진입 트리거(정본)**: 인게임 **Esc 1회** = 포인터록 해제 + 게임 일시정지 + 설정 서류함
카드 오버레이(기존 "Esc 해제" 동작을 흡수 — 해제와 설정은 같은 순간이다). Esc 재차 또는
카드 닫기 = 잠금 복귀·재개. FOV·감도의 "즉시 반영"은 카드가 열린 상태에서 뒤 화면에
실시간 적용되는 것으로 확인한다. 타이틀 화면에서는 동일 카드를 재사용(별도 메뉴 없음).
수사노트(Tab)와는 무관 — 노트는 게임 내 소품, 설정은 게임 밖 카드다.

**일시정지 전파(정본)**: 카드 개폐 시 `game:pause {on}` 발화(ARCH §5) — physics·chars·
cinematics·interrogation·audio가 구독해 자기 update를 스킵하고, **렌더·pipeline은
지속**(즉시 반영 확인의 전제). core는 무수정 — engine.time은 계속 흐르고 정지는 모듈
측 스킵으로 구현한다. 시네마틱 재생 중 Esc = 재생 정지(스킵 아님), 카드 닫으면 이어서
재생. **이 절의 코어 기여**: Esc가 해제·정지·설정을 한 순간에 묶는 것은 심문 중 오조작
(잠금 해제 상태의 의도치 않은 클릭 → 원치 않은 선택 제출)을 차단하는 안전장치다 —
비가역 시스템에서 오입력 방지는 U1의 공정성 조건이다. 물성(P6·D7 실격 방어)은 코어
대면의 무대 신뢰를 지키는 게이트 이행 절이다(E9 경유).

| 항목 | 방식 | 반영 |
|---|---|---|
| 품질 프리셋 | **선택지 3종 `high`/`medium`/`low`**(`cinematic`은 QA 전용 — UI 비노출. low 신설은 T-P0-06, 정본 `core/config.js` QUALITY) — `?q=` URL 재작성 + 리로드 (감사 결론 승계 — 무리로드 전환은 비경제) | 리로드 시 |
| FOV | 60~80, `camera.fov`+`updateProjectionMatrix()` | 즉시 |
| 마우스 감도 | `player.js` SENS 인스턴스 필드 | 즉시 |
| 자막 | `subtitles.js` 플래그 | 즉시 |
| 볼륨 | 기존 마스터 게인 노드 | 즉시 |
| 키바인드 | **범위 외** (키맵 테이블 부재 — 백로그 명시, P 계획 불포함) | — |

`settings:changed` 버스 발신 · localStorage 키 `virgil.settings`(자체 키, state와 분리).

### E6 §0 — 0. 소유권 분할 (ARCHITECTURE v2 §2에 반영)

<!-- 원문: docs/design/E6-spaces.md § 0. 소유권 분할 (ARCHITECTURE v2 §2에 반영) ⊂ E6 — 공간·레벨 -->
| 레벨 모듈 | 포함 공간 | 막 |
|---|---|---|
| `world/lobby.js` [LEVEL-LOBBY] | 로비 · 프런트데스크 · 엘리베이터 | 1 |
| `world/corridor.js` [LEVEL-CORRIDOR] | 9층 복도 · 린넨실 · 채광정 앞 | 2 |
| `world/room942.js` [LEVEL-ROOM] | 942호 · 욕실 · 944호 | 2 |
| `world/rooftop.js` [LEVEL-ROOFTOP] | 옥상 계단·계단참 · 옥상 · 탱크 캣워크 | 3 |

보일러실은 **공간이 아니라 소리 원점이다** — 진입 불가, 2막 페이즈에서 corridor.js가
`sfx`(배관 진동)만 발화한다. 문은 존재하고 잠겨 있다(상호작용 시 "잠김" — 정보 없음).

### E7 §1 — 1. 카메라 문법 (N5 — 심문·지목)

<!-- 원문: docs/design/E7-presentation.md § 1. 카메라 문법 (N5 — 심문·지목) ⊂ E7 — 연출·오디오·괴담 -->
기본 상태: 어깨 너머 40mm 상당, 손각도 미세 흔들림(진폭 0.15°, 주파수 0.4Hz — 삼각대가
아니라 사람이 서 있다).

| 트리거 | 카메라 | 의도 |
|---|---|---|
| TRUTH 선택 | 뒤로 물러나며 40→50mm — 화각이 넓어지고 상대가 공간 안에 놓인다 | 신뢰 = 거리의 회복 |
| DOUBT 선택 | 옆으로 미끄러진다(트래킹 0.4m, 등속) — 정면을 비껴 본다 | 압박의 유보 |
| LIE 선택(증거 선택 중) | 앞으로 밀고 들어가며 조리개 개방 — 배경 보케 붕괴, 상대 얼굴만 | 되돌릴 수 없는 순간의 좁아진 시야 |
| 정답 판정 | 푸시인 유지 + 상대의 텔 원샷이 프레임 중앙에 | 후퇴를 목격시킨다 |
| 오답 판정(소각) | 상대에게서 **반 발짝 물러나고** 룸톤이 조용해진다(§3) — 컷 없음 | 관계가 닫히는 물리감 |
| 붕괴(breaking) | 렌즈 유지, 카메라 높이가 8cm 내려간다 — 앉는 루이즈, 안경 벗는 다이치를 올려다보지 않고 같이 가라앉는다 | 연민의 각도 |
| 지목판 링크 성립 | 도일 미디엄 → 링크당 6mm씩 광각화(48→42→36) — 마지막 링크에서 옥상 전체와 비가 프레임에 들어온다 | 개인의 거짓에서 구조의 사건으로 |

컷 대신 모션(N5 원칙). 심문 중 컷은 0회 — 전부 이동·렌즈 변화로.

### E5 §4 — 4. 막 전환 (progression — case-graph `progression`과 1:1)

<!-- 원문: docs/design/E5-interrogation.md § 4. 막 전환 (progression — case-graph `progression`과 1:1) ⊂ E5 — 심문·판정 시스템 -->
| 전환 | 트리거 | 증거 요구 |
|---|---|---|
| 1막→2막 | 다이치 심문 종료 후 엘리베이터 상호작용 | **없음** (미획득 상태로도 전환 가능 — F3) |
| 2막→3막 | 루이즈·프라이스 심문 종료(소각 포함) 후 옥상 계단 문 상호작용. 문은 잠겨 있지 않다 — 도일이 옥상에 있다 | **없음** |

체크포인트는 회차 개시(`act:enter {act:1}` 직후)와 막 경계 2건에서 `checkpoint:saved`
(저장 트리거 총목록은 E8 §4 — 엔딩 종결 포함 4건). 전환은 되돌릴 수 없다 — 지난 막의 미수집 증거는
소각과 같은 지위가 된다(노트에 흔적 없음 — 몰랐던 것은 잃은 것이 아니다).

### E4 §1 — 1. 페르소나 카드

<!-- 원문: docs/design/E4-characters.md § 1. 페르소나 카드 ⊂ E4 — 인물 (페르소나 카드 4장) -->
### 다이치 (마를로 다이치, 51 — 야간 프런트 16년차)
- **목소리 지문**: 방어적 존대. 짧은 완결문. 확언을 "제 기억으론"으로 흐린다. 문장 끝 음량이 죽는다.
- **괴담 태도**: 안 믿는 척한다. 그러나 밤소리 목록을 꿰고 있다 — 라디오 괴담이 나오면 주파수를 돌린다.
- **공간 앵커**: 프런트데스크. 데스크를 떠난 모습은 게임 전체에 한 번도 나오지 않는다.
- **막별 프리젠스**: 1막 심문 · 2막 재심문(`roofkey` 조건부) · 3막 부재(엔딩 컷에서만).
- **심문 아크**: 직업적 방어 → 첫 후퇴(C1, 숙박부) → 부분 시인(열쇠 걸이) → **붕괴(C2,
  필적 — 안경을 벗는다)**. 그의 거짓은 살인 은폐가 아니라 생계 은폐다 — 붕괴가 자백이
  아니라 딸 학비 이야기로 끝나는 이유.

### 루이즈 (콘수엘라 루이즈, 44 — 하우스키퍼)
- **목소리 지문**: 짧게 끊는 어요체. 빨라지면 스페인어가 섞인다. 문장이 항상 일에 붙어 있다
  ("그게 제 일이니까").
- **괴담 태도**: 믿는다. 성호를 긋는다. 진상(lore.linen의 결로)을 알면서도 믿는다 — 전달자 1순위.
- **공간 앵커**: 9층 린넨실. 심문 내내 일하던 손을 멈추지 않는다 — 멈추면(앉으면) 그게 붕괴다.
- **막별 프리젠스**: 2막 심문 · 1막 원경(린넨 카트가 엘리베이터 앞을 지나간다).
- **심문 아크**: 회피(못 들었어요) → 서명 앞의 시인(두 사람 소리) → **자발적 증언(S3 —
  유일하게 압박 없이 진실을 보태는 인물)** → 패턴 증언(작년에도 그랬어요). 그녀의 거짓은
  공포(체류 신분)에서, 진실은 직업 윤리에서 나온다.

### 프라이스 (월터 프라이스, 58 — 944호 4년 거주, 전 하우스 디텍티브)
- **목소리 지문**: 과잉 정밀 — 시각·치수를 필요 이상으로 정확히. 전직 수사관 어휘. 냉소는
  한 문장에 하나만.
- **괴담 태도**: "괴담은 게으른 수사관의 결론" — 냉소. 단 한 번 흔들린다(S3에서 사진을
  뒤집을 때, 채광정 괴담을 스스로 인용한다 — 대사는 STORY §5.3).
- **공간 앵커**: 944호. 커튼 닫힌 방, 벽 전체가 14개월 전 스크랩. 방이 곧 그의 정지된 시간이다.
- **막별 프리젠스**: 2막 심문 · 1막 로비 원경(신문을 들고 소파 — 닳은 팔걸이 쪽).
- **심문 아크**: 부인(인사만 했습니다) → 이력 시인 → **죄책의 개방(C3, 사진 — "제출했더니
  이틀 뒤에 잘렸습니다")** → 고해(줬습니다. 그게 제가 한 겁니다) → 협력(해치 증언).
  4인 중 유일하게 아크가 상승한다 — 은폐에서 협력으로.

### 도일 (에멧 도일, 39 — 시설관리인, 소유주의 조카)
- **목소리 지문**: 웃으면서 말한다. 질문을 되묻는다. 기술어(밸브·압력)로 도피한다.
- **괴담 태도**: **이용한다.** "9층 물소리요? 옛날부터 그랬습니다" — 괴담이 그의 알리바이
  제조기다(lore.pipes가 두 밤의 소리를 무해화해 온 구조, E3 §2).
- **공간 앵커**: 보일러실·옥상. 지상층에서는 통과만 한다.
- **막별 프리젠스(신설 — 서사적 갑툭튀 방지)**: 1막 로비 통과(렌치, 무언, `npc:sighted`) ·
  2막 보일러실 소리 + 복도 끝 실루엣(×2) · 3막 대면. **원칙: 프리젠스는 정보를 주지 않고
  존재감만 준다** — 대사 0, 상호작용 불가, 다이치·루이즈의 반응(문장이 멎는다)만 남는다.
- **심문 아크**: 심문이 아니라 지목(E5 §2). 여유(사다리가 미끄럽죠) → 링크마다 웃음의 질이
  변한다 → L3에서 웃음을 멈추지 않는 채로 끝난다 — 붕괴 없는 범인. 그의 대사는 전부
  받아치기이고, 무너지는 것은 표정이 아니라 전화선 너머의 뒷배다.

### E5 §5 — 5. 지목 (3막 증거판)

<!-- 원문: docs/design/E5-interrogation.md § 5. 지목 (3막 증거판) ⊂ E5 — 심문·판정 시스템 -->
- 3링크 L1~L3 ([case-graph.json](case-graph.json) `links`): 링크당 증거 2개를 판에 놓아
  성립시킨다. **실획득 증거만** 판에 올라온다(N4 결박).
- 링크 성립마다 도일의 반응 대사(STORY §5.4) + 카메라 반응(E7). 성립 순서는 자유.
- **지목 종결 규칙**: 판을 닫는 것은 플레이어의 명시적 **서명 상호작용**(조서에 서명 —
  `deduction:sign`, UI 물성은 E8 §1)이다. 자동 판정 금지 — "성립 가능한 링크가 남아
  있는지"의 감지·경고·표시는 전부 무힌트 불변(§1) 위반이다. 예외 하나: L1~L3 셋째 링크가
  성립하는 순간은 서명 없이 자동 종결(완전 엔딩 즉시 개시 — E2 44:00 정합). 서명 시점의
  성립 링크 수가 엔딩을 정한다.
- 엔딩: 3링크=완전 · 2링크=부분 · ≤1링크=미제(정식 엔딩 — 괴담 흡수 자막, STORY §5.4).
- **미제의 괴담 흡수 규칙**: 미제 에필로그는 괴담 유닛 스키마(소문·매체·물질 진상 —
  STORY §7)를 따른다. 이번 회차의 실패가 라디오 소문 형식으로 세계에 기록된다 —
  플레이의 결과가 lore 층으로 내려앉는 것이 U2의 규칙 본체다.
- 오답 조합 페널티 없음 — 지목판은 심문이 아니다. 긴장은 "무엇이 없는가"에서 나온다.

### E8 §3 — 3. 로딩 화면 (P1 필수 — 베이크·컴파일 수 초의 블랙스크린 제거)

<!-- 원문: docs/design/E8-ui.md § 3. 로딩 화면 (P1 필수 — 베이크·컴파일 수 초의 블랙스크린 제거) ⊂ E8 — UI·부수 기능 -->
- 검은 바탕에 타자기 타건으로 찍히는 **허구 고지문**(로딩 시간의 서사화):
  "이 이야기의 인물·사건·호텔은 전부 허구다. 실존하는 어떤 인물·사건·업체와도 무관하다."
  — 이 고지는 재허구화 계약(MASTER-PLAN §1)의 화면 측 이행이다.
- 진행률: 하단에 객실 열쇠 고리가 하나씩 걸리는 카운터(텍스트 % 병기 없음 — 물성 유지).
  결박 신호: `boot:progress {done, total}`(main.js 발신, ARCH §5) — 열쇠 고리 수 = total.
- **부트 순서**: 로딩(boot:progress) → 타이틀 → cin-intro 또는 체크포인트 복원.
  타이틀 소유: `ui/title.js` 신설(T-P1-05 범위) — 물성은 호텔 정문 유리에 금박 각인
  스타일, 선택지는 놋쇠 명패 2개.
- **제스처 게이트(정본 — 브라우저 자동재생·포인터록 요건)**: 무저장 회차의 타이틀은
  "자동 통과"가 아니라 **첫 입력 시 통과**다 — 로딩 완료 후 정지 화면에 타자기 한 줄
  "프런트 벨을 누르십시오"(놋쇠 벨 도상). 첫 클릭/키 = 사용자 제스처로 AudioContext
  활성화 + 포인터록 요청 → **그 직후가 E2 첫 30초 표의 0:00 기점**(물소리는 제스처
  후에 시작한다 — "로딩 중 선재생"은 폐기). 저장 보유 회차의 "이어서/처음부터" 선택
  자체가 제스처를 겸한다.
- "처음부터"(또는 무저장 첫 입력) → E2 첫 30초 시퀀스로 컷 없이 연결. **개시 신호(정본)**:
  `title:proceed {mode:'new'}` 발화(ARCH §5) → cinematics가 cin-intro를 개시한다.
  "이어서"는 `title:proceed {mode:'resume'}` 발화 직후 title.js가 리로드(§4 프로토콜).
  cinematics 메서드 직접 호출 금지 — 발신(T-P1-05 외부)과 수신(T-P1-07 단일 최강)이
  다른 발주라 접면은 이벤트만.

### E7 §3 — 3. 오디오 — 공간 음향·침묵의 사용

<!-- 원문: docs/design/E7-presentation.md § 3. 오디오 — 공간 음향·침묵의 사용 ⊂ E7 — 연출·오디오·괴담 -->
- **공간별 리버브** (`audio/engine.js` 컨볼루션 프리셋):

| 공간 | RT60 | 특성 |
|---|---|---|
| 로비 | 1.6s | 대리석 반사, 라디오가 젖어 들림 |
| 엘리베이터 | 0.3s | 철제 박스 — 자기 숨소리가 들리는 좁음 |
| 9층 복도 | 0.9s | 카펫 흡음 + 긴 꼬리(복도 길이) |
| 942호 | 0.5s | 가구 있는 방 |
| 944호 | 0.35s | 신문지 벽의 데드룸 — 4인 중 가장 마른 소리 |
| 옥상 | 아웃도어 + 비 레이어 | 리버브 대신 거리 감쇠, 탱크 아래만 금속 반사 |

- **재질별 발소리**: marble / carpet / tile / concrete / steel-catwalk 5종 —
  `player:footstep {material, speed}` 소비(기존 이벤트).
- **침묵의 사용(N7)**: 오답 소각 직후 룸톤 -6dB·3초, 라디오/환경음 일시 정지 — 소리가
  물러나는 것이 페널티 연출의 절반이다(카메라 반 발짝과 동기). 붕괴(breaking) 중 BGM 0 —
  이 게임에 비디제틱 BGM은 엔딩 크레딧뿐이다.
- **물의 리트모티프**: 수압 파열음(첫 30초) → 보일러실 진동(2막 페이즈) → 탱크 해치의
  둔탁한 공명(3막) — 같은 저주파 모티프의 세 변주. 괴담(lore.pipes)이 말하는 "그 소리"를
  플레이어가 세 번 직접 듣는다.

### ARCH §6 — 6. 재질 계약 (MATERIALS 소유, 전원 소비)

<!-- 원문: docs/ARCHITECTURE.md § 6. 재질 계약 (MATERIALS 소유, 전원 소비) ⊂ VIRGIL — 아키텍처 계약 v2 (모든 에이전트 필독) -->
world/chars는 **직접 `new THREE.MeshStandardMaterial`을 만들지 않는다.** 반드시:

```js
import { mat } from '../materials/library.js'
const m = mat('marble.lobby.floor')   // 캐시된 THREE.MeshPhysicalMaterial 반환
```

`library.js`가 제공해야 하는 최소 이름 목록 (MATERIALS 에이전트 책임):

```
marble.lobby.floor      brass.polished        brass.tarnished
wood.varnished.dark     wood.painted.white    wallpaper.damask.green
plaster.cracked         tile.hex.bathroom     tile.subway.white
concrete.rooftop        steel.rusted          steel.galvanized
glass.clear             glass.frosted         mirror.aged
fabric.velvet.red       fabric.wool.suit      leather.worn.brown
paper.aged              water.dark            grime.overlay
carpet.corridor.red     ceramic.sink          bakelite.black
```

이름이 없으면 `library.js`가 **눈에 띄는 마젠타 재질**을 반환하고 콘솔에 경고한다 (실수 은닉 금지).

### RESUME §3 — 3. 기각된 가설 — 다시 파지 마라

<!-- 원문: docs/RESUME.md § 3. 기각된 가설 — 다시 파지 마라 ⊂ CECIL — 새 세션 인수인계 -->
| # | 가설 | 검증 | 결과 |
|---|---|---|---|
| 1 | 오토노출 `max(e0,e1)` 폭주가 워시아웃의 원인 | 바닥값 1스톱 제한 후 재촬영 | 출력이 **바이트 단위로 동일**. 무관 |
| 2 | TAA 리프로젝션 고스트가 램프 막대의 원인 | 카메라 순간이동 후 히스토리 강제 클리어 | 막대 잔존. 무관 |
| 3 | 블룸 mip 체인이 램프 막대의 원인 | 패스 제거 후 픽셀차 측정 | **0.35%**만 변함. 무관 |
| 4 | DOF 타일맥스 격자가 램프 막대의 원인 | 패스 제거 | 막대 잔존 |
| 5 | 광축 셰이더의 슬랫 변조(`uSlatDepth`) | 코드 확인 | 기본값 0, 다른 할당 없음. 비활성 코드 |
| 6 | 조명기구 지오메트리가 램프 막대의 원인 | 포스트 6개 전량 제거 | **틀렸다** — 아래 참조 |
| 7 | 천장 보에 `castShadow`가 안 걸려 그림자가 없다 | 런타임 씬 계측 | **틀렸다** — 캐스터 337개, 그림자 스포트 12개(far 26·11·9·4.6·3.6m) |
| 8 | 카펫이 단색인 건 UV 종횡비 때문 | 코드 확인 | **이미 수정됨** — `PC.floorUv(run.geometry, 2.7)`로 등방 재전개 완료 |
| 9 | 라운드4 수직 스미어가 TAA/모션블러 때문 | `motionblur`·`dof` 제거 | 픽셀차 **0.0%**. 포스트 전량 제거해도 잔존 |
| 10 | 스미어가 물얼룩·그을음 밴드(uCD) 오버레이 | 밴드 off A/B | **틀렸다** — 무변화 |
| 11 | 스미어가 월드 그런지(uCA.z) / 매크로 damp(uCC.y) / 디테일 노멀(uCB.y) | 각각 off A/B | 전부 무변화 |
| 12 | 스미어가 이방성 필터링 부재 | 런타임 텍스처 계측 | aniso 16 · minFilter LINEAR_MIPMAP_LINEAR 정상 |
| 13 | 스미어가 스토캐스틱 타일링 | define 제거 후 재컴파일 | 무변화 |
| 14 | 원거리 벽 직사각 이음선이 volumetric 패스 | 패스 제거 A/B | **틀렸다** — 계단 유지 |
| 15 | 같은 이음선이 그림자(pcss/VSM) | 전 광원 castShadow=false | **틀렸다** — 계단 유지 |
| 16 | 같은 이음선을 `uSoftFade` 확대로 완화 | 0.26 → 1.2 / 2.5 / 3.0 | **역효과** — 계단비 2.32 → 2.81 |
| 17 | 같은 이음선을 깊이 2차차분 기반 페이드 국소확장으로 완화 | `uEdgeSpread` 신설 후 촬영 | 해당 픽셀 **바이트 동일**. 셸 `uLen` 1.5m 라 15m 지점에 안 닿는다 |

**14~17 의 진짜 원인은 기구 광축 셸(`SHAFT_STEPS`)이다** — 셸 메시를 숨기면 그 자리가
8.1 → 9.5 로 평평해지고 계단이 통째로 사라진다. 상세는 `docs/ROUNDS.md` R6-1.

### 3.0 재질 오버레이 스미어의 진짜 원인 (해결됨 · 라운드5)

`THREE.Material.copy()` 는 `defines` / `onBeforeCompile` / `customProgramCacheKey` /
`onBeforeRender` 를 **복사하지 않는다**. `kit-mat.js` 의 `wearMat()`(그리고 `rain.js` 의
`wetify()`)이 라이브러리 재질을 클론하는데, 그 클론이 `applyCecil` 이 심은
**CECIL_TRIPLANAR·CECIL_STOCH·CECIL_POM·CECIL_FLOW 와 주입 청크를 통째로 잃고** 기본 PBR +
메시 UV 로 되돌아갔다. 복도 벽 베니어는 `uv 0..1 이 17.3m × 1.79m` 인 판이라, 트리플래너를
잃는 순간 벽지 한 장이 복도 전체에 늘어나 화면을 가로지르는 가닥이 된다.

결정적 증거(런타임 계측): 같은 `wallpaper.damask.green` 인데 원본 재질은
`defines: [STANDARD, PHYSICAL, CECIL_TRIPLANAR]`, wear 클론은 `defines: [STANDARD, PHYSICAL]`.

`wear`/`vcol`/젖은 표면 메시가 전부 이 경로를 타므로 **프로젝트 전역**에 걸려 있던 결함이었다.
재질 복제는 이제 전부 `kit-mat.cloneMat()` 을 거친다.

### 3.1 램프 "가로 막대"의 진짜 원인 (해결됨)

`composite.js`의 헐레이션 커널이 **고정 반경 원 위에 8탭**을 찍었다. 원판이 아니라 원주에만 놓인
탭은 블러가 아니라 **평행이동 복제 연산자**다 — 밝은 소스 하나가 반경만큼 떨어진 8개 사본으로 찍힌다.
반경 두 개를 합쳐 최대 16개 사본. 틴트 `vec3(1.0, 0.30, 0.13)`이 화면의 살구색이었다.
결정적 증거: 불투명 캡슐 메시 **하나만** 남기고 찍었더니 반투명 살구색 막대 5개가 나왔다.
→ 원판 확산 커널로 교체해 **해결됨**.

### 3.2 A/B가 오염되는 두 가지 이유 (반드시 숙지)

**(가) QA 모드 엔진은 RAF 를 돌리지 않는다.** `goto()` 가 settle 까지 끝낸 뒤 상태를 바꾸면
그 변경은 **그려지지 않는다** — 스크린샷은 goto 시점의 프레임이다. 이전 세션과 이번 세션
초반의 A/B 가 전부 "무변화"로 나온 진짜 이유가 이것이다. 변종 적용 후 반드시 다시 settle 해야
한다(`tools/shoot.mjs --ab` 가 자동으로 한다). 오토노출은 settle 횟수에 따라 계속 흐르므로
변종 간 노출이 다르면 그 비교는 이미 오염된 것이다.

**(나) composite 은 `--off` 가 닿지 않는다.**

`composite`은 `pipeline.effects`가 아니라 **PIPELINE-CORE 직속**이다.
광원 주변 아티팩트를 A/B 하기 전에 반드시:

```js
pipeline.composite.mat.uniforms.uHalation.value = 0
```

또 하나: 파이프라인이 `fx.bloom ? targets.bloom.texture : null`처럼 **존재 여부**로 합성을 결정하므로
`enabled=false`로 끄기만 하면 직전 프레임 타깃이 계속 합성된다. `tools/shoot.mjs`의 `--off`는
엔트리를 **삭제**하도록 이미 고쳐져 있다.

### E4 §3 — 3. 리그·연기 구현 계약

<!-- 원문: docs/design/E4-characters.md § 3. 리그·연기 구현 계약 ⊂ E4 — 인물 (페르소나 카드 4장) -->
- `chars/rig.js` [CHARACTERS]: 절차 휴머노이드 4종 — 실루엣 우선(G10). 식별 소품:
  다이치 안경+조끼 · 루이즈 앞치마+천 · 프라이스 셔츠+서스펜더 · 도일 작업복+렌치.
  페이셜 없음 — 머리는 자세·시선 방향만.
- `chars/perf.js` [CHARACTERS]: 상태 4종별 루프 애니메이션 + 텔 원샷(STORY §2 신호를
  1신호=1클립으로). 클립 재생은 `perf:state` 구독으로만 트리거 — perf.js는 진위를 모른다
  (상태만 받는다). 도일 3막 반응은 `deduction:link {id, ok}` 구독(링크별 웃음의 질 변화).
  결정론: `rng(seed)`.
- 프리젠스 이벤트: `npc:sighted {npc, kind}` (ARCHITECTURE v2 §5 추가분).

---

### MASTER-PLAN §7 — 7. 제작 공정 — 진단의 이행

<!-- 원문: docs/MASTER-PLAN.md § 7. 제작 공정 — 진단의 이행 ⊂ VIRGIL(가제) — 종합 기획 v1 (구 CECIL 확장) -->
### 7.1 그래픽 동결 선언

복도 기준선(`shots/_baseline/corridor.png`, R6-4)에서 **동결**. 시각 회귀 게이트만 상시 유지.
재개 조건: 게이트 4·2 통과 후 Phase 5. 동결 중 그래픽 라운드 투입은 공정 위반이다.

### 7.2 Phase 계획 (날짜가 아니라 게이트 순서로 관리)

| Phase | 내용 | 통과 게이트 |
|---|---|---|
| **P0 정지작업** | 계약 재동기화(§7.4) · 재허구화 개정(STORY v2 — §1·§2·§3 매트릭스·3.3 수정 반영, ARCH v2, RUBRIC v2) · 명칭 검증 · `factcheck.mjs` 구축 | 계약 린트 통과 · F1~F4 통과 · grep "세실" 0 |
| **P1 수직 슬라이스** | 1막 완주: 로비 정식 레벨 1개 + 다이치(리그+텔) + 심문 1건 + 증거 4종 + 로딩 화면 + 프레임 계측 | 완주 봇(1막) · 콘솔 0 · 프레임 예산 · P2·P4 |
| **P2 전 막** | 2·3막 레벨 + 루이즈·프라이스·도일 + 시네마틱 + 체크포인트 저장 | 완주 봇 3경로 · F3 |
| **P3 플레이·내러티브 채점** | 게이트 4(P1~P6) → 게이트 2(N1~N8) 라운드 루프 | 게이트 4 · 게이트 2 |
| **P4 커널 스왑** | 자유 서술 판정(§5.4 2단) + 판정 배터리 QA | 배터리 PASS · 게이트 4 재확인 |
| **P5 그래픽 재개** | 정식 레벨 위에서 G축 8+ 라운드(단일 담당·회귀 게이트) | 게이트 1 |
| **최종** | 블라인드 비교 | 게이트 3 |

**라운드 규율(전 Phase 공통)**: 라운드 = 단일 담당 · 단일 목표 · 사전 기준선 → 사후 기계 게이트.
게임 축도 잘게 쪼갠다(공간 1개 → 인물 1명 → 심문 1건) — 8/4 롤백의 교훈: 범위를 넓게 잡으면
얇게 나온다(4레벨+인물+시네마틱=505줄). **커밋은 라운드 단위로 세분**(과정 증빙은 소급 불가 —
NAN 요건 교훈의 습관화).

### 7.3 외부 모델 병렬화 (GPT sol · Grok build)

**투입 시점: P0 완료 + P1 1회전 이후.** 계약 문서가 실코드와 어긋난 상태의 외부 투입은 금지
(감사 판정). 배정 원칙:

- **단일 최강 모델 유지**: 그래픽 픽셀 축(pipeline·materials 튜닝 — 기각 가설 이력 의존),
  공정 오케스트레이션, 채점.
- **외부 발주 가능**: 계약이 두껍고 수용 기준이 기계적인 모듈 — 레벨 지오메트리 조립
  (`kit`/`mat()`/`practical()`만 사용), narrative 데이터 이행(script v2), audio, UI(설정·로딩),
  tools(factcheck·playthrough).
- **티켓 양식**: `{소유 파일(배타), 소비 계약(§ 인용), 수용 기준(기계 게이트 + 샷/로그), 금지 사항,
  반환 형식(CONTRACT_CHANGE_REQUEST 경로 포함)}`. 검수는 소유자와 분리된 판정자가 샷 하네스·기계
  게이트로 — 구현 모델이 무엇이든 같은 관문.

### 7.4 계약 재동기화 (P0 상세 — 2026-08-05 감사 결박)

1. `ARCHITECTURE.md` §2 소유권 표를 실파일로 갱신: `world/atmo/*`·`kit-mat.js`·`props-*.js`·
   `materials/recipes.a.js` 등재, 실재하지 않는 `world/lobby.js` 등은 "P1~P2에서 신설" 표기.
2. 재질·조명 예외 정리: `kit-mat.js` 폴백·`glow()`, `props.js` 광원 3건·`testbed.js` 1건 —
   **팩토리 경유로 청소를 기본**으로 하되, 성능·구조상 정당한 것만 §6/§6.5에 예외로 명문화.
3. 500줄 초과 4파일(`atmosphere.js` 574 · `recipes.a.js` 528 · `atmo/fixtures.js` 506 ·
   `props.js` 504)은 소유자 라운드에 분할 편입.
4. **계약 린트 신설**(커밋 훅): materials/ 밖 `new THREE.Mesh*Material`, atmosphere 밖
   `new THREE.*Light`, `Math.random(`/`Date.now(`/`performance.now(`, 500줄 초과, 화면 표출
   텍스트의 "세실" — 각 grep 규칙, 위반 시 커밋 차단.

---

### MASTER-PLAN §1 — 1. 재허구화 — 배포 리스크 결박

<!-- 원문: docs/MASTER-PLAN.md § 1. 재허구화 — 배포 리스크 결박 ⊂ VIRGIL(가제) — 종합 기획 v1 (구 CECIL 확장) -->
**원칙: "언젠가 공개 배포한다"를 전제로, 실제 사건·실존 업체를 지목하는 요소를 조합 단위로 해체한다.**
개별 모티프(물탱크·수압)는 장르 공유 자산이지만, 조합(세실이라는 이름 + 옥상 물탱크 + 투숙객 수도의
검은 물 + 엘리베이터 영상 등가물)은 특정 실제 사건을 지목한다. 조합을 끊으면 개별 요소는 안전하다.

| 요소 | 처리 | 근거 |
|---|---|---|
| 호텔명 "세실" | **치환** → 호텔 버질(Hotel Virgil, 가제) | 실존 업체·실제 사건의 제1 식별자. 가제 확정 전 실존 호텔·상표 검색 검증 필수(§10) |
| 무대 "메인 스트리트" | **치환** → 버질 애비뉴(LA 실존 도로명, 호텔은 가공) | 실제 호텔 소재지 지목 차단 |
| 엘리베이터 사진 4장 | **치환** → 옥상 계단참 사진 4장(스피드그래픽·스크럽 메커닉·4번째 장 유리 반사의 두 번째 형체 전부 유지) | 실제 사건의 바이럴 영상 등가물이 가장 강한 잔존 연상. 메커닉은 피사체와 무관 |
| 옥상 물탱크·수압 하락·검은 물 | **유지** | 사건 로직(수압→시점 특정→오염 입증)과 공포 문법(물·압력·냄새·소리)의 하중 벽. 시대 66년 전치 + 완전 허구 인물 + 살인 서사(실사건은 사인 미상)로 연상 절단 |
| 1947 LA·느와르 톤 | **유지** | 기존 결정(planning.md) 그대로 — 시대 전치 자체가 안전장치 |
| 엔딩 자막 "세실은 계속 영업했다" | **치환** → "버질은 계속 영업했다. 9층 이야기가 하나 늘었다." (§2 괴담 연결) | 명칭 잔존 제거 + 괴담 레이어 회수 |
| 실존 피해자 재현 금지 | **유지·강화** — 시작 화면에 허구 고지문 추가 | 기존 안전 규칙 승계 |

**검증(기계+절차)**: ① 가제 확정 전 실존 호텔·상표 웹 검색 ② 전 저장소 `grep -ri "cecil\|세실"` 0건
(코드 식별자·저장소 폴더명은 코드네임으로 잔존 허용, 화면·문서 표출 텍스트만 0) ③ 위 표를
체크리스트로 조합 재감사. 상업 선례(세실 모티프의 허구화 앤솔로지 호러물 등)는 명칭 확정 시 재확인.

---

## 13. 부록 B — 부록 A 가 다시 가리키는 절 (참고)

자기완결을 닫기 위한 2차 인라인이다. 대부분 이 티켓과 직접 관계가 없다 —
**읽을 필요는 없고, 본문에서 좌표를 만났을 때 여기서 찾으면 된다.**

### E3 §3 — 3. 소각 경제의 데이터 기반 — 단일/이중 경로 배분 (E5가 소비)

<!-- 원문: docs/design/E3-case-graph.md § 3. 소각 경제의 데이터 기반 — 단일/이중 경로 배분 (E5가 소비) ⊂ E3 — 사건·사실 그래프 (지휘 문서) -->
| 증거 | 획득 경로 | 소각 시 연쇄 |
|---|---|---|
| `pressure-log` | **단일** — 다이치 S3 (TRUTH/DOUBT) | 잃으면 루이즈 S2 반박 불가 → `two-voices` 소실 → `footprints` 소실 → 루이즈 S4 반박 불가. **최대 연쇄** |
| `photos` | **단일** — 프라이스 S1 정답 | 잃으면 S3 자백 불가 → L3 불성립. "게임 최대의 손실" |
| `footprints` | **단일** — `two-voices` 플래그 출현 | 상류(pressure-log) 의존 |
| `water-log` | **이중** — 944호 수색 또는 S4 정답 | 심문을 망쳐도 수색으로 회수 가능 |
| 나머지 10종 | 수색/관찰 — 소각 무관 | 없음 |

설계 의도: 단일 경로 3종이 전부 **심문 성과**에 걸려 있어 "심문이 수사의 무게중심"이라는
코어(E1 U1)를 데이터가 강제한다. 최악 소각 시에도 L1은 성립(수색·관찰만으로) → 미제 엔딩
도달(F3 PASS). 배분 변경은 이 표가 아니라 case-graph.json을 고치고 factcheck로 재검증한다.

### ARCH §8 — 8. 지오메트리 규약

<!-- 원문: docs/ARCHITECTURE.md § 8. 지오메트리 규약 ⊂ VIRGIL — 아키텍처 계약 v2 (모든 에이전트 필독) -->
- **모든 모서리에 베벨** — 순수 `BoxGeometry` 노출 금지 (루브릭 D4). `world/kit.js`의 `bevelBox()`를 사용한다.
- 반복 배치되는 요소(문, 조명, 액자)는 반드시 회전·위치·마모도에 시드 기반 변주를 준다.
- 모든 오브젝트는 `castShadow`/`receiveShadow` 명시.
- 그라운딩: 바닥에 놓이는 오브젝트는 `kit.groundContact(obj)` 호출로 컨택트 섀도 데칼을 받는다 (루브릭 D5).
- **정식 레벨 충돌 규약 *(v2)***: 레벨 모듈은 걷기 가능 바닥·벽을 physics 모듈의 정적 등록
  API 경유로 등록한다(시그니처는 [PHYSICS]가 P1 착수 시 이 절에 공표 — 그 전까지 레벨
  발주는 "physics 정적 등록 의무"만 전제). QA 프로브의 레이캐스트 폴백(`player.body=null`)은
  씬 모드 전용 경로다 — 정식 레벨이 이 폴백에 의존하는 것을 금지한다(AGENTS.md 보존 규칙).
- **앵커 규약 *(v2)***: NPC·시네마틱의 시각 실체는 레벨이 만들지 않는다. 레벨은 빈
  Object3D 앵커만 배치한다 — `userData.anchor` 정본 값: `npc/deitch`·`npc/ruiz`·
  `npc/pryce`·`npc/doyle`(심문 위치, 동일 문자열이 qaId 겸용) · `presence/doyle-lobby`·
  `presence/doyle-corridor-1`·`presence/doyle-corridor-2`(프리젠스 실루엣 위치) ·
  `presence/ruiz-lobby`(1막 원경 — 린넨 카트 통과 경로 기점)·`presence/pryce-lobby`
  (1막 원경 — 소파, 닳은 팔걸이 쪽) · `cin/act2-elevator`·`cin/act3-window`(시네마틱 기준점) ·
  `spawn/act1`·`spawn/act2`·`spawn/act3`(막 문턱 시작 위치 — 각 막의 첫 레벨이 배치:
  lobby/corridor/rooftop. 부트 초기 배치와 save.js "이어서" 복원이 소비).
  원경 2종(ruiz·pryce)은 배치만 하고 `npc:sighted`를 발화하지 않는다 — sighted는 목격
  연출이 있는 도일 프리젠스 전용이다(E4 §1). chars 모듈이 `room:changed`
  구독 후 현재 공간의 앵커를 검색해 리그·실루엣을 자기 배치하고, `npc:sighted` 발화는
  프리젠스 앵커 활성 시 chars가 아니라 **레벨이** 한다(§5 발신자 유지).

### E8 §5 — 5. (이관) 프레임타임 계측

<!-- 원문: docs/design/E8-ui.md § 5. (이관) 프레임타임 계측 ⊂ E8 — UI·부수 기능 -->
계측 오버레이(`?stats=1`)의 사양은 게이트 층 소유로 **E9 §2 프레임 예산 행**에 이관했다 —
플레이어 비노출 QA 도구는 체험 요소가 아니라 게이트 도구다. 구현 티켓은 T-P1-05 그대로.

---

### E3 §2 — 2. 설계 원칙 — 이 사건이 아귀가 맞는 이유

<!-- 원문: docs/design/E3-case-graph.md § 2. 설계 원칙 — 이 사건이 아귀가 맞는 이유 ⊂ E3 — 사건·사실 그래프 (지휘 문서) -->
- **범행의 반복 구조** — 14개월 전(넬)과 10월 9일(아이리스)은 같은 수법의 두 실행이다:
  유인/추적 → 탱크 → 연출. 반복이 루이즈의 패턴 증언("작년에도 그랬어요")과 L3(같은 사람,
  같은 자리)를 성립시킨다. 동기는 셀 FA1(접근 거부·민원 예고 — `motive` 태그, R2 결박).
- **조잡한 연출자** — 도일의 은폐는 매번 한 곳씩 어긋난다: 구두는 가지런한데 해치는 밖에서
  잠겼고(L1 자기모순), 심어 둔 열쇠엔 다이치의 필적 태그가 남았고(FB10, R3 결박), 일지는
  지우는 대신 써 넣어서 위조 자체가 서명이 됐다(FB11 → L2). **모든 지목 링크는 도일의 실수가
  아니라 도일의 "연출 습관"에서 나온다** — 증거가 우연히 남은 게 아니라 성격이 남긴 것.
- **물의 경로 = 사건의 경로** — 수압 하락(시점 특정) → 검은 물(발견) → 젖은 발자국(동선) →
  트랩 침전(오염 입증). 감각 레이어(E7)가 아니라 그래프의 골격이다.
- **결함 3건 수정 (MASTER-PLAN §3.3)** — ①프라이스 해고=14개월 전, 거주 4년 공존(FA9) ②도일
  동기=상습 접근·거부·민원 위협(FA1) ③roofkey=도일이 사후 침입 때 심음(FB10). 각각 factcheck
  R1·R2·R3가 회귀 감시한다.

### E8 §1 — 1. 수사노트 (`ui/notebook.js` — 기존 목표 달성분 승계 + v2 확장)

<!-- 원문: docs/design/E8-ui.md § 1. 수사노트 (`ui/notebook.js` — 기존 목표 달성분 승계 + v2 확장) ⊂ E8 — UI·부수 기능 -->
기존: 1947 종이 소품으로 읽힘(D7 무발생) — 이 물성 기준선을 유지한 채 3확장.

- **증거 면**: 수집 증거 목록 + 검사 뷰어. **사진 스크럽(C3)**: `photos` 검사 시 4장을
  드래그/방향키로 넘긴다(인화지 넘기는 모션). `photos-4` 플래그 후 4번째 장에서 유리 반사
  영역 상호작용 활성 → 2단 줌(전체→반사 크롭). 줌 배율 2단 고정, 자유 줌 없음.
- **인물 면**: 인물별 진술 기록 + 심문 종료 시 노트 요약 문구(3단 — 원문 STORY §5,
  규칙 E5 §2.4). **소각된 진술은 줄이 그어진 채 잔존**(E5 §2.3 — 잉크로 그은 취소선,
  지워지지 않는다). 소각으로 닫힌 재심문은 "더 묻지 않는다" 표기.
- **증거 지목 모드 (T-P1-09)**: 심문 중 LIE 선택 시 노트가 지목 모드로 열린다 —
  `interrogation:prompt` 구독, 선택 결과를 `interrogation:choose`로 반환(ARCH v2 §5).
  3선택 프롬프트 자체는 `ui/hud.js` 소유. 힌트 표시 0(E5 §1 불변).
- **괴담 면**: `lore:heard` 축적. 증거 면과 **다른 지질**(신문 스크랩·메모 쪼가리 콜라주 —
  타자 정서가 아니라 풀로 붙인 잡동사니)로 물리적 구분 — 괴담은 증거가 아니라는 시스템
  발화(E7 §4). 지목판에 나타나지 않는다.

### STORY §7 — 7. 괴담 유닛 (LORE — 사건 인과 참여 금지, case-graph `lore`와 1:1)

<!-- 원문: docs/STORY.md § 7. 괴담 유닛 (LORE — 사건 인과 참여 금지, case-graph `lore`와 1:1) ⊂ VIRGIL — 사건 성서 v2 (NARRATIVE / INTERROGATION 구현 명세) -->
> 스키마: 소문 원문 · 전달 매체 · 물질적 진상(사건 접점 유무). 괴담은 대기·환경서사·발화로만
> 존재한다. 증거 그래프에 들어가는 순간 factcheck F4가 실격 처리한다. 인물별 괴담 태도는
> §2 인물 표와 E4 페르소나 카드가 소유한다.

### lore.pipes — "9층에서 물소리가 나면 비가 온다"
- **소문 원문(라디오 심야 방송 톤)**: "버질 애비뉴의 그 호텔 말입니다. 9층에서 물소리가
  나면 이튿날 비가 온다죠. 배관공을 세 번 불렀는데 세 번 다 멀쩡했답니다."
- **전달 매체**: 로비 라디오(1막, 첫 30초에 반 문장 선노출 → 상호작용 시 전문).
- **물질적 진상**: 노후 배관의 공명. 넬의 밤에도, 아이리스의 밤에도 9층 사람들은 물소리를
  들었고 — 이 소문 때문에 아무도 이상하게 여기지 않았다. **괴담이 은폐막으로 작동한 실례.
  사건 접점: 있음(소리의 무해화). 인과 참여: 없음.**

### lore.lightwell — "아직 내려가는 중인 여자"
- **소문 원문(숙박부 여백, 연필 낙서)**: "9층에서 떨어진 여자는 아직 내려가는 중이래.
  채광정 앞을 지날 때 위를 보지 마."
- **전달 매체**: 숙박부 여백 낙서(1막 register 관찰 시) · 린넨실 벽(2막).
- **물질적 진상**: 넬 사건의 왜곡 전승. 14개월밖에 안 된 죽음이 이미 연대 미상의 괴담이
  됐다 — 이 호텔이 죽음을 소화하는 속도. **사건 접점: 있음(넬 사건의 그림자). 인과 참여: 없음.**

### lore.1912 — "강에 버린 열쇠"
- **소문 원문(로비 액자 옆 개업 연혁 판, 마지막 줄만 다른 손글씨)**: "1912년 개업.
  지진 해에 지하 저장고를 잠갔다. 열쇠는 강에 버렸다."
- **전달 매체**: 로비 액자(관찰) · 라디오(2막 페이즈에서 다른 괴담 소개 중 스치듯).
- **물질적 진상**: 금주법 시대 밀주 저장고 폐쇄. 시대 질감용. **사건 접점: 없음.**

### lore.linen — "밤마다 다시 젖는 세탁물"
- **소문 원문(린넨실 벽, 세로로 긁어 쓴 글씨)**: "말려도 소용없다."
- **전달 매체**: 린넨실 벽 낙서(2막, 루이즈 심문 공간의 배경).
- **물질적 진상**: 옥상 배관의 결로가 린넨실 천장으로 스민다. 루이즈는 진상을 알면서도
  성호를 긋는다 — 아는 것과 믿는 것은 다른 문제다. **사건 접점: 없음.**

### STORY §2 — 2. 인물

<!-- 원문: docs/STORY.md § 2. 인물 ⊂ VIRGIL — 사건 성서 v2 (NARRATIVE / INTERROGATION 구현 명세) -->
| ID | 이름 | 나이 | 역할 | 숨기는 것 | 거짓말 동기 |
|---|---|---|---|---|---|
| `deitch` | 마를로 다이치 | 51 | 야간 프런트, 16년차 | 옥상 열쇠를 20달러에 팔았다 | 해고 공포. 살인과 무관 |
| `ruiz` | 콘수엘라 루이즈 | 44 | 하우스키퍼 | 942호에서 두 사람 목소리를 들었다 | 체류 신분. 경찰이 무섭다 |
| `pryce` | 월터 프라이스 | 58 | 944호 장기투숙, 전 하우스 디텍티브 | 아이리스를 옥상으로 보낸 게 자신이다 | 죄책감. 그리고 도일이 무섭다 |
| `doyle` | 에멧 도일 | 39 | 시설관리인, 소유주의 조카 | 전부 | 범인 |

### 인물별 텔(tell) — CHARACTERS의 perf.js가 구현할 미세신호

| 인물 | 거짓 시 | 진실이나 불안할 때 | 무너질 때 |
|---|---|---|---|
| `deitch` | 오른손이 데스크 아래로 내려간다(플라스크). 문장 끝 음량이 떨어진다. "제 기억으론"을 붙인다 | 숙박부 모서리를 반복해서 맞춘다 | 안경을 벗고 눈두덩을 누른다 |
| `ruiz` | 말이 빨라지고 스페인어가 섞인다. 시선이 형사가 아니라 문을 본다 | 손에 쥔 천을 비틀어 짠다 | 앉는다. 그전까지 서 있었다 |
| `pryce` | 시각을 지나치게 정확히 말한다("10시 41분"). 대답 전 반박자 늦다 | 피우지도 않으면서 재떨이를 만진다 | 사진을 뒤집어 놓는다 |
| `doyle` | 웃는다. 질문을 되묻는다 | 렌치를 손에서 놓지 않는다 | 웃음을 멈추지 않는다 |

**텔 규칙**: 텔은 아이콘·색·UI로 표시하지 않는다. 오직 애니메이션과 카메라로만 관찰된다.
그리고 **불안 시 텔과 거짓 시 텔이 겹치도록** 설계한다 — 확정 판별을 주지 않는 것이 이 시스템의 핵심이다.

### MASTER-PLAN §3 — 3. 인물 기획 — 페르소나 × 타임라인 × 위치

<!-- 원문: docs/MASTER-PLAN.md § 3. 인물 기획 — 페르소나 × 타임라인 × 위치 ⊂ VIRGIL(가제) — 종합 기획 v1 (구 CECIL 확장) -->
### 3.1 페르소나 카드 (기존 표 승계 + 확장 4축)

| 인물 | 목소리 지문 (N3) | 괴담 태도 | 공간 앵커 | 막별 프리젠스 |
|---|---|---|---|---|
| 다이치 | 방어적 존대, 짧은 완결문, 헤지 "제 기억으론" | 안 믿는 척, 그러나 밤소리 목록을 꿰고 있다 | 프런트데스크 | 1막 심문 · 2막 재심문(조건부) · 3막 부재 |
| 루이즈 | 빨라지면 스페인어 혼입, 문장이 일에 붙어 있다 | 믿는다. 성호를 긋는다. 전달자 1순위 | 9층 린넨실 | 2막 심문 · 1막 원경(카트) |
| 프라이스 | 과잉 정밀(시각·치수), 전직 수사관 어휘 | "괴담은 게으른 수사관의 결론" — 냉소, 단 한 번 흔들린다 | 944호 | 2막 심문 · 1막 로비 원경(신문) |
| 도일 | 웃음, 질문 되묻기, 기술어(밸브·압력)로 도피 | **이용한다** — 괴담을 알리바이로 | 보일러실·옥상 | **1막 로비 통과(렌치) · 2막 보일러실 소리·복도 끝 실루엣 · 3막 대면** |

도일의 1·2막 프리젠스는 신설이다 — 현행 사양은 도일이 3막에만 등장해 지목이 서사적 갑툭튀가 된다.
대사 없는 목격 이벤트(§5.3)로만 심는다. 원칙: 프리젠스는 정보를 주지 않고 존재감만 준다.

### 3.2 타임라인 매트릭스 (STORY v2에 사양으로 편입)

모든 진술·증거는 이 매트릭스의 셀에 결박된다. 셀에 없는 사실은 게임에 존재하지 않는다.

**표 A — 14개월 전, 넬의 밤**

| 시점 | 넬 | 도일 | 프라이스 | 남는 흔적 |
|---|---|---|---|---|
| 저녁 | 9층 투숙 중. 도일의 접근을 거부, 지배인 민원 예고 | 위협 인지 | 하우스 디텍티브 재직, 야간 순찰 | — |
| 밤 | 옥상으로 (유인/추적 — v2에서 확정) | 뒤따름 → 탱크 익사 | 순찰 중 옥상 계단참에서 4장 촬영 | `photos` (4번째 장 유리 반사에 두 번째 형체) |
| 심야 | — | 시신을 채광정으로 이동, 추락 위장 | — | 부검 "낙하 시 흡인" 오기 → `autopsy` |
| 이틀 뒤 | — | 소유주(삼촌)가 종결 처리 | 사진 제출 → **해고** | 프라이스 944호 장기투숙 잔류(떠나지 못함 — 벽의 스크랩) |

**표 B — 10월 9일, 아이리스의 밤**

| 시각 | 아이리스 | 도일 | 다이치 | 루이즈 | 남는 흔적(증거 원산지) |
|---|---|---|---|---|---|
| 21:40 | 942호, 일기 마지막 기록 | 보일러실 | 프런트 | 9층 잔업(수압 민원 대비) | `journal` 원본 |
| 22:15 | 프런트에서 옥상 열쇠 $20 구매 | — | 열쇠 판매, ROOF 고리 빔 | — | `keyrack` 공백 · 열쇠 태그(다이치 필적) |
| 23:00 | 옥상 계단 | 뒤따름 | 프런트 | 902호 민원 접수·서명, 위층에서 두 사람 소리 | `pressure-log` 서명 · `two-voices` 증언 |
| 23:10 | 탱크 캣워크 → 해치 안 (언니 가설 확인 시도) | 해치를 바깥에서 잠금, 구두를 가지런히 배치(자살 연출) | — | — | `hatch-lock` · `shoes` (연출과 자물쇠의 자기모순 = L1) |
| 23:40 | — | 젖은 작업화로 하강, 9층 경유 | — | — | `footprints` (265mm) |
| 00:30 | — | 942호 침입: 일기에서 자기 관련 장 찢음, **열쇠를 매트리스 밑에 심음**(자살 연출 보강 — 태그 필적은 못 봄), 문에 회색 창고 팻말 | — | — | `journal` 찢김 · `roofkey` 위치 · 회색 팻말(루이즈 S1) |
| 10/10~11 | — | 급수 일지에 정상 기록(자필 위조 — L2의 자기모순) | 객실 자동 청구 계속 | 아침 복도 물기 닦음(목재 얼룩 잔존) | `register` 청구 · `water-log` · `sink-trap` 침전 · `footprints` 잔존 |

**표 C — 현재(10/11~), 막별 위치**: 1막 새벽 로비(다이치 프런트, 프라이스 원경, 도일 통과) →
2막 오전 9층(루이즈 린넨실, 프라이스 944, 도일 보일러실 소리) → 3막 오후 옥상·비(도일).

### 3.3 발견된 개연성 결함 — v2 즉시 수정 대상 (사실 그래프 게이트의 실증)

이 매트릭스를 짜는 과정에서 현행 `STORY.md`의 모순 3건이 드러났다. 사람이 통독으로 못 잡던 것을
표 작성이 잡았다 — §4의 기계 검증이 상시로 해야 할 일이 정확히 이것이다.

1. **프라이스 해고 시점 모순** — S2 "하우스 디텍티브였습니다. 4년 전까지" vs S3 자백 "제출했더니
   이틀 뒤에 잘렸습니다"(=넬 사건 직후 = 14개월 전). **통일안**: 거주 4년(재직 중 입주), 해고는
   14개월 전. 다이치 S5("여기 4년 살았습니다")와도 정합.
2. **도일의 넬 살해 동기 미정의** — 현행 §1은 살해 사실만 있고 이유가 없다. **통일안**: 상습
   접근·거부·민원 위협(표 A). 루이즈 S4 "작년에도 그랬어요"(패턴 증언)와 결박, 소유주 비호가
   종결의 메커니즘.
3. **roofkey 위치 모순** — 아이리스가 열쇠를 갖고 올라갔다면 매트리스 밑에 있을 수 없다.
   **통일안**: 도일이 사후 침입 시 자살 연출로 심었다(표 B 00:30). 태그의 다이치 필적을 못 본 것이
   연출의 결함이 되어, 조잡한 연출자라는 인물상(L1의 구두 배치)과 일관된다.

---

### E5 §1 — 1. 3선택 판정표

<!-- 원문: docs/design/E5-interrogation.md § 1. 3선택 판정표 ⊂ E5 — 심문·판정 시스템 -->
NPC 진술이 순서대로 나온다. 각 진술 후 플레이어는 셋 중 하나를 고른다 —
**진실(TRUTH)** 믿는다 · **의심(DOUBT)** 증거 없이 압박한다 · **거짓(LIE)** 수사노트에서
증거 하나를 지목한다.

| 실제 | 선택 | 결과 |
|---|---|---|
| 진실 | TRUTH | +1. 신뢰. 보너스 정보 |
| 진실 | DOUBT | -1. 상대가 방어적으로. 다음 진술이 짧아짐 |
| 진실 | LIE | -2. **소각(burn)**. 그 진술의 정보 영구 소실 |
| 거짓 | TRUTH | 0. 그냥 넘어감. 정보 없음 |
| 거짓 | DOUBT | +0.5. 상대가 흔들리지만 인정 안 함. 재질문 1회 가능 |
| 거짓 | LIE + 정답 증거 | +2. **자백 또는 결정적 정보 개방** |
| 거짓 | LIE + 오답 증거 | -2. **소각**. 상대가 닫힘 |

**재질문 규칙 (DOUBT의 기계 의미)**: DOUBT 선택 시 **진위 불문** 그 진술에 한해 후속
선택 1회가 열린다 — 후속 선택지는 TRUTH(수용하고 넘어감) 또는 LIE뿐, DOUBT 재선택 불가.
점수는 **대체 규칙**: 후속 LIE의 판정 점수가 DOUBT 점수를 대체한다(누적 아님 — 거짓에
DOUBT→LIE정답은 +2이지 +2.5가 아니다. DOUBT 선제시가 점수 이득이 되면 공짜 탐침이 된다).
후속 TRUTH 수용 시엔 DOUBT 판정 점수가 유지된다. 재질문 기회 자체는 진위와 무관하게
항상 열리므로 판별 신호가 아니다 — DOUBT의 가치는 반응 대사 한 줄(그 뉘앙스 읽기가
텔 게임의 일부)이고, 비용은 진실에 썼을 때의 -1이다. 후속 LIE+정답의 자백 도달은 정상
허용, 후속 LIE+오답은 정상 소각.

**힌트 금지(불변)**: UI에 정답 힌트를 절대 표시하지 않는다 — 남은 증거 개수, 정답률,
체크 표시 전부 금지. 카메라·연기만이 신호다(E4 §2, E7 §1).

### E7 §4 — 4. 괴담 연출 — 매체 구현 (본문: STORY §7, 데이터: case-graph `lore`)

<!-- 원문: docs/design/E7-presentation.md § 4. 괴담 연출 — 매체 구현 (본문: STORY §7, 데이터: case-graph `lore`) ⊂ E7 — 연출·오디오·괴담 -->
| 매체 | 구현 | 이벤트 |
|---|---|---|
| `radio-lobby` | 디제틱 라디오 루프 — 첫 30초에 반 문장 선노출, 상호작용 시 전문. 다이치가 주파수를 돌리는 반응(E4) | `lore:heard {id:'lore.pipes', medium:'radio-lobby'}` |
| `register-margin` | register 관찰 클로즈업의 여백 낙서 — 증거 검사와 같은 뷰어, 다른 레이어 | `lore:heard` (lore.lightwell) |
| `linen-wall` | 린넨실 벽 데칼(긁어 쓴 글씨) 관찰 | `lore:heard` (lore.linen·lightwell) |
| `lobby-frame` | 로비 개업 연혁 판 관찰 — 마지막 줄만 다른 손글씨 | `lore:heard` (lore.1912) |

수집된 괴담은 수사노트 괴담 면(E8 §2)에 축적 — 증거 면과 **물리적으로 구분된 지면**
(괴담은 증거가 아니라는 시스템 발화). 괴담 유닛은 지목판에 올라올 수 없다(N4·F4 이중 차단).

---

### E4 §2 — 2. 텔 연기 시스템 — 비확정 원칙 (U4)

<!-- 원문: docs/design/E4-characters.md § 2. 텔 연기 시스템 — 비확정 원칙 (U4) ⊂ E4 — 인물 (페르소나 카드 4장) -->
신호 원문은 STORY §2 표가 진실원. 이 문서가 계약하는 것은 **분포**다:
- 상태 4종: `idle` / `anxious`(진실이나 불안) / `lying` / `breaking`. 심문 상태기계가
  `perf:state {npc, state}` 이벤트로 발화한다(ARCH v2 §5) — 상태 산출 근거는 진술의
  `truth`와 **`anxiousTell` 필드**(case-graph.json statements — 불안 발화 진실 진술 4건:
  deitch.S1·S3, ruiz.S1, pryce.S2)이며, **breaking은 `breakingOn:true` 진술(deitch.S4·
  ruiz.S4·pryce.S3)의 lieCorrect 직후에만** 발화한다. 이 배정 데이터의 진실원은
  case-graph다(E3 소유). 프라이스 S4의 고해는 breaking이 아니라 이미 무너진 뒤의
  anxious 지속이다 — 붕괴는 인물당 한 번이다.
- **P5 상관 게이트**: 스크립트 전수에서 거짓 진술과 텔 발화의 상관이 1.0이면 FAIL —
  불안 시 텔 발화가 전체 텔 발화의 30% 이상이어야 PASS(E9). 즉 진실을 말하는데 신호가
  나오는 경우가 구조적으로 존재해야 한다. 읽기는 도박이어야 한다.
- 텔은 아이콘·색·UI로 표시하지 않는다. 애니메이션과 카메라(N5)로만.

