# 발사문 S4 — 게이트 하네스 (tools/)

> 실행자: codex. 제출 **8/10**.
> 이 세션은 코드 품질이 아니라 **검증 장치**를 소유한다. fable 체험 리뷰가 찾아낸 결함 5건은
> 전부 기계 게이트를 **통과한 상태로** 배포본에 살아 있었다. 그 구멍을 막는 것이 이 세션이다.

## 0. 먼저 읽는다

1. `docs/reviews/fable-experience-2026-08-08.md` §0 — 기계 게이트가 못 본 축 5건.
2. `docs/HANDOFF.md` 하단 — 미결 항목에 이 세션 지시가 3건 등재돼 있다.
3. `AGENTS.md` — 샷 하네스 규약(GPU 락은 자동, 대기 로그는 정상), 커밋 규약.
4. `docs/RESUME.md` §3.2 — QA 모드 엔진은 RAF를 안 돌린다. 이걸 모르면 하네스 수정이 헛돈다.

## 1. 소유 파일 (배타적)

```
tools/*.mjs                     (shoot playthrough test-interrogation test-unlocks test-audio
                                 test-physics factcheck regress pix manifest-check lint-contract …)
tools/calibration/**
src/core/shotlist.js            ← 엔트리 추가·보류 표기만 (ARCH §2 허용 예외)
```

**`src/` 나머지는 전부 남의 것이다.** 다른 세션 3개가 동시에 `src/`를 고치고 있다:
S1 = `world/lobby.js`·`materials/**`·`props*.js`, S2 = `render/**`·`atmosphere.js`·`atmo/**`,
S3 = `narrative/**`·`ui/**`·`chars/**`·`audio/**`·`gameplay/**`.
구현 수정이 필요하면 `docs/HANDOFF.md`에 등재하고 자기 소유분만 진행해라.

## 2. 작업 — 우선순위 순

### P0. UI 상태기계 단언 신설

**지금 UI 상태기계를 덮는 단언이 0건이다.** `test-interrogation.mjs`의 64단언은 심문 상태기계만
덮고, 그래서 다음이 전부 통과 상태로 배포됐다:

- 심문 중 자리를 떠나도 세션이 계속되고, 선택지 쪽지가 자유 이동 화면에 **잔류**한다.
- 잔류 쪽지에 숫자를 누르면 **보지도 듣지도 못한 진술에 판정이 기록**된다(`scores:{S5:-1}` 실측).
- 심문 중 Escape가 제시 취소가 아니라 설정 카드를 띄운다. Tab은 노트만 닫고 선택지는 남는다.

S3 세션이 이 수정을 진행 중이다(S0가 이탈 감시 `interrogation:left`를 이미 커밋했다).
**네 일은 그 수정을 고정하는 단언을 만드는 것이다** — 구현자와 판정 도구를 분리하는 것이
이 프로젝트에서 실제로 효과를 본 구조다(`docs/HANDOFF.md` T-P1-11 기록).

최소 커버: ①이탈 시 세션 종료·선택지 해제 ②세션 밖 숫자 입력이 점수를 만들지 않는다
③심문 중 Escape/Tab의 우선순위 ④지목 모드가 이탈과 함께 닫힌다.

### P0. 30초 캡처에 순흑 프레임 판정

인트로 타이핑 자막 4줄이 베일에 가려 안 보이던 결함이 **기존 산출물에 그대로 찍혀 있었다** —
`shots/gate30/first30-t001~009.png`가 전부 4,250바이트 동일 크기(순흑). 게이트는 프레임 수와
콘솔만 세서 통과시켰다.

- t=4~12 구간 프레임에 **순흑(단일 크기) 비율**이나 픽셀 분산 하한을 판정으로 넣어라.
- 자막 픽셀이 실재하는지까지 보면 더 좋다. 파일 크기 4,250 초과가 1차 신호다.

### P1. 없는 레벨 샷 6개 보류 표기

`corridor-long`·`corridor-942`·`room942-bed`·`room942-bath`·`rooftop-tanks`·`rooftop-ladder`는
해당 레벨이 P2 산출이라 존재하지 않고, 카메라가 로비의 벽·천장을 찍는다. `gate ok`로 통과하므로
**"28/28 통과"라는 수치가 실제보다 부풀어 보인다 — 실질 판정은 22개다.**

보류 표기를 넣고 리포트에 `판정 22 / 보류 6`처럼 분리 출력해라.

### P1. 샷 시간 결정성

