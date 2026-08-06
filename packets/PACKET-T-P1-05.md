# 패킷 T-P1-05 — 로딩 화면 + 타이틀 + 설정 뼈대 + 프레임 계측

> 이 문서 하나로 완결된다. **패킷 밖 문서를 열지 마라** — 필요한 계약 원문·데이터·규약은
> 전부 아래에 인라인돼 있다. 그래도 질문이 생기면 그건 이 패킷의 결함이니,
> 추측해서 진행하지 말고 §10 반환 형식의 `CONTRACT_CHANGE_REQUEST` 로 되돌려라.
> 자동 생성물 — 손으로 고치지 않는다. 원천: `data/manifest/T-P1-05.json` · 생성기: `tools/packet-gen.mjs`

## 1. goal 계약

```
/goal 로딩 화면 + 타이틀 + 설정 뼈대 + 프레임 계측 — T-P1-05
통과 조건: §8 수용 기준 4건 전건 통과 · 콘솔 에러·경고 0 · §9 금지 사항 위반 0
중단 조건: 라운드 상한 1회 · 서브에이전트 토큰 상한 150만
           (PROMPT-build-p1.md 의 P1 전체 상한 14회·1500만을 티켓 10장으로 나눈 몫)
           상한 도달 시 라운드 경계에서 끊고 §10 형식으로 인수인계한다. 중단 조건 없는 루프 금지.
```

- **타입**: ui · **배정 모델**: codex · **상태**: todo
- **라운드 규율**: 단일 담당 · 단일 목표 · 사전 기준선 → 사후 기계 게이트 · 라운드 단위 커밋.
  회귀면 롤백한다. 판 갱신은 개선일 때만.

## 2. 소유 파일 (배타)

이 목록 밖의 파일은 **읽기만** 한다. 남의 파일을 고쳐야 하면 §10.1 형식으로 반환한다 —
"그 담당이 지금 안 보인다"는 안전 신호가 아니다.

- `src/ui/settings.js` — 파일 전체 · 신설
- `src/ui/title.js` — 파일 전체 · 신설
- `src/main.js` — **구역 한정** — 부트 훅 — boot:progress 발화 (이 구역 밖은 남의 것이다)

## 3. 선행 의존

아래 티켓의 산출이 이미 트리에 있다고 전제한다. 없으면 착수하지 말고 반환하라.

- `T-P0-01` — 계약 린트 커밋 훅 — grep 5종 · 상태 todo
- `T-P0-02` — 재질·조명 계약 예외 청소 — 팩토리 경유화 · 상태 todo
- `T-P0-03` — script.js v2 이행 — case-graph 정합·소비자 적응 · 상태 todo
- `T-P0-04` — 500줄 초과 4파일 분할 · 상태 todo
- `T-P0-05` — P5 텔 상관 검사기 — factcheck 확장 · 상태 todo

## 4. 소비 계약 — 원문 인라인

### 4.1 E10 §2 P1 표

*왜 읽는가: 이 티켓의 정본 행. 내용·소유 파일·의존·수용 기준·모델 배정의 원천이며, 패킷과 어긋나면 이 표가 이긴다.*

