# 발사문 — 게이트 3기 인계 (Fable 새 세션 · 2026-08-10)

> 전임 게이트(JUDGE 판정 → 병렬 발주 → 회수·통합·배포 2회 → 완결 라운드)가 컨텍스트 한계로
> 이관한다. 너는 **회수·판정·통합·배포 게이트**다 — 직접 기능을 만들지 않는다.
> 제출 **오늘 밤**. 현재 배포 `gh-pages 56c576d` 라이브(serve-check PASS).

## 0. 지금 병렬로 돌고 있는 것 — 4세션 (전부 이 저장소 워킹트리 공유)

| 세션 | 발주문 | 소유 | 상태(이관 시점) | 완료 보고 파일 |
|---|---|---|---|---|
| S-L 성능 | `PROMPT-go-SL-perf.md` | render/** · core/config(QUALITY 한정) · ui/settings · world/** | 커밋 4건 완료(93cfc9a·a40694a·8204f0a·11bacb5). 마무리 체인(3프리셋 실측→완주 봇→프로브 4종) 진행 중 | `docs/reports/SL-final.md` |
| S-M 오디오 튜닝 | `PROMPT-go-SM-audiotune.md` | audio/** · 청감 시트 | 착수 직후. 사용자 실청취("걸을 때 물 떨어지는 소리·주기 북소리 별로")의 발화원 특정 → 처방 | `docs/reports/SM-final.md` |
| S-N 대본 개고 | `PROMPT-codex-script.md`(계약) | narrative/script.js · cinematics.js 나레이션 상수만 | 착수 직후. codex(sol ultra fast) 초안 → 불변 7항 검수 → 검증 3종 | `docs/reports/SN-final.md` |
| S-O 인물 조형 | `PROMPT-go-SO-chars.md` | chars/** | 착수 직후(Opus 5 모델). 유리 눈→시선→조형→배경 인형. 블라인드 전후 대조가 기준 | `docs/reports/SO-final.md` |

**회수 방법**: 각 세션에 완료 보고를 위 파일로 커밋하게 지시돼 있다 — **저장소가 회수 채널이다**
(`git log`·`docs/reports/`·`docs/HANDOFF.md` append 감시). `ListAgents` 에 SL-perf 등이 보이면
`SendMessage` 로 직접 물어도 된다. 세션 한도(리셋 주기 존재)로 죽으면 워킹트리에 WIP 가 보존된다
— stash/reset 금지, 이름으로 재개 메시지를 보내면 이어진다.

## 1. 먼저 읽는다 (순서대로)

1. **이 문서 §3 전임 판정 기록** — 재론하지 마라.
2. `docs/RESUME.md` §3 — 기각 가설 **20건**(18~20 신설: 앵커 하향·램프 개구 회전·이방성 AA).
3. `docs/HANDOFF.md` 하단 — 회수 블록 1·2차(감사 기록·수용된 미달·미처리 큐).
4. `tools/judge-probes/common.mjs` 헤더 — **하네스 함정**: 엔진 시계 0.4배(경합 시 0.2) ·
   SHOT=1 낡은 판 PASS(수정 후 vite 재시작·curl 로 서빙 판 확인) · 공유 트리 교차 오염.
   추가 함정: `shoot.mjs --ab` 상태 누적 · vite HMR 이 프로브 중 리로드(SHOT=1 로 끄고 측정).
5. `docs/reviews/judge-plan-2026-08-09.md` + `fable-experience-2026-08-09-r3.md` — 판정 계보
   (J1 7·J2 7·J3 7·J4 6·J5 7·J6 7* — 피크 없음·바닥 없음).
6. `PROMPT-integrate.md` §2·§3 — 회수 절차 원본(커밋 감사·통합 게이트·기준선·배포 §3-5).

## 2. 네가 할 일 — 회수 → 통합 → 배포 → 프레임 → 보고

1. **회수마다**: 커밋 감사(소유 단일 축 · HANDOFF 는 append 만 — 커밋했으면 "규약 이탈·실해
   여부"만 기록, 이력 재작성 금지) · 세션의 검증 주장 중 1개를 직접 재실행으로 교차 확인.
2. **4건 모두 회수 후 통합 게이트**:
   `node tools/test-interrogation.mjs`(108/0) · `test-unlocks` · `factcheck` · `lint-contract`
   (기준선 4건 초과 금지) · `playthrough.mjs --fast --act 1` ·
   `SHOT_PORT=59xx node tools/shoot.mjs --out shots/base-r5` → base-r4 대비 pix diff
   (의도 변화는 세션 보고와 대조 판독 — REGRESS 자동 롤백 금지, 3조건: 예고·대조군 격리·지표).
3. **배포** (integrate §3-5 그대로):
   ```
   npm run build:pages
   WT=<scratchpad>/ghp; rm -rf $WT; git fetch origin gh-pages; git worktree add -q $WT gh-pages
   cd $WT && git reset -q --hard origin/gh-pages && rm -rf assets index.html
   cp -R <repo>/dist/assets <repo>/dist/index.html . && git add -A -- assets index.html
   git commit && git push origin gh-pages && cd <repo> && git worktree remove --force $WT
   # CDN 폴링(새 index-*.js 해시 일치까지) 후: node tools/serve-check.mjs --url https://bluetop1102.github.io/virgil-1947/
   ```
   배포 후 `git push origin master:main`(소스 공개 요건) + `docs/submission/README.md` 해시·커밋 수 갱신.
4. **제출 프레임 재촬영**: `PROBE_OUT=shots/gate-r3 node tools/judge-probes/probe-submit.mjs`
   ×2 take — **지표만 보지 말고 프레임을 Read 로 직접 봐라**(심문 컷 구도는 실행마다 갈린다).
   S-O 인물·S-N 자막이 바뀌므로 5장 전부 갱신 + `docs/submission/frames/frames.md` 문단 갱신.
   블라인드 1문("인형이 공예품으로 보이는가")로 S-O 성과 최종 확인.
5. **사용자 보고 한 문단** + 사용자 몫 3건 안내(영상 촬영은 최종 배포 후 · 청감 12분
   `docs/submission/audio-listen-check.md` · PDF 변환 README §PDF).

## 3. 전임 판정 기록 — 재론 금지

- S-L: pixelBudget 승인 · 첫 부팅 자동 강등 **기각 승인** · HIGH 상한은 두 갈래 모두 현행
  유지(모션 품질도 판정 대상 — 무제한 HIGH 11.8fps 는 "정지만 최대") · 탈출 조건은 G6급
  디테일 사망 시 3.0Mpx 완화안만.
- S-J 검분 종이 패럴랙스("화면 고정 UI") = 수용된 미달, 제출 후 1순위(render 소유 월드 메시).
- ui-gate shotlist 엔트리·type.js wrap 잔여·fog.ambient 미도달·--ab 누적 = 제출 후 처리.
- 세이브·로드 부재 = 문서 정정으로 처리(구현 금지 — 마감 리스크).
- 게이트 화면은 제출 프레임 패킷 제외(영상 도입부가 담당).
- 인물 조형 수용 미달은 **사용자 지시로 해제** → S-O 가 작업 중이다.
- 커밋 규약: pathspec 만 · `git add -A`/`commit -a`/stash/reset 금지 · 문서(HANDOFF·ARCH·STORY)는
  게이트 일괄 커밋 · `Math.random`/`Date.now` 금지 · 500줄 린트 · 실존 인물 재현 금지.

## 4. 제출물 현황 (docs/submission/README.md 이 정본)

1 빌드+소스: **성립**(배포·main 푸시 완료 — 최종 배포 후 해시만 갱신) · 2 영상: 대본 완성,
촬영은 사용자(최종 배포 후 권장) · 3·4 문서: md 완성, PDF 변환은 사용자 · 5: 해당 없음.
제출 프레임: `docs/submission/frames/`(§2-4 로 갱신 예정).
