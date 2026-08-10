# 발사문 S2 — 빛·포스트·대기 (RENDER + ATMOSPHERE)

> 실행자: Opus 새 세션. 제출 **8/10**.
> 이 세션은 **제출 차단급 결함 1건(렌더 잠식)**과 **빛 축 4개(G2·G4·G7·G8)**를 소유한다.
> 판정 근거는 `docs/reviews/fable-experience-2026-08-08.md` — 배포본 실플레이 판정이다.

## 0. 먼저 읽는다 — 이 세션은 특히 중요하다

1. **`docs/RESUME.md` §3 기각된 가설 17건.** 그중 **11건이 네 영역이다** — 오토노출 폭주,
   TAA 리프로젝션, 블룸 mip 체인, DOF 타일맥스, 조명기구 지오메트리, castShadow 미설정,
   volumetric 패스, 그림자 pcss/VSM, uSoftFade 확대, uEdgeSpread…
   **전부 틀렸다고 실측으로 결론난 것들이다. 다시 파지 마라.**
   §3.2도 반드시 읽어라 — QA 모드 엔진은 RAF를 돌리지 않아서 변종 적용 후 재settle 없이 찍은
   A/B는 전부 "무변화"로 나온다. `composite`은 `--off`가 닿지 않는다(PIPELINE-CORE 직속).
2. `docs/reviews/fable-experience-2026-08-08.md` §0-1 · §1 — 잠식 재현 3종과 G축 "8+가 되려면".
3. `docs/ROUNDS.md` R6-1 — **원경 벽 계단 이음선의 진짜 원인은 기구 광축 셸(`SHAFT_STEPS`)이다.**
   네가 다룰 광 기둥 아티팩트와 같은 계열일 가능성이 높다.

## 1. 소유 파일 (배타적)

```
src/render/pipeline.js  exposure.js  bluenoise.js  pcss.js  contact.js
src/render/passes/*.js          (prepass taa composite gtao ssr volumetric volmarch volnoise bloom dof motionblur)
src/world/atmosphere.js
src/world/atmo/*.js             (moods ibl rain particles shell roof fixtures corridor-detail corridor-finish probe spaces)
```

**남의 파일** — 고쳐야 하면 `docs/HANDOFF.md` 등재 후 자기 소유분만:

| 세션 | 소유 | 겹칠 수 있는 지점 |
|---|---|---|
| S1 로비 물성 | `src/world/lobby.js` · `src/materials/**` · `src/world/props*.js` · `kit*.js` | **광원의 위치·개수·색온도는 S1**(`lobby.js:335 makeLights`). 너는 노출·볼류메트릭·그림자 품질·포스트 |
| S3 내러티브·UI | `src/narrative/**` · `src/ui/**` · `src/chars/**` · `src/audio/**` | 시네마틱 셔터각(G8) — 카메라 시퀀스는 S3, 모션블러 파라미터는 너 |
| S4 게이트 | `tools/**` | 샷 시간 결정성(`advanceTo`) 수정은 S4. 기전 진단은 너 |

`src/core/*`는 잠김. 예외는 `core/shotlist.js` 엔트리 **추가**뿐.

## 2. 작업 — 우선순위 순

### P0. 렌더 잠식 (§0-1) — 제출 차단급. 다른 무엇보다 먼저

**S0 세션이 가설 하나에 대한 코드를 이미 넣고 커밋했다**: HDR 하프플로트 오버플로 → `Inf * 0 = NaN`
→ SSR의 시간 이력(EMA)이 NaN을 영구히 물고 감염 확산. `ssr.js`·`bloom.js`에 NaN/Inf 관문 4곳.
**S0의 검증 결과가 커밋 메시지와 `docs/HANDOFF.md`에 있다. 그것부터 읽어라.**

- **S0에서 재현이 사라졌다면**: 진단이 맞은 것이다. 남은 일은 ①동근원으로 의심되는 **수직 화염 기둥**
  (`docs/reviews/shots-fable/83-ceiling.jpg`)이 함께 사라졌는지 확인 ②같은 오버플로 경로가
  `gtao`·`volumetric`·`composite`에도 있는지 점검 ③재발 방지 기전을 HANDOFF에 남기기.
- **아직 재현된다면**: 이게 네 세션 최우선이자 유일한 P0다. 재현 절차 3종(리뷰 §0-1):

  | 재현 | 절차 | 관측 |
  |---|---|---|
  | A | 벨 즉시 → 데스크 앞 정지 대기 | t=37/67/97 정상 → **t=127 화면 중앙 잠식** |
  | B | 같은 진입 후 데스크 접근 | **t≈70 발현**, 시야·상호작용 레이캐스트를 모두 가림 |
  | C | 타이틀에서 95초 방치 → 벨 | 시네마틱은 clock=30 완료 처리, **화면은 영구 암흑**(오토노출 600 고정 = 측정 휘도 0) |

  발생 시점이 시점·동선 의존(t≈52~127)이므로 **시간 파라미터를 쓰는 이펙트부터** 격리해라.
  리허설 전 임시 완화(해당 이펙트 비활성)라도 성립시키는 것이 목표다.
  기각 가설 표에 있는 것(TAA·블룸 mip·DOF·오토노출 바닥값)을 다시 A/B 하지 마라.

