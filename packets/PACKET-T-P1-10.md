# 패킷 T-P1-10 — gameplay QA 하네스 — qa 구동·관측부

> 이 문서 하나로 완결된다. **패킷 밖 문서를 열지 마라** — 필요한 계약 원문·데이터·규약은
> 전부 아래에 인라인돼 있다. 그래도 질문이 생기면 그건 이 패킷의 결함이니,
> 추측해서 진행하지 말고 §10 반환 형식의 `CONTRACT_CHANGE_REQUEST` 로 되돌려라.
> 자동 생성물 — 손으로 고치지 않는다. 원천: `data/manifest/T-P1-10.json` · 생성기: `tools/packet-gen.mjs`

## 1. goal 계약

```
/goal gameplay QA 하네스 — qa 구동·관측부 — T-P1-10
통과 조건: §8 수용 기준 3건 전건 통과 · 콘솔 에러·경고 0 · §9 금지 사항 위반 0
중단 조건: 라운드 상한 1회 · 서브에이전트 토큰 상한 150만
           (PROMPT-build-p1.md 의 P1 전체 상한 14회·1500만을 티켓 10장으로 나눈 몫)
           상한 도달 시 라운드 경계에서 끊고 §10 형식으로 인수인계한다. 중단 조건 없는 루프 금지.
```

- **타입**: tool · **배정 모델**: codex · **상태**: todo
- **라운드 규율**: 단일 담당 · 단일 목표 · 사전 기준선 → 사후 기계 게이트 · 라운드 단위 커밋.
  회귀면 롤백한다. 판 갱신은 개선일 때만.

## 2. 소유 파일 (배타)

이 목록 밖의 파일은 **읽기만** 한다. 남의 파일을 고쳐야 하면 §10.1 형식으로 반환한다 —
"그 담당이 지금 안 보인다"는 안전 신호가 아니다.

- `src/gameplay/player.js` — **구역 한정** — qa 구동·관측 절 (이 구역 밖은 남의 것이다)
- `src/gameplay/evidence.js` — **구역 한정** — qa 관측·lore:heard 절 (이 구역 밖은 남의 것이다)

## 3. 선행 의존

아래 티켓의 산출이 이미 트리에 있다고 전제한다. 없으면 착수하지 말고 반환하라.

- `T-P1-01` — 로비 정식 레벨 · 상태 todo

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

### 4.2 ARCH §4 Engine API

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

### 4.4 ARCH §9 스크린샷·QA 하네스 계약

*왜 읽는가: qaId 슬러그 정본·qa API 시그니처·샷 엔트리 추가 규약.*

<!-- 원문: docs/ARCHITECTURE.md § 9. 스크린샷·QA 하네스 계약 -->
게임은 반드시 `window.__CECIL__`을 노출한다 (core가 처리). 각 레벨/시네마틱 에이전트는 `core/shotlist.js`에 **엔트리를 추가**한다 (기존 엔트리 수정 금지).

**완주 봇 구동 API *(v2 — `__CECIL__.qa`, QA 모드 전용)***
- 타깃 명명: 상호작용 오브젝트의 `userData.qaId` = case-graph `obtain.where` 슬러그 그대로
  (`lobby/front-desk` 등). 레벨 모듈이 배치 시 부여할 의무를 진다. **비증거 타깃의 정본
  qaId**: NPC 심문 개시 `npc/deitch`·`npc/ruiz`·`npc/pryce`·`npc/doyle` · 막 전환
  `lobby/elevator`·`stairs-roof/door` · 층계창 관찰 `stairs-roof/window` · 괴담 매체는
  lore의 media 값 그대로(`radio-lobby`·`linen-wall`·`lobby-frame`; `register-margin`은
  register 관찰에 포함). 스폰 증거는 case-graph obtain에 `where`를 병기한다
  (footprints = `corridor9/footprints`).
