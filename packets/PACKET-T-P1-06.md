# 패킷 T-P1-06 — 완주 봇 — 골든 패스 소비 + 캡처 모드

> 이 문서 하나로 완결된다. **패킷 밖 문서를 열지 마라** — 필요한 계약 원문·데이터·규약은
> 전부 아래에 인라인돼 있다. 그래도 질문이 생기면 그건 이 패킷의 결함이니,
> 추측해서 진행하지 말고 §10 반환 형식의 `CONTRACT_CHANGE_REQUEST` 로 되돌려라.
> 자동 생성물 — 손으로 고치지 않는다. 원천: `data/manifest/T-P1-06.json` · 생성기: `tools/packet-gen.mjs`

## 1. goal 계약

```
/goal 완주 봇 — 골든 패스 소비 + 캡처 모드 — T-P1-06
통과 조건: §8 수용 기준 4건 전건 통과 · 콘솔 에러·경고 0 · §9 금지 사항 위반 0
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

- `tools/playthrough.mjs` — 파일 전체 · 신설

## 3. 선행 의존

아래 티켓의 산출이 이미 트리에 있다고 전제한다. 없으면 착수하지 말고 반환하라.

- `T-P1-01` — 로비 정식 레벨 · 상태 todo
- `T-P1-04` — 심문 1건 E2E — 소각 직렬화 포함 · 상태 todo

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

### 4.2 ARCH §9 스크린샷·QA 하네스 계약

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

### 4.4 ARCH §10 결정론

*왜 읽는가: Math.random()·Date.now() 금지. rng(seed)·engine.time 만 쓴다.*

<!-- 원문: docs/ARCHITECTURE.md § 10. 결정론 -->
- `Math.random()` 직접 호출 금지. `core/util.js`의 `rng(seed)` 사용.
- `Date.now()` / `performance.now()` 직접 호출 금지. `engine.time` 사용.
- QA 모드(`?qa=1`)에서 시간은 하네스가 고정 스텝으로 전진시킨다.

### 4.5 E9 §2 기계 게이트 총목록

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

### 4.6 E2 완주 타임라인

*왜 읽는가: 봇 시나리오의 진실원 — 행을 {t, action, expect} 시퀀스로 파싱한다.*

<!-- 원문: docs/design/E2-golden-path.md § 완주 타임라인 (최선 루트, 50:00) -->
### 1막 — 로비 (0:30–10:30, 10분)

| 시각 | 사건 | 트리거/산출 (case-graph 결박) |
|---|---|---|
| 0:30–2:00 | 로비 수색: 숙박부(여백 낙서 포함)·열쇠 걸이(942와 ROOF 고리가 비었다)·데스크 아래 플라스크 관찰 · 라디오 상호작용 · 개업 연혁 판(마지막 줄만 다른 손글씨) | `register` `keyrack` `flask` 획득/관찰 · `lore:heard` ×3(lore.pipes·lore.lightwell·lore.1912) |
| 2:00–2:45 | 다이치 심문 개시 — S1(진실): 2주치 현금 선납 | TRUTH → 보너스 정보 |
| 2:45–3:45 | **C1** S2(거짓): "나가시는 걸 봤습니다. 제 기억으론" — 노트를 열고, 숙박부를 내민다. "나간 사람 방에 왜 물수건 값이 붙습니까." 다이치가 반 발짝 물러선다 | LIE+`register` → `deitch-recanted` · 카메라 푸시인→오답 아닌 후퇴 없음 |
| 3:45–5:00 | S3(진실): 수압 민원 — 장부를 내준다. "도일 씨가 봤습니다. 늘 그 사람이 봅니다" | TRUTH → `pressure-log` 획득 |
| 5:00–6:00 | S4(거짓): "옥상 열쇠는 관리인만" — 열쇠 걸이를 내민다. "…분실입니다. 그런 건 늘 있습니다" | LIE+`keyrack` → 부분 성공, 2막 재심문 개방 |
| 6:00–7:00 | S5(진실): 944호 프라이스 언급 — "물어보면 대답을 해버리거든요" | TRUTH → 2막 동선 예고 |
| 7:00–8:00 | 심문 종료 페이즈 — 도일이 로비를 통과한다. 렌치. 무언. 다이치의 문장이 멎는다 | `npc:sighted`(doyle, 렌치) · `act:phase` |
| 8:00–10:30 | 엘리베이터 격자문 — 9층 상승. 층 표시등 불빛이 얼굴을 쓸고 지나간다. **문이 열리면 오전이다 — 복도 끝 창으로 흐린 아침빛**(막 경계 = 픽션 시간 경과, 자막 없이 빛으로 선언) | `act:enter {act:2}` (10:30) |

### 2막 — 9층·942·944 (10:30–35:30, 25분)

| 시각 | 사건 | 트리거/산출 |
|---|---|---|
| 10:30–12:00 | 9층 복도: 카펫의 옅어진 띠(942→계단), 회색 팻말이 걸린 942 문, 린넨 카트 원경 | 환경서사(E6) |
| 12:00–12:45 | 루이즈 S1(진실): "팻말이 걸려 있었으니까" — 회색 팻말은 창고 것 | TRUTH → FB10 단서 |
| 12:45–14:00 | 루이즈 S2(거짓): "아무 소리도 못 들었어요" — 민원 장부의 서명을 내민다. "…두 사람이었어요. 한 사람은 말을 안 했어요" | LIE+`pressure-log` → `two-voices` · 복도에 `footprints` 출현 |
| 14:00–14:40 | 복도로 나와 젖은 발자국 관찰 — 작업화, 265mm, 942호에서 계단 쪽으로 | `footprints` 획득 |
| 14:40–16:00 | 루이즈 S3(진실): "위로 올라간 거구나" · S4(거짓): "말도 잘 안 해요" — 발자국을 내민다. 루이즈가 앉는다. "작년에도 그랬어요" | LIE+`footprints` → `doyle-pattern` |
| 16:00–21:00 | 942호 수색 5개소: 침대 밑 찢긴 일기(17:00) · 매트리스 밑 옥상 열쇠(18:00) — **관찰 확대에서 태그 필적=숙박부 필적 인지(FB3 결박, 노트에 대조 주석·재심문 개방 조건)** · 욕실 트랩 침전물(19:00) · 여행가방 부검 사본(20:00) · 벽의 액자 자국·한쪽만 눌린 침대(관찰) | `journal` `roofkey`(+필적 주석) `sink-trap` `autopsy` |
| 21:00–23:30 | **C2** 로비로 하강, 다이치 재심문 — 열쇠를 데스크에 놓는다. 태그가 보이게. 다이치가 안경을 벗는다. "…20달러였습니다. 딸 학비가 밀렸습니다" | LIE+`roofkey` → `deitch-confession` |
| 23:30–25:30 | 9층 복귀, 944호 — 커튼 닫힌 방, 벽 전체가 14개월 전 스크랩. 프라이스 S1(거짓): "인사만 했습니다" — 일기를 내민다. "당신 이름이 세 번 나옵니다" | LIE+`journal` → `photos` 획득 |
| 25:30–26:30 | S2(진실): 하우스 디텍티브 이력 — "그만둔 게 아니라 잘렸습니다" | TRUTH |
| 26:30–28:30 | **C3** S3(거짓): "제 소관이 아니었습니다" — 사진을 내민다. 프라이스가 사진을 뒤집는다. "…제출했더니 이틀 뒤에 잘렸습니다." **사진 스크럽 개방 — 넷째 장 유리 반사에 두 번째 형체** | LIE+`photos` → `photos-4` · 스크럽 뷰어(E8) |
| 28:30–29:30 | S4(거짓): "준 적 없습니다" — 부검 사본을 내민다. "…줬습니다. 급수 일지도 줬습니다. 그게 제가 한 겁니다" | LIE+`autopsy` → `pryce-confession` · `water-log` 획득 |
| 29:30–30:00 | S5(진실): "탱크 해치는 안에서 못 잠급니다. 4년간 매달 봤습니다" | TRUTH → 3막 L1 사전 결박 |
| 30:00–32:00 | 복도 페이즈: 보일러실에서 올라오는 배관 소리, 복도 끝 실루엣 — 서 있다가, 없다 | `npc:sighted` ×2 |
| 32:00–33:30 | 린넨실 앞 — 벽의 긁힌 낙서 "말려도 소용없다" | `lore:heard`(lore.linen) |
| 33:30–35:30 | 옥상 계단·계단참 — 층계창 관찰: 밤의 유리가 거울이 된다. 사진 4장의 촬영 지점이 현장으로 특정된다(노트 사진 면에 주석) | 층계창 관찰(FA5 결박) · 문 너머 빗소리 |
| 35:30 | 옥상 문 — 잠겨 있지 않다. **문 너머는 오후의 비**(막 경계 시간 경과) | `act:enter {act:3}` |

### 3막 — 옥상·증거판 (35:30–50:00, 14.5분)

| 시각 | 사건 | 트리거/산출 |
|---|---|---|
| 35:30–38:00 | 옥상·비. 탱크 4개 중 하나만 닫혀 잠겼다. 캣워크의 구두 — 젖지 않은 자리에 나란히. 해치 걸쇠는 바깥에. 공구함의 렌치 | `shoes` `hatch-lock` `wrench` |
| 38:00–40:00 | 도일 대면 — "사다리가 미끄럽죠." "저는 밸브만 봅니다." 지목 개시 | 심문이 아니라 지목(E5 §2) |
| 40:00–42:00 | **C5** L1: 자물쇠+구두 — "자살자는 밖에서 문을 잠글 수 없다." 도일: "그건 그 여자가 그렇게 해놓은 겁니다" | L1 성립 |
| 42:00–44:00 | **C4** L2: 급수 일지+민원 장부 — 민원은 빗발치는데 일지는 '정상'. 도일이 웃는다. "일지는 제가 씁니다. 제가 쓴 걸 저한테 들이대시는 겁니까." 그 말이 자백이다 | L2 성립 |
| 44:00–46:00 | L3: 사진+렌치 — 14개월 전 유리 반사의 형체, 손에 맞춰 감은 렌치. 도일이 웃음을 멈추지 않는다. "…삼촌한테 전화 좀 하겠습니다." "받는 사람이 없을 겁니다" | L3 성립 → 완전 엔딩 |
| 46:00 | 엔딩 시네마틱 개시 — 체포 비트 | `cinematic:start`(cin-end-full) |
| 47:30 | 재수사 개시 자막 — 넬 밴스 파일이 다시 열린다 | 시네마틱 내부 비트 |
| 48:30 | 마지막 컷 — 물탱크의 물이 빠지는 소리 | 시네마틱 내부 비트 |
| 49:00–50:00 | 크레딧 — 라디오 괴담이 다시 흐르다 끊긴다 | `cinematic:end` |

**무사건 구간 검사(M4) — 판정 규칙**: ①행의 사건 시각 t는 **구간 시작 시각 단일값**이다
(완주 봇이 간격을 기계 계산할 수 있게). ②시네마틱 구간(`cinematic:start`~`end`)은 입력
없는 저작 연출이므로 무사건 판정에서 제외 — 단 내부 비트는 위처럼 분 단위로 명기한다.
③이동·연출만 있는 구간은 사건이 아니다. 재계산 결과: 사건 t 열 = 0:30, 2:00, 2:45, 3:45,
5:00, 6:00, 7:00, 8:00, 10:30, 12:00, 12:45, 14:00, 14:40, 16:00~20:00(개소별), 21:00, 23:30,
25:30, 26:30, 28:30, 29:30, 30:00, 32:00, 33:30, 35:30, 38:00, 40:00, 42:00, 44:00, 46:00 —
**인접 간격 최대 2:30(8:00→10:30, 35:30→38:00), 3분 초과 구간 0.**

### 4.7 E2 1막

*왜 읽는가: P1 게이트가 요구하는 구간.*

<!-- 원문: docs/design/E2-golden-path.md § 1막 — 로비 (0:30–10:30, 10분) -->
| 시각 | 사건 | 트리거/산출 (case-graph 결박) |
|---|---|---|
| 0:30–2:00 | 로비 수색: 숙박부(여백 낙서 포함)·열쇠 걸이(942와 ROOF 고리가 비었다)·데스크 아래 플라스크 관찰 · 라디오 상호작용 · 개업 연혁 판(마지막 줄만 다른 손글씨) | `register` `keyrack` `flask` 획득/관찰 · `lore:heard` ×3(lore.pipes·lore.lightwell·lore.1912) |
| 2:00–2:45 | 다이치 심문 개시 — S1(진실): 2주치 현금 선납 | TRUTH → 보너스 정보 |
| 2:45–3:45 | **C1** S2(거짓): "나가시는 걸 봤습니다. 제 기억으론" — 노트를 열고, 숙박부를 내민다. "나간 사람 방에 왜 물수건 값이 붙습니까." 다이치가 반 발짝 물러선다 | LIE+`register` → `deitch-recanted` · 카메라 푸시인→오답 아닌 후퇴 없음 |
| 3:45–5:00 | S3(진실): 수압 민원 — 장부를 내준다. "도일 씨가 봤습니다. 늘 그 사람이 봅니다" | TRUTH → `pressure-log` 획득 |
| 5:00–6:00 | S4(거짓): "옥상 열쇠는 관리인만" — 열쇠 걸이를 내민다. "…분실입니다. 그런 건 늘 있습니다" | LIE+`keyrack` → 부분 성공, 2막 재심문 개방 |
| 6:00–7:00 | S5(진실): 944호 프라이스 언급 — "물어보면 대답을 해버리거든요" | TRUTH → 2막 동선 예고 |
| 7:00–8:00 | 심문 종료 페이즈 — 도일이 로비를 통과한다. 렌치. 무언. 다이치의 문장이 멎는다 | `npc:sighted`(doyle, 렌치) · `act:phase` |
| 8:00–10:30 | 엘리베이터 격자문 — 9층 상승. 층 표시등 불빛이 얼굴을 쓸고 지나간다. **문이 열리면 오전이다 — 복도 끝 창으로 흐린 아침빛**(막 경계 = 픽션 시간 경과, 자막 없이 빛으로 선언) | `act:enter {act:2}` (10:30) |

### 4.8 E2 [구현] 봇 구동 계약

*왜 읽는가: 2모드(--fast/--paced)의 의미론과 무사건 판정 규칙.*

<!-- 원문: docs/design/E2-golden-path.md § [구현] -->
- 이 표가 완주 봇 골든 패스 시나리오의 진실원: `tools/playthrough.mjs`(P1 신설, E10 티켓)가
  표의 행을 `{t, action, expect}` 시퀀스로 파싱 가능해야 한다. 행 형식 고정: 시각(사건 t =
  구간 시작 단일값) · 사건 · 트리거/산출(case-graph id 결박).
- 완주 봇 구동 계약: `window.__CECIL__.qa` API(ARCHITECTURE v2 §9 — 이동 goto/walk ·
  심문·지목 입력 choose/link · 관측 state/events. 타깃 슬러그 정본 목록도 §9) · 2모드:
  `--fast`(텔레포트 — 도달성·이벤트 검증=P1) / `--paced`(walk + **이 표의 t를 행동
  스케줄로** — 행 t에 행동 개시, 콘텐츠가 슬롯을 넘치면 지연 기록. P3 판정 = 막 경계
  실측 +40% 상한 검출 + 무사건 ≤3:00).
- **픽션 시간 구조**: 1막 새벽 2시 → 2막 오전 → 3막 오후·비 (MASTER-PLAN 표 C 승계) —
  막 경계 연출이 시간 경과를 빛으로 선언한다. 공간 무드·창광 사양(E6)은 이 시간대에 결박.
- 페이즈 전환 결박: `act:enter` 발화 시각 10:30 / 35:30. 막 경계 체크포인트 저장
  (`checkpoint:saved`)은 전환 직후 — **복원 권한은 진행 저장 전용, 소각·플래그는 복원 후에도
  유지된다(E8 §4). 이 경계가 E1 코어("틀린 수는 되돌아오지 않는다")의 저장 측 이행이다.**
- 이동 구간의 체감: 엘리베이터 상승(8:00)·옥상 계단(32:00~)은 `cin-act2`·`cin-act3`
  (E7 §2)가 연출을 소유한다 — 이동의 시간 비용은 연출 산출이지 무사건이 아니며, 시네마틱
  구간은 무사건 판정에서 제외된다(위 판정 규칙 ②).
- 첫 30초: 시네마틱 시퀀스 사양(초 단위 표)은 `narrative/cinematics.js` 발주의 수용 기준.
  30초 시퀀스 캡처 판정(P2)이 이 표와 대조한다.

### 4.9 E2 부록 B 캡처 목록

*왜 읽는가: --capture 가 덤프할 구간의 정본 좌표.*

<!-- 원문: docs/design/E2-golden-path.md § 부록 B — 게이트 판정 캡처 대상 목록 (P2·P4 판정 입력) -->
게이트 판정에 쓰는 캡처의 정본 좌표: **P2 판정** = 첫 30초 시퀀스(0:00–0:30, 위 표와 행
단위 대조) · **P4 판정** = C1 오답 변형 시퀀스(2:45 지점에서 오답 증거 제시 → 카메라 반
발짝 캡처. **룸톤 -6dB·3초는 화면 캡처가 아니라 test-audio 배터리가 증빙**한다 —
E7 [구현] 수용 기준) · **클러치 검증** = C1~C5 각 좌표의 완주 봇 재현 캡처. 데모·트레일러가
필요해지면 이 목록에서 파생한다(별도 저작 없음).

---

### 4.10 AGENTS.md 샷 하네스 규약

*왜 읽는가: GPU 락·--out 분리·SHOT_PORT 규약 — 봇도 같은 규약을 따른다.*

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

## 5. 입력 데이터

## 6. 이벤트 계약

이 티켓은 버스를 발화하지도 구독하지도 않는다. 새 이벤트 이름을 만들지 마라 —
필요하면 §10.1 로 반환한다.

## 7. 샷

이 티켓은 샷 엔트리를 쓰지 않는다(로그·배터리로 판정). `core/shotlist.js` 를 건드리지 마라.

## 8. 수용 기준 (기계 판정 — 전건 통과가 완료 조건)

형용사로 자평하지 않는다. 아래 명령을 실제로 돌리고 출력을 결과 보고에 붙인다.

**A1.**

```bash
node tools/playthrough.mjs --fast --act 1
```
→ 1막 완주 로그 출력 · qa.goto/interact 경로로 증거 4종 획득 · act:enter{act:2} 도달 · exit 0

**A2.**

```bash
node tools/playthrough.mjs --paced --act 1
```
→ E2 표의 t를 행동 스케줄로 소비 — 행 t에 행동 개시, 지연을 초 단위로 기록. 막 경계 실측이 스케줄 +40% 상한 안, 무사건 간격 ≤3:00

**A3.**

```bash
node tools/playthrough.mjs --capture first30 --out shots/p1-06
```
→ 0:00–0:30 프레임 시퀀스 덤프 — E2 §첫 30초 표의 5행과 초 단위 대조 가능한 파일명(t 각인)

**A4.**

```bash
node tools/lint-contract.mjs
```
→ 위반 0 — 특히 Date.now() 직호출(봇 시간도 결정론적 스텝)

## 9. 금지 사항

### 9.1 이 티켓 고유

- 봇이 engine.bus를 직접 발화·구독하는 것 — 구동은 __CECIL__.qa API로만, 관측은 qa.state()/qa.events()로만(ARCH §9).
- 게임 코드(src/**) 수정 — 봇이 돌지 않으면 그건 qa API의 결함이고 CONTRACT_CHANGE_REQUEST로 반환한다.
- E2 표를 봇에 하드코딩 복사 — 표를 파싱해서 소비한다. 표가 정본이다.
- Date.now()/Math.random() 직호출 — 봇 실행이 재현 가능해야 판정 입력이 된다.
- 별도 시퀀스 캡처 도구 신설 — 캡처는 이 봇에 통합한다(E10 T-P1-06).

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

### 11.3 docs/ARCHITECTURE.md § 11. 코드 스타일

<!-- 원문: docs/ARCHITECTURE.md § 11. 코드 스타일 -->
- ESM, 세미콜론 없음, 2스페이스, 작은따옴표.
- 파일당 500줄 이하. 넘으면 같은 소유 디렉터리 안에서 분할.
- 주석은 "왜"만. "무엇"은 코드로.
- 콘솔 에러/경고 0 — QA가 콘솔을 읽고 실격 처리한다.

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

