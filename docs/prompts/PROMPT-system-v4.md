# 발사문 — 위임 시스템 v4 (P1 발주 운영: 회수·검증·머지)

> 실행자: **Opus 새 세션** (기계 절차 중심 — 최강 모델 불필요. 게슈탈트 판정은 이 발사문
> 범위 밖이며 최종 체험 리뷰만 Fable 별도 세션이 후행한다).
> 선행: v3(P0 발주) 완료. 이 문서는 v3 §4.3 머지 규약의 P1 판이다. v1~v3 재독 불필요.
> 배경 결정: 예산 제약으로 P1 구현은 codex 패킷 발주(E10 §3 배정 변경 — HANDOFF 기록됨).

## 0. 지금 서 있는 자리 (2026-08-07 발사 시점 실측)

| 축 | 상태 |
|---|---|
| P0 | 01·03·05·06 done · 02·04 in-progress(유일 결박 = HANDOFF #29 practical 비등록 팩토리 답신 — ATMOSPHERE) |
| T-P1-02 리그 | **done** — 마리오네트 정본 머지(`e46adb0`). 인물 아트 디렉션 = 의도된 퍼펫(디렉터 확정) |
| P1 1파 | **codex 3장 실행 중** (아래 §2 — 회수부터 시작하라) |
| 린트 | 전체 스캔 잔여 14건 전부 타 소유(HANDOFF 목록) — **네 커밋은 명시 스테이지만 하면 안 걸린다** |
| 워킹 트리 | `src/world/props.js` 미커밋 분할본 존재 — **절대 스테이지·되돌리기 금지**(T-P0-04 2/2 대기분) |

## 1. 필독 (이것만)

1. `AGENTS.md` — 안전 규칙·샷 하네스 규약·**병렬 커밋 규약**(`git commit -a`·무인자 `add -A` 금지).
2. `tools/calibration/prompt-order.md` — 실발주 투입 원문(패킷 경로만 교체).
3. `docs/HANDOFF.md` 하단 200줄 — 답신 상태·타 소유 잔여 목록.
4. 패킷 시스템 명령: `node tools/packet-gen.mjs --all && node tools/packet-gen.mjs --audit`(잔여 0 확인) ·
   `node tools/manifest-check.mjs`(정합 PASS 확인) — **매니페스트를 고치면 반드시 재생성**.

## 2. 1파 회수 (지금 — 이미 발주돼 돌고 있다)

| 티켓 | 클론 | 최종 보고 파일 |
|---|---|---|
| T-P1-01 로비 정식 레벨 | `~/Documents/WORK/Worktrees/qp1-01` | `/private/tmp/claude-501/-Users-kang-yunbyeong-Documents-WORK-Projects-cecil-hotel-noir/ec8bf6a9-47c4-491d-8094-415ffd8dad86/scratchpad/out-p1-01.md` |
| T-P1-03 다이치 텔 4클립 | `~/Documents/WORK/Worktrees/qp1-03` | 같은 폴더 `out-p1-03.md` |
| T-P1-05 로딩·타이틀·설정·계측 | `~/Documents/WORK/Worktrees/qp1-05` | 같은 폴더 `out-p1-05.md` |

완료 판별: 보고 파일이 생겼거나 클론 `git log --oneline -1` 에 새 커밋. 폴링:
`ls <보고파일> && git -C <클론> log --oneline -2`. 안 끝났으면 기다린다(수십 분 걸릴 수 있음).

**회수 절차 (티켓마다 — v3 §4.3 승계, 전 과정 실측 출력 첨부):**

1. **보고 읽기** — 수용 기준 결과·구현 선택·패킷 지적. §10.1 반환(착수 거부)이면 사유를
   매니페스트에 역반영 후 재발주(아래 §5 명령).
2. **감사** — `git -C <클론> status --short`(소유 밖 파일 0) · 커밋이 소유 파일만 건드리는지
   `git -C <클론> show --stat` · rig/level 류는 `Math.random\|Date.now` grep 0.
3. **클론 내 수용 기준 재실행** — 패킷 §8 명령 그대로(클론 안에서). playthrough 항목은
   "통합 시 실행 대기"로 표기돼 있으면 생략 정상.
4. **본체 머지** — 산출 파일만 본체로 복사(`cp <클론>/<파일> <본체>/<파일>`) → 본체에서
   수용 기준 재실행 → 샷 티켓(01·05)은 해당 샷을 본체에서 재촬영해 **PNG 를 Read 로 직접
   눈으로 본다**(CLAUDE.md 시각 검수 규약 — 파탄만 거른다, 미세 감각 판정은 Fable 리뷰 몫)
   → **자기 소유 경로만 명시 스테이지** → 커밋(훅이 자동 검사).
5. **기록** — 커밋 메시지에 티켓·클론 커밋 해시·게이트 실측 요약. 패킷 지적은
   `tools/calibration/report.md` §5 표에 이어서 등재(결함 번호 이어쓰기).

## 3. 2파·3파 발주 (1파 머지 후)

- **2파**: T-P1-04(심문 E2E) · T-P1-06(완주 봇) · T-P1-07(첫 30초) · T-P1-10(qa 하네스) — 병렬 가능.
- **3파**: T-P1-08(심문 카메라) · T-P1-09(심문 UI) — 04 머지 후.
- 발주 전마다: 해당 매니페스트의 depends 를 실소비·done 기준으로 정밀화하고, 아직 없는
  도구(playthrough 등)를 부르는 수용 기준에 "통합 시 실행" 문구가 있는지 확인(1파에서 한
  방식 그대로 — `data/manifest/T-P1-01.json` 참조). 고치면 재생성·정합 확인 후 커밋.

## 4. 통합 게이트 (3파 머지 후)

`PROMPT-build-p1.md` v2 의 통과 조건 은행 그대로: 완주 봇 1막(`node tools/playthrough.mjs
--fast --act 1`) · 콘솔 0 · P2(30초 캡처 vs E2 표 행 단위) · P4 · P5 · factcheck 전건 ·
`npm run shot` 전 샷. 미달 항목은 소유 티켓에 재발주. **여기까지 끝나면 사용자에게
"Fable 체험 리뷰 준비 완료"를 보고하고 멈춘다** — 감각 판정은 하지 마라.

## 5. 발주 명령 원문 (재발주·2파·3파 공통)

```bash
W=~/Documents/WORK/Worktrees
S=<네 세션 scratchpad>
t=04   # 예
rm -rf $W/qp1-$t && git clone --local --quiet . $W/qp1-$t
sed "s|<PACKET>|packets/PACKET-T-P1-$t.md|g" tools/calibration/prompt-order.md | sed '1,/^---$/d' > $S/order.txt
codex exec -C $W/qp1-$t -s workspace-write --skip-git-repo-check -o $S/out-p1-$t.md "$(cat $S/order.txt)" < /dev/null &
```

`< /dev/null` 필수(stdin 대기 행 방지). 클론은 `git clone --local`만 — 워크트리 금지(훅 공유).

## 6. 예산·안전

- codex 실비 발주는 P1 10장 범위로 사용자 승인 완료. 세션 한도 근처 팬아웃 금지 — 직렬 전환.
- **이력 재작성 금지**(제출 요건) · 외부 에셋 다운로드 금지 · `Math.random`/`Date.now` 직호출 금지.
- 편집 금지: `docs/design/**`(E*·graders) · `STORY*` · `ARCHITECTURE.md` · `AAA-RUBRIC.md` ·
  기존 `PROMPT-*.md` · 남의 소유 src. **예외**: 외부 산출의 본체 머지는 이 세션의 일.
- 배타 소유(승계): `data/manifest/**` · `packets/**` · `tools/{manifest-check,packet-gen,serve-check,lint-contract,install-hooks}.mjs` ·
  `tools/calibration/**` · `docs/credits.md` · `docs/submission/**`.
- 계약이 결정 못 하는 지점은 `docs/HANDOFF.md` 하단 등재(형식은 기존 항목 모방) — 세션 간
  유일 채널이다. #29 답신이 오면: 광원 4건 라우팅 티켓 발주 + `props.js` 분할 커밋으로
  P0 를 완전 종결한다.

## 7. 완료 기준 (이 발사문의)

P1 10장 전건 머지 + §4 통합 게이트 전건 PASS + HANDOFF 잔여(타 소유분 제외) 0 +
`docs/submission/README.md` 상태판 갱신. 그 시점에 사용자에게 Fable 체험 리뷰와
배포 재갱신(`npm run build:pages` → gh-pages)을 제안하고 종료한다.
