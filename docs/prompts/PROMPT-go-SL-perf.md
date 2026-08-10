# 발사문 S-L — 성능 최적화 (사용자 실플레이: "렉 걸린다")

> 실행자: Claude 새 세션. 오늘 제출 — **측정 없이 아무것도 바꾸지 마라.**
> 제1 원칙: **HIGH 프리셋의 픽셀은 불변이다.** 제출 프레임·JUDGE 판정·기준선(base-r4)이 전부
> 그 위에 서 있다. 이득은 ①화질 동일 최적화 ②프리셋 게이트 레버에서만 나온다.
> 배포는 게이트 몫.

## 0. 먼저 읽는다

1. `src/ui/settings.js` — 품질 프리셋(high/medium/low)·FRAME LEDGER(?stats=1, P50/P95, 예산
   high 16.7ms / 그 외 33.3ms). `src/core/config.js` — QUALITY 정의.
   **core 잠금 예외**: `core/config.js` 는 `QUALITY.low 신설` 한정으로 수정이 허용돼 있다(AGENTS).
2. `src/render/pipeline.js`·`render/passes/**` — 포스트 체인(ssr·gtao·volumetric·bloom·dof·
   motionblur·taa·composite/헐레이션). `docs/ARCHITECTURE.md` 렌더 패스 ctx 계약.
3. `docs/RESUME.md` §3 — 기각 가설(특히 A/B 방법론)·§3.2 오염 3종. `tools/judge-probes/common.mjs` 함정 3건.

## 1. 소유 파일

```
src/render/**  src/core/config.js(QUALITY 항 한정)  src/ui/settings.js(프리셋 적용 로직 한정)
src/world/**(LOD·그림자 예산 한정)
```

## 2. 작업 — 측정 → 레버 → 검증 순서 고정

### P0-1. 프레임 예산표 [1.5h] — 이것 없이 다음 단계 금지
어디서 시간이 새는지 실측: ①`?stats=1` P50/P95 기준선(로비 자유 시점 3곳·심문) ②패스별
기여 — 패스를 하나씩 삭제(`--off` 방식·composite 은 유니폼 직접)하며 프레임타임 델타 표
③`renderer.info` 드로우콜·트라이앵글 ④**devicePixelRatio 실효값**(레티나 2x면 픽셀 4배 —
최대 용의자다) ⑤그림자: 캐스터 337·스포트 12의 맵 해상도·갱신 빈도.
산출: "패스 × ms" 표. 상위 3개가 P0-2의 대상이다.

### P0-2. 화질-비파괴 레버 [2.5h]
후보(예산표가 정한다 — 전부 하지 마라, 큰 것부터):
- **렌더 스케일/픽셀 비율 캡** — 내부 해상도 상한(예: DPR≤1.5 또는 1440p 캡) + 업스케일.
  HIGH 의 스크린샷 판정은 1600×900 헤드리스(DPR 1)라 **기준선과 무관**하다 — 실기기만 빨라진다.
- 정적 씬 최적화: 그림자 맵 정적 캐시(움직이는 캐스터만 갱신)·머티리얼/지오메트리 병합·
  프레임당 할당 제거(GC 스파이크가 "렉"의 흔한 정체).
- 오프스크린 패스 해상도(볼류메트릭·SSR 하프레스가 이미인지 확인 — 아니면 하프레스화는
  화질 영향이 있으니 프리셋 게이트로).
가드: 수정마다 `SHOT_PORT=5928 node tools/shoot.mjs --out shots/sl-guard` 12샷 이상 +
base-r4 대비 pix diff — **HIGH 에서 지표 위반 0**이어야 통과.

### P0-3. 프리셋 실효화 [1.5h]
medium/low 가 실제로 싸지는지 실측하고, 아니면 만들어라(QUALITY.low 신설 허용분):
포스트 다이얼(모션블러·DOF·볼류메트릭 off/하프)·그림자 해상도·렌더 스케일 단계.
프리셋별 P95 표가 산출이다. 목표: medium 이 실기기에서 33.3ms 예산 안, low 는 그 아래.
**기본 프리셋 자동 선택**(첫 부팅에서 GPU/DPR 휴리스틱으로 medium 폴백)은 넣되,
휴리스틱은 보수적으로 — 강한 기기는 반드시 high 로 남아야 한다(제출 프레임 경로).

### P1-4. 설정 카드에 변경 즉시 체감 [여력 시]
품질 변경이 location.assign 리로드인 현행 유지가 안전하면 유지 — 리로드 없는 전환은 오늘 범위 밖.

## 3. 검증 (완료 조건)

- 프레임 레저 전/후 표: 프리셋×장면(로비 3시점·심문) P50/P95. HIGH 개선폭 명시(렌더 스케일
  효과는 DPR 2 조건에서 측정 — 헤드리스는 `deviceScaleFactor: 2` 로 재현).
- HIGH 화질 가드: base-r4 대비 pix diff 지표 위반 0 · 제출 프레임 5장 재촬영 후 육안 동일.
- 기능 회귀: probe-guidance·probe-tell·probe-audio·완주 봇 전건 PASS · 콘솔 0.
- `?stats=1` 오버레이가 QA 모드 밖에서 새 코드에 안 끌려 들어갔는지(D7).

## 4. 커밋·보고
pathspec 커밋(항목 단위 — render/ ui/settings.js core/config.js world/ 축 분리). HANDOFF append만.
완료 보고: 예산표·전/후 P95 표·적용 레버와 기각 레버(이유)·포기 항목. **배포 금지 — 게이트 몫.**
