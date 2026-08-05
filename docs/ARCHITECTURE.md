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
  main.js          [CORE] 부트스트랩·씬 모드 진입로 (?scene= 경로 보존 — AGENTS.md)
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
    cinematics.js  [CINEMATICS] ※ P2 신설 예정 — 카메라 시퀀스·타임라인 (E7 §2)
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
| `act:enter` | `{act: 1\|2\|3}` | narrative |
| `evidence:collected` | `{id, kind}` | gameplay |
| `evidence:presented` | `{id, npc, correct}` | interrogation |
| `interrogation:start` | `{npc}` | gameplay |
| `interrogation:statement` | `{npc, line, truth}` | interrogation |
| `interrogation:verdict` | `{npc, choice, correct}` | interrogation |
| `interrogation:end` | `{npc, score}` | interrogation |
| `player:interact` | `{targetId}` | gameplay |
| `player:footstep` | `{material, speed}` | gameplay |
| `cinematic:start` / `cinematic:end` | `{id}` | cinematics |
| `subtitle` | `{speaker, text, dur}` | any |
| `sfx` | `{id, pos?, gain?}` | any |
| `room:changed` | `{room}` | levels |
| `act:phase` | `{act, phase}` | narrative — 막 내 페이즈 전환(조명·오디오 무드 연동) *(v2)* |
| `lore:heard` | `{id, medium}` | gameplay — 괴담 유닛 접촉, 노트 괴담 면 축적 *(v2)* |
| `npc:sighted` | `{npc, kind}` | levels — 프리젠스 목격, 정보 없는 존재감 (E4 §1 도일) *(v2)* |
| `checkpoint:saved` | `{act}` | gameplay/save — 막 경계 저장 *(v2)* |
| `settings:changed` | `{key, value}` | ui/settings *(v2)* |

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

## 9. 스크린샷 하네스 계약

게임은 반드시 `window.__CECIL__`을 노출한다 (core가 처리). 각 레벨/시네마틱 에이전트는 `core/shotlist.js`에 **엔트리를 추가**한다 (기존 엔트리 수정 금지).

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