- 구동(gameplay 구현): `qa.list()` 현재 공간 qaId 목록 · `qa.goto(qaId)` 텔레포트 ·
  `qa.walk(qaId)` 등속 보행 이동(직선+웨이포인트, 경로 실패 시 goto 폴백+로그) ·
  `qa.interact(qaId)` 상호작용. interact/walk는 gameplay가 자기 경로로 `player:interact`를
  발화하므로 §5 발신 방향 계약과 충돌하지 않는다.
- 심문·지목 입력([UI] 구현): `qa.choose({sid, choice, evidence?})` — UI의
  `interrogation:choose` 발신 경로를 대리 구동 · `qa.link(linkId)` — 증거판 `deduction:present`
  대리 · `qa.sign()` — 조서 서명(`deduction:sign`) 대리 · `qa.notebook({op, arg?})` —
  수사노트 구동(op: open/close/tab/scrub/inspect — C3 스크럽·반사 상호작용 재현용).
- 관측(gameplay 구현): `qa.state()` → `{act, evidence[], burned[], flags[], room}` 읽기 전용
  스냅샷 · `qa.events(sinceIndex?)` → 버스 이벤트 링버퍼(QA 모드에서 gameplay가 기록).
  봇은 버스를 직접 발화·구독하지 않는다.
- 완주 봇 2모드: `--fast`(goto — 도달성·이벤트 검증, P1 게이트) / `--paced`(walk + E2 표의
  t를 행동 스케줄로 — 행 t에 행동 개시, 콘텐츠가 슬롯을 넘치면 지연으로 기록. P3 판정 =
  막 경계 실측(스케줄+지연) +40% 상한 검출 + 무사건 ≤3:00. 하한 -40%는 스케줄 구동에서
  자동 충족되므로 실질 게이트는 지연 검출이다). QA 모드(`?qa=1`) 밖에서 이 API는 비노출.

```js
// core/shotlist.js
export const SHOTS = {
  'lobby-wide':   { pos:[x,y,z], target:[x,y,z], fov:35, time: 12.0, act:1, note:'로비 전경' },
}
```

`npm run shot -- lobby-wide` → `shots/lobby-wide.png` (2560x1440). 인자 없으면 전체.

### 4.5 ARCH §10 결정론

*왜 읽는가: Math.random()·Date.now() 금지. rng(seed)·engine.time 만 쓴다.*

<!-- 원문: docs/ARCHITECTURE.md § 10. 결정론 -->
- `Math.random()` 직접 호출 금지. `core/util.js`의 `rng(seed)` 사용.
- `Date.now()` / `performance.now()` 직접 호출 금지. `engine.time` 사용.
- QA 모드(`?qa=1`)에서 시간은 하네스가 고정 스텝으로 전진시킨다.

### 4.6 ARCH §11 코드 스타일

*왜 읽는가: ESM·세미콜론 없음·2스페이스·작은따옴표·파일당 500줄·콘솔 0.*

<!-- 원문: docs/ARCHITECTURE.md § 11. 코드 스타일 -->
- ESM, 세미콜론 없음, 2스페이스, 작은따옴표.
- 파일당 500줄 이하. 넘으면 같은 소유 디렉터리 안에서 분할.
- 주석은 "왜"만. "무엇"은 코드로.
- 콘솔 에러/경고 0 — QA가 콘솔을 읽고 실격 처리한다.

### 4.7 ARCH §9 qa API 정본

*왜 읽는가: qaId 슬러그 정본 목록 · list/goto/walk/interact/state/events 시그니처 · ?qa=1 게이팅.*

<!-- 원문: docs/ARCHITECTURE.md § 9. 스크린샷·QA 하네스 계약 -->
게임은 반드시 `window.__CECIL__`을 노출한다 (core가 처리). 각 레벨/시네마틱 에이전트는 `core/shotlist.js`에 **엔트리를 추가**한다 (기존 엔트리 수정 금지).

