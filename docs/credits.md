# 크레딧 — 오픈소스·AI 도구·에셋 출처

> NAN 2026 제출물 4번(AI 활용 기술 문서)의 **필수 항목**이다. 누락은 심사 제외 사유가 된다.
> 이 파일이 진실원이고, 제출 PDF는 여기서 파생한다. 의존성을 추가하면 **같은 커밋에서** 여기도 고친다.

## 1. 외부 에셋 — 다운로드 5건(음악) · AI 생성 1건

이 프로젝트는 **텍스처·지오메트리·효과음·폰트를 하나도 내려받지 않는다.** 화면에 보이는 것과
sfx·룸톤·리버브·발소리는 전부 런타임 절차 생성이다. 예외는 둘뿐이고, 둘 다 사용자 승인분이다
(AGENTS.md 에셋 예외 ①②, 2026-08-09):

- **타이틀 화면 배경 1장** — 내려받은 것이 아니라 AI로 생성했다(§1.1). 게임 월드 안에는 안 쓴다.
- **음악 5곡** — Kevin MacLeod(incompetech.com)의 CC BY 4.0 트랙(§1.2). 세 곡은 **로비 소품인
  라디오에서 나오는 디제틱 음원**이라 거리 감쇠·룸 리버브·심문 감쇠를 그대로 통과하고
  (E7 §3 "비디제틱 BGM 0" 계약 안쪽), 두 곡은 **심문·지목 구간의 긴장 침대**로 그 계약의
  사용자 지시 개정분이다(2026-08-10, §1.2).

| 종류 | 조달 방식 | 근거 |
|---|---|---|
| 텍스처(알베도·노멀·러프니스·AO) | GPU 셰이더로 절차 생성 | `src/materials/procedural.js` · 계약: ARCHITECTURE §7 "모든 텍스처는 절차 생성. 외부 에셋 다운로드 금지" |
| 재질(PBR 24종) | 절차 텍스처 조합 레시피 | `src/materials/recipes.a.js` · `recipes.b.js` |
| 지오메트리(소품 40종·가구·몰딩) | 코드 생성 + 시드 변주 | `src/world/kit.js` · `props*.js` |
| 환경광(IBL) | 절차 생성 PMREM — **HDR 파일 로드 금지** | `src/world/atmo/ibl.js` · 계약: ARCHITECTURE §6.5 |
| 오디오(리버브 IR·발소리·룸톤·효과음·스팅어·드론 큐) | WebAudio DSP·오실레이터로 합성 | `src/audio/dsp.js` · `ir.js` · `music.js` |
| 오디오(라디오 3곡 · 긴장 침대 2곡) | **외부 CC BY 4.0 다운로드** — 유일한 오디오 예외 | §1.2 |
| 폰트 | 시스템 폰트 스택만(`ui-serif, Georgia, serif`) — 웹폰트 파일 없음 | `index.html` |
| 인물 리그 | 절차 휴머노이드 + 스키닝, 모션 파일 없음 | 계약: E4 §3 |

검증: 빌드에 실리는 경로(`src` · `assets` · `index.html`)의 이미지·오디오·폰트·모델
바이너리는 §1.1 의 배경 1장과 §1.2 의 음악 5곡, 합계 6개뿐이다.

```bash
git ls-files src assets index.html \
  | grep -iE '\.(png|jpg|jpeg|hdr|exr|mp3|wav|ogg|glb|gltf|fbx|woff2?|ttf)$'   # → 6행
```

(`assets/title-bg.jpg` · `radio-1-…mp3` · `radio-2-…mp3` · `radio-3-…mp3` ·
`bed-unease-…mp3` · `bed-urge-…mp3`.
`docs/reviews/**` 의 jpg 는 체험 리뷰 증거 스크린샷이고, 과거 커밋의 `scratchpad/` 스크린샷은
QA 진단 산출물이다 — 둘 다 게임 에셋도 빌드 대상도 아니다.)

**왜 이 제약을 걸었나**: 오프라인 재현성과 라이선스 리스크 0. 심사자가 어떤 계정·키·네트워크
없이 링크만으로 실행할 수 있어야 한다는 요건과 같은 방향이다.

### 1.1 AI 생성 에셋 — 1건

