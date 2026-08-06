# VIRGIL — 아키텍처 계약 v2 (모든 에이전트 필독)

> 이 문서는 **계약**이다. 병렬 작업자는 자기 소유 파일만 수정하고, 여기 정의된 시그니처를 절대 바꾸지 않는다.
> 계약 변경이 필요하면 코드를 고치지 말고 결과 보고에 `CONTRACT_CHANGE_REQUEST`로 적어 반환한다.
> **v2 (2026-08-05)**: 재허구화(§0) · §2 소유권 표 실파일 동기화 · §5 표준 이벤트 추가분.
> 코드 식별자(`__CECIL__` 등)는 내부 코드네임으로 잔존 허용 — 화면 표출 텍스트만 "세실" 0 (계약 린트, P0).

## 0. 작품 정의

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

## 1. 실행

```bash
npm run dev      # vite, http://localhost:5173
npm run shot     # 헤드리스 스크린샷 하네스 (tools/shoot.mjs)
```

## 2. 디렉터리 소유권

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

## 3. 모듈 계약

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

## 4. Engine API (읽기 전용 계약)

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

## 4.5 렌더 패스 계약 (PIPELINE-CORE ↔ PIPELINE-EFFECTS)

`render/pipeline.js`는 공유 컨텍스트 `ctx`를 만들어 각 패스에 넘긴다. **패스는 ctx 필드를 추가하지 않는다.**

```js
ctx = {
  engine, renderer, scene, camera,
  w, h,                       // 렌더 버퍼 해상도(픽셀, dpr 반영 후)
  targets: {
    hdr,        // RGBA16F  씬 라이팅 결과 (depthTexture 부착)
    hdrPrev,    // RGBA16F  이전 프레임 히스토리 (TAA)
    normal,     // RGBA16F  rgb=뷰스페이스 노멀, a=선형 뷰 깊이
    velocity,   // RG16F    스크린스페이스 모션벡터 (현재-이전, NDC 단위)
    roughness,  // R8       실효 러프니스. clearcoat 재질은 mix(rough, ccRough, cc)를 기록한다.
                //          normal/velocity와 같은 FBO의 3번째 어태치먼트 — 프리패스가 씬을 한 번만
                //          돌므로 추가 드로우콜 0. SSR/GTAO가 소비한다.
    ao,         // R8       GTAO 결과 (1=차폐없음)
    ssr,        // RGBA16F  a=신뢰도
    vol,        // RGBA16F  하프 해상도 볼류메트릭 인스캐터링
    bloom       // RGBA16F  블룸 합성 결과
  },
  depthTexture,               // ctx.targets.hdr.depthTexture 별칭
  frame,                      // 프레임 인덱스 (Halton/블루노이즈 시퀀스 인덱싱용)
  jitter: {x, y},             // 현 프레임 서브픽셀 지터 (NDC 단위, TAA용)
  matrices: { proj, invProj, view, invView, viewProj, prevViewProj },
  quality, look,              // core/config.js 프리셋
  blueNoise,                  // DataTexture 64x64 R8, 프레임마다 골든레이시오 오프셋
  fsq (material, target)      // 풀스크린 쿼드 렌더 헬퍼. target=null이면 화면
}
```

각 패스 파일의 default export는 다음 클래스 형태다.

```js
export default class Gtao {
  async init (ctx) {}
  setSize (w, h, ctx) {}
  render (ctx) {}      // 결과를 자기 담당 타깃(ctx.targets.ao)에 기록
}
```

**소유권 분할**
- `[PIPELINE-CORE]` — `render/pipeline.js`, `passes/prepass.js`(노멀·속도 override 렌더), `passes/taa.js`, `passes/composite.js`(톤매핑·그레이딩·그레인·CA·비네트·헐레이션)
- `[PIPELINE-EFFECTS]` — `passes/gtao.js`, `passes/ssr.js`, `passes/volumetric.js`, `passes/bloom.js`, `passes/dof.js`, `passes/motionblur.js`

CORE는 EFFECTS 패스를 **선택적으로 로드**한다(파일이 없으면 건너뛰고 정상 동작). EFFECTS는 CORE 파일을 수정하지 않는다.

## 5. 이벤트 버스 계약

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

## 6. 재질 계약 (MATERIALS 소유, 전원 소비)

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

## 6.5 조명 계약 (ATMOSPHERE 소유, 레벨이 소비)

레벨은 `new THREE.PointLight` 등을 직접 만들지 않는다. 반드시:

```js
import { practical, ambientRig, setMood } from './atmosphere.js'
const l = practical('sconce', { pos:[x,y,z], kelvin:2700, lumens:420, radius:4.5, flicker:0.06 })
setMood('corridor-night')   // 안개 밀도·볼류메트릭 세기·IBL을 한 번에 전환
```

- 모든 광원은 켈빈으로 지정한다. 한 공간 안에 **최소 2가지 이상 색온도**가 공존해야 한다 (루브릭 G1).
- `atmosphere.js`는 `engine.scene.environment`에 절차 생성 IBL(PMREM)을 세팅한다. HDR 파일 로드 금지.
- 무드 프리셋: `lobby-night`, `corridor-night`, `room-dusk`, `bathroom`, `rooftop-rain`, `interrogation`.

## 7. 텍스처 규약

- 모든 텍스처는 절차 생성. 외부 에셋 다운로드 금지(오프라인 재현성).
- 반복 타일링 금지 — 트리플래너 또는 스토캐스틱 샘플링, 그리고 라지스케일 그런지 오버레이 필수 (루브릭 D3).
- 해상도: `engine.quality.texRes` (cinematic=2048, high=1024, medium=512).
- 색공간: albedo만 `SRGBColorSpace`, normal/roughness/ao는 `NoColorSpace`.

## 8. 지오메트리 규약

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

## 9. 스크린샷·QA 하네스 계약

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

## 10. 결정론

- `Math.random()` 직접 호출 금지. `core/util.js`의 `rng(seed)` 사용.
- `Date.now()` / `performance.now()` 직접 호출 금지. `engine.time` 사용.
- QA 모드(`?qa=1`)에서 시간은 하네스가 고정 스텝으로 전진시킨다.

## 11. 코드 스타일

- ESM, 세미콜론 없음, 2스페이스, 작은따옴표.
- 파일당 500줄 이하. 넘으면 같은 소유 디렉터리 안에서 분할.
- 주석은 "왜"만. "무엇"은 코드로.
- 콘솔 에러/경고 0 — QA가 콘솔을 읽고 실격 처리한다.
