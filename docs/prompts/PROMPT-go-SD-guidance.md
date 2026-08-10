# 발사문 S-D — 길잡이 UX (J5 바닥 위반 · "AAA가 당연히 갖춘 것")

> 실행자: Claude 새 세션. 개선 창 **오늘 24:00까지**. 제출 8/10 밤.
> 발주 근거: `docs/reviews/judge-plan-2026-08-09.md` — J5 **4점(바닥 위반)**. 심사관이 처음
> 3분에 헤매는 경로가 실측으로 열려 있다. 예쁨(N8 9점)은 이미 증명됐다 — 이 발주는 **기능**이다.
> 완료 판정은 §4의 기계 프로브 + 블라인드 비전 채점.

## 0. 먼저 읽는다

1. `docs/reviews/judge-plan-2026-08-09.md` §0-3·§1 J5 — 근거 실측.
2. `docs/AAA-RUBRIC.md` D7 — **웹 UI 실격 조건. 시스템 폰트·기본 버튼·이모지 금지는 이 발주에서도 유효하다.**
   새 UI는 전부 기존 종이 소품 파이프라인(`ui/paper.js`·`type.js`)으로 만든다.
3. `AGENTS.md` — 소유·커밋 규약.

## 1. 소유 파일 (배타적)

```
src/ui/**         (hud.js  settings.js  subtitles.js  notebook.js  paper.js  type.js …)
src/gameplay/**   (player.js  evidence.js …)
tools/ui-shoot.mjs  tools/ui-selftest.html
```

심문 타이머·세션 상태는 `narrative/**`(S-B 소유) — 일시정지에서 심문까지 멈추려면
`docs/HANDOFF.md`에 등재하고 player 정지까지만 진행.

## 2. 현황 — JUDGE 실측 (재발견하지 마라)

- **조작 이양 직후 화면 가시 텍스트 0건.** WASD·E·Tab·Esc를 알려주는 지점이 게임 전체에
  없다(코드 grep 교차 확인). Tab(수사노트)·Esc(설정)는 눌러야만 발견된다.
- 수사노트 체크리스트가 사실상 목표 리스트인데(`j1-50-tab-notebook`) 노트를 여는 법을 알 길이 없다.
- **일시정지가 반쪽이다**: `game:pause`를 듣는 것은 rig·cinematics·audio뿐. **설정 카드가
  열린 채 W를 누르면 1.52m 걸어간다**(probe-guidance 스모크 실측 FAIL). `gameplay/player.js`에
  리스너가 없다.
- 설정 카드는 5종(품질·FOV·감도·자막·음량) 완비 — 조작 안내 행만 없다.
- 화자명이 밝은 데스크 위에서 묻힌다(2차 N8 소형, `73-b`).
- 증거 획득의 물리 감각이 얇다 — 소리·슬립·자막은 있는데 카메라가 무반응(J4 6점).

## 3. 작업 (우선순위 순 — 21:00까지 P0 둘이 안 서면 P1을 버려라)

### P0-1. 벨보이 조작 카드 [2.5h]
이양 +0.5초에 화면 하단 손글씨 종이 카드 — "이동 W·A·S·D — 조사 E — 수첩 Tab — 카드 Esc" —
3.5초 표시 후 자동 소거. `paper.js` 소품으로, 타자기/손글씨 서체(D7 비저촉). 재입장(resume)
경로에서도 한 번은 떠야 한다.
**프로브 계약**: `hud`에 `controlsCardState()`를 노출해라 — `'visible' | 'hidden' | 'never'`.
카드는 canvas 소품이라 DOM 텍스트로 검출이 안 된다 — 이 훅이 기계 검증의 유일한 창이다.

### P0-2. 일시정지 실화 [1h]
`gameplay/player.js`에 `game:pause` 리스너 — 열림 중 이동·상호작용 입력 무시. 포인터락
해제와 무관하게 WASD가 죽어야 한다. 심문 타이머는 S-B 소유 — 필요 판단 시 HANDOFF 등재.

### P1-3. 설정 카드 '조작' 행 [30분]
정적 안내 1행(이동 W·A·S·D / 조사 E / 수첩 Tab). 값 전환 버튼 없는 표시 전용 행.

### P1-4. 화자명 대비 [30분]
밝은 배경 위 화자명("마를로 다이치") 판독 확보 — 잉크 농도나 밑줄 스트로크로(`subtitles.js`).

### P1-5. 획득 카메라 딥 [1h]
`evidence:collected`에 0.2초 미세 카메라 하강(집어드는 체감). 과하면 멀미 — 진폭은 픽셀
수 준으로. J4 촉감 기여.

### P2-6. 괴담 면 [1.5h — 여력 시]
로어 접촉이 수사노트에 흔적을 남기는 면(HANDOFF 등재분). 21:00까지 P0·P1이 안 끝났으면 포기로 기록.

## 4. 검증 — 이중

**(a) 기계 프로브.**
```bash
npx vite --port 5714 &
PROBE_URL=http://127.0.0.1:5714/ PROBE_OUT=shots/judge-sd node tools/judge-probes/probe-guidance.mjs
```
7항목 전부 PASS: 카드 표시/자동 소거(`controlsCardState` 훅) · 일시정지 이동 동결(<0.05m) ·
해제 후 복귀 · 설정 조작 행 · **Escape 양보 규약 유지**(노트 위 Esc가 설정을 띄우면 안 된다 —
기존 PASS 항목이니 회귀 금지) · 콘솔 0.

**(b) 블라인드 비전 채점.** 구현 내용을 모르는 서브에이전트에 `guide-00-controls-card.jpg`만 주고:
> "이 화면 하단 요소가 ①무엇으로 보이는가(게임 UI인가, 소품인가) ②적힌 키를 3초 안에
> 읽을 수 있는가 ③1947년 배경 게임에서 위화감이 있는가."
PASS: 종이/소품으로 인식 + 키 판독 가능 + 위화감 없음. 답변 원문을 완료 보고에 인용한다.

## 5. 커밋

pathspec 커밋만:
```bash
git commit -m "feat: 벨보이 조작 카드·일시정지 실화" -- src/ui/ src/gameplay/
```
규약 동일(무인자 add 금지·stash/reset 금지·rng·500줄 린트 — hud.js 280줄, 여유 확인).

## 6. 완료 보고

- 카드 문안·표시 타이밍·소거 조건. `controlsCardState` 훅 명세.
- 프로브 verdict 원문 + 블라인드 채점 답변 원문.
- 포기 항목과 이유. HANDOFF 등재분.
