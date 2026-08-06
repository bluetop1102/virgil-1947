# 패킷 T-P0-03 — script.js v2 이행 — case-graph 정합·소비자 적응

> 이 문서 하나로 완결된다. **패킷 밖 문서를 열지 마라** — 필요한 계약 원문·데이터·규약은
> 전부 아래에 인라인돼 있다. 그래도 질문이 생기면 그건 이 패킷의 결함이니,
> 추측해서 진행하지 말고 §10 반환 형식의 `CONTRACT_CHANGE_REQUEST` 로 되돌려라.
> 자동 생성물 — 손으로 고치지 않는다. 원천: `data/manifest/T-P0-03.json` · 생성기: `tools/packet-gen.mjs`

## 1. goal 계약

```
/goal script.js v2 이행 — case-graph 정합·소비자 적응 — T-P0-03
통과 조건: §8 수용 기준 4건 전건 통과 · 콘솔 에러·경고 0 · §9 금지 사항 위반 0
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
- `src/narrative/deduction.js` — **구역 한정** — 데이터 접근층 — 관계 필드 참조 (이 구역 밖은 남의 것이다)

## 3. 선행 의존

없다. 다른 티켓의 산출을 기다리지 않는다.

## 4. 소비 계약 — 원문 인라인

### 4.1 E10 §2 P0 표

*왜 읽는가: 이 티켓의 정본 행. 내용·소유 파일·수용 기준·모델 배정의 원천이며, 패킷과 어긋나면 이 표가 이긴다.*

<!-- 원문: docs/design/E10-production.md § P0 — 정지작업 (전 티켓 상호 독립, T-P0-03만 E3 산출 의존) -->
| 티켓 | 내용 | 소유 파일(배타) | 수용 기준(기계) | 모델 |
|---|---|---|---|---|
| T-P0-01 | 계약 린트 커밋 훅 — grep 5종(materials 밖 재질 생성·atmosphere 밖 광원·랜덤/시계 직호출·500줄 초과·화면 표출 "세실") | `tools/lint-contract.mjs` + `.git/hooks` 설치 스크립트 | 위반 5종 각각 주입 시 커밋 차단 재현 | 외부 |
| T-P0-02 | 재질·조명 계약 예외 청소(kit-mat 폴백·glow, props 광원 3건, testbed 1건) — 팩토리 경유화, 불가한 것만 §6/§6.5 예외 등재 | `src/world/kit-mat.js` `props.js` `testbed.js` + ARCH §6 예외 절 | T-P0-01 린트 통과 + `pix diff` 기준선 대비 무변화 | 외부 (회귀 게이트 필수) |
| T-P0-03 | script.js v2 이행 — STORY v2 대사 반영(종료 노트 문구 포함)·case-graph id 정합·관계 중복 기재 제거 · **소비자 적응 포함**: interrogation.js/deduction.js의 관계 필드 접근을 case-graph 로더 경유로 전환(`narrative/case-graph-loader.js` 신설 허용) · `room:changed` 이형 표기(`corridor` 등)를 ARCH §5 정본 어휘로 수렴 | `src/narrative/script.js` + `interrogation.js`·`deduction.js`의 데이터 접근층 + `case-graph-loader.js`(신설) | factcheck PASS · `test-interrogation.mjs` 통과 · 표출 "세실" grep 0 | 외부 |
| T-P0-04 | 500줄 초과 4파일 분할(atmosphere 574 · recipes.a 528 · atmo/fixtures 506 · props 504) | 해당 4파일 + 분할 신규 파일 | 전 파일 ≤500 · `pix diff` 무변화 · 콘솔 0 | 외부 |
| T-P0-05 | P5 텔 상관 검사기 — factcheck 확장, script v2의 텔 발화 상관 측정 | `tools/factcheck.mjs` §P5 절 | 완전판별기 변이 주입 시 FAIL 재현 | 외부 |

### 4.2 ARCH §2 디렉터리 소유권

*왜 읽는가: 자기 소유 파일의 경계 — 표에 없는 파일은 남의 것이다.*

<!-- 원문: docs/ARCHITECTURE.md § 2. 디렉터리 소유권 -->
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
    config.js      품질 프리셋·튜너블
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

<!-- 원문: docs/ARCHITECTURE.md § 5. 이벤트 버스 계약 -->
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
| `deduction:end` | `{ending, links, flags}` | deduction — 지목 종결 확정 통지(ending ∈ full/partial/cold). cinematics(cin-end-* 개시)·save가 소비 *(v2)* |
| `boot:progress` | `{done, total}` | main.js — 부트 진행(모듈 init 계수+첫 프레임). 로딩 화면(E8 §3)이 구독 *(v2)* |
| `title:proceed` | `{mode}` | ui(title) — 타이틀 통과 신호. mode `new`(첫 입력/처음부터) → cinematics가 cin-intro 개시. mode `resume` → title.js 자신이 `?resume=1` 재작성+리로드(E8 §4 프로토콜 — 수신자 없음, 로그 목적 발화) *(v2)* |
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

<!-- 원문: docs/design/E3-case-graph.md § 4. 소비 계약 -->
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

<!-- 원문: docs/design/E5-interrogation.md § [위임] -->
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

<!-- 원문: docs/STORY.md § 5. 심문 스크립트 -->
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

<!-- 원문: docs/ARCHITECTURE.md § 5. 이벤트 버스 계약 -->
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
| `deduction:end` | `{ending, links, flags}` | deduction — 지목 종결 확정 통지(ending ∈ full/partial/cold). cinematics(cin-end-* 개시)·save가 소비 *(v2)* |
| `boot:progress` | `{done, total}` | main.js — 부트 진행(모듈 init 계수+첫 프레임). 로딩 화면(E8 §3)이 구독 *(v2)* |
| `title:proceed` | `{mode}` | ui(title) — 타이틀 통과 신호. mode `new`(첫 입력/처음부터) → cinematics가 cin-intro 개시. mode `resume` → title.js 자신이 `?resume=1` 재작성+리로드(E8 §4 프로토콜 — 수신자 없음, 로그 목적 발화) *(v2)* |
| `game:pause` | `{on}` | ui(settings 카드) — 일시정지 전파. **구독·정지 대상: physics·chars(perf)·cinematics·interrogation·audio(디제틱 감쇠) — 각 모듈이 자기 update를 스킵한다(core 무수정, engine.time은 계속 흐른다). 렌더·pipeline은 지속** — FOV·감도 즉시 반영을 카드 뒤 화면으로 확인하는 것이 목적이다. 시네마틱 재생 중 pause = 재생 정지(스킵 아님) *(v2)* |
| `perf:state` | `{npc, state}` | interrogation — 연기 상태 idle/anxious/lying/breaking. perf.js는 이것만 구독하며 진위를 모른다. 산출 규칙(기계): 진술 제시 중 `truth:false`→lying, `anxiousTell:true`→anxious, 그 외→idle. **breaking은 case-graph `breakingOn:true` 진술의 lieCorrect 판정 직후에만**(현행 3건: deitch.S4·ruiz.S4·pryce.S3) *(v2)* |
| `deduction:link` | `{id, ok}` | deduction — 지목판 링크 성립/실패. perf(도일 반응)·cinematics(광각화)가 구독 *(v2)* |
| `camera:dof` | `{bias, ms}` | cinematics — LIE 푸시인의 조리개 개방(보케 붕괴) 요청. 수신·보간은 [PIPELINE-CORE]가 dof 패스에 전달(수신부 구현은 HANDOFF 큐 경유 — E10 T-P1-08 비고) *(v2)* |

**`room:changed` 값 어휘 (정본 — v2)**: `lobby` · `elevator` · `corridor9` · `linen` ·
`room942` · `bathroom942` · `room944` · `stairs-roof` · `rooftop`. 오디오 리버브 전환(E7 §3)·
완주 봇 로그가 이 문자열을 그대로 소비한다. 기존 코드의 `corridor` 등 이형 표기는
T-P0-03 정합 라운드에서 이 어휘로 수렴한다. `elevator`는 이동 공간이라 case-graph 셀이
아니며, `boiler`는 진입 불가 공간이라 room 값으로 발화되지 않는다(소리 원점 전용, E6 §0).

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
grep -rn '세실' src/ --include=*.js
```
→ 화면 표출 문자열에서 0건 (코드 식별자 __CECIL__ 등은 잔존 허용)

