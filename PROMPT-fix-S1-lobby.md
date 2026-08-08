# 발사문 S1 — 로비 물성·실루엣 (LEVEL-LOBBY + MATERIALS + PROPS)

> 실행자: Opus 새 세션. 제출 **8/10**. 리허설은 밀렸다.
> 이 세션은 **게이트 1 실격 2건(D3·D4) 해제**와 **표면·형태 축 4개(G3·G5·G6·G10)**를 소유한다.
> 판정 근거는 전부 `docs/reviews/fable-experience-2026-08-08.md` — 배포본 실플레이 판정이다.

## 0. 먼저 읽는다

1. `docs/RESUME.md` — **기각된 가설 17건**. 여기 적힌 것을 다시 파는 것이 이 프로젝트 최대 낭비다.
   특히 §3.0(`Material.copy()`가 defines를 안 옮긴다 → 재질 복제는 반드시 `kit-mat.cloneMat()`)은
   네 작업 한복판에 있다.
2. `docs/reviews/fable-experience-2026-08-08.md` §1 — G1~G10 항목별 점수와 **"8+가 되려면"** 조건.
   이 문서의 조건문이 네 수용 기준이다. 점수를 새로 매기지 말고 그 조건을 충족시켜라.
3. `docs/ARCHITECTURE.md` §2 소유권 · §6 재질/조명 계약.
4. `AGENTS.md` 샷 하네스 규약 — GPU 락은 자동이다. "대기 중" 로그가 보이면 죽이지 말고 기다려라.

## 1. 소유 파일 (배타적)

```
src/world/lobby.js            ← 주전장
src/world/kit.js  kit-mat.js  props.js  props-corridor.js  props-detail.js  props-fixtures.js
src/materials/procedural.js  library.js  glsl.js  recipes.a.js  recipes.a-carpet.js  recipes.b.js
```

**남의 파일** — 고쳐야 하면 `docs/HANDOFF.md`에 항목을 추가하고 자기 소유분만 진행한다:

| 세션 | 소유 | 겹칠 수 있는 지점 |
|---|---|---|
| S2 빛·포스트 | `src/render/**` · `src/world/atmosphere.js` · `src/world/atmo/**` | 광 기둥 아티팩트·볼류메트릭·노출. **네가 광원의 위치·개수·색온도를 정하고, S2가 대기·노출·그림자 품질을 정한다** |
| S3 내러티브·UI | `src/narrative/**` · `src/ui/**` · `src/chars/**` · `src/audio/**` | 라디오 상호작용 배선(로어 3종). 재질·모델은 너, 발화 경로는 S3 |
| S4 게이트 | `tools/**` | 없음 |

`src/core/*`는 잠김. 예외는 `core/shotlist.js` 엔트리 **추가**뿐이다 — 근접 검수 샷이 필요하면 추가해라.

## 2. 작업 — 우선순위 순

### P0. D3 타일링 실격 해제

fable 판정: **걸림**. 셋 다 별건이다.

1. **미튼 얼룩 데칼 반복** — 같은 장갑 실루엣의 얼룩이 벽 좌·우·중앙에 동일 형상으로 찍힌다
   (`docs/reviews/shots-fable/82-lobby-wide.jpg`). 시드·스케일·회전 변주를 넣거나 형상 자체를 바꿔라.
   fable 주: 이 얼룩이 그림자와 구분되지 않아 **G4 광원 논리까지 흐린다** — 이 한 건이 D3와 G4를 같이 산다.
   **S0가 찾아둔 출처**: 데칼이 아니라 셰이더다 — `procedural.js:215`의
   `damp = smoothstep(0.46, 0.92, cMacroLow(vCWPos, uCA.y)) * uCC.y`(월드 공간 습기 자국)와
   `glsl.js:243`의 저역 얼룩 함수. 재질별 `opts.damp`(0.22~0.34)와 `uCA.y` 스케일이 조종간이다.
   반복 인지를 깨려는 장치가 오히려 특징적 실루엣을 만들어 반복으로 읽히는 구조다.
2. **대리석 체커 타일** — 같은 연기무늬가 오블리크 뷰에서 그대로 반복(`80-radio.jpg`).
3. **벽지 모티프 두 배율 공존** — 기등재분(`docs/RESUME.md` §4 우선순위 3). UV 스케일 통일부터.

### P0. D4 플레이스홀더 실격 해제

**라디오가 백색소음 텍스처를 뒤집어쓴 상자다**(`80-radio.jpg`). 다이얼·그릴·목재 캐비닛이 판독 불가.
로어 3종 중 하나를 담는 주요 상호작용 오브젝트라 D4 + N3 + N6이 한꺼번에 걸려 있다.
fable이 "마감 내 그래픽 수정을 1건만 고른다면 이것"이라고 지목했다.

- 놋쇠 다이얼 · 패브릭 그릴 · 바니시 목재 — **전용 재질**로.
- 워킹트리에 이미 `boxUv()`가 들어가 목재 캐비닛 UV만 박스 투영으로 바뀌어 있다(S0 커밋분).
  그릴·다이얼·노브까지 마저 끝내라.
