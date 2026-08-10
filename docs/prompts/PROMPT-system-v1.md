# 발사문 — 위임 시스템·제출 인프라 (system-v1)

> 실행자: Fable 5 새 세션. 역할 = 시스템 구축 + (이후) 통합·판정.
> 기획 세션(E0~E10 라운드)이 같은 저장소에서 병행 중이다 — §1 소유 경계 엄수.
> 목표: E10 티켓 보드를 "어떤 에이전트가 봐도 동일한 구조가 나오는" 위임 시스템으로
> 실체화하고, NAN 2026 제출 인프라를 세운다. 마감 8/10 · 리허설 8/8.

## 0. 필독 (순서대로, 전부)

1. `AGENTS.md` · `docs/RESUME.md` (기각 가설 재발굴 금지)
2. `docs/ARCHITECTURE.md` — 계약 v2. 이벤트 어휘·소유권·QA 하네스.
3. `docs/design/E10-production.md` — 티켓 보드·모델 배정. **이 발사문의 원료.**
4. `docs/design/ROUNDS-PLAN.md` 말미 — 기획 라운드 현황(최종 블라인드 재채점 진행 중).
5. `../hackathon-2026/docs/nan2026-requirements.md` — NAN 제출 요강 원문.
6. `../hackathon-2026/deliverables/2026-08-05-dangol-cecil-quality-lessons.md` — 승부처×라운드×범위.

## 1. 소유 경계 (기획 세션과 충돌 회피 — 위반은 즉시 중단 사유)

- **편집 금지**: `docs/design/E*.md` · `STORY*` · `ROUNDS-PLAN.md` · `AAA-RUBRIC.md` ·
  `ARCHITECTURE.md` · `src/**` · 기존 `PROMPT-*.md`. 수정이 필요하면 `docs/HANDOFF.md` 큐에 등재.
- **신설·배타 소유**: `docs/design/manifest.schema.json` · `data/manifest/**` ·
  `tools/packet-gen.mjs` · `tools/manifest-check.mjs` · `tools/calibration/**` ·
  `packets/**` · `docs/credits.md` · `docs/submission/**` · 배포 설정 파일.
- 커밋은 자기 소유 파일만, 작업 단위로. 커밋 이력 자체가 제출물(AI 활용 문서) 재료다.
  squash·force push 금지.

## 2. 산출물 A — 컴포넌트 매니페스트 (프로즈 표 → 기계 소비 데이터)

E10 티켓 양식을 영속 스키마로 승격한다. 단위 타입: `level | rig | tell | interrogation |
cinematic | ui | audio | tool`. 필드(전부 필수):

```
id · type · title · owner_files[](배타) · consumes[](계약 문서 § 좌표)
inputs[](case-graph 노드 id·E문서 좌표) · events{emit[], listen[]}
acceptance[](실행 가능한 기계 명령 + 기대 결과) · shots[](샷 엔트리)
forbidden[] · model(fable|opus|codex|grok) · depends[] · status
```

- P0·P1 티켓 15장을 인스턴스로 전환 → `data/manifest/`. E10 표와 어긋나면 표가 정본 —
  해석이 갈리는 지점은 HANDOFF 질의.
- `tools/manifest-check.mjs`: 소유 파일 교차 중복 0 · consumes § 좌표 실재(문서에 해당
  절 존재) · acceptance 명령 실행 가능 · depends 순환 0. 이 검증기가 통과해야 A 완료.

## 3. 산출물 B — 패킷 생성기 (티켓 → 자기완결 발사문)

`node tools/packet-gen.mjs <ticket-id>` → `packets/PACKET-<id>.md`.

패킷 내용물: 매니페스트 항목 전개 + **consumes가 가리키는 § 원문 발췌 인라인**(패킷 밖
문서를 읽을 필요가 없어야 한다) + acceptance 명령 + forbidden + 반환 형식
(CONTRACT_CHANGE_REQUEST 경로·커밋 규약·샷 규약 `--out shots/<자기이름>`).

**게이트 — 무질문 테스트**: 패킷 1장을 신선한 에이전트에게 "패킷 밖 문서 접근 금지"
조건으로 주고, 질문 0 + acceptance 전건 통과로 완성하는지 확인. 실패 시 패킷(스키마)을
고치지 에이전트를 탓하지 않는다. 기획 라운드의 무질문 테스트 문법 재사용.

## 4. 산출물 C — 교차 에이전트 캘리브레이션 (Codex · Grok build 실측)

- 파일럿 2건: ① **기계형** T-P0-01(계약 린트 훅 — 정답 수렴형) ② **창작형** T-P1-02
  (다이치 리그 급 — 정답 발산형). 각 에이전트 별도 워크트리, 소지품은 패킷 1장뿐.
- **동일성의 정의 (픽셀 동일이 아니다)**:
  - 구조: 소유 파일 경로·export·이벤트 어휘가 매니페스트와 일치
  - 게이트: acceptance 전건 통과 (린트·factcheck·픽셀 diff·콘솔 0)
  - 프로세스: 질문 0 · 소유 밖 파일 편집 0
  - 품질: 샷을 같은 루브릭으로 채점 — 편차는 기록만, 실격 아님(판정 라운드가 수렴시킨다)
