# 발사문 S3 — 내러티브·UI·연기 (NARRATIVE + UI + CHARACTERS + AUDIO + GAMEPLAY)

> 실행자: Opus 새 세션. 제출 **8/10**.
> fable 판정: **게이트 2는 불통과지만 근접이다.** 기계축(N4 9 · N5 8 · N8 9)은 이미 서 있고,
> 사람이 앉는 자리(N1 체감 · N2·N3 표본)가 누수와 표본 부족으로 미달이다.
> 이 세션이 게이트 2를 넘기는 유일한 세션이다.

## 0. 먼저 읽는다

1. `docs/reviews/fable-experience-2026-08-08.md` §0-2~0-5 · §2 — N1~N8 항목별 **"8+가 되려면"**.
2. `docs/design/E4-characters.md` §3 — 텔(미세신호) 연기 계약. `docs/design/E5-interrogation.md` — 심문 규칙.
3. `docs/RESUME.md` — 기각 가설. 네 영역은 적지만 §3.2(QA 모드는 RAF를 안 돌린다)는 UI 검증에 걸린다.
4. `docs/ARCHITECTURE.md` §5 이벤트 버스 계약 — **구독 어휘는 폐집합이다.** 새 이벤트가 필요하면
   `manifest-check`가 `[DRIFT]`로 찍어주니 등재까지 해라.

## 1. 소유 파일 (배타적)

```
src/narrative/interrogation.js  script.js  cinematics.js  deduction.js  case-graph-loader.js
src/ui/*.js                     (hud notebook subtitles settings title board casebook casefile paper photos sketch type wall)
src/chars/rig.js  perf.js
src/audio/*.js
src/gameplay/player.js  evidence.js
```

**남의 파일** — `docs/HANDOFF.md` 등재 후 자기 소유분만:

| 세션 | 소유 | 겹칠 수 있는 지점 |
|---|---|---|
| S1 로비 물성 | `src/world/lobby.js` · `src/materials/**` · `props*.js` · `kit*.js` | **로어 3종의 배선은 `lobby.js`의 `userData.lore`에 있다**(`lobby.js:288,323,330`). 소품·재질·프롬프트 문구는 S1, 발화 경로와 대사는 너 |
| S2 빛·포스트 | `src/render/**` · `atmosphere.js` · `atmo/**` | 시네마틱 셔터각·모션블러 — 카메라 시퀀스는 너, 포스트 파라미터는 S2 |
| S4 게이트 | `tools/**` | **UI 상태기계 단언을 S4가 신설한다.** 네 수정이 그 단언의 대상이다 — 인터페이스가 필요하면 S4에 HANDOFF |

## 2. 작업 — 우선순위 순

### P0. §0-3 심문 이탈 누수 마감 (N1 · X5 — 치명)

S0가 절반을 커밋했다: `interrogation.js`에 사거리 4.2m 이탈 감시 + `_leave()`,
`hud.js`·`notebook.js`가 `interrogation:left`를 수신해 선택지·지목 모드를 내린다.
**먼저 그 커밋을 읽고 실제로 닫혔는지 확인한 뒤** 아래 잔여를 처리해라.

- **잔여 1**: 심문 중 **Escape의 1차 동작이 설정 카드 열기**다. 증거 제시 취소가 되어야 한다.
- **잔여 2**: Tab은 노트를 닫지만 선택지는 남는다 — 세션 상태와 동기.
- **잔여 3**: 이탈 판정이 `player.pos` 기준이라 **시선 이탈(고개만 돌린 경우)**은 안 잡는다.
  리뷰 지시는 "거리 임계 **또는** 시선 이탈"이다. 필요한지 판단해서 처리하거나 근거를 남기고 수용.
- 원 재현(리뷰 §0-3): S4에 증거 제시 → 응답 연출 중 엘리베이터로 이동 → 잔류 쪽지에 숫자 2 →
  **보지도 듣지도 못한 S5에 의심 -1이 기록**(`state.serialize`의 `scores:{S5:-1}`).
  이 재현이 재현되지 않는 것이 수용 기준이다.

### P0. §0-2 인트로 자막 4줄 (X1 · P2)

S0가 `subtitles.js` 레이어를 body 직속 `z-index:93`으로 올리고, 같은 프레임 `clear()` 버그와
타이핑 `dur` 하한도 함께 고쳐 커밋했다. **네 일은 검증이다** — 30초 캡처에서 t=4~12 구간에
"1947년 10월 11일 / 버질 호텔… / 9층까지 물이… / 942호 손님이…" 4줄이 **실제 픽셀로** 나오는가.

> 기존 게이트 산출물 `shots/gate30/first30-t001~009.png`가 전부 4,250바이트 동일 크기(순흑)였다.
> 프레임 수·콘솔만 세는 게이트가 이걸 통과시켰다. 파일 크기 4,250 초과가 1차 신호다.

### P1. N3 대사 품질 7 → 8 — 로어 3종 발화 경로

> "표본이 다이치 5진술뿐이다. 라디오 괴담 반 문장·연혁판 텍스트가 안 보이면 대사 다양성이
> 판정 불가. **로어 3종 발화 경로 복구가 곧 N3 표본이다.**"

