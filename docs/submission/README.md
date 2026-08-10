# NAN 2026 사전 과제 제출 — 통제판

> 공식 사이트·배포 번들 재확인: **2026-08-10 KST**
> 마감: **2026-08-10 23:59:59 KST** · 마감 후 변경 불가
> 근거 기록: [audit-2026-08-10.md](audit-2026-08-10.md)

## 결론

**1인 참가로 확인됐으므로 PDF는 두 개만 만든다.** 그러나 전체 제출은 아래 **1~4번이 모두 필수**다.
5번 팀원 역할 PDF는 해당 없다. 한 항목이라도 빠지면 심사 대상에서 제외된다.

| # | 필수 제출물 | 현재 산출물 | 상태 |
|---|---|---|---|
| 1 | 플레이 링크 + 전체 소스·커밋 이력 | 공개 Pages·GitHub | **조건부 성립** — 링크는 PASS, 최종 소스/배포 동결 전 |
| 2 | 실제 플레이 30~60초 YouTube | [video-plan.md](video-plan.md) | **차단** — 사람 촬영·업로드·URL 필요 |
| 3 | 게임 소개·설명 PDF | [game-guide.md](game-guide.md) | **DRAFT** — 실제 영상 URL을 빌더에 전달한 뒤 final 생성 |
| 4 | AI 활용 기술 PDF | [ai-tech.md](ai-tech.md) | **DRAFT** — 라이선스·최종 검증 상태 확정 후 생성 |
| 5 | 팀원 역할 PDF | — | **해당 없음** — 사용자 확인: 1인 참가 |

## 제출 링크

| 대상 | URL | 2026-08-10 상태 |
|---|---|---|
| 플레이 | <https://bluetop1102.github.io/virgil-1947/> | 부팅·캔버스·요청 실패 0·콘솔 0 확인 |
| 소스·이력 | <https://github.com/bluetop1102/virgil-1947> | public `main=cace78c`; 진행 중인 로컬 제작본보다 뒤 · 외부 에셋 Description 정정 확인(16:48 KST) |
| YouTube | `{{YOUTUBE_URL}}` | 미업로드 |
| 공식 제출 폼 | <https://docs.google.com/forms/d/e/1FAIpQLSdb2ifNzAdJpOYrRUCFA0DDQ7S56zTfcUsm79MI3aNTKOgsGg/viewform?usp=header> | 사용자 로그인·제출 필요 |

현재 링크가 열린다는 사실은 최종본이라는 뜻이 아니다. 다른 제작 세션의 변경이 끝난 뒤 최종
커밋을 push하고 그 소스로 Pages를 다시 배포한 다음, 아래 검증을 새로 실행해야 한다.

## 제출 전 P0·최종 게이트

1. **참가 인원 확인 완료** — 2026-08-10 사용자 확인: 1인 참가. 5번 팀원 역할 PDF는 해당 없음.
2. **음원 귀속·가시성 이행** — 현재 후보의 라디오 3곡·긴장층 2곡은 모두 오디오 전용이고 true
   peak `-1.4/-3.6/-3.2/-1.2/-1.9 dBTP`다. credits와 설정 소스도 5곡으로 갱신됐다. 17:28 KST
   축약 설정안은 1280×720 CSS(2× 캡처)에서 전 문구·경계·콘솔 0을 통과했다. `Impending Boom`도
   실제 지목판 `ui:open`에 배선돼 17:22 KST 일반 Vite 동적 프로브에서 `streamed=true`·요청 실패
   0이었다. `fe11510`과 소유자 보고서의 결과·곡별 trim은 fresh 측정과 일치하지만, raw
   `measured_*`가 보존되지 않아 완전한 명령 재현성은 부분이다. 남은 것은 헤드폰 청감·credits의
   권리/AI 이력 정정·최종 Pages 재확인이다.
3. **공개 저장소 설명 해소·최종 확인** — 16:48 KST GitHub API에서 Description이 “절차 생성
   3D 월드 · 외부 에셋은 AI 생성 타이틀 배경과 CC BY 4.0 음원뿐(전수 `docs/credits.md` 기재)”으로
   바뀐 것을 확인했다. 최종 제출 직전 비로그인 화면에서 한 번 더 확인한다.
4. **증거 규칙 해소·최종 확인** — `42a3814`에서 “증거 아이템은 남고, 한 번 내민 판정과 닫힌
   진술은 되돌릴 수 없음”으로 정렬했고 fresh 108/0·burn 9/0·완주 PASS다. 최종 동결 커밋에서 한 번
   더 확인한다. DRAFT에는 새 고지 후보를 반영했지만 최종 Pages에서 다섯 프레임을 한 실행으로
   재촬영한다.
5. **조작 카드 5행 최종 배포 확인** — Shift 추가 뒤 `카드 · Esc`가 잘리는 결함은 `999dafa`에서
   해소됐다. 로컬 일반 게임 경로 1920×1080에서 다섯 행·화면 경계·콘솔 0을 통과했다. 최종 Pages
   재배포 뒤 같은 화면을 한 번 더 보고 영상을 촬영한다.