| 항목 | 내용 |
|---|---|
| 파일 | `assets/title-bg.jpg` (2048×1152 · 270 KB · JPEG q72) |
| 용도 | 타이틀·재입장 화면 배경. **게임 월드 안에는 쓰이지 않는다** |
| 생성 도구 | Codex CLI 0.147.0 내장 `image_gen` 도구 |
| 모델 | `gpt-image-2` · quality high · size 2048×1152 |
| 후처리 | macOS `sips` 로 PNG(2.6 MB) → JPEG q72(270 KB) 변환. 그 외 편집 없음 |
| 생성일 | 2026-08-09 |
| 라이선스 | OpenAI 이미지 생성물 — 생성자에게 귀속. 제3자 저작물 차용 없음 |

생성 프롬프트 전문:

```text
Exterior of a 1940s Art Deco hotel facade at night in the rain, Los Angeles 1947,
film noir. Wet asphalt street reflecting a dim amber marquee and a few lit windows;
the rest of the building falls into deep near-black shadow. Streetlight haze,
drifting rain, iron fire escape, low fog at street level. Heavy vignette, 35mm film
grain, muted sepia-amber and cold slate-grey palette only. Wide cinematic
street-level shot. The upper third of the frame is almost empty and very dark,
reserved for a title overlay. No people, no figures, no text, no letters, no logos,
no signage, no watermark.
```

인물을 금지한 것은 인게임 인물이 마리오네트 인형 스타일이라 사실적 인물이 들어가면 아트
디렉션이 어긋나기 때문이고, 문자를 금지한 것은 제목 조판을 이미지가 아니라 UI 레이어가
담당하기 때문이다. 채택 전 같은 조건으로 6장을 생성해 타이틀 UI를 얹은 상태로 비교했다
(로비·대로비·복도·엘리베이터·옥상·외관).

**폴백**: 이 파일이 없거나 `?titlebg=render` 로 열면 타이틀 배경은 **인게임 로비 실렌더**로
떨어진다(`src/ui/title.js`). 즉 외부 에셋 없이도 게임은 완전한 타이틀 화면을 갖는다.

### 1.2 외부 라이선스 음원 — 5곡 (CC BY 4.0)

다섯 곡 전부 **Kevin MacLeod**(incompetech.com)의 작품이고 **Creative Commons: By Attribution
4.0** 으로 배포된다. 쓰이는 자리가 둘이다.

- **로비 라디오 3곡(디제틱)** — 비디제틱 BGM이 아니라 **로비 사이드테이블 라디오의 편성**으로만
  재생된다. 다이얼(E, "주파수를 맞춘다") 상호작용이 국을 바꾸고, 절차 생성 괴담 방송이 같은
  다이얼의 한 자리를 차지한다(`src/audio/radio.js`). 거리 감쇠·룸 리버브·심문 감쇠·오답 딥을
  전부 통과한 뒤에야 귀에 닿는다.
- **긴장 침대 2곡(비디제틱)** — 심문과 지목 구간에만 서는 지속 침대다(`src/audio/music.js`
  `bedStart`). 이 자리는 원래 절차 생성 지속층이었는데 **사용자 실청취에서 기각되어**
  (2026-08-10 — 0.27Hz 트레몰로가 주기적 북소리로 들렸다) 외부 트랙으로 교체했다.
  E7 §3 "비디제틱 BGM 0" 불변조항의 **사용자 지시 개정분**이며, 개정 범위는 이 두 구간뿐이다 —
  자유 배회·인트로·타이틀에는 여전히 비디제틱 음악이 0이다.

sfx·룸톤·리버브 IR·발소리·스팅어는 전부 절차 생성이라는 계약은 그대로다(§1 표).

