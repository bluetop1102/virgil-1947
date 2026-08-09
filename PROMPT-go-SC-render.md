# 발사문 S-C — 렌더·물성 (J2 피크 프레임 · G7/G8 잔여)

> 실행자: Claude 새 세션. 개선 창 **오늘 24:00까지**. 제출 8/10 밤.
> 발주 근거: `docs/reviews/judge-plan-2026-08-09.md` — J2 **6점**. 오늘 밤 그래픽은 전면전이
> 아니다 — **제출 프레임 3종을 상용 오인 수준으로 미는 국소전**이다.
> 완료 판정은 §4의 기계 프로브 + 블라인드 비전 채점 + `pix.mjs` 회귀 게이트.

## 0. 먼저 읽는다

1. `docs/reviews/judge-plan-2026-08-09.md` §1 J2·J1 — 근거 실측.
2. **`docs/RESUME.md` §3 — 기각 가설 17건. 여기 있는 것을 다시 파면 오늘 밤이 끝난다.**
   특히 §3.2 A/B 오염 3종(설정 후 재settle·composite는 --off 밖·1변종만 깨끗)을 먼저 숙지.
3. `docs/HANDOFF.md` — ①`wood.varnished.dark` 클리어코트 기전(S2→S1 등재분) ②[!] `pix.mjs`
   REGRESS 2건을 롤백 신호로 읽지 마라 항목.
4. `AGENTS.md` — 샷 하네스 규약(GPU 락·`--out` 분리·`SHOT_PORT`).

## 1. 소유 파일 (배타적)

```
src/render/**
src/world/**      (lobby*  materials  props  atmo)
shots/_baseline/
```

램프 위치 변경 요청이 HANDOFF에 올라올 수 있다(S-B가 카메라로 못 풀 때) — 그때만 소품을 만진다.

## 2. 현황 — JUDGE 실측 (좌표)

- **모달 복귀 화이트아웃**: 서류철/노트(밝은 종이)를 닫은 직후 1~2초 과노출(2차 `76`,
  expo 72.7). 노트 열고 닫기만으로 재현된다.
- **앙각 과노출**: 천장 앙각에서 expo 72 계열(2차 `42`) — 석고 균열망이 절차 노이즈로 읽히는
  즉답 트리거와 결합.
- **인트로 트래킹 모션블러**: 형체가 뭉개져 결함으로 읽힘(`shots-judge/j1-114-cin` — 벨홉
  인형·기둥). 셔터 각 축소가 1차 지시 잔여다.
- **샹들리에 상단 세로 글로우**: `j2-lobby-wide` 상단 — HANDOFF 등재 클리어코트 기전 +
  `clearcoatRoughness 0.30` 미적용. 제출 프레임 3(lobby-wide)의 마지막 발목.
- **데스크 서랍 5칸 동일 반복**: `j2-lobby-wide` 데스크 전면 — 동일 패널+핸들 반복이
  원거리에서 프로시저럴 티를 낸다.

## 3. 작업 (우선순위 순 — 항목마다 diff 게이트 통과 후 다음으로)

### P0-1. 노출 클램프 [1h]
모달 복귀(서류철·노트 닫힘) 직후와 앙각에서 오토노출 상한. 검증 수치: 모달 닫고 1초 내
expo ≤ 40, 앙각 expo ≤ 50(§4 프로브가 기계 판정). **RESUME §3 기각 가설 1(오토노출 바닥값)과
다른 작업이다** — 그건 워시아웃 가설이었고 이건 상한 클램프다.

### P0-2. 인트로 셔터 각 축소 [30분]
트래킹 중 모션블러 강도를 내려라. 목표: `frame-01-cin-t14`에서 인형·기둥 윤곽이 판독된다.

### P0-3. 클리어코트 글로우 소거 [1.5h]
HANDOFF 등재분 그대로: `wood.varnished.dark` 기전 처리 + 샹들리에 `clearcoatRoughness 0.30`.
완료 후 `frame-05-lobby-wide` 재촬영 — 상단 세로 광 띠가 없어야 한다.

### P1-4. 데스크 서랍 전면 변주 [1h]
칸별 명도·마모·핸들 각 변주. 근접(`j4-10`)과 와이드(`j2-lobby-wide`) 양쪽에서 반복이 안 읽혀야 한다.

### P1-5. 라디오 테이블 국소 광원 · 소파 쿠션 분할 [1.5h — 여력 시]
G1·G10 잔여. 21:00까지 P0 셋이 안 끝났으면 이 항목은 포기로 기록한다.

## 4. 검증 — 삼중

**(a) 기계 프로브 + 회귀 게이트.**
```bash
npx vite --port 5713 &
PROBE_URL=http://127.0.0.1:5713/ PROBE_OUT=shots/judge-sc node tools/judge-probes/probe-frames.mjs
SHOT_PORT=5913 node tools/shoot.mjs --out shots/judge-sc-full     # 전 샷 성공 유지
node tools/pix.mjs diff shots/_baseline/corridor.png shots/judge-sc-full/atmo-corridor-night.png --heat /tmp/sc-heat.png
```
probe-frames 기계 2항목(모달 복귀 expo·앙각 expo) PASS + 전 샷 성공 + 회귀 diff에서
개선 방향 확인(HANDOFF [!] 항목 — REGRESS 표기를 무조건 롤백으로 읽지 마라).

**(b) 블라인드 비전 채점.** 구현 내용을 모르는 서브에이전트에 프레임만 주고:
> "frame-01: 움직이는 화면 한 장이다. 사람·기둥 윤곽이 판독되는가, 뭉개져 보이는가.
> frame-05: 샹들리에 위쪽에 수직 광 띠·번짐이 보이는가. 화면 속 데스크 전면에서 반복
> 패턴이 느껴지는가. frame-02와 frame-05: 상용 게임 스크린샷인가 데모인가 — 즉답해보라."
PASS: 윤곽 판독 가능 · 광 띠 없음 · "즉답 불가" 또는 "상용". 답변 원문을 보고에 인용.

**(c) A/B 방법론.** 변종 비교가 필요하면 RESUME §3.2를 그대로 따른다 — settle 재실행,
composite 유니폼 직접 0, 결정 판정은 1변종 단독 재실행.

## 5. 커밋

pathspec 커밋만:
```bash
git commit -m "fix: 노출 클램프·클리어코트 글로우" -- src/render/ src/world/ shots/_baseline/
```
규약 동일(무인자 add 금지·stash/reset 금지·rng·500줄 린트). 기준선 갱신은 개선 확정 후에만.

## 6. 완료 보고

- 항목별 수치(클램프 상한·셔터 각·러프니스 값)와 diff 결과.
- 프로브 verdict + 블라인드 채점 답변 원문.
- 재촬영된 제출 프레임 3종 경로(게이트 세션이 최종 재촬영·선정한다).
- 포기 항목과 이유. HANDOFF 등재분.
