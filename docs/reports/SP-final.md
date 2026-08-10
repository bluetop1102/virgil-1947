# S-P 완료 보고 — 2막 플레이 루프

발주: 사용자 실플레이 판정 "엘리베이터가 열려도 뒤가 없다. 플레이 루프가 없다."
범위: **엘리베이터 → 9층 복도 → 942호 수색 → 종막 카드 → 타이틀 복귀**.
결과: **전 구간 완주**. 발주 항목 1~5 구현, 6(저장 호환)은 명시로 처리.

## 1. 구현 경로

신규 2파일. 기존 파일 수정 0건 — `src/core/*`·`main.js`·`interrogation.js`·`spaces.js`·
`audio/**` 무수정이고, shotlist 엔트리도 추가하지 않았다(사유 §5).

| 파일 | 축 | 줄 | 소유 범위 |
|---|---|---|---|
| `src/world/transit.js` | world | 233 | 전환 규칙 · 942호 실물 소품 3종 + 복도문 · 괴담 비트 트리거 |
| `src/ui/finale.js` | ui | 141 | 암전 베일 + 막 표제 · 종막 카드 · 마지막 입력 |

### 공간을 새로 짓지 않았다

`?scene=` 진입로(main.js 67~100행)가 쓰는 배관을 그대로 재사용한다 —
`qa:state{scene:'atmo-probe', mood}` **한 발**이 atmosphere(공간 빌드·광원 배선)·
audio(리버브·룸톤 전환)·testbed(퇴장)를 전부 몬다. 그래서 `spaces.js`의 corridor-night·
room-dusk 가 **정식 레벨 지오메트리로 승격**됐고, transit.js 가 소유하는 것은 지오메트리가
아니라 전환 규칙뿐이다. 좌표 격리(월드 y=−500)도 그대로라 로비 언로드가 필요 없다.

`?scene=` 경로 보존: transit 은 URL 에 `scene` 파라미터가 있으면 스스로 비활성한다
(`this.disabled`). 씬 모드는 이미 프로브에 서 있는 상태라 그 위에 전환을 겹치면 진입로가 깨진다.

### 플레이어 이동

AGENTS.md 씬 모드 규약 그대로: `p.body = null` · `p.physFail = true` · `p.floorY = OY` ·
`p.teleport([x, OY, z], yaw)`. 프로브 지오메트리에 rapier 콜라이더가 없어 물리 캐릭터를
남기면 허공을 짚고 낙하한다. `pos` 직접 대입은 하지 않았다(RESUME §3-4).
`teleport()` 는 yaw 만 잡으므로 도착 프레임이 직전 행동의 피치(문고리를 내려다본 −19°)를
물려받는 문제가 있어 `pitch/pitchT = 0` 을 한 줄 덧붙였다.

또 하나: 도착 시 `level/lobby` 루트를 `visible = false` 로 내린다. 언로드가 아니라 `_scan()`
방어다 — 켜둔 채로 두면 player 가 매 초 로비 전 메시를 충돌 후보로 긁어모아, 레이캐스트 폴백
이동이 그만큼 느려진다.

### 상호작용 타깃 — 보이지 않는 히트박스를 만들지 않았다

`lint-contract` 의 `materials-outside-factory` 때문이기도 하지만, 근본은 D4다. 942호 문은
`spaces.js` 가 이미 세운 `doorUnit` 실물(복도 좌측 벽 z=1.9)에 이름·좌표로 찾아 태그만 얹는다.
증거 3종은 `props.js` 팩토리로 실물을 세워 그 위에 얹는다.

| 증거 id | 소품 | 배치 | script.js `foundIn` |
|---|---|---|---|
| `journal` | `journal(901)` | 침대 발치 바닥 (−1.34, −1.08) | room942/under-bed |
| `roofkey` | `keyBrass(902, {len:0.11})` | 매트리스 위 (−2.86, 0.525, −1.58) | room942/mattress |
| `autopsy` | `ledger(903)` | 여행가방 뚜껑 (1.16, 0.212, 2.36) | room942/suitcase |

획득은 `evidence.registerPickup(obj, id)` 하나로 끝난다 — 검분 컷·획득 쪽지·노트 편입·
발소리 딥·sfx 가 기존 배선에서 그대로 따라왔다(§4 프레임 3 참조). 새로 배선한 것 없음.

