# 체험 컴포넌트 리서치 — 회자되는 추리 게임과 무난한 추리 게임을 가르는 것

> `deep-research-v3` standard 3라운드(fresh → augment → augment) · 2026-08-06 ·
> 에이전트 33기 · 서브에이전트 토큰 191만 · 소스 45건 수집 · 검증 통과 주장 누적 33건 ·
> 반증 0. run: `wf_f06d8a39-374` → `wf_3386596b-a7c` → `wf_934ba46f-967`.
> **용도**: `PROMPT-plan-v2.md` Phase A의 체험 축 도출 근거 + `PROMPT-codex-verdict.md` 입력.
> 이 문서는 **일반 담론의 정리이지 우리 세트에 대한 판정이 아니다** — 대조는 codex가 한다.

## 0. 한계 — 먼저 읽어라

3라운드를 돌리고도 닫지 못한 구멍이 넷이다. 축을 세울 때 이 영역의 근거로 삼지 마라.

- **텔 판별 가능성(L.A. Noire 각도 A)** — 3라운드 연속 실패. "MotionScan 과장 연기로 거짓말이
  너무 티 났다"인지 "Doubt와 Lie 경계가 모호해 알 수 없었다"인지, 어느 쪽이 지배적 발화였는지
  확인 못 했다. 리마스터의 라벨 변경(Truth/Doubt/Lie → Good Cop/Bad Cop/Accuse)이 무엇에 대한
  대응이었는지도 미확인. 유일하게 근접한 자료는 2021년 재검토 비평의 제3 프레이밍 —
  "기계적으로 흥미롭기도 하고 상당히 평범하기도 하다(both mechanically interesting as well as
  fairly pedestrian)".
- **1940년대 LA 무대의 아류 판정(각도 F)** — 근거 0. 같은 시대·도시를 쓰고도 아류로 안 읽힌
  작품이 있는지, 판정을 가르는 조건이 무엇인지 미확인.
- **플레이어 발화 1차 근거의 부족** — 2·3라운드에서 Steam 포럼·리뷰 인용을 일부 확보했으나
  (Outer Wilds 스포일러 규범, Disco Elysium 세이브 스컴 공략, Golden Idol 리뷰), 여전히 상당수
  주장이 개발자 인터뷰·비평(2차)에 기댄다. Reddit 원문은 3라운드 내내 한 건도 못 가져왔다 —
  검색 각도가 아니라 하네스의 접근 한계로 보인다.
- **실패 대조군 표본** — 목표 3~4건에 못 미치는 2건(Uncover the Smoking Gun, Nobody Wants to
  Die)이고 후자는 실패작이 아닌 평작이다. Contradiction·The Council·Paradise Killer·Sherlock
  Holmes 시리즈는 검증 배치에 오르지 못했다.
- 중반 슬럼프의 **해법**(개발자가 무엇으로 깼는가)도 미확인 — 증상만 특정됐다.

## 1. 판별력 등급표

| # | 컴포넌트 | 등급 | 라운드 |
|---|---|---|---|
| C5 | 지연된 인과 — 선택의 총량이 아니라 반향의 시차 | **필수** | 1 |
| C9 | 회자 지점 = 스스로 도달했다는 감각 + 공유 불가능성 | **필수** | 2 |
| C10 | 단일 회차 엔딩의 여운 = 되돌릴 수 없는 발견 자체가 콘텐츠 | **필수** | 2 |
| C11 | 비가역 실패의 판별 조건 = 실패의 **서사적 의미부여** (되돌리기 난이도 아님) | **필수** | 2 |
| C12 | 중반 권태는 케이스 수가 아니라 **전제의 반복**에서 온다 | **필수** | 3 |
| C2 | 연역적 행위주체성 — 결론에 도달하는 주체가 플레이어여야 한다 | 필수 | 1 |
| C6 | 주인공을 무력하지도 전능하지도 않은 위치에 고정 | 증폭 | 1 |
| C7 | 레이어링으로 밀도, 선형 크리티컬 패스로 통제 | 증폭 | 1 |
| C13 | 무명 주인공은 '수사자 정체성' 부여로 성립한다 | 증폭(근거 약함) | 3 |
| C1 | 무차별 대입 불가능한 정밀 검증 | **강등 — 판별력 없음** | 1→2 |
| C4 | 메커닉의 참신성 | **판별력 없음(반증된 통념)** | 1 |
| C8 | 장르 3분류(연역형·모순형·수사형) | 분류 기준 | 1 |

## 2. 검증 강도는 판별 축이 아니다 — C1의 강등과 스펙트럼