| # | 곡명 | 파일 | 쓰임 | 길이 | 편성·악기 · 작곡가 설명 원문 | 트랙 페이지(ISRC) |
|---|---|---|---|---|---|---|
| 1 | **Night on the Docks - Sax** | `assets/radio-1-night-on-the-docks-sax.mp3` | 라디오 0번국 | 2:54 | EP + 테너 색소폰. 무박. `Dark, Somber, Relaxed` — "Sad and smooth; Think 1950's detective film." | [USUAN1100137](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100137) |
| 2 | **Dark Times** | `assets/radio-2-dark-times.mp3` | 라디오 2번국 | 3:04 | 현악만, 48 BPM. `Dark, Somber` — "Deeply troubling and somber, this piece is heavy on the bass strings… The feel is very dark and funereal." | [USUAN1100747](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100747) |
| 3 | **Vanishing** | `assets/radio-3-vanishing.mp3` | 라디오 3번국 | 3:55 | 프리페어드 피아노·베이스클라리넷·첼로·잉글리시호른·튜바·트롬본·호른·오보에·플루트. 무박. `Dark, Eerie, Mysterious` | [USUAN1600050](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1600050) |
| 4 | **Long note One** | `assets/bed-unease-long-note-one.mp3` | 심문 침대 | 7:20 | 콘트라베이스 + 바이올린. 무박. `Dark, Intense, Suspenseful, Unnerving` — "Just a very long pad for use under dialog." | [USUAN1100418](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100418) |
| 5 | **Impending Boom** | `assets/bed-urge-impending-boom.mp3` | 지목 침대 | 2:36 | 호른·팀파니·비올라·하프, 60 BPM. `Driving, Epic, Intense, Mysterious, Suspenseful` — "That sort of tension music for when people are trying to diffuse a bomb… Sixteenth notes beginning to end." | [USUAN1100198](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100198) |

곡명 `Long note One` 의 소문자 `n` 은 오타가 아니라 **incompetech 카탈로그의 표기 그대로**다
(같은 시리즈의 Two·Three·Four 는 대문자 N). 귀속 표기는 카탈로그 표기를 따른다.

- **원본 출처(직접 다운로드 URL)**: `https://incompetech.com/music/royalty-free/mp3-royaltyfree/<파일명>.mp3`
  (예: `…/mp3-royaltyfree/Night%20on%20the%20Docks%20-%20Sax.mp3`). 파일명은 카탈로그
  `https://incompetech.com/music/royalty-free/pieces.json` 의 `filename` 필드가 진실원이고 곡명과
  다를 수 있다. 1·4·5번은 2026-08-09, 2·3번은 2026-08-10 에 내려받았고, 2026-08-10 에 전 곡을
  같은 후처리로 다시 구웠다.
- **후처리 도구**: ffmpeg 8.1 (Homebrew, macOS arm64). 2패스 loudnorm 이다 — 1패스로 측정하고
  그 값을 `measured_*` 로 넣어 `linear=true` 로 적용한다.

  ```bash
  # 1패스(측정)
  ffmpeg -i <원본> -vn -af loudnorm=I=-18:TP=-2:LRA=11:print_format=json -f null -
  # 2패스(적용) — 라디오 3곡
  ffmpeg -i <원본> -vn -map_metadata -1 -map 0:a:0 \
    -af "loudnorm=I=-18:TP=-2:LRA=11:measured_I=..:measured_TP=..:measured_LRA=..:measured_thresh=..:offset=..:linear=true,alimiter=limit=0.72:attack=5:release=60:level=disabled,volume=<트림>dB" \
    -ac 1 -ar 22050 -b:a 48k <출력>
  # 긴장 침대 2곡은 -ar 32000 -b:a 64k, 그 외 동일
  ```

  - `-vn -map 0:a:0` 가 **커버아트 PNG 스트림을 제거**한다. 구판(2026-08-09)은 `-map_metadata -1`
    만 걸어서 태그는 지웠지만 **아트워크가 별도 video 스트림으로 남아 있었다**(radio-1·2 에서
    실측). 메타데이터 제거와 스트림 제거는 다른 일이다.
  - 샘플레이트가 갈리는 이유: 라디오 3곡은 런타임에서 AM 대역(320~3300Hz)으로 다시 좁히므로
    (`src/audio/radio.js`) 22.05kHz 로 충분하고, 긴장 침대 2곡은 대역 제한 없이 그대로 나가므로
    32kHz 로 올렸다.
  - `volume` 트림은 **인코딩된 파일의 실측 true peak 가 상한을 넘을 때만** 걸리고, 넘지 않을
    때까지 재인코딩을 반복한다. 리미터 **뒤에** 두는 것이 조건이다 — 앞에 두면 리미터가 트림을
    되돌려 실링이 내려가지 않는다.
  - 편곡·편집·구간 절단은 하지 않았다. 라우드니스 정규화·모노 다운믹스·리샘플·피크 제한만 했다.

