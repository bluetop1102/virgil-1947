# 패킷 T-P1-02 — 다이치 리그 — 절차 휴머노이드 + 식별 소품

> 이 문서 하나로 완결된다. **패킷 밖 문서를 열지 마라** — 필요한 계약 원문·데이터·규약은
> 전부 아래에 인라인돼 있다. 그래도 질문이 생기면 그건 이 패킷의 결함이니,
> 추측해서 진행하지 말고 §10 반환 형식의 `CONTRACT_CHANGE_REQUEST` 로 되돌려라.
> 자동 생성물 — 손으로 고치지 않는다. 원천: `data/manifest/T-P1-02.json` · 생성기: `tools/packet-gen.mjs`

## 1. goal 계약

```
/goal 다이치 리그 — 절차 휴머노이드 + 식별 소품 — T-P1-02
통과 조건: §8 수용 기준 2건 전건 통과 · 콘솔 에러·경고 0 · §9 금지 사항 위반 0
중단 조건: 라운드 상한 1회 · 서브에이전트 토큰 상한 150만
           (PROMPT-build-p1.md 의 P1 전체 상한 14회·1500만을 티켓 10장으로 나눈 몫)
           상한 도달 시 라운드 경계에서 끊고 §10 형식으로 인수인계한다. 중단 조건 없는 루프 금지.
```

- **타입**: rig · **배정 모델**: codex · **상태**: todo
- **라운드 규율**: 단일 담당 · 단일 목표 · 사전 기준선 → 사후 기계 게이트 · 라운드 단위 커밋.
  회귀면 롤백한다. 판 갱신은 개선일 때만.

## 2. 소유 파일 (배타)

이 목록 밖의 파일은 **읽기만** 한다. 남의 파일을 고쳐야 하면 §10.1 형식으로 반환한다 —
"그 담당이 지금 안 보인다"는 안전 신호가 아니다.

- `src/chars/rig.js` — 파일 전체 · 신설

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

### 4.4 ARCH §6 재질 계약

*왜 읽는가: 재질은 mat() 경유만. 등록명 밖 이름은 마젠타로 드러난다.*

<!-- 원문: docs/ARCHITECTURE.md § 6. 재질 계약 (MATERIALS 소유, 전원 소비) -->
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

### 4.5 ARCH §8 지오메트리 규약

*왜 읽는가: 베벨·시드 변주·그라운딩·physics 정적 등록·앵커 규약.*

<!-- 원문: docs/ARCHITECTURE.md § 8. 지오메트리 규약 -->
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

### 4.6 ARCH §10 결정론

*왜 읽는가: Math.random()·Date.now() 금지. rng(seed)·engine.time 만 쓴다.*

<!-- 원문: docs/ARCHITECTURE.md § 10. 결정론 -->
- `Math.random()` 직접 호출 금지. `core/util.js`의 `rng(seed)` 사용.
- `Date.now()` / `performance.now()` 직접 호출 금지. `engine.time` 사용.
- QA 모드(`?qa=1`)에서 시간은 하네스가 고정 스텝으로 전진시킨다.

### 4.7 ARCH §11 코드 스타일

*왜 읽는가: ESM·세미콜론 없음·2스페이스·작은따옴표·파일당 500줄·콘솔 0.*

<!-- 원문: docs/ARCHITECTURE.md § 11. 코드 스타일 -->
- ESM, 세미콜론 없음, 2스페이스, 작은따옴표.
- 파일당 500줄 이하. 넘으면 같은 소유 디렉터리 안에서 분할.
- 주석은 "왜"만. "무엇"은 코드로.
- 콘솔 에러/경고 0 — QA가 콘솔을 읽고 실격 처리한다.

### 4.8 E4 §1 다이치 카드

*왜 읽는가: 실루엣이 말해야 하는 것 — 목소리 지문·공간 앵커·심문 아크.*

<!-- 원문: docs/design/E4-characters.md § 다이치 (마를로 다이치, 51 — 야간 프런트 16년차) -->
- **목소리 지문**: 방어적 존대. 짧은 완결문. 확언을 "제 기억으론"으로 흐린다. 문장 끝 음량이 죽는다.
- **괴담 태도**: 안 믿는 척한다. 그러나 밤소리 목록을 꿰고 있다 — 라디오 괴담이 나오면 주파수를 돌린다.
- **공간 앵커**: 프런트데스크. 데스크를 떠난 모습은 게임 전체에 한 번도 나오지 않는다.
- **막별 프리젠스**: 1막 심문 · 2막 재심문(`roofkey` 조건부) · 3막 부재(엔딩 컷에서만).
- **심문 아크**: 직업적 방어 → 첫 후퇴(C1, 숙박부) → 부분 시인(열쇠 걸이) → **붕괴(C2,
  필적 — 안경을 벗는다)**. 그의 거짓은 살인 은폐가 아니라 생계 은폐다 — 붕괴가 자백이
  아니라 딸 학비 이야기로 끝나는 이유.