**A4.**

```bash
node tools/lint-contract.mjs
```
→ 위반 0 — 특히 500줄 초과·표출 "세실" 규칙

## 9. 금지 사항

### 9.1 이 티켓 고유

- STORY §5 대사 원문의 각색·요약·재창작 — 진실원은 STORY이고 script.js는 전사(轉寫)다.
- interrogation.js·deduction.js의 판정 로직·이벤트 발화 절 편집 — 승인 범위는 데이터 접근층뿐이다(E5 [위임]).
- case-graph.json 수정 — 그래프는 E3 소유다. 그래프가 틀렸다면 CONTRACT_CHANGE_REQUEST로 반환한다.
- script.js에 원산지·반박 관계를 다시 적는 것 — 관계는 그래프에만 산다.

### 9.2 전역 (프로젝트 전체 불변)

<!-- 원문: AGENTS.md § 안전 규칙 -->
- 남이 소유한 파일을 편집하지 않는다. **다른 소유자의 파일을 고쳐야 하면 `docs/HANDOFF.md` 큐에 항목을
  추가**하고 자기 소유분만 진행한다. "그 에이전트가 지금 안 보인다"는 안전 신호가 아니다 — 여러 워크플로가
  동시에 돌고 소유자는 라운드 사이에 다시 살아난다.
- `src/core/*`는 잠김. `core/shotlist.js`에 엔트리 추가만 허용.
- 외부 에셋 다운로드 금지. 모든 텍스처·지오메트리·오디오는 절차 생성.
- `Math.random()` / `Date.now()` 직접 호출 금지 (`core/util.js`의 `rng`, `engine.time` 사용).
- 실제 사건 피해자를 재현하지 않는다. 인물·사건은 전부 허구.

