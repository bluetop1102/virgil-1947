# NAN 2026 사전 과제 제출 — 상태판

> 마감 **2026-08-10** · 리허설 **2026-08-08** · 제출물 5종 중 **하나라도 누락하면 심사 제외**다.
> 요강 원문: `../../../hackathon-2026/docs/nan2026-requirements.md`

## 제출물 5종

| # | 제출물 | 형태 | 이 저장소의 재료 | 상태 |
|---|---|---|---|---|
| 1 | 플레이 가능한 빌드 + 소스 | GitHub 링크 | `npm run build:pages` → `dist/` · 소스 전체 · 커밋 이력 36개 | **차단** — §차단 항목 참조 |
| 2 | 플레이 동영상 30~60초 | YouTube 링크 | 촬영 플랜: [video-plan.md](video-plan.md) | 미착수 (1번 선행) |
| 3 | 게임 소개·설명 문서 | PDF | 골격: [game-guide.md](game-guide.md) | 골격 |
| 4 | AI 활용 기술 문서 | PDF | 골격: [ai-tech.md](ai-tech.md) · 출처: [../credits.md](../credits.md) | 골격 |
| 5 | 팀원 롤 기술서 | PDF | **2인 이상만 해당** — 1인 참가면 제출 대상 아님 | 해당 없음(1인 기준) |

제출 전 최종 관문: [checklist.md](checklist.md)

## 1번 제출물의 기술 요건 (실측 대조)

| 요건 | 현황 | 근거 |
|---|---|---|
| 웹 빌드, 링크 클릭만으로 플레이 | **성립** | `node tools/serve-check.mjs` → 부팅·캔버스 1280×720·콘솔 0 |
| PC 실행파일(.exe) 불가 | 해당 없음 | 웹 전용 |
| 별도 유료 라이선스·API 키 불요 | **성립** | 런타임 AI 없음. 의존성 2개 전부 MIT/Apache-2.0 ([credits](../credits.md) §2·§3) |
| 전체 소스 공개 | 성립 | 외부 에셋 0 — 저장소가 곧 전체다 |
| 커밋 기록 유지 | **부분** — §커밋 이력 참조 | `git log` 36개(8/4~) |
| public 또는 심사계정 초대 | 미결 — 원격 저장소 없음 | `git remote -v` 비어 있음 |

## 배포 방식 (확정)

**상대 경로 빌드**를 쓴다 — `npm run build:pages`(`vite build --base=./`).

기본 `npm run build`(base=`/`)는 루트 배포에서만 돌고 **서브패스에서 깨진다**. GitHub Pages
프로젝트 사이트(`https://<user>.github.io/<repo>/`)가 서브패스라 기본 빌드로는 심사자가
링크를 눌러도 404 5건에 빈 캔버스를 본다. 실측 대조:

| 빌드 | 루트 배포 | 서브패스 배포 |
|---|---|---|
| `npm run build` (base=`/`) | PASS | **FAIL** — 에셋 404 5건, 부팅 실패 |
| `npm run build:pages` (base=`./`) | PASS | **PASS** |

재현: `node tools/serve-check.mjs` · `node tools/serve-check.mjs --prefix /cecil-hotel-noir`
(vite dev 서버는 경로를 보정해 주므로 증거가 되지 않는다. 이 검사기는 보정 없는 순수 정적
서버라 베이스 경로 결함이 여기서만 드러난다.)

## 커밋 이력 — 요건 대비 실상

요건은 "커밋 기록 유지"다. **이력 재작성(squash·filter-repo)은 이 요건의 정면 위반이므로 금지**다.

- 현재 36커밋 / 8-04 3, 8-05 22, 8-06 11.
- **공백**: 7/31~8/3 의 초기 구축분은 커밋이 없다. 저장소가 8/4 에 스냅샷 1커밋
  (`a195a02 chore: CECIL 현재 상태 스냅샷`)으로 시작했기 때문이다. 감추지 말고 기술 문서에
  명시한다 — 8/4 이후의 라운드 이력이 오히려 공정의 증거다.
- **push 제약**: `.git` 이 2.0GB(과거 커밋의 QA 스크린샷 634장 포함)이고 GitHub 는 push 1회
  팩 2GB 한도가 있다. **구간 분할 push** 로 넘긴다 —
  `git push origin <중간커밋>:refs/heads/main` 을 시기순 2~3회 돌린 뒤 최종 push.
- **향후 위생**: `scratchpad/` 를 추적 해제했다(`git rm --cached` + `.gitignore` — 정상 커밋,
  재작성 아님). 이후 라운드가 이력을 더 불리지 않는다.

## 차단 항목 (해소 전 제출 불가)

1. **배포본에 구 작품명 표출** — `<title>` 과 부트 화면 대문짝. 심사자가 링크를 클릭해
   가장 먼저 보는 두 글자다. `docs/HANDOFF.md` 등재분, 소유자는 [CORE]/[UI]/[INTERROGATION].
2. **게임이 성립하지 않는다** — 공간은 QA 프로브로만 존재하고 정식 레벨·인물·심문 E2E가
   미착수다(`docs/RESUME.md` §1). 제출물 1·2번의 실질 전제이며, P0·P1 티켓 15장
   (`data/manifest/`)이 이 구멍을 메우는 작업이다.
3. **`low` 품질 프리셋 없음** — `?q=low` 가 경고 없이 `high` 로 폴백하고 `medium` 도
   볼류메트릭·GTAO 를 끄지 않는다. 저사양 리허설(8/8)이 통과 불가다. `docs/HANDOFF.md` 등재분.
4. **원격 저장소 없음** — 생성·push 는 사용자 명시 승인 후.
