# 발사문 — 회수·통합·재판정 (오케스트레이터 세션)

> 실행자: Opus 새 세션. 제출 **8/10 밤**.
> 이 세션은 **직접 기능을 만들지 않는다.** 병렬 세션의 산출을 회수하고, 섞임을 감사하고,
> 통합 게이트를 돌리고, 기준선을 재동결하고, 배포를 갱신하고, 재판정을 발주한다.
> 앞 오케스트레이터 세션(S0)이 실제로 밟은 함정이 §3에 있다 — **거기부터 읽어라.**

## 0. 지금 서 있는 곳

- **Fable 2차 판정**(`docs/reviews/fable-experience-2026-08-09.md`): 게이트 1 **실격 0**·평균 6.6·
  8+ 항목 0 · 게이트 2 미달이 **심문 푸시인 램프 오클루전 1건**으로 수렴 · 게이트 3 "경계".
- **JUDGE 루브릭 신설**(`docs/JUDGE-RUBRIC.md`): 결함 제거 축과 직교하는 **인상 축 J1~J6**.
  평균이 아니라 피크로 채점한다. 사용자 지정 최우선은 **J6 사운드스케이프**와 **J5 길잡이(UI/UX 기능)**.
- **개선 계획**: Fable이 `docs/reviews/judge-plan-2026-08-09.md`에 병렬 세션 분배안을 낸다.
  그 계획이 이 세션이 회수할 대상이다.
- **개선 창**: 8/9 24:00까지. 8/10 오전 통합·재판정·배포, 8/10 낮 제출물 2·3·4.
- 배포본: `https://bluetop1102.github.io/virgil-1947/` · 기준선: `shots/base-r2/`.

## 1. 먼저 읽는다

1. **§3 (이 문서)** — 앞 세션이 밟은 함정 6건. 같은 것을 다시 밟지 마라.
2. `docs/JUDGE-RUBRIC.md` — 이번 라운드의 채점기.
3. `docs/reviews/judge-plan-2026-08-09.md` — Fable의 분배안(있으면).
4. `docs/HANDOFF.md` 하단 — S0 회수 기록·수용된 미달 5건.
5. `docs/RESUME.md` §3 — 기각된 가설 17건.
6. `AGENTS.md` — 소유권·커밋 규약·에셋 예외 2건(타이틀 배경 AI 이미지·BGM 외부/AI).

## 2. 회수 절차

### 2-1. 커밋 감사 (매 회수 라운드)

```bash
git log --oneline -20
for c in $(git log --format=%h -8); do echo "--- $c"; git show --stat --format="" $c | head -6; done
```

**각 커밋이 단일 축인지, 소유 밖 파일이 섞였는지 확인한다.** 섞였으면 되돌리지 말고 등재해라 —
이력 재작성은 제출 요건 위반이다.

### 2-2. 통합 게이트 (전건 통과가 회수 조건)

```bash
node tools/test-interrogation.mjs          # S0 시점 108/0
node tools/test-interrogation.mjs --burn   # 9/0
node tools/test-unlocks.mjs                # 10/0
node tools/factcheck.mjs                   # 전 게이트
node tools/lint-contract.mjs               # 잔여 5건은 전부 타 소유 기존 위반 — 늘지만 않으면 된다
npm run build
node tools/playthrough.mjs --fast --act 1  # ★ 생략 금지 — §3-3 참조
SHOT_PORT=5700 node tools/shoot.mjs --out shots/base-r3
```

샷은 **판정 27 / 보류 6**이 정상이다(보류 6은 P2 미구현 레벨). `gateFailures 0 · bootErrors 0 ·
console 0`을 `shots/base-r3/report.json`에서 확인해라.

### 2-3. 기준선 재동결과 REGRESS 판독

```bash
node tools/pix.mjs diff shots/base-r2/<샷>.png shots/base-r3/<샷>.png --json
```

**`lumaMean` REGRESS 를 자동으로 롤백 신호로 읽지 마라.** S0 회수에서 로비 3샷이 REGRESS 였는데
전부 **의도된 하향**이었다(노출 앵커 하향·광속 감쇠 = 체험 리뷰가 요구한 방향). 판별법:
①같은 샷의 `speckle` 이 함께 개선됐는가 ②담당 세션이 그 변경을 예고했는가
③변경이 안 닿는 대조군(ATMOSPHERE 프로브 `atmo-*`)이 오차 안인가. 셋이 맞으면 재동결한다.

**PNG 를 Read 도구로 직접 봐라.** 지표만으로 판정하지 않는다(CLAUDE.md).

### 2-4. 공유 문서 일괄 커밋

`docs/HANDOFF.md`·`docs/ARCHITECTURE.md` 는 **병렬 세션이 커밋하지 않고 워킹트리에 append 만**
하도록 규약돼 있다. 회수 세션이 한 번에 싣는다. 커밋 전 내용을 읽고 반쪽 문장이 없는지 확인해라.

## 3. 앞 세션이 실제로 밟은 함정 — 재발 방지

### 3-1. git 인덱스는 워킹트리당 하나뿐이다 (가장 위험)

4개 세션이 같은 워킹트리에서 돌면 `git add` 후 commit 사이에 다른 세션이 add 한 파일이
**네 커밋에 섞인다.** 해법은 **pathspec 커밋**이다:

```bash
git commit -m "..." -- <자기 소유 경로>      # git add 를 쓰지 않는다
git add <신규파일> && git commit -m "..." -- <경로>   # 신규 파일만 예외(add 후에도 pathspec 유지)
```