<!-- 원문: docs/design/E10-production.md § P1 — 수직 슬라이스 (P0 전체 완료 후 착수) -->
| 티켓 | 내용 | 소유 파일 | 의존 | 수용 기준 | 모델 |
|---|---|---|---|---|---|
| T-P1-01 | 로비 정식 레벨 ([E6](E6-spaces.md) §1 로비 사양 전체) | `src/world/lobby.js` | P0 | `room:changed`·샷 엔트리·증거 4종 상호작용·콘솔 0·프레임 예산·상호작용 밀도 ≥6 | **단일 최강** (첫 30초 무대) |
| T-P1-02 | 다이치 리그 (실루엣+식별 소품, E4 §3) | `src/chars/rig.js` | P0 | 샷 판정(실루엣 판독)·콘솔 0 | 외부 |
| T-P1-03 | 다이치 텔 연기 4클립 (E4 §2·§3) | `src/chars/perf.js` | T-P1-02 | 클립 4종 재생·이벤트 구독만으로 트리거·P5 PASS | **단일 최강** (타이밍 감각) |
| T-P1-04 | 심문 1건 E2E — 소각 직렬화 포함 (E5 §1·§2) | `src/narrative/interrogation.js` | T-P1-01 | 판정표 6행 배터리·소각 후 unlocks 미발화·`state` 직렬화 포함 | 외부 |
| T-P1-05 | 로딩 화면+타이틀+설정 뼈대+프레임 계측 (E8 §2·§3·§5 — 부트 순서: 로딩→타이틀→cin-intro/복원) | `src/ui/settings.js` + `src/ui/title.js`(신설) + `main.js` 부트 훅(`boot:progress`) | P0 | P6 정지샷(로딩·타이틀 포함)·`settings:changed` 발화·`?stats=1` 동작 | 외부 |
| T-P1-06 | 완주 봇 — E2 골든 패스 표 소비, 1막 구간 + **`--capture <구간>` 모드**(P2 첫 30초·P4 오답 변형 등 판정용 프레임 시퀀스 덤프 — 시퀀스 캡처 도구는 봇에 통합, 별도 신설 없음) | `tools/playthrough.mjs` | T-P1-01·04 | 1막 완주 로그·무사건 간격 측정 출력·캡처 모드 동작 | 외부 |
| T-P1-07 | 첫 30초 시네마틱 `cin-intro` (E2 §첫 30초 표) | `src/narrative/cinematics.js`(신설 — ARCH §2 표기 P1) | T-P1-01 | 30초 캡처가 E2 표와 초 단위 대조 통과(P2) | **단일 최강** |
| T-P1-08 | 심문 카메라·침묵 연출 — E7 §1 수치 7행(렌즈·트래킹·높이) + 오답 룸톤 -6dB·3초(E7 §3). 이벤트 구독만으로 트리거. LIE 보케 붕괴는 `camera:dof` 발화(ARCH §5) — **pipeline 수신부(dof 유니폼 보간 1점)는 HANDOFF 큐로 [PIPELINE-CORE] 소유자에게 선행 의뢰** | `src/narrative/cinematics.js` 심문 절 + `src/audio/engine.js` 룸톤 규칙 | T-P1-04·07 + HANDOFF(pipeline dof 수신) | 오답 시퀀스 캡처 P4 무설명 판독 · 심문 중 컷 0회 검증 | **단일 최강** |
| T-P1-09 | 심문 UI — hud 3선택 프롬프트 + notebook 증거 지목 모드 (`interrogation:prompt`/`choose`/`aiming` 배선, E5 [구현]) + **qa 대리 구동 UI 측**(`qa.choose`·`qa.link`·`qa.sign`·`qa.notebook` — ARCH §9) | `src/ui/hud.js` + `src/ui/notebook.js` 지목 모드 | T-P1-04 | C1 시퀀스 완주 봇 재현 · 정지샷 힌트 요소 0(P6·E5 §1) | 외부 |
| T-P1-10 | gameplay QA 하네스 — `__CECIL__.qa` 구동·관측부(list/goto/walk/interact/state/events, `?qa=1` 게이팅, 이벤트 링버퍼) + `lore:heard` 발화 | `src/gameplay/player.js`·`evidence.js`의 qa 절 | T-P1-01 | 봇 `--fast` 1막 구동 성립 · qa API가 비QA 모드에서 비노출 | 외부 |

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

### 4.3 ARCH §3 모듈 계약

*왜 읽는가: default export 인터페이스와 order 배정 — 신규 모듈은 이 형태여야 등록된다.*

<!-- 원문: docs/ARCHITECTURE.md § 3. 모듈 계약 -->
모든 모듈은 이 인터페이스를 구현한 **객체 또는 클래스 인스턴스**를 default export 한다.

```js
export default {
  name: 'pipeline',      // 고유 이름
  order: 100,            // update 실행 순서 (작을수록 먼저). 아래 표 참조
  async init(engine) {}, // 1회. engine.scene 등 접근 가능
  update(dt, elapsed) {},// 매 프레임
  resize(w, h) {},       // 선택
  dispose() {},          // 선택
}
```

**order 배정 (충돌 금지)**