### 괴담 비트

942호에서 **두 번째** 증거가 손에 들어오면 `lore:heard` 한 발. 원문은 `script.js` LORE 가
소유하고 발화는 `interrogation._lore` 가 한다 — **대사를 새로 짓지 않았다**. 기본은
`lore.lightwell`("9층에서 떨어진 여자는 아직 내려가는 중이래…"), 로비 숙박부 여백에서 이미
들은 회차면 `lore.linen` 으로 갈아탄다(같은 줄을 두 번 읽어주지 않는다).

### 종막

`journal` + `roofkey` 를 쥔 상태에서 복도문 E → 암전 → 카드. 미충족이면 게이트 자막
("아직 이 방에서 볼 것이 남았다.") — `interrogation.js` 의 격자문 게이트와 같은 어법이다.
카드 조판은 `ui/title.js` 의 활자 문법(Baskerville 디스플레이 + Courier 본문, 놋쇠 괘선)을
따랐다. 시스템 폰트·현대 UI 위젯 0. 귀속 한 줄(`음악: Kevin MacLeod (incompetech.com) ·
CC BY 4.0`)은 `docs/credits.md` §1.2 표기 그대로다. 아무 키 → 진입 URL 재호출로 타이틀 복귀.

## 2. 도중에 잡은 결함 3건 (전부 실측 기반)

| # | 증상 | 원인 | 처방 |
|---|---|---|---|
| 1 | 도착 후 **11.5초** 암전 유지 | 새 공간 첫 렌더의 셰이더 컴파일·섀도맵이 프레임을 통째로 잡아먹고, 그동안 `engine.time` 이 dt 클램프에 걸려 거의 멈춘다. 시간 기반 해제 예약이 안 온다 | ①해제를 **프레임 수**(4프레임)로 전환 ②같은 시간을 **막 표제**로 쓴다 — 암전 위에 "9층"/"942호"를 얹어 정지 화면을 의도된 표제로 바꿨다 |
| 2 | 종막 카드가 **뜨자마자 닫힘** | 문을 연 그 `E` 키가 아직 버블 중인데 `show()` 가 같은 디스패치 안에서 `window` 에 keydown 을 걸었다 — 한 번의 입력이 카드를 열고 닫는다 | 입력 무장을 카드 페이드인 완료(`transitionend`, setTimeout 폴백) 이후로 미룸 + `e.repeat` 차단 |
| 3 | 열쇠 조준 실패 | 조준점이 원점인데 `keyBrass` 의 원점은 **고리 구멍**이라 광선이 링 한가운데를 통과 | 프로브를 바운딩박스 중심 조준으로 교정(사람이 십자선을 얹는 자리) + 열쇠 길이 0.075→0.11 |

암전 실측은 계측 프로브로 확인했다(도착 1,862ms · 완전 해제 13,349ms, E 입력 기준).
표제 처리 후 그 구간은 검은 화면이 아니라 층수 카드가 떠 있는 구간이다.

## 3. 검증

| 항목 | 명령 | 결과 |
|---|---|---|
| 1막 완주 봇 (회귀) | `SHOT_PORT=5965 node tools/playthrough.mjs --fast --act 1` | PASS — `act:enter{act:2}` 도달 |
| 자가 E2E (2막 전 구간) | 자체 프로브, `judge-probes/common.mjs` 재사용 | **ALL PASS · 콘솔 이슈 0** |
| 심문 배터리 | `node tools/test-interrogation.mjs` | 112 passed / 0 failed |
| unlocks 경로 | `node tools/test-unlocks.mjs` | 10 / 0 |
| 오디오 | `node tools/test-audio.mjs` | all passed |
| 물리 | `node tools/test-physics.mjs` | ALL PASS (steps=2070) |
| 사실 그래프 | `node tools/factcheck.mjs` | 전 게이트 통과 |
| 매니페스트 | `node tools/manifest-check.mjs` | 발견 0 |
| 계약 린트 | `node tools/lint-contract.mjs` | 4건 — **기준선 동일**(신규 위반 0) |

### 자가 E2E 상세