## 10. 반환 형식

### 10.1 계약 변경이 필요할 때

코드를 고치지 말고 `docs/HANDOFF.md` **하단에 항목을 추가**한다(남의 항목 수정·삭제 금지).
그리고 자기 소유분만 진행한다. 형식:

<!-- 원문: docs/HANDOFF.md § 형식 -->
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

- 수용 기준 A1~A4 각각의 **실제 명령 출력**을 붙인다. 요약 서술로 대체하지 않는다.
- 커밋은 자기 소유 파일만, 라운드 단위로. squash·force push 금지 — 커밋 이력 자체가 제출물이다.
- 중단했다면 무엇이 남았는지·다음 담당이 어디서 이어받는지를 적는다.

## 11. 공통 규약 (전 패킷 공통 — 인라인)

### 11.1 AGENTS.md § 안전 규칙

<!-- 원문: AGENTS.md § 안전 규칙 -->
- 남이 소유한 파일을 편집하지 않는다. **다른 소유자의 파일을 고쳐야 하면 `docs/HANDOFF.md` 큐에 항목을
  추가**하고 자기 소유분만 진행한다. "그 에이전트가 지금 안 보인다"는 안전 신호가 아니다 — 여러 워크플로가
  동시에 돌고 소유자는 라운드 사이에 다시 살아난다.
- `src/core/*`는 잠김. `core/shotlist.js`에 엔트리 추가만 허용.
- 외부 에셋 다운로드 금지. 모든 텍스처·지오메트리·오디오는 절차 생성.
- `Math.random()` / `Date.now()` 직접 호출 금지 (`core/util.js`의 `rng`, `engine.time` 사용).
- 실제 사건 피해자를 재현하지 않는다. 인물·사건은 전부 허구.

### 11.2 AGENTS.md § 명령

<!-- 원문: AGENTS.md § 명령 -->
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

### 11.3 AGENTS.md § 샷 하네스 규약 (병렬 작업 중 필수)

<!-- 원문: AGENTS.md § 샷 하네스 규약 (병렬 작업 중 필수) -->
- **GPU 락이 자동으로 걸린다.** 동시에 한 프로세스만 실행되며, 다른 실행이 돌고 있으면
  "GPU 락 대기 중" 로그를 찍고 기다린다. 이건 정상이다 — 죽이지 말고 기다려라.
  단독 실행 기준 warmup 20~30초 + 첫 샷 ~25초, 이후 샷 ~2초다.
- **필요한 샷만 찍어라.** 전체 샷은 배선/검수 담당만 돌린다. 자기 담당 1~2개만 지정해서 찍는다.
- **`--out shots/<자기이름>`을 써라.** 기본 출력(`shots/`)은 공유되므로 report.json이 서로 덮인다.
  리포트에 `runner` 필드로 실행 주체가 찍히니 남의 리포트를 자기 것으로 읽지 마라.
- `SHOT_PORT=<고유번호>`를 지정해 포트 충돌을 피한다.
- 샷 도중 vite는 HMR·파일 워처가 꺼진 채로 뜬다(`SHOT=1`). 그래서 다른 에이전트가 파일을 저장해도
  페이지가 리로드되지 않는다. 이 동작에 의존하지 말고, 자기 샷은 자기 수정이 끝난 뒤에 찍어라.

### 11.4 docs/ARCHITECTURE.md § 10. 결정론

<!-- 원문: docs/ARCHITECTURE.md § 10. 결정론 -->
- `Math.random()` 직접 호출 금지. `core/util.js`의 `rng(seed)` 사용.
- `Date.now()` / `performance.now()` 직접 호출 금지. `engine.time` 사용.
- QA 모드(`?qa=1`)에서 시간은 하네스가 고정 스텝으로 전진시킨다.

### 11.5 docs/ARCHITECTURE.md § 11. 코드 스타일

<!-- 원문: docs/ARCHITECTURE.md § 11. 코드 스타일 -->
- ESM, 세미콜론 없음, 2스페이스, 작은따옴표.
- 파일당 500줄 이하. 넘으면 같은 소유 디렉터리 안에서 분할.
- 주석은 "왜"만. "무엇"은 코드로.
- 콘솔 에러/경고 0 — QA가 콘솔을 읽고 실격 처리한다.

### 11.6 docs/design/E9-gates.md § 3. goal 계약 형식 (전 구현 Phase 공통 — 중단 조건 없는 goal 루프 금지)

<!-- 원문: docs/design/E9-gates.md § 3. goal 계약 형식 (전 구현 Phase 공통 — 중단 조건 없는 goal 루프 금지) -->
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

### 11.7 docs/HANDOFF.md § 형식

<!-- 원문: docs/HANDOFF.md § 형식 -->
```
### [ ] <요청자> → <대상 소유자>
- **파일**: src/...
- **루브릭**: G8 / D3 ...
- **문제**: 스크린샷 어느 지점에서 무엇이 잘못 보이는가
- **지시**: 구체적 기술 지시
- **요청자가 처리한 부분**: 자기 소유 파일에서 이미 한 것(중복 작업 방지)
```

---