| order | 모듈 |
|---|---|
| 10 | physics |
| 20 | player |
| 30 | characters |
| 40 | interrogation |
| 50 | cinematics |
| 60 | audio |
| 70 | levels (lobby/corridor/room/rooftop) |
| 80 | ui |
| 100 | pipeline (항상 마지막) |

### 4.4 ARCH §4 Engine API

*왜 읽는가: engine.time·bus·state 접근 규약. renderer.render 직접 호출 금지.*

<!-- 원문: docs/ARCHITECTURE.md § 4. Engine API (읽기 전용 계약) -->
```js
engine.renderer   // THREE.WebGLRenderer
engine.scene      // THREE.Scene
engine.camera     // THREE.PerspectiveCamera  (연출은 이 카메라를 직접 옮긴다)
engine.bus        // EventBus
engine.state      // GameState
engine.quality    // config.js의 활성 프리셋 객체
engine.size       // {w, h, dpr}
engine.get(name)  // 다른 모듈 인스턴스. 없으면 undefined — 항상 optional chaining으로 접근할 것
engine.register(mod)
engine.time       // 결정론적 시간(초). Date.now() 사용 금지 — 이 값만 쓸 것
```

**렌더링**: Engine은 `engine.get('pipeline')?.render()`를 호출한다. pipeline이 없으면 기본 `renderer.render(scene, camera)`로 폴백한다. 다른 모듈은 절대 `renderer.render`를 호출하지 않는다.

### 4.5 ARCH §5 이벤트 버스 계약

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

### 4.6 ARCH §11 코드 스타일

*왜 읽는가: ESM·세미콜론 없음·2스페이스·작은따옴표·파일당 500줄·콘솔 0.*

<!-- 원문: docs/ARCHITECTURE.md § 11. 코드 스타일 -->
- ESM, 세미콜론 없음, 2스페이스, 작은따옴표.
- 파일당 500줄 이하. 넘으면 같은 소유 디렉터리 안에서 분할.
- 주석은 "왜"만. "무엇"은 코드로.
- 콘솔 에러/경고 0 — QA가 콘솔을 읽고 실격 처리한다.

### 4.7 E9 §2 기계 게이트 총목록

*왜 읽는가: 이 티켓이 만들거나 통과해야 하는 게이트의 정의 원문.*

<!-- 원문: docs/design/E9-gates.md § 2. 기계 게이트 총목록 (goal 루프가 소비하는 통과 조건 은행) -->
| 게이트 | 도구 | 실행 시점 | 상태 |
|---|---|---|---|
| 사실 그래프 F1~F4+R1~R3 | `tools/factcheck.mjs` | 내러티브 데이터 변경마다 (커밋 게이트) | **가동 중 (PASS)** |
| 픽셀 회귀 | `tools/pix.mjs diff` + `shots/_baseline/` | 시각 변경 라운드마다 | 가동 중 (동결 감시) |
| 완주 봇 3경로 | `tools/playthrough.mjs` (신설) — 판정용 시퀀스 캡처(`--capture`)도 이 도구가 소유 | 게임플레이 변경마다 | P1 티켓 |
| 텔 상관 (P5) | factcheck 확장 — script v2의 텔 발화 상관 | 스크립트 변경마다 | P1 티켓 |
| 콘솔 에러·경고 0 | 샷 하네스 기존 | 전 라운드 | 가동 중 |
| 계약 린트 | 커밋 훅 grep 5종: materials 밖 `Mesh*Material` · atmosphere 밖 `*Light` · `Math.random(`/`Date.now(`/`performance.now(` · 500줄 초과 · 화면 표출 "세실" | 커밋마다 | P0 티켓 |
| 프레임 예산 | `?stats=1` 통계 오버레이(frametime p50/p95·드로우콜·메모리 — QA 전용·플레이어 비노출·D7 면제) + 샷 하네스 게이트: high 60fps / medium 30fps. 구현 티켓 T-P1-05 (E8 §5에서 이관) | 레벨 라운드마다 | P1 티켓 |
| 판정 배터리 (2단) | 정답/오답/무관 60건 오판 0 | 커널 스왑 머지 조건 | P4 티켓 |

### 4.8 E8 §2 설정

*왜 읽는가: 진입 트리거 Esc 1회 · game:pause 전파 규칙 · 항목 5종과 반영 시점.*