- **실측값(목표값이 아니라 인코딩 결과 파일을 다시 잰 값)**: `ffmpeg -i <파일> -af
  ebur128=peak=true -f null -` · 스트림은 `ffprobe -show_entries stream=codec_type`.

  | 파일 | 스트림 | Integrated | LRA | True peak | 트림 | 크기 |
  |---|---|---|---|---|---|---|
  | `radio-1-night-on-the-docks-sax.mp3` | audio ×1 | **-19.7 LUFS** | 10.3 LU | **-1.4 dBTP** | -0.85 dB | 1.00 MB |
  | `radio-2-dark-times.mp3` | audio ×1 | **-22.5 LUFS** | 8.4 LU | **-3.6 dBTP** | 0 dB | 1.05 MB |
  | `radio-3-vanishing.mp3` | audio ×1 | **-21.1 LUFS** | 12.6 LU | **-3.2 dBTP** | 0 dB | 1.35 MB |
  | `bed-unease-long-note-one.mp3` | audio ×1 | **-21.1 LUFS** | 11.3 LU | **-1.2 dBTP** | 0 dB | 3.36 MB |
  | `bed-urge-impending-boom.mp3` | audio ×1 | **-19.0 LUFS** | 3.9 LU | **-1.9 dBTP** | 0 dB | 1.20 MB |

  전 파일 **video 스트림 0개 · true peak ≤ -1.0 dBTP**. 구판 3곡은 +0.3~+0.4 dBTP 로 실링을
  넘어 있었고 그중 2곡에 커버아트가 남아 있었다.

- **런타임 레벨 보정**: 라디오 3곡은 AM 대역 통과 뒤의 라우드니스가 서로 다르다(같은 필터
  체인으로 실측: 1번 -21.7 · 2번 -27.5 · 3번 -20.1 LUFS). 「Dark Times」는 저현이 본체라
  하이패스가 곡을 깎는다. 파일을 더 크게 굽는 대신 `src/audio/radio.js` 의 `TRIM` 이 되올린다 —
  다이얼을 돌려도 **라디오 한 대의 음량 노브는 그대로여야** 하기 때문이다.
- **라이선스 전문**: https://creativecommons.org/licenses/by/4.0/ ·
  법적 전문 https://creativecommons.org/licenses/by/4.0/legalcode.en

**표준 표기(incompetech 트랙 페이지의 `Attribution Code` 블록 원문 그대로)**:

```text
"Night on the Docks - Sax" Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0 License
http://creativecommons.org/licenses/by/4.0/

"Dark Times" Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0 License
http://creativecommons.org/licenses/by/4.0/

"Vanishing" Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0 License
http://creativecommons.org/licenses/by/4.0/

"Long note One" Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0 License
http://creativecommons.org/licenses/by/4.0/

"Impending Boom" Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0 License
http://creativecommons.org/licenses/by/4.0/
```

incompetech Music FAQ 가 **게시 위치**도 지정한다: "Video Games — Most commonly, credits are
placed on a 'Credits' screen found in the settings menu." 즉 이 문서 기재만으로는 부족하고
**인게임 노출 경로가 있어야 라이선스 이행이 끝난다.** 설정 카드(Esc) 하단에 다섯 곡 전부와
저작자·라이선스·전문 URL·가공 내역을 낸다(`src/ui/settings.js`).

같은 FAQ 의 개작 조항도 이행 대상이다: "Can I change your music? Yes, you can sing over, chop,
splice, compress, lengthen, and add instruments to anything you like. You MUST make it clear in
the credits which parts are yours, and which parts are mine." **이 프로젝트는 어떤 파트도 더하지
않았다** — 라우드니스 정규화·모노화·리샘플·피크 제한, 그리고 런타임의 AM 대역 필터·거리 감쇠·
리버브가 전부다. 그 사실을 인게임 표기와 이 문서 양쪽에 적는다.

**폴백**: `assets/radio-*.mp3` 가 없으면 편성표가 비고 라디오는 절차 생성 괴담 방송만 내보낸다
(`radio.js` `HAS_MUSIC` 분기). `assets/bed-*.mp3` 가 없으면 긴장 침대는 물의 리트모티프
E1(41.2Hz)을 늘인 절차 생성 패드로 떨어진다(`music.js` `pad()`). 즉 **외부 음원 없이도 게임은
그대로 성립하고 심문의 레벨 역전도 재발하지 않는다** — 코덱 거부·로드 실패도 같은 자리로
떨어지고, 오프라인 자체검증(`tools/test-audio.mjs`)은 항상 이 폴백 경로를 잰다.