### P1. G8 포스트 절제 4 → 8 (G축 최저점)

> "광원 위 떠 있는 광구 · **수직 화염 기둥**(`83-ceiling.jpg`) · 강한 모션블러(인트로 트래킹 중
> 형체 뭉개짐, `15-cin-t14.jpg`) — '필터/결함'으로 읽힌다.
> 화염 기둥 제거(§0-1과 동근원 추정), 헐레이션 반경 축소, 시네마틱 트래킹 중 셔터 각 축소."

헐레이션은 이미 한 번 고쳤다(RESUME §3.1 — 원주 8탭이 평행이동 복제 연산자였던 건). 반경만 줄여라.

### P1. G2 볼류메트릭 5 → 8

> "사선 광축은 있으나 밀도 균일한 반투명 판으로 읽힌다. 천장 광원이 수직 화염 기둥으로 렌더 —
> 광학이 아니라 결함으로 보인다. **광 기둥 아티팩트 제거가 선행.** 그 다음 광축에 3D 노이즈 밀도차
> + 먼지 교차 시 산란 강조."

### P2. G7 컬러 그레이딩 6 → 8

> "앰버/세피아 톤 통일은 있다. 청록 그림자 분리 없음, 밝은 앵글에서 워시아웃(`22-t37.jpg` 대비
> `50-s1.jpg` 낙차). 어두운 앵글 쪽으로 전역 노출 앵커를 내리고(현재 오토노출이 밝은 앵글에서 과노출)
> 섀도에 냉색 틴트."

### P2. G4 그림자 6 → 8

> "소프트 섀도·셀프섀도 존재. 페넘브라 거리 비례는 이미 있는 듯 — 데스크 아래 확인됨."

RESUME 기각 가설 7: **캐스터 337개·그림자 스포트 12개로 이미 동작 중이다. castShadow 플래그를
다시 뒤지지 마라.** 볼 것은 **바이어스·페넘브라·해상도**다. 벽의 얼룩 데칼과 그림자가 구분 안 되는
문제는 S1(D3 수정)이 처리한다 — 그쪽이 끝나면 판독이 살아난다.

## 3. 검증

```bash
SHOT_PORT=5602 node tools/shoot.mjs --out shots/s2 lobby-wide
SHOT_PORT=5602 node tools/shoot.mjs --out shots/s2 --off volumetric,dof lobby-wide   # A/B
node tools/pix.mjs diff shots/base-0808/<샷>.png shots/s2/<샷>.png --heat /tmp/h.png
```

`shots/base-0808/`이 S0가 동결한 출발선이다(28/28 gate ok · 콘솔 0). `shots/_baseline/`은
corridor 샷과 대응이 깨져 있어 쓰지 마라(HANDOFF 등재분).

- **A/B 전에** `pipeline.composite.mat.uniforms.uHalation.value = 0` (composite은 `--off` 안 닿음).
- **A/B 변종은 1번만 상태가 깨끗하다.** 결정적 판정은 1변종 단독 실행으로 재확인(RESUME §2).
- 잠식은 **정지 대기 시간에 의존**한다 — 샷 하네스의 짧은 settle로는 안 나올 수 있다.
  `npm run dev` + 실브라우저로 t=130까지 앉아 있는 확인을 최소 1회 해라. 헤드리스로 하려면
  `docs/reviews/` 의 fable 세션 방식(engine.time 직접 진행 + 주기 캡처)을 참고.
- PNG는 Read 도구로 직접 봐라. 코드만 읽고 판정하지 않는다.

## 4. 커밋

**같은 워킹트리에서 4개 세션이 동시에 돈다. git 인덱스는 워킹트리당 하나뿐이라 공유된다** —
`git add` 후 commit 하기까지의 사이에 다른 세션이 add 하면 그 파일이 네 커밋에 섞인다.
**`git add` 를 쓰지 말고 pathspec 커밋을 써라:**

```bash
git commit -m "fix: 광 기둥 아티팩트 제거" -- src/render/ src/world/atmosphere.js src/world/atmo/
```

- `git commit -a` · 무인자 `git add -A` 금지.
- `index.lock` 충돌로 실패하면 정상이다 — 2~3초 뒤 재시도.
- `git status` 에 네 것이 아닌 수정 파일이 보이는 것도 정상이다. **`git stash`·`git checkout .`·
  `git reset --hard` 금지 — 남의 작업을 지운다.**
- 커밋 후 `git show --stat HEAD` 로 자기 파일만 들어갔는지 확인.

**이력 재작성 금지**(제출 요건). `Math.random`/`Date.now` 직호출 금지.

## 5. 완료 보고

- 잠식 항목은 **재현 A·B·C 각각에 대해 재현되는가/안 되는가**를 프레임 증거로 답해라.
  "고쳤다"가 아니라 "t=130 정지 대기에서 순흑 비율 x%"처럼 실측으로.
- 기각된 가설을 다시 시험했다면 왜 그럴 필요가 있었는지 적어라.
- 미달 항목은 `docs/HANDOFF.md`에 소유자 반환.