<!-- 원문: docs/design/E8-ui.md § 2. 설정 (`ui/settings.js` 신규 — order 80, 자동 등록) -->
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
| 품질 프리셋 | `?q=` URL 재작성 + 리로드 (감사 결론 승계 — 무리로드 전환은 비경제) | 리로드 시 |
| FOV | 60~80, `camera.fov`+`updateProjectionMatrix()` | 즉시 |
| 마우스 감도 | `player.js` SENS 인스턴스 필드 | 즉시 |
| 자막 | `subtitles.js` 플래그 | 즉시 |
| 볼륨 | 기존 마스터 게인 노드 | 즉시 |
| 키바인드 | **범위 외** (키맵 테이블 부재 — 백로그 명시, P 계획 불포함) | — |

`settings:changed` 버스 발신 · localStorage 키 `virgil.settings`(자체 키, state와 분리).

### 4.9 E8 §3 로딩 화면

*왜 읽는가: 허구 고지문 전문 · 열쇠 고리 진행률 · 부트 순서 · 제스처 게이트 정본.*

<!-- 원문: docs/design/E8-ui.md § 3. 로딩 화면 (P1 필수 — 베이크·컴파일 수 초의 블랙스크린 제거) -->
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

### 4.10 E8 §5 프레임타임 계측 이관

*왜 읽는가: 계측 사양은 E9 §2로 이관됐고 구현 티켓만 여기 남는다.*

<!-- 원문: docs/design/E8-ui.md § 5. (이관) 프레임타임 계측 -->
계측 오버레이(`?stats=1`)의 사양은 게이트 층 소유로 **E9 §2 프레임 예산 행**에 이관했다 —
플레이어 비노출 QA 도구는 체험 요소가 아니라 게이트 도구다. 구현 티켓은 T-P1-05 그대로.

---

### 4.11 AAA-RUBRIC D7·P6

*왜 읽는가: 1947 물성 위반은 실격이다 — 시스템 폰트·기본 버튼·라운드 코너·이모지 0.*

