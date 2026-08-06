# 교차 에이전트 캘리브레이션 — 리포트

> 실행 규약: [protocol.md](protocol.md). 이 리포트가 **"위임 개시 가능" 판정의 근거**다.
> 채워지지 않은 표는 판정 근거가 아니다 — 미실행은 미실행으로 남긴다.

**상태: 파일럿 ① 1/2 실행 (Codex 완료 · Grok 미실행).** 파일럿 ② 미착수.

---

## 0. 선행 시도 — 무질문 게이트 (2026-08-06, 내부 서브에이전트)

캘리브레이션과 같은 측정 장치를 내부 서브에이전트로 먼저 돌렸다. **세션 토큰 한도로 조기
종료**돼 측정값이 없다(패킷 완독·착수까지는 질문 0). 통과로 치지 않는다. 이후 Codex 실행이
같은 티켓·같은 조건이라 이 항목은 §1 이 대체한다.

### 대체 측정 — 기계적 자기완결 감사

```
node tools/packet-gen.mjs --audit
```

| 시점 | 잔여 § 좌표 |
|---|---|
| 폐포 도입 전 | 202건 (15장 합계) |
| 폐포 도입 후 | **0건 (15장 전부)** |

---

## 1. 파일럿 ① 기계형 — `T-P0-01` 계약 린트 커밋 훅

**투입**: 독립 로컬 클론 · 소지품 `packets/PACKET-T-P0-01.md` 1장 · 문서 열람 금지 ·
질문 대신 추측 기록. 실행: `codex exec -C <클론> -s workspace-write`.

### 1.1 통과표

| 축 | 기준 | Codex | Grok build |
|---|---|---|---|
| 구조 | 소유 파일 경로가 매니페스트와 일치 (`tools/lint-contract.mjs`·`tools/install-hooks.mjs`) | **통과** | 미실행 |
| 구조 | 규칙 5종을 전부 구현 (material-factory · light-factory · deterministic-runtime · file-length · display-name) | **통과** | 미실행 |
| 게이트 | A1 `--self-test` — 위반 5종 각각 exit 1, 청정 exit 0 | **통과** (exit 0) | 미실행 |
| 게이트 | A2 훅 설치 + 실행 권한 | **통과** (exit 0) | 미실행 |
| 게이트 | A3 `--staged` | **통과** (exit 0) — 단 기준 자체가 약했다(§3-2) | 미실행 |
| 프로세스 | 질문 0 | **통과** — 되묻기 0, 추측 4건 기록 | 미실행 |
| 프로세스 | 소유 밖 파일 편집 0 | **통과** — 산출은 소유 2파일뿐 | 미실행 |
| 품질 | 위반 메시지 판독성 (기록만) | 규칙명·파일·줄번호 3요소 출력 | 미실행 |

### 1.2 명령 출력 (Codex 실측)

```text
$ node tools/lint-contract.mjs --self-test          # exit 0
SELF-TEST material-factory: expected exit 1, actual exit 1
SELF-TEST light-factory: expected exit 1, actual exit 1
SELF-TEST deterministic-runtime: expected exit 1, actual exit 1
SELF-TEST file-length: expected exit 1, actual exit 1
SELF-TEST display-name: expected exit 1, actual exit 1
SELF-TEST clean: expected exit 0, actual exit 0
contract lint self-test: PASS

$ node tools/install-hooks.mjs && test -x .git/hooks/pre-commit    # exit 0
contract lint pre-commit hook installed: …/.git/hooks/pre-commit

$ node tools/lint-contract.mjs --staged             # exit 0
contract lint: PASS (2 files, 0 violations)
```

산출: `tools/lint-contract.mjs` 390줄 · `tools/install-hooks.mjs` 57줄. 커밋 1개
(`Add contract lint pre-commit gate`). 소유 밖 파일 변경 0.

### 1.3 Grok — 미실행

`grok` 헤드리스 호출이 호스트의 권한 분류기에 차단됐다(`--always-approve`·
`--permission-mode acceptEdits` 양쪽 모두). 우회하지 않았다 — 사용자가 Bash 권한 규칙을
추가하거나 직접 실행해야 한다. **에이전트 간 대조가 이 파일럿의 목적이므로, Codex 단독
결과는 "패킷이 한 에이전트를 결박한다"까지만 증명하고 "에이전트를 바꿔도 같다"는 증명하지
않는다.**

---

## 2. 파일럿 ② 창작형 — `T-P1-02` 다이치 리그

**미착수.** 착수 전 확인할 것: 이 티켓의 A2(`node tools/lint-contract.mjs`)는 T-P0-01 산출에
의존하고 A1(샷)은 리그가 씬에 등록돼야 한다. **P0 이 트리에 없으면 게이트를 돌릴 수 없다** —
①의 산출을 본체에 반영한 뒤에 착수하는 것이 맞다.