**완주 봇 구동 API *(v2 — `__CECIL__.qa`, QA 모드 전용)***
- 타깃 명명: 상호작용 오브젝트의 `userData.qaId` = case-graph `obtain.where` 슬러그 그대로
  (`lobby/front-desk` 등). 레벨 모듈이 배치 시 부여할 의무를 진다. **비증거 타깃의 정본
  qaId**: NPC 심문 개시 `npc/deitch`·`npc/ruiz`·`npc/pryce`·`npc/doyle` · 막 전환
  `lobby/elevator`·`stairs-roof/door` · 층계창 관찰 `stairs-roof/window` · 괴담 매체는
  lore의 media 값 그대로(`radio-lobby`·`linen-wall`·`lobby-frame`; `register-margin`은
  register 관찰에 포함). 스폰 증거는 case-graph obtain에 `where`를 병기한다
  (footprints = `corridor9/footprints`).
- 구동(gameplay 구현): `qa.list()` 현재 공간 qaId 목록 · `qa.goto(qaId)` 텔레포트 ·
  `qa.walk(qaId)` 등속 보행 이동(직선+웨이포인트, 경로 실패 시 goto 폴백+로그) ·
  `qa.interact(qaId)` 상호작용. interact/walk는 gameplay가 자기 경로로 `player:interact`를
  발화하므로 §5 발신 방향 계약과 충돌하지 않는다.
- 심문·지목 입력([UI] 구현): `qa.choose({sid, choice, evidence?})` — UI의
  `interrogation:choose` 발신 경로를 대리 구동 · `qa.link(linkId)` — 증거판 `deduction:present`
  대리 · `qa.sign()` — 조서 서명(`deduction:sign`) 대리 · `qa.notebook({op, arg?})` —
  수사노트 구동(op: open/close/tab/scrub/inspect — C3 스크럽·반사 상호작용 재현용).
- 관측(gameplay 구현): `qa.state()` → `{act, evidence[], burned[], flags[], room}` 읽기 전용
  스냅샷 · `qa.events(sinceIndex?)` → 버스 이벤트 링버퍼(QA 모드에서 gameplay가 기록).
  봇은 버스를 직접 발화·구독하지 않는다.
- 완주 봇 2모드: `--fast`(goto — 도달성·이벤트 검증, P1 게이트) / `--paced`(walk + E2 표의
  t를 행동 스케줄로 — 행 t에 행동 개시, 콘텐츠가 슬롯을 넘치면 지연으로 기록. P3 판정 =
  막 경계 실측(스케줄+지연) +40% 상한 검출 + 무사건 ≤3:00. 하한 -40%는 스케줄 구동에서
  자동 충족되므로 실질 게이트는 지연 검출이다). QA 모드(`?qa=1`) 밖에서 이 API는 비노출.

```js
// core/shotlist.js
export const SHOTS = {
  'lobby-wide':   { pos:[x,y,z], target:[x,y,z], fov:35, time: 12.0, act:1, note:'로비 전경' },
}
```

`npm run shot -- lobby-wide` → `shots/lobby-wide.png` (2560x1440). 인자 없으면 전체.

### 4.8 E7 §4 괴담 매체

*왜 읽는가: lore:heard 발화 조건 — 매체 4종과 id 매핑.*

<!-- 원문: docs/design/E7-presentation.md § 4. 괴담 연출 — 매체 구현 (본문: STORY §7, 데이터: case-graph `lore`) -->
| 매체 | 구현 | 이벤트 |
|---|---|---|
| `radio-lobby` | 디제틱 라디오 루프 — 첫 30초에 반 문장 선노출, 상호작용 시 전문. 다이치가 주파수를 돌리는 반응(E4) | `lore:heard {id:'lore.pipes', medium:'radio-lobby'}` |
| `register-margin` | register 관찰 클로즈업의 여백 낙서 — 증거 검사와 같은 뷰어, 다른 레이어 | `lore:heard` (lore.lightwell) |
| `linen-wall` | 린넨실 벽 데칼(긁어 쓴 글씨) 관찰 | `lore:heard` (lore.linen·lightwell) |
| `lobby-frame` | 로비 개업 연혁 판 관찰 — 마지막 줄만 다른 손글씨 | `lore:heard` (lore.1912) |

수집된 괴담은 수사노트 괴담 면(E8 §2)에 축적 — 증거 면과 **물리적으로 구분된 지면**
(괴담은 증거가 아니라는 시스템 발화). 괴담 유닛은 지목판에 올라올 수 없다(N4·F4 이중 차단).