- 산출: `tools/calibration/report.md` — 에이전트×기준 통과표 + 질문·이탈이 나온 지점의
  패킷 결함 역반영 목록. **이 리포트가 "위임 개시 가능" 판정의 근거다.**
- 외부 에이전트 실행은 토큰이 실비다 — 파일럿 착수 전 사용자에게 실행 승인을 받는다.

## 5. 산출물 D — NAN 제출 인프라 (A~C와 병행 가능)

- **빌드**: `npm run build` 성립 확인부터. 정적 배포 산출물이 링크 클릭만으로 실행되는지
  로컬 정적 서버로 검증. 베이스 경로는 배포 방식 확정 후.
- **원격 저장소**: 현재 remote 없음. GitHub 생성·push는 **사용자 명시 승인 후** (제출 시
  public 권장 또는 심사계정 `dl_gameai_reviewer@nhn.com` 초대). 준비만 해 둔다.
- **커밋 이력 — 전체 유지가 원칙, 재작성 금지**: 기존 이력(8/4 스냅샷~현재)을 그대로
  push한다. squash·filter-repo 등 이력 재작성은 요건("커밋 기록 유지") 정면 위반 리스크 —
  금지. 단 현재 `.git`이 2.0GB(scratchpad 스크린샷 634장 이력 포함)이고 GitHub는 push
  1회 팩 2GB 한도가 있으므로 **구간 분할 push**로 넘긴다
  (`git push origin <중간커밋>:refs/heads/main`을 시기순 2~3회 → 최종 push).
  push 전 **전 이력 감사**: 시크릿 스캔(gitleaks 급, 전 커밋 대상) + 재허구화 이전
  커밋의 실존 사건 명칭 잔존 확인(잔존 자체는 수용 — 배포본 기준으로만 판정하되,
  public 전환 시 사용자에게 고지). **향후 커밋 위생**: `scratchpad/`·`shots/`를
  `git rm --cached` + `.gitignore`로 추적 해제(정상 커밋 — 재작성 아님), 이후 라운드가
  이력을 더 불리지 않게 한다. 이력은 제거 대상이 아니라 **자산**이다 — 라운드 커밋·발사문
  커밋의 타임라인을 `git log` 통계로 추출해 AI 활용 기술 문서의 프로세스 증거 절에 넣는다.
- **품질 프리셋**: E8의 `?q=` 리로드 계약이 정본. 저사양 프리셋이 볼류메트릭·GTAO·SSR을
  실제로 내리는지 확인만 하고, 구현 수정이 필요하면 HANDOFF 등재. 저사양 리허설(스로틀링
  포함)을 8/8 체크리스트에 넣는다.
- **`docs/credits.md`**: three.js 등 오픈소스·AI 도구 사용 내역 스캐폴드. 외부 에셋 0
  원칙(전부 절차 생성) 명기 — 기술 문서 필수 항목, 누락 시 실격 사유.
- **`docs/submission/`**: 게임 소개 PDF 골격(제목·한줄소개·게임 방법·실행 방법·링크) ·
  AI 활용 기술 문서 골격(구조 설명·주요 프롬프트 — 재료는 이 저장소의 발사문·ROUNDS·
  매니페스트·커밋 이력: "AI 디렉팅 시스템" 서사) · 30~60초 영상 촬영 플랜(실플레이만,
  AI 합성 불가) · 제출 전 체크리스트(시크릿 창 완주·콘솔 0·링크 유지).

## 6. 순서와 게이트

A(스키마+전환) → 검증기 통과 → B(생성기) → 무질문 게이트 → C(캘리브레이션, 사용자 승인
후) → 리포트. D는 처음부터 병행. 기획 최종 채점이 닫혀 E 문서가 확정되면 매니페스트
§ 좌표를 재검증하고 패킷을 재생성한다 — 지시서는 손으로 쓰지 않는다, 생성기가 찍는다.

## 7. 역할 지도 (이후 빌드 단계의 배정 — 이 세션은 시스템만)

- **Fable**: 시스템(본 발사문) + 통합 + 판정. 판정자는 구현을 겸하지 않는다(E10 원칙).
- **Opus**: 헤드라인 티켓 참조 구현 — 로비(T-P1-01)·첫 30초(T-P1-07)·텔(T-P1-03)·심문
  연출(T-P1-08). 참조 구현이 각 타입의 표준 골격이 된다.
- **Codex · Grok build**: 패킷으로 결박된 잎 티켓(외부 배정분). 투입 조건은 E10 §3 준수.

## 8. 예산·안전

- 토큰 상한: 시스템 구축(A·B·D) 300만 · 캘리브레이션(C) 400만. 상한 도달 시 중단·보고.
  한도 근처에서는 팬아웃 금지, 직렬 전환(교훈 메모 자원 조항).
- `Math.random()`/`Date.now()` 직접 호출 금지 등 ARCHITECTURE 계약은 도구 코드에도 적용.
- API 키·시크릿 커밋 금지. 외부 push·저장소 생성·외부 에이전트 실행은 사용자 승인 후.
- 완료 보고에는 검증 증거를 첨부한다: manifest-check 출력 · 무질문 테스트 로그 ·
  캘리브레이션 리포트 · build 성립 로그.