| 축 | 기준 | Codex | Grok build |
|---|---|---|---|
| 구조 | `src/chars/rig.js` 단일 소유 준수 | — | — |
| 구조 | 모듈 계약(default export·order 30) 준수 | — | — |
| 구조 | `room:changed` 구독만 · 이벤트 발화 0 | — | — |
| 게이트 | A1 샷 성공 · 콘솔 0 · 실루엣 판독 | — | — |
| 게이트 | A2 계약 린트 위반 0 | — | — |
| 프로세스 | 질문 0 · 소유 밖 편집 0 | — | — |
| 품질 | 실루엣 인상·소품 해석 (기록만) | — | — | **편차 정상** |

---

## 3. 패킷 결함 역반영 목록 — **이 리포트의 본체**

Codex 가 남긴 추측 4건과 문서 지적 6건에서 실결함 5건을 뽑아 전건 역반영했다.

| # | 지적 | 판정 | 조치 | 재확인 |
|---|---|---|---|---|
| 1 | "안전 규칙·샷 하네스 규약이 §9·§11 에 중복된다" | **생성기 버그** — §9.2 가 인라인한 절을 `seen` 에 등록하지 않아 §11 COMMON 이 같은 절을 또 붙였다 | `packet-gen.mjs` §9.2 에 `seen.add` 추가 | 안전 규칙 인라인 1회로 감소 |
| 2 | "A3 명령은 깨끗한 인덱스에서 차단 경로를 검증하지 못한다" | **수용 기준 결함** — exit 0 만 확인하면 훅이 실제로 막는지 모른다 | `T-P0-01.json` A3 를 "위반 스테이지 → exit 1 → reset → exit 0" 왕복 재현으로 교체 | `manifest-check` PASS |
| 3 | "1,307줄로 지나치게 길고 부록 대부분이 무관하다" | **설계 결함** — 자기완결 폐포가 하중 절과 참고 절을 섞어 놓았다 | 부록을 2단 분리: §12 A(본문이 직접 가리키는 절) · §13 B(그것이 다시 가리키는 절, "읽을 필요 없음" 명시) | §12 A 85줄로 분리, 감사 잔여 0 유지 |
| 4 | "검사 대상 경로·확장자, 화면 표출 판별법, 기존 훅 정책이 없다" (추측 3건의 뿌리) | **계약 공백** — 매니페스트가 아니라 E9 §2 가 비어 있다. 여기서 갈리면 에이전트마다 다른 판정이 난다 | `docs/HANDOFF.md` 등재(E9/E10 소유자) + `T-P0-01.forbidden` 에 "범위를 정하지 않고 넘어가지 말 것" | 계약 수정 대기 |
| 5 | "패킷 §10.1 '추측 말고 반환' 과 실험의 '추측하고 기록' 이 충돌한다" | **실험 프로토콜 결함** — 패킷이 아니라 투입 프롬프트의 문제 | `protocol.md` §2 에 예외 조항 명문화 | — |

부수 발견(캘리브레이션 실행 중): **워크트리를 쓰면 안 된다.** `.git/hooks` 를 본체와 공유해서
T-P0-01 처럼 훅을 설치하는 티켓은 본체 저장소의 커밋까지 막는다. 독립 로컬 클론으로 교체하고
`protocol.md` §2·§4 에 반영했다(2GB 저장소도 하드링크라 0.2초).

**규칙**: 지시서를 손으로 고치지 않았다. `data/manifest/*.json` 과 `tools/packet-gen.mjs` 를
고치고 `node tools/packet-gen.mjs --all` 로 다시 찍었다.

---

## 4. 판정

| 조건 | 충족 |
|---|---|
| 기계형 ①에서 **전 에이전트**가 구조·게이트·프로세스 3축 통과 | **부분** — Codex 통과, Grok 미실행 |
| 창작형 ②에서 구조·프로세스 통과 | 미실행 |
| §3 결함 목록 전건 역반영 완료 | **충족** (5/5, 1건은 계약 수정 대기) |

**판정: 조건부 — 외부 발주를 아직 열지 않는다.**

근거가 있는 만큼만 말하면: 패킷 1장으로 외부 에이전트가 **질문 0·소유 밖 편집 0 으로 기계
과제를 완주하고 게이트 3건을 통과한다**는 것은 실측됐다. 이건 위임 시스템의 핵심 가정이
성립한다는 뜻이다. 그러나 **에이전트를 바꿔도 같은 구조가 나오는지는 아직 측정되지 않았다** —
그게 이 리포트의 이름값이고, Grok 실행이 열려야 채워진다.

다음 순서: (1) Grok 권한 개방 후 ① 재실행 → 2에이전트 대조, (2) ①의 산출을 본체 P0 에
반영, (3) 그 위에서 ② 창작형 착수.
