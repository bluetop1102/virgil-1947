# 패킷 T-P0-05 — P5 텔 상관 검사기 — factcheck 확장

> 이 문서 하나로 완결된다. **패킷 밖 문서를 열지 마라** — 필요한 계약 원문·데이터·규약은
> 전부 아래에 인라인돼 있다. 그래도 질문이 생기면 그건 이 패킷의 결함이니,
> 추측해서 진행하지 말고 §10 반환 형식의 `CONTRACT_CHANGE_REQUEST` 로 되돌려라.
> 자동 생성물 — 손으로 고치지 않는다. 원천: `data/manifest/T-P0-05.json` · 생성기: `tools/packet-gen.mjs`

## 1. goal 계약

```
/goal P5 텔 상관 검사기 — factcheck 확장 — T-P0-05
통과 조건: §8 수용 기준 3건 전건 통과 · 콘솔 에러·경고 0 · §9 금지 사항 위반 0
중단 조건: 라운드 상한 2회 · 서브에이전트 토큰 상한 100만
           (PROMPT-build-p0.md 의 P0 전체 상한 10회·500만을 티켓 5장으로 나눈 몫)
           상한 도달 시 라운드 경계에서 끊고 §10 형식으로 인수인계한다. 중단 조건 없는 루프 금지.
```

- **타입**: tool · **배정 모델**: codex · **상태**: todo
- **라운드 규율**: 단일 담당 · 단일 목표 · 사전 기준선 → 사후 기계 게이트 · 라운드 단위 커밋.
  회귀면 롤백한다. 판 갱신은 개선일 때만.

## 2. 소유 파일 (배타)

이 목록 밖의 파일은 **읽기만** 한다. 남의 파일을 고쳐야 하면 §10.1 형식으로 반환한다 —
"그 담당이 지금 안 보인다"는 안전 신호가 아니다.

- `tools/factcheck.mjs` — **구역 한정** — §P5 텔 상관 본검사 (이 구역 밖은 남의 것이다)

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

### 4.2 E9 §2 기계 게이트 총목록

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

### 4.3 E4 §2 텔 연기 시스템

*왜 읽는가: P5 상관 게이트의 정의 — 거짓·텔 상관 1.0이면 FAIL, 불안 시 텔 발화가 전체의 30% 이상이어야 PASS.*

<!-- 원문: docs/design/E4-characters.md § 2. 텔 연기 시스템 — 비확정 원칙 (U4) -->
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

### 4.4 E3 §4 텔 배정 데이터

*왜 읽는가: anxiousTell·key 필드가 진실원. 정적 감시는 P5d, 본검사가 이 티켓이다.*

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

### 4.5 STORY §2 인물별 텔

*왜 읽는가: 신호 원문 — 검사기가 세는 대상.*

<!-- 원문: docs/STORY.md § 인물별 텔(tell) — CHARACTERS의 perf.js가 구현할 미세신호 -->
| 인물 | 거짓 시 | 진실이나 불안할 때 | 무너질 때 |
|---|---|---|---|
| `deitch` | 오른손이 데스크 아래로 내려간다(플라스크). 문장 끝 음량이 떨어진다. "제 기억으론"을 붙인다 | 숙박부 모서리를 반복해서 맞춘다 | 안경을 벗고 눈두덩을 누른다 |
| `ruiz` | 말이 빨라지고 스페인어가 섞인다. 시선이 형사가 아니라 문을 본다 | 손에 쥔 천을 비틀어 짠다 | 앉는다. 그전까지 서 있었다 |
| `pryce` | 시각을 지나치게 정확히 말한다("10시 41분"). 대답 전 반박자 늦다 | 피우지도 않으면서 재떨이를 만진다 | 사진을 뒤집어 놓는다 |
| `doyle` | 웃는다. 질문을 되묻는다 | 렌치를 손에서 놓지 않는다 | 웃음을 멈추지 않는다 |

**텔 규칙**: 텔은 아이콘·색·UI로 표시하지 않는다. 오직 애니메이션과 카메라로만 관찰된다.
그리고 **불안 시 텔과 거짓 시 텔이 겹치도록** 설계한다 — 확정 판별을 주지 않는 것이 이 시스템의 핵심이다.

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
→ P5 절 포함 전건 PASS — 불안 발화 진실 진술 4건(deitch.S1·S3, ruiz.S1, pryce.S2)이 전체 텔 발화의 30% 이상

**A2.**

```bash
node tools/factcheck.mjs --mutate p5-perfect
```
→ FAIL 재현 — anxiousTell을 전부 제거해 거짓·텔 상관을 1.0으로 만든 변이에서 P5가 반드시 떨어진다(완전판별기 검출)

**A3.**

```bash
node tools/factcheck.mjs --mutate p5-breaking
```
→ FAIL 재현 — breakingOn을 인물당 2건 이상으로 늘린 변이에서 "붕괴는 인물당 한 번" 규칙이 검출된다

## 9. 금지 사항

### 9.1 이 티켓 고유

- case-graph.json 수정 — 검사기는 데이터를 고치지 않고 읽기만 한다.
- factcheck.mjs의 기존 F1~F4·R1~R3 절 편집 — 소유 범위는 §P5 절 신설분뿐이다.
- 임계값을 현재 데이터에 맞춰 사후 조정하는 것 — 30%는 E4 §2가 정한 값이다.

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