## 2. 오픈소스 의존성

런타임에 실제로 번들되는 것은 위 2개뿐이다.

| 패키지 | 버전 | 라이선스 | 용도 | 출처 |
|---|---|---|---|---|
| three | 0.185.1 | MIT | WebGL 렌더러·씬 그래프. 포스트프로세스 파이프라인은 자체 구현 | https://threejs.org/ |
| @dimforge/rapier3d-compat | 0.19.3 | Apache-2.0 | 강체·캐릭터 컨트롤러 물리 (WASM) | https://rapier.rs |

개발·검증 전용 (번들 미포함):

| 패키지 | 버전 | 라이선스 | 용도 | 출처 |
|---|---|---|---|---|
| vite | 8.2.0 | MIT | 개발 서버·정적 빌드 | https://vite.dev |
| playwright | 1.62.1 | Apache-2.0 | 헤드리스 스크린샷 하네스·배포 검증 | https://playwright.dev |

라이선스 원문은 각 패키지의 `node_modules/<name>/LICENSE` 에 있다.
`npm ls --omit=dev --depth=0` 으로 런타임 트리를 재확인할 수 있다.

## 3. AI 도구 사용 내역

이 프로젝트는 AI를 **보조 작성기가 아니라 제작 공정 그 자체**로 썼다. 사람이 한 일은
목표·루브릭·게이트 설계와 판정이고, 코드·문서·검증기는 에이전트가 썼다.

| 도구 | 모델 | 역할 | 산출 흔적 |
|---|---|---|---|
| Claude Code | Claude Opus 5 / Fable 5 | 기획 라운드(E0~E10 요소 문서)·구현 라운드·통합·판정·시스템 구축 | 커밋 이력 전체 · `docs/design/**` · `PROMPT-*.md` |
| Claude Code (서브에이전트) | Opus 5 / Sonnet 5 | 병렬 전담(재질·파이프라인·이펙트·소품·대기)·블라인드 채점자·반증 에이전트 | `docs/ROUNDS.md` 라운드 로그 · `docs/HANDOFF.md` 교차 요청 큐 |
| OpenAI Codex | — | 독립 2차 코드 리뷰·**P0 발주 티켓 3장 구현·머지**(T-P0-01 계약 린트 · T-P0-05 텔 상관 · T-P0-06 low 프리셋) | `tools/calibration/report.md` · 머지 커밋 3건(발주 커밋 해시 명기) |
| Grok build | — | 캘리브레이션 파일럿 ① 대조군(산출은 계약 개정으로 미머지) | `tools/calibration/report.md` §1·§4.1 |

- **프롬프트 원문은 저장소에 있다**: `PROMPT-plan-v1.md`(기획) · `PROMPT-build-p0.md`·
  `PROMPT-build-p1.md`(구현) · `PROMPT-system-v1.md`(위임 시스템) · `packets/PACKET-*.md`
  (티켓별 자동 생성 발사문 15장). 제출물 4번의 "주요 프롬프트·지시사항" 항목은 이 파일들을 인용한다.
- **런타임 AI 없음**: 출하 빌드는 API 키를 요구하지 않는다. 심문 판정은 전 스크립트이고,
  자유 서술 판정(2단 커널)은 별도 플래그로 분리된 후속 단계다(E5 §6). 제출 요건
  "별도 유료 라이선스 없이 심사자가 실행 가능"의 이행이다.

## 4. 소재의 지위 (표절·도용 조항 대응)

인물·사건·호텔은 전부 허구다. 실존 사건·실존 업체를 지목하는 조합은 해체했다
(재허구화 계약: `docs/MASTER-PLAN.md` §1, 명칭 검증: `docs/design/E0-index.md` §0).
로딩 화면이 허구 고지문을 타자기로 찍는 것이 이 계약의 화면 측 이행이다(E8 §3).

**미해소 잔여 1건**: 배포 산출물의 `<title>`·부트 화면에 구 작품명이 남아 있다.
`docs/HANDOFF.md` 큐 등재분이며, 제출 전 체크리스트(`docs/submission/checklist.md`)의
차단 항목이다.