- **데스크 서랍 전면**도 같은 스펙클 노이즈(`41-interro-ui.jpg` 하단) — 목재 패널로.

### P1. G6 디테일 밀도 5 → 8

> "확대 시 나오는 것이 2차 디테일이 아니라 **노이즈**(서랍 스펙클·라디오 백색소음·벽 크래클).
> 노이즈성 표면 3종을 실제 소재로 교체. 데스크 위 수준의 소품 밀도를 소파·라디오 테이블 주변에."

데스크 위(전화기·압지·숙박부)는 이미 밀도가 성립한다 — 그 수준을 나머지 사분면에 옮기는 작업이다.

### P1. G10 실루엣 5 → 8

> "로비가 박스 방 + 가구 소수. 벽-천장 접합이 단순 직각(`83-ceiling.jpg`).
> 크라운 몰딩·베이스보드 강화, 기둥 2개(인트로 프레임에는 있다)를 시야 리듬에 들어오게 재배치,
> 엘리베이터 홀 개구부에 아치."

### P2. G3 재질 신뢰성 6 → 8

> "바닥 타일별 러프니스 ±변주와 vein 스케일 확대(현재 결이 너무 잘아 연기로 읽힌다)."

### P2. G5 반사 6 → 8

> "젖은/마른 구획 분리(입구 쪽 젖음, 데스크 앞 마모 매트). SSR이 이미 러프니스 G버퍼를 소비하므로
> 러프니스 맵만 나누면 된다."

### P2. G1·G9 조명 배치 (광원의 위치·개수·색온도만)

> "데스크 코너의 조명 문법(국소 텅스텐 + 사선 필 + 어두운 주변부)을 로비 전 사분면에 반복한다.
> 특히 라디오 테이블 위에 자체 광원 하나, 엘리베이터 홀은 격자문 안쪽 광만 남기고 주변 감쇠."
> G9: "로비 조명으로 시선 유도(밝은 곳 = 상호작용점)가 생기면 8."

`lobby.js:335 makeLights()`가 네 것이다. 노출·볼류메트릭·그림자 품질은 S2에 맡기고 손대지 마라.

### P3. N6 공간 서사 6 → 8

소파 팔걸이 한쪽 마모를 **근접 판독 가능한 명도차**로. 열쇠 걸이 빈 고리 2개(942·ROOF)는 이미 성립.

## 3. 검증

```bash
SHOT_PORT=5601 node tools/shoot.mjs --out shots/s1 lobby-wide
SHOT_PORT=5601 node tools/shoot.mjs --out shots/s1 lobby-wide interrogation-face notebook-open
node tools/pix.mjs crop shots/s1/lobby-wide.png /tmp/z.png <x> <y> <w> <h> 3   # 확대 검수
```

- **PNG를 Read 도구로 직접 봐라.** 코드만 읽고 품질을 판정하지 않는다(CLAUDE.md).
- 근접 판정이 필요한 대상(라디오·서랍·소파 팔걸이·몰딩)은 `core/shotlist.js`에 근접 샷을 **추가**해서 찍어라.
- 기준선 대비: `node tools/pix.mjs diff shots/base-0808/<샷>.png shots/s1/<샷>.png --heat /tmp/h.png`
  — `shots/base-0808/`이 S0가 동결한 출발선이다(28/28 gate ok · 콘솔 0 · bootErrors 0).
  `shots/_baseline/`은 corridor 샷과 대응이 깨져 있어 쓰지 마라(HANDOFF 등재분).
  — **한 곳을 고치며 다른 곳을 망가뜨리는 것**이 이 프로젝트 3라운드 연속 평균 4.6의 원인이었다(RESUME §5).
- `Math.random()` / `Date.now()` 직호출 금지 — `core/util.js`의 `rng`, `engine.time`.
- 외부 에셋 다운로드 금지. 전부 절차 생성.

## 4. 커밋

**`git commit -a` 와 무인자 `git add -A` 금지.** 자기 소유 경로를 명시해 스테이지한다:

```bash
git add src/world/lobby.js src/materials/ src/world/props.js
git commit -m "fix: D3 얼룩 데칼 반복 해제 — 시드·스케일 변주"
```

작업 단위로 자주 커밋해라. 커밋 이력 자체가 제출물(AI 활용 기술 문서)의 재료라 한 커밋에 두 축이
섞이면 라운드↔변경 대응이 깨진다. **이력 재작성(squash·rebase) 금지 — 제출 요건 위반이다.**

## 5. 완료 보고

- 항목별로 **무엇을 바꿨고 어느 샷의 어느 좌표에서 확인되는가**. 점수 자평은 쓰지 마라.
- 해결하지 못한 항목은 숨기지 말고 "미달 + 이유"로 남겨라. `docs/HANDOFF.md`에 소유자 반환.
- 콘솔 에러·경고 0 · `npm run build` 성공을 마지막에 확인.