이동·상호작용은 **실제 키 입력**(W 홀드, E 프레스), 마우스룩만 `yawT/pitchT` 등가 입력
(judge-probes 규약과 동일 조건). 프로브는 스크래치에 있다:
`…/scratchpad/probe-act2.mjs`.

```
PASS  복도 도착 — [0.4,-500,6.2] room=corridor9
PASS  암전 해제 — veil=0 표제="9층"
PASS  942호 문 타깃 존재 — (-1.39, 1.90)
PASS  문 조준 — focus=corridor9/942-door
PASS  942호 진입 — [3.8,-500,4]
PASS  journal 획득 — focus=ev:journal d=0.91m
PASS  roofkey 획득 — focus=ev:roofkey d=1.80m
PASS  autopsy 획득 — focus=ev:autopsy d=0.90m
PASS  괴담 비트 — lore.lightwell
PASS  종막 카드 — veil=1 카드불투명도=1 잔류표제=""
PASS  타이틀 복귀 — {"active":"loading","search":""}
console issues: 0
```

엘리베이터 구간만 `state.npc('deitch').ended = true` 로 선행 조건을 세운 뒤
`player:interact{targetId:'lobby/elevator'}` 를 실제 게이트 경로로 태웠다(1막 심문 전체를
다시 걷는 것은 완주 봇이 이미 매 회 하는 일이라 중복). 그 뒤 종막까지는 전부 키 입력이다.

### 육안 판정 (`shots/sp/`, Read 로 직접 판독)

- `sp-corridor.png` — 9층 복도 도착 프레임. 벽등 3점·전경 카트·계단참 어둠이 프로브 샷과
  같은 품질로 서 있고, 조작 안내 카드가 겹친다. 표제 "9층" 이 암전과 함께 걷힌 직후.
- `sp-room942.png` — 942호 도착. 시선 수평(§1 피치 처방 확인), 침대 발치 일기·전경
  여행가방이 프레임 안에 있다.
- `sp-room942-searched.png` — 수색 완료 순간. **부검 사본 검분 컷**(script.js 본문이
  종이에 조판됨) + 괴담 자막 + 우하단 획득 쪽지가 동시에 성립. 이 세 가지가 내가 배선한 것이
  아니라 `registerPickup` 하나에 기존 시스템이 전부 따라붙었다는 증거다.
- `sp-finale.png` — 종막 카드. 놋쇠 괘선 상하, 제1막 케르닝, 귀속 한 줄, 맥동하는 퇴장선.
  웹 UI 냄새(D7) 없음.

## 4. 포기·이월

| 항목 | 판단 |
|---|---|
| 저장 호환(발주 6) | **1막 유지로 명시.** 세이브/로드는 이 게임에 없다(`gameplay/save.js` 미존재, `title.hasCheckpoint()` 가 보는 localStorage 키를 쓰는 코드가 0건이라 "이어서" 명패는 뜨지 않는다). 종막 후 재시작은 새 회차다 |
| shotlist `act2-corridor` 엔트리 | **추가하지 않음.** 상호작용 타깃은 기존 실물에 얹은 userData 라 렌더 결과가 `atmo-corridor-night` 와 픽셀 동일이다 — 정보량 0인 샷을 전체 샷 집합에 넣으면 다른 세션의 report.json·매니페스트만 흔든다 |
| 944호·욕실·발자국 | 범위 밖. 2막 최소 루프(복도·942호)만 배선했다. `sink-trap`·`water-log`·`footprints` 는 미배치 |
| 루이즈·프라이스 심문 | 범위 밖. 2막 NPC 앵커·배치는 미착수 |
| 3막(옥상) | 범위 밖. `stairs-roof/door` 게이트는 interrogation.js 에 이미 있으나 대상 실물이 없다 |

## 5. 계약 메모

`transit:veil{on,dur,delay,caption}` · `finale:show{delay}` 2종이 **ARCHITECTURE §5 표준
이벤트 표에 없는 신규 이름**이다. 발신 world(transit) → 구독 ui(finale) 1:1 이고 판정에
관여하지 않는(연출 통지 전용) 폐쇄 쌍이라 기존 소비자 무영향이지만, §5 구독 어휘 폐집합
규칙상 **등재가 필요하다** — ARCH 소유자에게 CONTRACT_CHANGE_REQUEST 로 넘긴다(HANDOFF 등재).
