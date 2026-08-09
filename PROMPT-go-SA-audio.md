# 발사문 S-A — 사운드스케이프 (J6 · 사용자 최우선 축)

> 실행자: Claude 새 세션. 개선 창 **오늘 24:00까지**. 제출 8/10 밤.
> 발주 근거: `docs/reviews/judge-plan-2026-08-09.md` — J6 **4점(바닥 위반)**.
> 완료 판정은 네가 하지 않는다 — §4의 기계 프로브 + 독립 에이전트 교차 판독을 통과해야 하고,
> 최종 회수는 게이트 세션(JUDGE 오케스트레이터)이 한다.

## 0. 먼저 읽는다

1. `docs/reviews/judge-plan-2026-08-09.md` §0-2·§1 J6·§2 — 이 발주의 근거 실측 전부.
2. `docs/design/E7-presentation.md` §3 — 오디오 계약: **비디제틱 BGM 0, 예외는 엔딩뿐.** 이 계약은 오늘 밤에도 깨지 않는다.
3. `docs/submission/audio-listen-check.md` — 네 산출물이 이걸 갱신한다.
4. `AGENTS.md` 에셋 예외 ② — **BGM에 한해** 외부 라이선스·AI 생성 트랙 허용(사용자 승인). sfx·룸톤·리버브는 절차 생성 유지. 라이선스 전문·도구·프롬프트를 `docs/credits.md`에 기재하지 않으면 제출물 4번이 불성립한다.

## 1. 소유 파일 (배타적)

```
src/audio/**        (engine.js  music.js  cues.js  dsp.js  graph.js  ir.js)
docs/credits.md
docs/submission/audio-listen-check.md
tools/test-audio.mjs
assets/  중 BGM 트랙 파일 추가분
```

남의 파일은 `docs/HANDOFF.md` 등재. 같은 워킹트리에서 S-B(narrative·chars)·S-C(render·world)·S-D(ui·gameplay)가 동시에 돈다.

## 2. 현황 — JUDGE 실측 (재발견하지 마라 · 재배포 후 갱신 반영)

- **심문이 게임에서 가장 조용하다 — 이것이 네 P0다.** 재배포본(gh-pages `61c3b21`) 스모크
  실측: 심문 lines 구간 평균 **-42.7dB vs 배회 기준선 -34.5dB** (probe-audio FAIL 확인).
  interro 감쇠 0.42가 환경을 낮추는데 그 자리를 채우는 소리가 없다. 긴장이 올라야 할 순간에
  소리가 내려간다.
- 자유 플레이는 **-35dB 룸톤 평탄선**이다(무음 구간 0은 성립). 음악 큐는 인트로 드론·1막
  late 페이즈 11초·3막·엔딩뿐 — 자유 구간의 긴장 곡선이 소리로 존재하지 않는다.
- **인트로 드론 레이스 — 구조 잔존, 현재는 이기는 중.** 판정 대상(구배포 `6b7bec3`)에서는
  `musicOn` 0으로 미발화였으나(judge-plan §0-2), 재배포본 스모크에서는 발화한다(103샘플).
  원인 구조는 그대로다: `cinematic:start`가 첫 제스처와 같은 프레임에 오고 `musicCue`에
  defer 경로가 없어 **ctx 생성 리스너와의 등록 순서에 승패가 달려 있다** — 번들 구성이
  바뀌면 다시 진다. 접전 방어로 고쳐라(P1-3).
- sfx는 성립한다(획득음 -23.6dB 스파이크·벨 2타·재질별 발소리 실측). 확충이 아니라 **음악층**이 이 발주다.

## 3. 작업 (우선순위 순 — 21:00까지 P0 둘이 안 서면 P1을 버려라)

### P0-1. 심문 긴장층 [2.5h]
물의 리트모티프(E1=41.2Hz)를 심문의 언어로 확장한다: 진입 시 저역 상승 · 거짓 지목(증거 서류철 열림)
스팅어 · 판정 후 해소. 이벤트는 이미 배선돼 있다 — `cues.js`가 `interrogation:*`·`ui:open`을 듣는다.
비디제틱 BGM 금지 계약과의 경계: **곡이 아니라 음정화된 저역 이벤트**로 유지한다(기존 drone 문법).