---

### 4.9 E6 §2 공통 계약

*왜 읽는가: qaId = case-graph obtain.where 슬러그. 레벨이 부여하고 gameplay가 소비한다.*

<!-- 원문: docs/design/E6-spaces.md § 2. 공통 계약 -->
- 진입 이벤트: 각 레벨은 `room:changed {room}` 발화 — **room 값은 ARCH v2 §5의 정본
  어휘만**(lobby/elevator/corridor9/linen/room942/bathroom942/room944/stairs-roof/rooftop).
  `core/shotlist.js`에 자기 샷 엔트리 **추가**(기존 수정 금지). 증거 오브젝트는
  `gameplay/evidence.js`의 수집 규약 소비 + `userData.qaId` = case-graph `obtain.where`
  슬러그 부여(완주 봇 구동 계약, ARCH v2 §9).
- 충돌: 걷기 가능 바닥·벽은 physics 정적 등록 API 경유(ARCH v2 §8 규약) — QA 프로브의
  레이캐스트 폴백 의존 금지.
- 상호작용 밀도(권역 차등 — "정보 있는 상호작용" = 증거+환경서사+괴담 매체 합산.
  관찰 문구의 진실원은 STORY §6 — 목록의 전 항목이 §6에 문장을 가진다):
  - 로비 **7**: register(+여백 낙서 lore.lightwell) · keyrack · flask · 라디오(lore.pipes) ·
    개업 연혁 판(lore.1912) · 소파 팔걸이 · 프런트 압지(필적 모티프의 선노출).
  - 복도+린넨실 **6**: footprints · linen-wall 낙서(lore.linen·lightwell) · 카펫 띠 ·
    회색 팻말 · 채광정 난간 · 린넨 카트.
  - 942+욕실 **6**: journal · roofkey · sink-trap · autopsy · 눌린 침대/액자 자국 · 양동이.
  - 944 **4**: water-log · 스크랩 벽(최근 1장) · 재떨이 · 커튼 틈.
  - 옥상+계단참 **6**: hatch-lock · wrench · shoes · 층계창 · 열린 탱크 3개 · 고인 물·배수구.
- NPC·시네마틱 앵커: 레벨은 빈 Object3D 앵커만 배치(`userData.anchor` — 정본 값 목록은
  ARCH v2 §8 앵커 규약). 리그·실루엣 실체는 chars 모듈이 자기 배치, `npc:sighted` 발화는
  레벨 소유 유지.
- 성능: 레벨 라운드는 프레임 예산 게이트(high 60fps / medium 30fps, `?stats=1` 계측) 선행
  없이 진입 금지(MASTER-PLAN §6).

---

## 5. 입력 데이터

### 5.1 case-graph 노드 (`docs/design/case-graph.json` 발췌 — 이 값이 정본이다)

