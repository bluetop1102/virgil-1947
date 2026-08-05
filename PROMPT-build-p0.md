# 《VIRGIL》 구현 발사문 P0 — 정지작업 (새 세션에 그대로 붙여넣기)

*기획 게이트 통과본(docs/design/E0~E10, 2026-08-05)이 이 발사문의 상위 문서다. 티켓의
진실원은 `docs/design/E10-production.md` §2 — 여기 복사하지 않고 id로 참조한다.*

---

ultracode. /goal P0 정지작업: 계약 문서와 실코드의 어긋남을 0으로 만들고, 기계 게이트를
커밋 훅에 걸어 이후 전 Phase가 그 위에서 돌게 하라. **신규 게임 기능 0** — 이 세션의
산출은 청소와 게이트뿐이다.

**통과 조건**: T-P0-01~05 수용 기준 전건(E10 §2 P0 표) + `node tools/factcheck.mjs` 전건
PASS + 화면 표출 "세실" grep 0 + `pix diff` 기준선(`shots/_baseline/corridor.png`) 대비
무변화 + 콘솔 에러·경고 0.
**중단 조건**: 라운드 10회 상한 · **서브에이전트 토큰 상한 500만** · 티켓당 담당 1명
직렬(동시 팬아웃 금지 — 같은 픽셀을 두 손이 만지면 귀속 불가) · 세션 한도 근처에서
라운드 경계 종료 후 HANDOFF 기록.

프로젝트: /Users/kang-yunbyeong/Documents/WORK/Projects/cecil-hotel-noir

## 입력 (필독 순서)

1. `docs/design/E10-production.md` §2 P0 티켓 5장 — 소유 파일·수용 기준·모델 배정.
2. `docs/ARCHITECTURE.md` v2 — §2 소유권(500줄 초과 4파일·신설 예정 표기) · §6/§6.5 계약.
3. `docs/design/E3-case-graph.md`·`docs/design/case-graph.json` — T-P0-03의 id 정합 기준.
4. `docs/STORY.md` v2 — T-P0-03의 대사 원문(프라이스 S2 개정 포함. 한 글자도 창작 금지).
5. `docs/RESUME.md` §3 — 기각 가설 17건. 재질 클론은 반드시 `kit-mat.cloneMat()`.
6. `AGENTS.md` — 샷 하네스 규약(GPU 락·`--out` 분리·SHOT_PORT).

## 티켓 실행 순서 (의존 없음 — 단 03은 01의 린트가 있어야 최종 검증 가능)

T-P0-01(린트 훅) → T-P0-05(P5 검사기) → T-P0-03(script v2 이행) → T-P0-02(예외 청소) →
T-P0-04(500줄 분할). 라운드당 티켓 1개. 각 티켓 종료 시 커밋(라운드 단위 증빙).

## 반드시 지킬 것

- **그래픽 동결.** 시각 산출이 변하면 그 라운드는 실패다 — `pix diff` 무변화가 02·04의
  수용 기준이다. 개선도 금지다(동결은 방향이 아니라 정지다).
- `src/core/*` 수정 금지. 셰이더·패스·재질 레시피 신설 금지.
- 대사·데이터 창작 금지 — STORY v2·case-graph.json에 없는 것은 CONTRACT_CHANGE_REQUEST로.
- 커밋은 라운드 단위. 훅이 걸리면(T-P0-01 이후) 훅을 우회하지 않는다.

## 종료 조건

통과 조건 전건 + `docs/ROUNDS.md`에 P0 라운드 로그(티켓·게이트 출력·커밋 해시) 기록.
완료 시 다음 발사문은 `PROMPT-build-p1.md` — 외부 모델(GPT sol·Grok build) 투입은
P1 1회전 이후에만 허용된다(E10 §3).