배선은 이미 있다 — `lore.pipes`(라디오, `lobby.js:323`) · `lore.1912`(연혁판, `:330`) ·
`lore.lightwell`(숙박부 여백, `:288`) · `evidence.js:51`이 매체별 로어를 매핑하고
`notebook.js:86`이 `lore:heard`를 듣는다. **실플레이에서 이 3종이 실제로 발화되는지**를 확인하고,
끊긴 고리를 이어라. fable의 로비 수색 세션에서 하나도 관찰되지 않았다.

### P1. N2 텔 가독성 6 → 8

> "거짓 진술(S4) 전달 중 손을 얼굴로 올리는 비얼굴 텔 1종 관찰(`60-s2-a.jpg`). 아이콘·UI 표시
> 없음(비확정성 성립). **1막 안에서 다이치의 텔 변주(숙박부 모서리 맞추기 등 E4 §3 선언분)가
> 2회 이상 관찰 가능해야 8 판정 표본이 성립한다.**"

`chars/perf.js`의 `DEITCH_CLIPS` · `deitchPose()`가 네 것이다. 현재 상태 4종(idle/anxious/lying/
breaking)에 텔 변주를 더해 **같은 텔의 반복이 아니라 다른 텔이 두 번** 나오게 하라.
factcheck P5는 이미 통과 중이니(텔 발화 진술 11 · 상관 0.522) **데이터가 아니라 연기 표현**의 문제다.

### P2. N1 오답 응답 대사

> "오답 증거 제시에 대한 다이치 응답 대사가 관찰 표본에서 안 보였다 — 있는지 확인하고 없으면 한 줄 추가."

`script.js`의 `wrongVariants`를 확인해라. 있는데 발화가 안 되면 배선 문제다.

### P2. N5 연출 카메라 8 → 유지·강화

> "오답 시 '카메라 반 발짝'이 풀백으로 보이나 미세하다 — 진폭을 키우면 P4도 같이 산다."

### P2. N7 오디오 — 코드측 점검 + 청감 체크리스트

fable은 헤드리스라 **판정 보류**했다. 기계 게이트(`test-audio.mjs --roomtone`)는 통과 중이다.
공간별 리버브 차이와 침묵 연출을 코드로 점검하고, **사람이 귀로 확인할 항목 5개 이하의
체크리스트**를 `docs/submission/`에 남겨라 — 사용자가 실행할 것이다.

### P3. §0-5 엘리베이터 무응답

S0가 거절 자막 한 줄을 커밋했다(`interrogation.js`). 문구가 톤에 맞는지, 반복 입력 시 도배되지
않는지만 확인해라.

## 3. 검증

```bash
node tools/test-interrogation.mjs          # 64단언 — 깨뜨리지 마라
node tools/test-unlocks.mjs                # 10단언
node tools/factcheck.mjs                   # 사실 그래프 전 게이트
node tools/playthrough.mjs --fast --act 1  # 1막 완주 봇
SHOT_PORT=5603 node tools/shoot.mjs --out shots/s3 hud-prompt notebook-present interrogation-face
```

- **UI 상태기계에는 지금 단언이 0건이다.** S4가 신설 중이지만, 네 수정의 1차 검증은 네 몫이다 —
  실브라우저(`npm run dev`)에서 이탈·중첩·잔류를 직접 재현해봐라.
- 심문 UI 수정은 PNG를 Read 도구로 직접 봐라. 디제틱(1947 종이 소품) 성립이 N8 9점의 근거다 —
  시스템 폰트·기본 버튼·이모지가 들어가면 그 점수가 무너진다.
- `Math.random`/`Date.now` 직호출 금지 — `core/util.js`의 `rng`, `engine.time`.

## 4. 커밋

**같은 워킹트리에서 4개 세션이 동시에 돈다. git 인덱스는 워킹트리당 하나뿐이라 공유된다** —
`git add` 후 commit 하기까지의 사이에 다른 세션이 add 하면 그 파일이 네 커밋에 섞인다.
**`git add` 를 쓰지 말고 pathspec 커밋을 써라:**

```bash
git commit -m "fix: 심문 Escape 1차 동작을 제시 취소로" -- src/narrative/ src/ui/ src/chars/
```

- `git commit -a` · 무인자 `git add -A` 금지.
- `index.lock` 충돌로 실패하면 정상이다 — 2~3초 뒤 재시도.
- `git status` 에 네 것이 아닌 수정 파일이 보이는 것도 정상이다. **`git stash`·`git checkout .`·
  `git reset --hard` 금지 — 남의 작업을 지운다.**
- 커밋 후 `git show --stat HEAD` 로 자기 파일만 들어갔는지 확인.

**이력 재작성 금지**(제출 요건). 작업 단위로 자주.

## 5. 완료 보고

- N1~N8 각각에 대해 **무엇을 바꿨고 어떤 재현으로 확인했는가**. 점수 자평은 쓰지 마라.
- 로어 3종은 "발화된다/안 된다"를 실플레이 관측으로 답해라.
- 미달은 `docs/HANDOFF.md`에 소유자 반환. 콘솔 에러·경고 0 확인.