- `index.lock` 충돌은 정상 — 2~3초 뒤 재시도.
- **`git stash`·`git checkout .`·`git reset --hard` 금지** — 남의 작업을 지운다.
- 발주 시 이 규약을 **모든 세션에 전파**해라. S0 라운드에서 한 세션이 이 메시지를 못 받아
  사용자가 수동으로 전달해야 했다. `ListAgents` 로 peer 를 확인하고 `SendMessage` 로 보내되,
  **peer 목록에 안 잡히는 세션이 있다**(codex 및 일부 Claude 세션) — 사용자에게 전달을 부탁해라.

### 3-2. 자막은 canvas 라 DOM 텍스트로 판정할 수 없다

`.virgil-sub` 의 `textContent` 는 **항상 빈 문자열**이다. 자막 검증은 레이어 안 canvas 의
`getImageData` 로 **잉크 픽셀을 세야** 한다. DOM 으로 재고 "자막이 안 나온다"고 오판한 이력이 있다.

### 3-3. 완주 봇을 돌리지 않으면 동선 의존 회귀를 놓친다

S0 가 커밋한 심문 이탈 감시(`e6dc3be`)가 **E2 골든패스를 깼다** — 마지막 진술 판정 직후 마무리
대사 중에 자리를 뜨면 `interrogation:end` 가 안 나서 막이 안 열린다. 배터리(상태기계 단위)와
샷(정지 프레임)은 이걸 못 본다. **심문·증거·막 전환을 건드린 커밋은 완주 봇이 유일한 탐지기다.**

### 3-4. `player.pos` 를 직접 set 하면 물리 body 가 되돌린다

이탈·이동 관련 검증에서 `P.pos.set(...)` 만 하면 다음 프레임에 body 위치로 복귀해 **이탈이
발생하지 않는다.** `player._qaPlace({pos, aim})` 를 써서 body 까지 옮겨야 실제 재현이다.
이 함정 때문에 정상 동작을 FAIL 로 오판한 이력이 있다.

### 3-5. gh-pages 배포는 브랜치 전환이 아니라 워크트리로 한다

다른 세션이 같은 워킹트리에서 돌고 있으므로 `git checkout gh-pages` 는 **절대 금지**다.
그리고 pre-commit 훅이 `$repo_root/tools/lint-contract.mjs` 를 실행하는데 gh-pages 에는
`tools/` 가 없어 실패한다 — **훅 우회(`core.hooksPath`)는 정책상 차단되므로**, 린터를
워크트리에 복사해 훅이 정상 실행되게 한다. 전체 절차:

```bash
npm run build:pages
WT=<scratchpad>/ghp; rm -rf $WT; git worktree add -q $WT gh-pages
cd $WT && git reset -q --hard origin/gh-pages          # 원격이 앞서 있을 수 있다 — 반드시
rm -rf assets index.html
cp -R <repo>/dist/assets <repo>/dist/index.html .
mkdir -p tools && cp <repo>/tools/lint-contract.mjs <repo>/tools/lint-contract-selftest.mjs tools/
git add -A -- assets index.html
git commit -m "deploy: gh-pages — <무엇을 반영했는지>"
git push origin gh-pages
cd <repo> && rm -rf $WT/tools && git worktree remove --force $WT
node tools/serve-check.mjs --url https://bluetop1102.github.io/virgil-1947/
```

`git reset --hard origin/gh-pages` 를 빼면 **non-fast-forward 로 push 가 거부된다** —
로컬 `origin/gh-pages` 참조가 낡아 있던 실측 이력이 있다(그 때문에 "배포본은 8/6" 이라고
사용자에게 잘못 보고했다. **fetch 후 실제 원격 커밋을 확인하고 말해라**).

### 3-6. `src/*` 파일당 500줄 상한이 계약 린트로 강제된다

`cinematics.js` 는 500줄에 닿아 있어 **주석 한 줄만 더해도 커밋이 막힌다.** 상한에 걸리면
근거를 커밋 메시지에 남기고 인라인 주석을 포기하는 것이 정상 처리다.

## 4. 재판정 발주

통합 게이트 통과 + 배포 갱신 후, **Fable 3차 재판정**을 발주한다.

`PROMPT-review-fable-2.md` 를 템플릿으로 복제해 `PROMPT-review-fable-3.md` 를 만들어라.
바꿀 것은 넷이다.

1. **판정 대상 커밋 해시**를 새 배포본으로.
2. **채점기를 `docs/JUDGE-RUBRIC.md`(J1~J6)로 교체** — 이번 라운드의 목표는 게이트 1~3 점수가
   아니라 **"처음 켠 사람이 감탄하는가"**다. 게이트 1~3은 회귀 확인용으로만 인용한다.
3. **이번 라운드 수정 목록**을 선제공(표로). "고쳤다니 통과"로 읽지 말라는 문장을 반드시 넣어라.
4. **수용된 미달**을 갱신해 재발견을 막는다.

## 5. 완료 기준

- 병렬 세션 산출 전건 회수 · 커밋 섞임 0 · 통합 게이트 전건 통과.
- 기준선 재동결(`shots/base-r3`) · REGRESS 판독 근거 기록.
- 배포 갱신 + `serve-check` PASS.
- `docs/HANDOFF.md` 에 회수 블록 등재(무엇이 들어왔고·무엇이 미달이고·무엇을 수용했는지).
- Fable 3차 발주.
- **사용자에게 한 문단 보고** — 점수 나열이 아니라 "지금 내면 심사관에게 어떻게 읽히는가".

## 6. 금지

- `git commit -a` · 무인자 `git add -A` · 이력 재작성(제출 요건 정면 위반).
- 남의 워킹트리 변경을 stash·checkout·reset 하는 것.
- 기각된 가설 재탐색(`docs/RESUME.md` §3).
- 검증 없이 완료 선언. **"고쳤다"가 아니라 "무엇으로 확인했다"로 보고한다.**
