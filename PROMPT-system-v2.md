# 발사문 — 위임 시스템 v2 (캘리브레이션 완결 · 계약 반영)

> 실행자: Opus 새 세션. 역할 = v1의 잔여 마감 + 위임 개시 판정.
> 선행: `PROMPT-system-v1.md`(A·B·D 완료, C 절반). 기획 세트는 게이트 2 승인으로 확정됐다.
> 이 문서는 v1의 후속이지 대체가 아니다 — v1의 소유 경계·예산 조항은 그대로 살아 있다.

## 0. 지금 서 있는 자리 (실측)

| 산출물 | 상태 | 근거 |
|---|---|---|
| A 매니페스트 + 검증기 | **완료** | 티켓 **16장** · `manifest-check` **8규칙 전건 PASS · 발견 0** · 변이 12종 12/12 검출 |
| B 패킷 생성기 | **완료** | 패킷 16장 · `packet-gen --audit` 잔여 좌표 **0** |
| C 캘리브레이션 | 진행 — 2에이전트 대조 실행분 | `tools/calibration/report.md` |
| D 제출 인프라 | **완료** | public 배포 가동 · 실배포 검증 PASS |
| 계약 공백 | **닫힘** | Fable `27010a1` 5건 반영 → 매니페스트 재전사 `6776218` |

- 배포: https://bluetop1102.github.io/virgil-1947/ (소스 https://github.com/bluetop1102/virgil-1947)
- 검증 명령: `node tools/serve-check.mjs --url https://bluetop1102.github.io/virgil-1947/`

## 1. 필독 (순서대로)

1. `AGENTS.md` · `docs/RESUME.md` — 기각 가설 재발굴 금지.
2. `PROMPT-system-v1.md` — 이 세션의 전제. 소유 경계(§1)·예산(§8)이 그대로 적용된다.
3. `tools/calibration/report.md` — **§3 결함 역반영 목록이 핵심.** 무엇이 왜 고쳐졌는지.
4. `tools/calibration/protocol.md` — 실행 규약. 워크트리 금지 이유·헤드리스 호출법.
5. `docs/HANDOFF.md` 하단 5건 — 이 세션이 등재한 계약 공백. Fable(기획)에 요청 전달됨.
6. `docs/submission/README.md` — 제출 현황·차단 항목.

## 2. 소유 경계 (v1 §1 승계 — 변경 없음)

- **편집 금지**: `docs/design/E*.md` · `STORY*` · `ROUNDS-PLAN.md` · `AAA-RUBRIC.md` ·
  `ARCHITECTURE.md` · `src/**` · 기존 `PROMPT-*.md`.
- **배타 소유**: `data/manifest/**` · `packets/**` · `tools/manifest-check.mjs` ·
  `tools/packet-gen.mjs` · `tools/serve-check.mjs` · `tools/calibration/**` ·
  `docs/credits.md` · `docs/submission/**` · 배포 설정.
- **커밋 규약(신설 — 사고 재발 방지)**: `git commit -a` 와 무인자 `git add -A` 금지.
  **자기 소유 경로를 명시해서 스테이지한다.** 커밋 `379f7be` 가 다른 세션의 스테이징
  22파일을 삼킨 사고가 있었다(HANDOFF 등재). 이 저장소는 상시 2세션 이상이 동시에 돈다.

## 3. 최우선 정정 — 지금 리포트의 대조는 무효다

Codex 파일럿은 **결함 5건을 고치기 전 패킷**으로 돌았다. 그 뒤 패킷이 바뀌었다:
§9·§11 중복 제거 · A3 수용 기준 교체(차단 경로 왕복 재현) · 부록 2단 분리.

그러므로 **Grok만 지금 돌려서 Codex 결과와 비교하면 안 된다** — 서로 다른 지시서를 받은
두 에이전트를 비교하는 것이라 "에이전트가 갈렸는지"를 측정하지 못한다.

**둘 다 현재 패킷으로 재실행한다.** Codex 재실행분이 기준선이고, 그 전 결과는
리포트 §1 에 "구 패킷 실측"으로 남긴다(지우지 마라 — 결함이 무엇을 바꿨는지의 증거다).

## 4. 할 일

### 4.1 캘리브레이션 파일럿 ① 완결 (2에이전트 × 현재 패킷)

