# 발사문 S-E — 마감 수정·제출 프레임·최종 배포

> 실행자: Claude 새 세션. 근거: 3차 재판정 `docs/reviews/fable-experience-2026-08-09-r3.md`
> 오전 권고 + §3 부수 발견. 제출 8/10 밤 — **오늘 낮 안에 끝낸다.**
> 원칙: **그래픽(노출·구도·재질)은 건드리지 않는다** — 3차 판정의 명시 권고다. 이 발주는
> 소폭 UI 2건 + 프로브 1건 + 패키징 + 배포뿐이다.

## 0. 먼저 읽는다

1. `docs/reviews/fable-experience-2026-08-09-r3.md` §0-1(프로브 오탐 기전)·§1 J5③·§3 부수
   발견 2건·§5(제출 프레임 확정본) — 이 발주의 근거 전부.
2. `tools/judge-probes/common.mjs` 헤더 — 하네스 함정 3건. 소스 수정 후 vite 재시작 필수.
3. `AGENTS.md` — pathspec 커밋 규약. docs/HANDOFF.md 는 append만.

## 1. 소유 파일 (배타적 — S-G 세션이 docs/submission/*.md 를 동시에 만진다)

```
src/ui/settings.js  src/ui/subtitles.js
tools/judge-probes/**
docs/submission/frames/   (신규 디렉터리 — 이 발주가 만든다)
gh-pages 배포 (워크트리 절차)
```

## 2. 작업

### P0-1. 설정 조정표 조작 행에 Esc 추가 [30분]
3차 J5③: 조작 카드는 1회성인데 조정표 조작 행에 Esc 가 빠져 있어, 카드를 놓친 플레이어가
설정 여는 법을 배울 자리가 없다. `settings.js` 조작 행에 `카드 Esc` 항목 추가.

### P0-2. 자막 어절 줄바꿈 수정 [1h]
3차 §3 부수 ①: `tell-01~03` 에서 "…제 기억 / 으론." 처럼 어절 중간이 갈린다 — 제출 프레임에
그대로 찍힌다. `subtitles.js` 줄바꿈을 공백 경계로. canvas 조판이니 measureText 기준 어절 단위
개행. 검증: 같은 진술 프레임 재촬영에서 어절 분리 0.

### P0-3. 크레딧 표기 대비 소폭 상향 [20분]
3차 §3 부수 ②: 조정표 하단 CC BY 표기가 판독 하한. 잉크 농도만 올린다(레이아웃 불변).

### P0-4. probe-guidance 카드 판정을 사건 결박으로 [40분]
3차 §0-1: 고정 시각 판정이라 실행마다 갈리는 게이트 오탐. `cinematic:end` 수신 후 상태를
읽도록 수정(페이지 이벤트 구독 — common.mjs 의 startEventLog 참조). 검증: 3회 연속 실행 전부
같은 verdict.

### P1-5. 제출 프레임 패키지 [40분]
`docs/submission/frames/` 신설, 3차 §5 확정본 복사+캡션 파일(`frames.md` — 각 프레임이 무엇을
증명하는지 1줄 + 출처 경로 + 타이틀은 "배경 AI 생성" 명시):
- 본선 3: `shots-fable-3/sub-30-picker.jpg` · `sub-11-s1-choice.jpg` · `frame-00-title.jpg`
- 예비 2: `fr-50-notebook.jpg` · `sub-40-s3-lines.jpg`
P0-2 수정 후 자막 프레임(sub-11 등)은 **재촬영본으로 교체**해라(어절 분리가 찍혀 있다).

### P1-6. 검증 후 최종 재배포 [40분]
```bash
npx vite --port 5716 &   # 수정 후 재시작 — 낡은 판 함정
PROBE_URL=http://127.0.0.1:5716/ PROBE_OUT=shots/judge-se node tools/judge-probes/probe-guidance.mjs   # 7/7 ×3회
node tools/playthrough.mjs --fast --act 1
npm run build:pages
```
배포는 `PROMPT-integrate.md` §3-5 워크트리 절차 그대로(fetch→reset→복사→push→serve-check).
배포 후 커밋 해시를 완료 보고에 적어라.

## 3. 검증 요약 (완료 조건)
probe-guidance 7/7 ×3회 일관 · 재촬영 자막 프레임 어절 분리 0(직접 Read로 확인) ·
완주 봇 PASS · serve-check PASS · 콘솔 0.

## 4. 커밋·보고
pathspec 커밋만(`src/ui/`·`tools/judge-probes/`·`docs/submission/frames/` 분리). HANDOFF append만.
완료 보고: 항목별 결과 + 배포 해시 + 재촬영 프레임 경로.