```json
// evidence
{
  "id": "register",
  "title": "숙박부",
  "act": 1,
  "origin": "FB12",
  "supports": [
    "FS4",
    "FB12"
  ],
  "refutes": [
    "deitch.S2"
  ],
  "obtain": [
    {
      "via": "search",
      "where": "lobby/front-desk"
    }
  ]
}
// evidence
{
  "id": "keyrack",
  "title": "열쇠 걸이",
  "act": 1,
  "origin": "FB3",
  "supports": [
    "FB3"
  ],
  "refutes": [
    "deitch.S4"
  ],
  "obtain": [
    {
      "via": "search",
      "where": "lobby/behind-desk"
    }
  ]
}
// evidence
{
  "id": "flask",
  "title": "위스키 플라스크",
  "act": 1,
  "origin": "FC2",
  "supports": [
    "FC2"
  ],
  "refutes": [],
  "obtain": [
    {
      "via": "search",
      "where": "lobby/under-desk"
    }
  ]
}
// lore
{
  "id": "lore.pipes",
  "rumor": "9층에서 물소리가 나면 비가 온다",
  "media": [
    "radio-lobby"
  ],
  "materialTruth": "노후 배관의 공명 — 이 소문이 넬의 밤과 아이리스의 밤의 소리를 선제적으로 무해화해 왔다",
  "contactFact": "FB6"
}
// lore
{
  "id": "lore.lightwell",
  "rumor": "9층에서 떨어진 여자가 아직 내려가는 중이다",
  "media": [
    "register-margin",
    "linen-wall"
  ],
  "materialTruth": "넬 사건의 왜곡 전승",
  "contactFact": "FA6"
}
// lore
{
  "id": "lore.1912",
  "rumor": "1912년 개업. 지진 해에 지하 저장고를 잠갔고 열쇠는 강에 버렸다",
  "media": [
    "lobby-frame",
    "radio-lobby"
  ],
  "materialTruth": "금주법 시대 밀주 저장고 폐쇄 — 사건 접점 없음",
  "contactFact": null
}
// lore
{
  "id": "lore.linen",
  "rumor": "린넨실 세탁물이 밤마다 다시 젖는다",
  "media": [
    "linen-wall"
  ],
  "materialTruth": "옥상 배관 결로 — 사건 접점 없음",
  "contactFact": null
}
```

그래프가 틀렸다고 판단되면 고치지 말고 §10.1 로 반환한다 — case-graph 는 E3 소유다.

## 6. 이벤트 계약

- **발화(emit)**: `lore:heard`
- **구독(listen)**: 없음

ARCHITECTURE §5 표의 해당 행 (payload·발신자 정본):

| 이벤트 | payload | 발신 |
|---|---|---|
| `lore:heard` | `{id, medium}` | gameplay — 괴담 유닛 접촉, 노트 괴담 면 축적 *(v2)* |

표에 없는 이벤트 이름을 새로 만들지 않는다. 발신 방향(누가 쏘는가)도 표가 정본이다.

## 7. 샷

이 티켓은 샷 엔트리를 쓰지 않는다(로그·배터리로 판정). `core/shotlist.js` 를 건드리지 마라.

## 8. 수용 기준 (기계 판정 — 전건 통과가 완료 조건)

형용사로 자평하지 않는다. 아래 명령을 실제로 돌리고 출력을 결과 보고에 붙인다.

**A1.**

```bash
node tools/playthrough.mjs --fast --act 1
```
→ 봇이 qa API만으로 1막을 구동 성립 — qa.list()/goto()/walk()/interact()/state()/events()가 전건 동작

**A2.**

```bash
node tools/playthrough.mjs --fast --assert-lore
```
→ lore:heard 4종(lore.pipes·lore.lightwell·lore.1912·lore.linen)이 골든 패스 도달 지점에서 발화되고 노트 괴담 면에 축적

**A3.**

```bash
node tools/playthrough.mjs --no-qa --assert-hidden
```
→ ?qa=1 없이 로드했을 때 window.__CECIL__.qa가 undefined — QA API가 출하 빌드에 노출되지 않는다

## 9. 금지 사항

### 9.1 이 티켓 고유

- qa API를 ?qa=1 밖에서 노출하는 것 — 출하 빌드에 구동 API가 남으면 안 된다.
- 봇이 버스를 직접 만지게 하는 우회로 제공 — 관측은 qa.events() 링버퍼로만.
- player.js·evidence.js의 qa 절 밖 편집 — 컨트롤러·수집 규약 본체는 [GAMEPLAY] 기존 소유다.
- qaId 슬러그 임의 명명 — case-graph obtain.where와 ARCH §9 비증거 목록이 정본이다.
- Date.now()/Math.random() 직호출 — QA 모드 시간은 하네스가 고정 스텝으로 전진시킨다.

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

- 수용 기준 A1~A3 각각의 **실제 명령 출력**을 붙인다. 요약 서술로 대체하지 않는다.
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

### 11.4 docs/design/E9-gates.md § 3. goal 계약 형식 (전 구현 Phase 공통 — 중단 조건 없는 goal 루프 금지)

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

### 11.5 docs/HANDOFF.md § 형식

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