```bash
node tools/packet-gen.mjs --all && node tools/packet-gen.mjs --audit   # 잔여 0 확인 선행
W=/Users/kang-yunbyeong/Documents/WORK/Worktrees
rm -rf $W/cal-codex-P0-01 $W/cal-grok-P0-01
git clone --local . $W/cal-codex-P0-01
git clone --local . $W/cal-grok-P0-01     # 워크트리 금지 — protocol.md §2 이유 참조

# 투입 프롬프트는 protocol.md §2 조건 그대로. 이전 회차 원문:
#   scratchpad 는 세션마다 지워지므로 protocol.md §2 를 보고 다시 쓴다.
codex exec -C $W/cal-codex-P0-01 -s workspace-write -o codex.out "<프롬프트>"
grok --cwd $W/cal-grok-P0-01 --permission-mode acceptEdits --output-format plain --prompt-file <파일>
```

**grok 권한은 이미 열려 있다** — `.claude/settings.json` 에 `Bash(grok:*)` 를 넣었다.
막히면 그 파일을 먼저 확인하라(이전 세션에서 호스트 분류기가 차단했던 지점).

회수·판정은 `protocol.md` §3(동일성 4축)·§4(회수 명령)·§6(판정 조건) 그대로.
리포트 §1 통과표를 **명령 출력으로** 채운다 — "통과함"으로 갈음 금지.

### 4.2 ~~Fable 반영분 재전사~~ — **완료** (`6776218`)

5건 전부 닫혔고 매니페스트를 재전사했다. 결과: `manifest-check` **8규칙 전건 PASS · 발견 0**
(세션 시작 이래 처음 — 직전까지 R1 CONTRACT 1건이 정본 결함으로 남아 있었다).

| 계약 변경 | 매니페스트 반영 |
|---|---|
| E9 §2 린트 판별 규칙 3줄(범위·표출 판별·훅 공존) | `T-P0-01` forbidden 을 "판별 규칙 준수"로 교체 — 추측 여지 소멸 |
| E10 P0 표 의존 정정 | `T-P0-02.depends += T-P0-04` — 위상 `T-P0-04 → T-P0-02` 확정 |
| T-P0-03 범위에 표출명 2건 | `casebook.js`·`deduction.js` 구역 소유 + grep 수용 기준 |
| T-P0-06 신설 (core 예외) | 매니페스트 16장째 |
| 병렬 커밋 규약(AGENTS) | §2 에 이미 반영 |

**계약 문서를 고치지 마라.** 매니페스트가 정본을 따라간다, 반대가 아니다 — 이 원칙이
이번에 실제로 작동했다. 계약이 바뀌자 검증기가 R2 5건으로 드리프트를 잡았고, 손으로
패킷을 고치지 않고 재전사 + 재생성으로 닫았다.

### 4.3 파일럿 ② 창작형 (①·②가 끝난 뒤)

`T-P1-02` 다이치 리그. **선행 필수**: 이 티켓의 A2 는 `tools/lint-contract.mjs` 를 부르므로
①의 산출(Codex/Grok 중 채택분)을 본체 P0 에 반영한 뒤에만 게이트를 돌릴 수 있다.
반영 없이 착수하면 게이트를 못 돌려 측정이 안 된다.

## 5. 게이트 — "위임 개시 가능"의 조건 (protocol.md §6)

1. 기계형 ①에서 **전 에이전트**가 구조·게이트·프로세스 3축 통과
2. 창작형 ②에서 구조·프로세스 통과 (품질 편차는 허용)
3. 리포트 §3 결함 목록 전건 역반영

셋을 못 채우면 외부 발주를 열지 않는다. 현재 3만 충족.

## 6. 남은 차단 (제출 측 — 이 세션 소유 아님)

| 차단 | 소유 | 비고 |
|---|---|---|
| 인게임 표출명 3건 | [UI]·[INTERROGATION]·[NARRATIVE] | `casebook.js`·`deduction.js`·`script.js`. `index.html` 은 해소됨 |
| `low` 품질 프리셋 부재 | [CORE] + E8 | `?q=low` 가 경고 없이 high 로 폴백. 저사양 리허설 통과 불가 |
| 게임 미성립 | P0·P1 티켓 15장 | 제출물 1·2번의 실질 전제 |

## 7. 예산·안전

- 토큰 상한: 캘리브레이션 400만(v1 §8 승계). 상한 도달 시 중단·보고.
- **한도 근처에서 팬아웃 금지, 직렬 전환.** v1에서 서브에이전트가 세션 한도로 죽은 실사례가 있다.
- 외부 에이전트 실행은 실비 — 파일럿 착수 전 사용자 승인(이미 받은 범위: 파일럿 ①·②).
- API 키·시크릿 커밋 금지. 이력 재작성(squash·filter-repo) 금지 — 제출 요건 정면 위반.
- 완료 보고에 검증 증거 첨부: `manifest-check` 출력 · `--audit` 잔여 · 캘리브레이션 명령 출력.