### P0-2. 심문 감쇠 재설계 [1h]
quiet 0.42는 환경(룸톤·라디오)만 낮추고 **긴장층 버스는 예외**로. 목표: 심문 lines 구간 RMS가
배회 기준선 이상(역전 해소 — §4 기계 판정 기준).

### P1-3. 드론 defer 수정 [30분]
`musicCue`에 ctx 부재 시 지연 계약을 넣는다(벨의 `playOrDefer`와 같은 방식 — `_open` 때 흘려보내기).
**제스처 전에 AudioContext를 만들지 마라** — 콘솔 경고 = 실격(D 계열)이고 그 제약 때문에 이 구조가 생겼다.

### P1-4. 라디오 디제틱 BGM 배선 [2.5h]
**트랙 선정은 사용자 결정 대기다(AI 생성 vs 에셋 — 오케스트레이터가 후보를 조달한다). 기다리지
말고 배선을 먼저 만들어라**: 외부 오디오 파일을 로비 라디오 버스에 태우는 경로(디코드→라디오
대역 필터·낡은 스피커 착색→기존 라디오 게인·거리 감쇠·오답 딥·심문 감쇠를 그대로 상속) +
`docs/credits.md`에 기재 템플릿(트랙명·출처·라이선스 전문·도구·프롬프트 칸). 트랙이 도착하면 태우고 리허설.

### P1-5. E2 0:22–0:27 "라디오가 잦아든다" [30분]
`cinematic:start` 구독으로 인트로 구간 라디오 게인 자동화(HANDOFF 등재분을 오디오 쪽에서 해결 — CINEMATICS 파일 침범 금지).

## 4. 검증 — 삼중

**(a) 기계 프로브.** 자기 수정 완료 후:
```bash
npx vite --port 5711 &   # 자기 전용 포트
PROBE_URL=http://127.0.0.1:5711/ PROBE_OUT=shots/judge-sa node tools/judge-probes/probe-audio.mjs
node tools/test-audio.mjs && node tools/test-audio.mjs --roomtone   # 기존 배터리 — 깨뜨리지 마라
```
probe-audio의 4항목이 전부 PASS여야 한다: ①인트로 musicOn ≥10초 ②배회 무음 0
③심문 lines ≥ 배회 -1dB ④콘솔 0.

**(b) 독립 에이전트 교차 판독 (블라인드).** 구현 내용을 모르는 서브에이전트를 새로 띄워
`shots/judge-sa/probe-audio.json`만 주고 이렇게만 물어라 — 유도 금지:
> "이 오디오 RMS 타임라인에서 ①t<31에 음악층(musicOn) 구간이 있는가 ②심문 구간(이벤트
> interrogation:prompt 이후)과 그 전 구간 중 어느 쪽이 조용한가 ③가장 긴 정체 구간은 몇 초인가."
①있음 ②"심문이 더 조용하지 않음"이 나와야 PASS. 답변 원문을 완료 보고에 인용한다.

**(c) 사람 귀.** `docs/submission/audio-listen-check.md`를 갱신해라 — 항목마다 어디서·무엇을
듣고·무엇이 잘못된 소리인지("심문 진입 5초 안에 저역이 올라오는가 — 안 올라오면 FAIL"처럼 판정
가능하게). judge-plan §5의 5항목을 포함할 것. 이건 네가 대신 통과시킬 수 없는 축이다 —
기계로 증명한 것과 귀에 남긴 것을 갈라서 보고해라.

## 5. 커밋

git 인덱스 공유 — **pathspec 커밋만**:
```bash
git commit -m "feat: 심문 긴장층·드론 defer" -- src/audio/ docs/credits.md docs/submission/audio-listen-check.md
```
`git add` 무인자·`git commit -a`·`stash`·`reset --hard` 금지. 커밋 후 `git show --stat HEAD`로
자기 파일만 들어갔는지 확인. `Math.random`/`Date.now` 직호출 금지(`core/util.js` rng). 파일당 500줄 린트.

## 6. 완료 보고

- P0/P1 각 항목: 무엇을 어떻게(신스·필터·버스 구성 — 제출물 4번 재료).
- 프로브 verdict 원문 + 독립 에이전트 답변 원문.
- 사람 귀에 남긴 항목 목록.
- 포기한 것과 이유(조용히 빼지 마라). HANDOFF 등재분.