<!-- 원문: docs/AAA-RUBRIC.md § 절대 실격 조건 (하나라도 걸리면 그 항목 점수는 0, 루프 재진입) -->
| 코드 | 실격 사유 | 스크린샷에서 보이는 형태 |
|---|---|---|
| D1 | 에일리어싱 노출 | 지오메트리 실루엣·난간·창틀에 계단 픽셀이 육안으로 보임 |
| D2 | 플랫 조명 | 그림자 없는 균질 밝기, 명암 대비 없음, 광원 방향 불명 |
| D3 | 타일링 텍스처 | 바닥·벽에 동일 패턴 반복이 3회 이상 눈에 띔 |
| D4 | 플레이스홀더 지오메트리 | 모따기 없는 순수 박스/실린더가 주요 오브젝트로 노출 |
| D5 | 접지 실패 | 오브젝트가 바닥에서 떠 보임(컨택트 섀도 부재) |
| D6 | 대비 붕괴 | 순수 흑(#000) 클리핑 또는 순수 백 블로우아웃이 화면 15% 초과 |
| D7 | 웹 UI 냄새 | 시스템 폰트, 기본 버튼, 라운드 코너 카드, 이모지 아이콘 |
| D8 | 죽은 화면 | 먼지·연기·비·빛흔들림 등 시간축 요소가 전무 |

## 5. 입력 데이터

## 6. 이벤트 계약

- **발화(emit)**: `settings:changed` · `game:pause` · `boot:progress` · `title:proceed`
- **구독(listen)**: `boot:progress`

ARCHITECTURE §5 표의 해당 행 (payload·발신자 정본):

| 이벤트 | payload | 발신 |
|---|---|---|
| `settings:changed` | `{key, value}` | ui/settings *(v2)* |
| `game:pause` | `{on}` | ui(settings 카드) — 일시정지 전파. **구독·정지 대상: physics·chars(perf)·cinematics·interrogation·audio(디제틱 감쇠) — 각 모듈이 자기 update를 스킵한다(core 무수정, engine.time은 계속 흐른다). 렌더·pipeline은 지속** — FOV·감도 즉시 반영을 카드 뒤 화면으로 확인하는 것이 목적이다. 시네마틱 재생 중 pause = 재생 정지(스킵 아님) *(v2)* |
| `boot:progress` | `{done, total}` | main.js — 부트 진행(모듈 init 계수+첫 프레임). 로딩 화면(E8 §3)이 구독 *(v2)* |
| `title:proceed` | `{mode}` | ui(title) — 타이틀 통과 신호. mode `new`(첫 입력/처음부터) → cinematics가 cin-intro 개시. mode `resume` → title.js 자신이 `?resume=1` 재작성+리로드(E8 §4 프로토콜 — 수신자 없음, 로그 목적 발화) *(v2)* |

표에 없는 이벤트 이름을 새로 만들지 않는다. 발신 방향(누가 쏘는가)도 표가 정본이다.

## 7. 샷

- `ui-loading` — **신설**. `core/shotlist.js` 에 엔트리를 **추가**한다(기존 엔트리 수정 금지). 로딩 화면 — 허구 고지문 타건 중, 열쇠 고리 진행률
- `ui-title` — **신설**. `core/shotlist.js` 에 엔트리를 **추가**한다(기존 엔트리 수정 금지). 타이틀 — 정문 유리 금박 각인 + 놋쇠 명패 2개
- `ui-settings` — **신설**. `core/shotlist.js` 에 엔트리를 **추가**한다(기존 엔트리 수정 금지). 설정 서류함 카드 오버레이

촬영은 반드시 `--out shots/<자기이름>` 로 분리한다 — 기본 출력은 공유라 report.json 이 서로 덮인다.
`SHOT_PORT=<고유번호>` 로 포트 충돌을 피한다. GPU 락 대기 로그는 정상이니 죽이지 말고 기다린다.

## 8. 수용 기준 (기계 판정 — 전건 통과가 완료 조건)

형용사로 자평하지 않는다. 아래 명령을 실제로 돌리고 출력을 결과 보고에 붙인다.

**A1.**

```bash
SHOT_PORT=5925 node tools/shoot.mjs --out shots/p1-05 ui-loading ui-title ui-settings
```
→ 3샷 성공 · 콘솔 0 · P6 정지샷 판정에서 D7(2026년 웹 UI 냄새) 무발생 — 시스템 폰트·기본 버튼·라운드 코너 카드·이모지 0

**A2.**

```bash
node tools/playthrough.mjs --fast --assert-boot
```
→ boot:progress{done,total}가 total까지 단조 증가 후 타이틀 · 첫 입력 제스처 뒤에야 AudioContext 활성화·포인터록 요청 · 그 직후가 0:00 기점

**A3.**

```bash
node tools/playthrough.mjs --fast --assert-settings
```
→ settings:changed가 5항목(품질·FOV·감도·자막·볼륨) 전건 발화 · Esc 1회로 game:pause{on:true} 발화되고 렌더는 지속

**A4.**

```bash
node tools/playthrough.mjs --fast --stats
```
→ ?stats=1 오버레이가 frametime p50/p95·드로우콜·메모리를 출력하고 high 60fps / medium 30fps 게이트를 판정한다

## 9. 금지 사항

### 9.1 이 티켓 고유

- src/core/** 수정 — 잠김이다. 부트 진행 신호는 main.js의 훅으로만 낸다.
- 수동 저장·로드 슬롯 추가 — 체크포인트는 막 경계 자동 1슬롯뿐이다(E8 §4).
- 키바인드 설정 — 명시적 범위 외다(E8 §2 표).
- 품질 프리셋의 무리로드 전환 — ?q= URL 재작성 + 리로드가 정본이고 재론 금지다.
- 로딩 중 오디오 선재생 — 제스처 게이트 전에는 소리가 없다(E8 §3).
- 시스템 폰트·기본 버튼·라운드 코너 카드·이모지 — D7 실격이다.
- cinematics 메서드 직접 호출 — 타이틀 통과는 title:proceed {mode} 발화로만 넘긴다. 발신(이 티켓)과 수신(T-P1-07)이 다른 발주라 접면은 이벤트뿐이다(E8 §3).

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

### 11.5 docs/design/E9-gates.md § 3. goal 계약 형식 (전 구현 Phase 공통 — 중단 조건 없는 goal 루프 금지)

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

### 11.6 docs/HANDOFF.md § 형식

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