### 4.9 E4 §3 리그·연기 구현 계약

*왜 읽는가: 실루엣 우선(G10)·식별 소품(안경+조끼)·페이셜 없음·rng(seed) 결정론.*

<!-- 원문: docs/design/E4-characters.md § 3. 리그·연기 구현 계약 -->
- `chars/rig.js` [CHARACTERS]: 절차 휴머노이드 4종 — 실루엣 우선(G10). 식별 소품:
  다이치 안경+조끼 · 루이즈 앞치마+천 · 프라이스 셔츠+서스펜더 · 도일 작업복+렌치.
  페이셜 없음 — 머리는 자세·시선 방향만.
- `chars/perf.js` [CHARACTERS]: 상태 4종별 루프 애니메이션 + 텔 원샷(STORY §2 신호를
  1신호=1클립으로). 클립 재생은 `perf:state` 구독으로만 트리거 — perf.js는 진위를 모른다
  (상태만 받는다). 도일 3막 반응은 `deduction:link {id, ok}` 구독(링크별 웃음의 질 변화).
  결정론: `rng(seed)`.
- 프리젠스 이벤트: `npc:sighted {npc, kind}` (ARCHITECTURE v2 §5 추가분).

---

### 4.10 ARCH §8 앵커 규약

*왜 읽는가: chars 모듈이 room:changed 구독 후 npc/deitch 앵커를 찾아 자기 배치한다.*

<!-- 원문: docs/ARCHITECTURE.md § 8. 지오메트리 규약 -->
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

## 5. 입력 데이터

### 5.1.1 docs/design/E4-characters.md § 1. 페르소나 카드

<!-- 원문: docs/design/E4-characters.md § 1. 페르소나 카드 -->
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

## 6. 이벤트 계약

- **발화(emit)**: 없음
- **구독(listen)**: `room:changed`

ARCHITECTURE §5 표의 해당 행 (payload·발신자 정본):

| 이벤트 | payload | 발신 |
|---|---|---|
| `room:changed` | `{room}` | levels |

표에 없는 이벤트 이름을 새로 만들지 않는다. 발신 방향(누가 쏘는가)도 표가 정본이다.

## 7. 샷

- `interrogation-deitch` — **기존 엔트리, 수정 금지. 촬영만 한다.** 심문 카메라 위치 — 실루엣 판독 판정용
  ```js
  'interrogation-deitch': {
  ```

촬영은 반드시 `--out shots/<자기이름>` 로 분리한다 — 기본 출력은 공유라 report.json 이 서로 덮인다.
`SHOT_PORT=<고유번호>` 로 포트 충돌을 피한다. GPU 락 대기 로그는 정상이니 죽이지 말고 기다린다.

## 8. 수용 기준 (기계 판정 — 전건 통과가 완료 조건)

형용사로 자평하지 않는다. 아래 명령을 실제로 돌리고 출력을 결과 보고에 붙인다.

**A1.**

```bash
SHOT_PORT=5922 node tools/shoot.mjs --out shots/p1-02 interrogation-deitch
```
→ 샷 1장 성공 · 콘솔 0 · 실루엣만으로 다이치 식별 가능(안경+조끼가 역광 실루엣에서 읽힌다 — G10 판정)

**A2.**

```bash
node tools/lint-contract.mjs
```
→ 위반 0 — 특히 Math.random( 직호출(리그 변주는 rng(seed))·materials 밖 재질 생성

## 9. 금지 사항

### 9.1 이 티켓 고유

- 페이셜 리그·표정 블렌드셰이프 — 머리는 자세·시선 방향만이다(E4 §3).
- 외부 모델·모션 파일 로드 — 지오메트리·스키닝 전부 절차 생성이다.
- Math.random() 직호출 — 변주는 core/util.js의 rng(seed)로만. 같은 시드에 같은 리그가 나와야 한다.
- 연기(perf) 로직 작성 — 상태별 클립은 T-P1-03 소유다. 이 티켓은 리그와 소품까지다.
- npc:sighted 발화 — 프리젠스 발화는 레벨 소유다(ARCH §8).

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

- 수용 기준 A1~A2 각각의 **실제 명령 출력**을 붙인다. 요약 서술로 대체하지 않는다.
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