6. **소스와 배포 동결** — 모든 외부 세션 종료 → 명시적 파일만 커밋/push → Pages 재배포 →
   최종 URL E2E. 현재 `dist/`는 16:21 KST 감사 중 dirty 로컬 소스로 재생성된 파생물이라 절대
   배포하지 말고, clean 최종 커밋에서 새로 빌드한다. 마감 뒤 수정할 수 없으므로 이 단계 이후 기능
   변경은 하지 않는다.
7. **사람이 영상 촬영** — 실제 조작 화면만 52초로 편집하고 YouTube 공개/일부 공개로 업로드한다.

## 닫는 순서

순서가 중요하다. 게임 소개 PDF에는 플레이 영상 링크가 필수이므로 PDF를 먼저 확정하면 안 된다.

1. 코드·라이선스 P0 해소 및 소스/배포 동결
2. 시크릿 창에서 최종 배포 1막 완주
3. 최종 배포로 30~60초 실제 플레이 영상 촬영·업로드
4. YouTube URL은 원고의 토큰을 직접 지우지 말고 PDF 빌더의 `--video-url`로 전달한다. 이 상태판과
   영상 설명란에도 같은 URL을 기록한다.
5. 두 PDF를 **final 모드**로 생성하고 전 페이지·링크·한글 글리프 확인
6. 공개 링크 3개와 PDF 2개를 다른 기기에서 직접 열기
7. 공식 Google Form 제출 완료 화면 캡처
8. 마감 뒤 저장소·Pages·영상·PDF를 변경하지 않고 심사 종료까지 공개 유지

## fresh 검증 명령

```bash
node tools/manifest-check.mjs
node tools/factcheck.mjs
node tools/lint-contract.mjs --self-test
node tools/lint-contract.mjs
node tools/test-interrogation.mjs
node tools/playthrough.mjs --fast --act 1
npm run build:pages
node tools/serve-check.mjs --prefix /virgil-1947
node tools/serve-check.mjs --url https://bluetop1102.github.io/virgil-1947/
```

`lint-contract`는 현재 훅 도입 이전 잔여 4건 때문에 exit 1이다. 이를 “전건 PASS”로 적지 않는다.
최종 상태에서 4건이 그대로라면 정확한 위치·영향·수용 결정을 기술 문서와 제출 기록에 남긴다.

## 산출물 위치

- 제출 원고: `docs/submission/game-guide.md`, `docs/submission/ai-tech.md`
- 영상 대본: `docs/submission/video-plan.md`
- 최종 관문: `docs/submission/checklist.md`
- 제출 PDF: `output/pdf/`
- PDF 렌더 검수: `tmp/pdfs/`

```bash
# 최초 1회: 재현 가능한 PDF 빌드 환경
python3 -m venv tmp/pdfs/venv
tmp/pdfs/venv/bin/pip install -r docs/submission/pdf-requirements.txt

# 현재 상태를 검토하는 워터마크 DRAFT
tmp/pdfs/venv/bin/python docs/submission/build-pdfs.py --draft

# 최종: 실제 YouTube URL과 fresh P0 판정 문자열 없이는 실행이 거부된다
tmp/pdfs/venv/bin/python docs/submission/build-pdfs.py --final \
  --video-url 'https://youtu.be/VIDEO_ID' \
  --evidence-status '해소 — 42a3814 · 108/0·burn 9/0·playthrough PASS' \
  --audio-status '해소 — ffprobe audio-only · 설정 화면 육안 PASS · 지목 침대 런타임 청감 PASS · true peak -1.4/-3.6/-3.2/-1.2/-1.9 dBTP · 공개 빌드 재생 PASS'
```

final 모드는 원고의 토큰 개수를 먼저 검사하고, 두 PDF를 임시 위치에서 모두 빌드·재개방 검증한 뒤
한 쌍으로 공개한다. `HOTEL-VIRGIL-PDF-MANIFEST.json`이 없으면 제출 세트가 아니다. 기존 final
세트를 덮어쓰지 않으므로 재생성이 필요하면 기존 PDF 2개와 manifest를 함께 별도 보관한 뒤 실행한다.
또한 실제 YouTube oEmbed, 깨끗하고 버전 관리된 입력, 증거 회귀 3종, 오디오 전용 스트림·설정 소스의
필수 귀속 문자열·true peak·지목판 이벤트 연결을 직접 검사한다. 설정 화면의 실제 가시성과 음원의
실제 청감은 자동화 범위가 아니므로 사람이 최종 배포에서 확인해 `설정 화면 육안 PASS`와
`지목 침대 런타임 청감 PASS`를 상태 인자로 남긴다. `output/`, `tmp/`, `dist/`, `shots/` 밖의
미추적 파일이 있으면 final을 거부한다.