`src/core/engine.js:127`의 `advanceTo`가 `Math.max(t, self.time)`이라 **샷이 선언한 `time`은
현재 시간보다 클 때만 존중된다.** 전 스위트 실행에서 atmo 프로브가 선언값(23~31) 대신 t≈52~56에
촬영되고, 그 상태에서 검은 폴리곤이 나타난다. 단독 촬영은 깨끗하다(실측 `atmo-interrogation`
t=31.8 정상 / t=55.7 오염). **머지 이전 커밋 `b578121`에서도 재현되는 기존 결함이다.**

- `engine.js`는 잠긴 core다. **고치지 마라.** 하네스 쪽에서 샷별 세션 분리로 해결하거나,
  불가하면 `docs/HANDOFF.md`에 CORE 소유자 반환으로 등재해라.
- 샷 순서가 결과를 바꾸는 상태 자체가 회귀 판정의 기반을 흔든다는 것이 이 항목의 요지다.
- 검은 폴리곤 자체의 기전(HDR NaN 감염 의심)은 **S2 세션 소유**다. 중복 조사하지 마라.

### P2. `--paced` 막 전환 미도달

`tools/playthrough.mjs --paced --act 1`이 `act:enter {act:2} 미도달`로 실패한다(`--fast`는 통과).
증거 4종은 획득하므로 `missing.length`는 통과하고 `!act2`에서 걸린다. 두 모드 차이는 이동
방식이다(`playthrough.mjs:233` — paced는 `walk`, fast는 `goto`). `_qaWalk`는 실패 시 `_qaPlace`로
순간이동하고 `qa:walk:fallback`을 기록한 뒤 true를 반환하므로 **보행 실패가 false로 새는 경로는
아니다.** 스케줄 소비 후 엘리베이터 상호작용이 실제로 발생하는지 이벤트 로그로 확인해라.
재현은 실시간이라 십수 분 걸린다.

### P2. 배터리 커버리지 축소 복원 — **복원으로 결정한다**

`test-interrogation.mjs`가 재작성되며 475줄·1098단언 → 235줄·73단언으로 줄었다. 새 배터리는
판정표 7결과·재질문·tier·막 전환·소각을 정확히 덮지만, 구 배터리의 **심문 스크립트 데이터
무결성 일괄 검사**(전 인물·전 진술의 `grants`/`spawns`/`lieVariants`/`wrongVariants` 참조가
EVIDENCE에 실재하는지)가 사라졌다. `factcheck.mjs` S0는 `case-graph.json` 쪽을 덮어 **겹치지 않는다.**

구 버전은 `git show 8855ada:tools/test-interrogation.mjs`에 있다. 그 일괄 검사만 되살려 붙여라 —
전체 되돌리기가 아니다.

## 3. 검증

```bash
node tools/test-interrogation.mjs && node tools/test-unlocks.mjs && node tools/factcheck.mjs
node tools/lint-contract.mjs           # 잔여 5건은 전부 타 소유 기존 위반 — 늘리지만 마라
SHOT_PORT=5604 node tools/shoot.mjs --out shots/s4 lobby-wide
```

- **네가 만든 게이트가 실제로 결함을 잡는지 증명해라.** 결함을 인위적으로 되살린 상태에서
  FAIL이 나오는 것을 보이고, 원복 후 PASS를 보여라. 통과만 확인한 게이트는 게이트가 아니다.
- GPU 락 때문에 다른 세션의 샷과 직렬화된다. "대기 중" 로그는 정상이다.
- `--out shots/s4` · `SHOT_PORT=5604` 고정. 기본 출력(`shots/`)은 공유라 report.json이 덮인다.

## 4. 커밋

**같은 워킹트리에서 4개 세션이 동시에 돈다. git 인덱스는 워킹트리당 하나뿐이라 공유된다** —
`git add` 후 commit 하기까지의 사이에 다른 세션이 add 하면 그 파일이 네 커밋에 섞인다.
**`git add` 를 쓰지 말고 pathspec 커밋을 써라:**

```bash
git commit -m "test: 심문 UI 상태기계 단언 신설" -- tools/ src/core/shotlist.js
```

- `git commit -a` · 무인자 `git add -A` 금지.
- `index.lock` 충돌로 실패하면 정상이다 — 2~3초 뒤 재시도.
- `git status` 에 네 것이 아닌 수정 파일이 보이는 것도 정상이다. **`git stash`·`git checkout .`·
  `git reset --hard` 금지 — 남의 작업을 지운다.**
- 커밋 후 `git show --stat HEAD` 로 자기 파일만 들어갔는지 확인.

**이력 재작성(squash·rebase·filter-repo) 금지 — 제출 요건 정면 위반이다.**

## 5. 완료 보고

- 항목별로 **신설한 판정 / 그 판정이 잡는 결함 / 결함 재현 시 FAIL 증거**.
- `src/`를 고쳐야 했던 지점은 전부 `docs/HANDOFF.md` 등재로 남기고 직접 고치지 마라.