1라운드는 "무차별 대입 불가능한 테스터"를 필수로 올렸으나, 2라운드가 강등했다. **연역 요구가
없는 가이드형과 지나치게 엄밀한 검증형이 반대 방향에서 같은 '퀴즈화' 실패로 수렴**하기 때문이다.

- **검증형 과잉**: 골든 아이돌 플레이어 — "Solutions can also, at times, feel too exacting.
  Every word must be placed correctly ... It can sometimes feel like being quizzed on all the
  observations one has made, instead of a satisfying deduction."
  ([waltoriouswrites](https://waltoriouswritesaboutgames.com/2025/01/13/the-case-of-the-golden-idol-is-another-great-game-for-collaborative-detective-work/), 블로그·1인칭)
- **가이드형 과소**: Nobody Wants to Die — "it entirely guides players through the investigation
  process", "no fail states and explicit directional prompts rather than requiring deductive
  reasoning" ([Digital Trends](https://www.digitaltrends.com/gaming/nobody-wants-to-die-cyberpunk-recommendation/))
- **L.A. Noire의 위치(3라운드 확정)**: 검증형 극단의 **반대편**, 무검증에 가까운 가이드형 쪽
  극단. 3선택+증거제시라는 형식을 갖췄으나 오답에 비용이 없다.

## 3. L.A. Noire — 오답의 무게가 애초에 없었다 (3라운드 최대 산출)

| 사실 | 원문 |
|---|---|
| 심문을 전부 틀려도 케이스는 성공 종결된다 | "it's also possible to pick every incorrect answer and still come away having successfully cracked the case." |
| 별점은 서사에 거의 영향이 없다 | "the main narrative changes little even if they end up getting everything wrong." |
| 기사 자체의 요약 판단 | "In short, failing interrogations really doesn't do much at all." |

출처: [ScreenRant](https://screenrant.com/la-noire-wrong-answers-interrogations-interviews-cole-phelps/) (블로그). 확신도 high — 세 문장이 동일 원문에서 확인.

**긴장 관계**: 같은 장르를 훑은 다른 비평은 7개 탐정 게임(L.A. Noire 포함)을 두고 되돌릴 수
없는 실패를 재미의 원천으로 규정한다 — "They're not about always being right, but about the
thrill of being wrong in spectacular fashion. They embrace dead ends, irreversible mistakes"
([GameRant](https://gamerant.com/detective-games-players-can-fail/)). 장르가 표방하는 것과
L.A. Noire가 실제로 구현한 것 사이의 간극이 이 대조의 핵심이다.

## 4. C11 — 비가역 실패는 '서사적 의미부여'로 갈린다

판별 조건은 되돌리기의 기술적 난이도가 아니다. **되돌릴 수 있으면 커뮤니티가 우회 규범을 만들어
실패를 장애물로 소비한다.** Disco Elysium 포럼의 표준 공략이 그 증거다.

- "Save frequently in multiple slots; some game-overs are story-based rather than health-related"
- "If you think an option might kill you, don't take it. Come back later with higher stats"
  ([Steam 토론](https://steamcommunity.com/app/632470/discussions/0/4629230764944339612), 포럼·1차)

## 5. C9·C10 — 회자와 엔딩

- **C9 회자 지점** = self-arrival + 공유 불가능성. Outer Wilds 커뮤니티는 스포일러 요청에
  "we just want you to enjoy the experience the way we did by brute force and trial and error"로
  답하며 공유 불가능성을 **규범으로 방어**한다([Steam 토론](https://steamcommunity.com/app/753640/discussions/0/3194739612545860731), 포럼·1차). 골든 아이돌 플레이어 Sofox(14.4시간)는
  "It definitely rewards deduction, examining the scene and getting an overall sense of what
  happened"라며 self-arrival을 오브라 딘과 비교해 호평했다([Steam 리뷰](https://steamcommunity.com/app/1677770/reviews/), 포럼·1차).
- **C10 단일 회차 엔딩** = 되돌릴 수 없는 발견 자체가 콘텐츠. Outer Wilds — "Once you have
  uncovered its mystery, there is no recovering it."([Mancunion](https://mancunion.com/2024/05/02/outer-wilds-retrospective/)). 장르는 재플레이 불가를 결함이 아니라 정의적 특성으로 받아들인다 —
  "it's also completely unreplayable, as most detective and puzzle games are."([GamesRadar](https://www.gamesradar.com/the-case-of-the-golden-idol-is-the-best-successor-to-obra-dinn-so-far/))

## 6. C12 — 중반 권태는 케이스 수가 아니라 전제의 반복

L.A. Noire의 슬럼프 좌표가 특정됐다. 살인 미스터리 9건 중 **진짜 후더닛으로 기능하는 것은
Traffic 데스크 2건뿐**이고, 나머지 7건은 오프닝에서 범인이 드러난다. 특히 **Homicide 데스크
5건 중 4건이 "남편과 별거 중인 아내가 혼자 술 마시고 귀가하다 살해된다"는 동일 전제의 반복**이다.

- "Of those nine [actual mysteries], only the two traffic cases actually work as mysteries."
- "each one...is about a married woman who's estranged from her husband getting murdered after
  a night out drinking alone."
  ([GameCritics](https://gamecritics.com/daniel-weissenberger/l-a-noire-has-problems/), 확신도 high)

**페이싱 반대 사례**: 리마스터에 추가된 Nicholson Electroplating DLC 케이스가 Arson 데스크
클라이맥스(켈소 시퀀스) 중간에 끼어들어 서사 흐름을 끊는다 — "This completely upends the
narrative, with a case that has no bearing on the story while said story is hurtling towards
its conclusion."([Thomas Clement](https://thomasclement.net/2019/03/06/l-a-noire-the-battle-between-dlc-pacing/))

## 7. 주인공 — C6·C13

- **강한 주인공(콜 펠프스)**: 아바타가 아니라 독자적 의제를 가진 캐릭터로 설계됐다 — "Phelps is
  not an avatar that players command, he is a character with his own agenda." 유부남 펠프스가
  나이트클럽 가수를 따라가는 장면이 플레이어 의지와 무관하게 진행된다. Arson 데스크에서 경찰
  절차물이 느와르 스릴러로 전환되며 **주인공이 잭 켈소로 교체**된다
  ([Kotaku](https://kotaku.com/l-a-noires-ending-revisited-1818553078)). 다른 비평은 그 강한
  캐릭터성을 결함이 아니라 미덕으로 읽는다 — "so sharply drawn that it's painful"
  ([Vice](https://www.vice.com/en/article/la-noire-retrospective-10-power-and-misuse/)).
- **C6 요짐보 모델(디스코 엘리시움)**: 해리 뒤부아는 무력하지도 전능하지도 않은 위치에 고정되며
  "Harry is not going to change the balance of political power in the world"가 명시적 설계 원칙
  ([Game Developer](https://www.gamedeveloper.com/design/player-agency-politics-and-narrative-design-in-disco-elysium-)).
- **C13 무명이 성립하는 조건(근거 약함, low)**: Her Story는 고정 주인공 대신 수사관·검사·변호인
  같은 **수사자 정체성**을 부여해 플레이어=수사자 동일시가 이름 없는 캐릭터를 대체한다
  ([CMU 코스 자료](https://courses.ideate.cmu.edu/54-498/f2015/index.html%3Fp=10685.html)).
  **플레이어가 무명성을 불만으로 말하는지 몰입 장치로 말하는지는 3라운드 내내 확보 실패.**

## 8. 1라운드 확정분 (재서술 없이 유지)

- **C5 지연된 인과** — 펜티멘트: "It's about choices mattering, not about them being everywhere."
  25년 시간축으로 1막의 고발이 2막에서 유족 대사로 되돌아온다([Digital Trends](https://www.digitaltrends.com/gaming/pentiment-interview-alec-frey-choice/)).
- **C7 레이어링 + 선형 크리티컬 패스** — ZA/UM: 쿠노는 약 20회 재작성됐으나 "There's one answer
  to the mystery. The critical path is quite linear."([GamesHub](https://www.gameshub.com/news/features/disco-elysium-narrative-writing-process-18597/)).
- **C4 참신성은 충분조건이 아님** — Uncover the Smoking Gun: GPT 자유질문 + System Overload
  자백 모드, Steam 96% 긍정·Metacritic 80, 그러나 리뷰 413건([Steam](https://store.steampowered.com/app/2492290/Uncover_the_Smoking_Gun/), **1차**).
- **오브라 딘의 설계 출발점** — Lucas Pope는 제약에서 시작했고("If there's no problem, then I'm
  not that interested"), 미스터리 축을 "어떻게 죽었나"에서 "누구인가"로 전환한 것이 피벗이었다
  ([Game Developer](https://www.gamedeveloper.com/design/for-lucas-pope-i-return-of-the-obra-dinn-i-was-a-bunch-of-appealing-design-problems)).

---

증분 재실행 상태는 3차 run(`wf_934ba46f-967`)에 보존돼 있다. 남은 공백(§0)을 더 파려면
`mode:'augment'`로 각도만 추가하되, Reddit 접근은 3라운드 연속 실패했으므로 같은 방법의
4라운드는 수익 체감이 크다.
