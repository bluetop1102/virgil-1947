## 1. 게이밍 벡터

| 발견한 결함 | 왜 실험을 무효화하는가 | 최소 수정 제안 |
|---|---|---|
| 알려진 단일 프레임만 채점한다. [grader-rig.md:17](/Users/kang-yunbyeong/Documents/WORK/Projects/cecil-hotel-noir/tools/calibration/grader-rig.md:17), [quality-iteration.md:44](/Users/kang-yunbyeong/Documents/WORK/Projects/cecil-hotel-noir/tools/calibration/quality-iteration.md:44) | 구현자는 보이는 면만 세밀화하거나, 결함이 있는 하체·후면·관절을 카운터와 카메라 밖에 숨길 수 있다. 실제로 라운드 0에서 D5를 판정하지 못했다. [quality-iteration.md:58](/Users/kang-yunbyeong/Documents/WORK/Projects/cecil-hotel-noir/tools/calibration/quality-iteration.md:58) | 공개 개발 프레임과 비공개 홀드아웃 프레임을 분리한다. 최종 판정은 정면 근접, 3/4 전신, 측후면, 바닥 접촉을 포함한 평가자 촬영 3~4장으로 한다. |
| 카메라·FOV·포즈·노출·광원·시간·해상도가 이름 외에는 고정되지 않았다. | 지오메트리나 재질을 개선하지 않고도 얕은 심도, 역광, 어두운 노출, 압축된 원근으로 결함을 은폐할 수 있다. G3·G4·G10은 특히 조명과 렌즈에 민감하다. | 프레임마다 카메라 행렬, FOV, 포즈, 시간, 렌더 프리셋, 노출, 해상도와 기준 이미지 SHA-256을 고정한다. 구현자에게는 해당 상태 변경 권한을 주지 않는다. |
| 배경은 무시하라고 하지만 G4와 D5는 배경의 광원·바닥·의자 없이는 판정할 수 없다. [grader-rig.md:23](/Users/kang-yunbyeong/Documents/WORK/Projects/cecil-hotel-noir/tools/calibration/grader-rig.md:23) | 구현자가 배경 조명이나 접촉면을 조작해 캐릭터 그림자 점수를 올릴 수 있다. 반대로 배경 결함이 캐릭터 점수를 떨어뜨릴 수도 있어 소유 범위가 분리되지 않는다. | 고정된 평가 씬에서 회수 측이 촬영하고, 배경·조명 파일 해시가 기준선과 다르면 라운드를 무효화한다. 캐릭터 마스크도 함께 제출해 인물 영역을 명시한다. |
| 자체 채점 반복은 증거 없이 구현자의 보고에 의존한다. [quality-iteration.md:20](/Users/kang-yunbyeong/Documents/WORK/Projects/cecil-hotel-noir/tools/calibration/quality-iteration.md:20) | 허위 “전 항목 확인” 보고는 최종 통과를 직접 조작하지는 못하지만, 실패를 ② 루프 부족이 아닌 ③ 모델 한계로 오분류하게 만든다. 실험의 핵심 측정값이 오염된다. | 회수 측 하네스가 각 반복의 이미지·체크리스트·이미지 해시를 자동 보존한다. 증거가 없으면 “자체 반복 수행”으로 인정하지 않는다. |
| 평가 프레임이 공개되어 있고 최종 홀드아웃이 없다. | 프레임 ID나 QA 상태를 감지해 해당 장면에서만 고품질 메시·재질을 내는 특수처리도 통과할 수 있다. 이는 캐릭터 품질이 아니라 시험 적응이다. | QA 프레임 분기와 카메라 종속 구현을 소스 감사로 금지하고, 제출 후 평가자가 선택하는 미공개 포즈·각도에서 재검증한다. |

## 2. 신호 재현성

| 발견한 결함 | 왜 실험을 무효화하는가 | 최소 수정 제안 |
|---|---|---|
| 각 축에는 10점과 6점 예시만 있고 통과 경계인 8점의 관찰 기준이 없다. [grader-rig.md:36](/Users/kang-yunbyeong/Documents/WORK/Projects/cecil-hotel-noir/tools/calibration/grader-rig.md:36) | 동일 이미지를 두 심사자가 7·8·9점 중 어디에 놓을지 임의로 결정한다. 한 점 차이로 합격 여부가 바뀐다. | 축마다 6/8/10점의 필수 관찰조건을 정의하고, 중간 점수는 충족한 하위 조건 개수로 산출한다. |
| “상용 출시 빌드에 이질감이 없는가”, “2025년 AAA급”은 고정 표본 없이 기억에 의존한다. [grader-rig.md:43](/Users/kang-yunbyeong/Documents/WORK/Projects/cecil-hotel-noir/tools/calibration/grader-rig.md:43) | 심사자의 게임 경험과 미적 기준에 따라 `blind.pass`가 흔들린다. 같은 심사자도 다른 세션에서 다른 내부 참조를 떠올릴 수 있다. | 비교용 AAA 캐릭터 샷 묶음을 사전 등록하고 파일 해시·크롭·표시 크기를 고정한다. 스타일 일치와 AAA 품질 판단은 별도 질문으로 분리한다. |
| 채점 모델·버전·추론 설정·이미지 표시 해상도와 반복 횟수가 기록되지 않는다. | 모델 업데이트나 비결정적 샘플링이 처치 효과보다 큰 점수 변화를 만들 수 있다. 현재는 채점기 자체의 분산을 알 수 없다. | 모델 식별자와 설정을 고정·기록하고 동일 산출을 최소 3회 독립 채점한다. 항목별 중앙값을 쓰며 범위가 1점을 넘으면 판정 보류한다. |
| “의심스러우면 낮게”만 있고 판정 불가 처리 규칙이 없다. [grader-rig.md:68](/Users/kang-yunbyeong/Documents/WORK/Projects/cecil-hotel-noir/tools/calibration/grader-rig.md:68) | D5처럼 증거가 화면에 없을 때 어떤 심사자는 fail, 다른 심사자는 pass 또는 N/A로 처리한다. 라운드 0이 이미 이 문제를 재현했다. | `pass/fail/unobservable`을 구분한다. `unobservable`은 점수 0도 통과도 아니며, 보충 프레임을 촬영한 뒤에만 유효 라운드로 인정한다. |
| 실패좌표의 좌표계와 이미지 리사이즈 규칙이 없다. [grader-rig.md:49](/Users/kang-yunbyeong/Documents/WORK/Projects/cecil-hotel-noir/tools/calibration/grader-rig.md:49) | 같은 결함을 서로 다른 영역으로 지목하거나, 모델 내부 축소 때문에 미세 디테일의 존재 판단이 달라진다. | 원본 해상도를 고정하고 좌상단 원점의 정규화 박스 `[x,y,w,h]`를 사용한다. 근접 크롭은 하네스가 동일 규칙으로 생성한다. |

## 3. 측정 유효성

| 발견한 결함 | 왜 실험을 무효화하는가 | 최소 수정 제안 |
|---|---|---|
| 이른바 블라인드 판정은 AAA 정본과의 무라벨 비교가 아니다. 입력은 “대상 샷”과 같은 게임의 환경 참조로 이미 역할이 표시된다. [grader-rig.md:15](/Users/kang-yunbyeong/Documents/WORK/Projects/cecil-hotel-noir/tools/calibration/grader-rig.md:15) | 정본 게이트 3은 실제 AAA 스크린샷과의 무라벨 식별 시험이다. [AAA-RUBRIC.md:102](/Users/kang-yunbyeong/Documents/WORK/Projects/cecil-hotel-noir/docs/AAA-RUBRIC.md:102) 현재 `blind.pass`는 “자체 환경과 어울리는가”만 측정하므로 게이트 3 또는 AAA 품질 증거가 아니다. | 출력 명칭을 `style-fit proxy`로 낮춰 부르고, AAA 캐릭터 참조와 후보를 파일명·순서가 가려진 A/B로 제시하는 별도 최종 시험을 둔다. |
| G10을 “공간 실루엣”에서 “인체 비례·연결”로 바꾸는 등 정본 항목을 재정의했다. [grader-rig.md:41](/Users/kang-yunbyeong/Documents/WORK/Projects/cecil-hotel-noir/tools/calibration/grader-rig.md:41), [AAA-RUBRIC.md:53](/Users/kang-yunbyeong/Documents/WORK/Projects/cecil-hotel-noir/docs/AAA-RUBRIC.md:53) | 합격해도 정본 G10을 통과한 것이 아니다. 새 캐릭터 루브릭의 구성 타당성이 검증되지 않은 상태에서 “품질 축으로 이전”됐다고 일반화하게 된다. | 이를 `C-G3/C-G4/C-G6/C-G10` 파생 프록시로 명시하고 결론을 “다이치 리그 프록시”로 한정한다. 정본 통과로 사용할 경우 AAA-RUBRIC에 정식 캐릭터 축을 추가해야 한다. |
| 대조군 없이 패킷 기준, 자체 반복, 채점 피드백을 동시에 바꾼다. [quality-iteration.md:29](/Users/kang-yunbyeong/Documents/WORK/Projects/cecil-hotel-noir/tools/calibration/quality-iteration.md:29) | 점수가 오르더라도 계약 문구, 추가 계산량, 채점 피드백 누출, 모델의 우연한 산출 중 무엇이 원인인지 구분할 수 없다. “계약이 품질을 이전했다”는 인과 가설에 답하지 못한다. | 동일 모델·예산·기준 커밋에서 기존 패킷과 강화 패킷을 각각 최소 2회 독립 실행하는 짝지은 대조를 둔다. 자체 반복 횟수와 계산 예산도 동일하게 제한한다. |
| 라운드마다 `HEAD 최신`을 사용한다. [quality-iteration.md:41](/Users/kang-yunbyeong/Documents/WORK/Projects/cecil-hotel-noir/tools/calibration/quality-iteration.md:41) | 병행 개발의 배경, 조명, 렌더러, 카메라 변경이 캐릭터 점수 변화에 섞인다. 이는 명백한 시간 교란 변수다. | 전 라운드를 동일 base commit에서 시작한다. 처치 패킷과 `src/chars/rig.js` 외 파일 해시가 달라지면 비교를 무효화한다. |
| 라운드 피드백에 사용한 동일 프레임으로 최종 합격을 판정한다. | 계약은 일반 품질이 아니라 공개 시험 프레임에 수렴할 수 있다. 반복할수록 채점기 과적합 가능성이 커진다. | 공개 개발 프레임은 수정 피드백에만 쓰고, 최종 결론은 한 번만 여는 비공개 각도·포즈 세트에서 판정한다. |
| “1발주” 내부의 자체 반복 횟수와 비용에 상한이 없다. | 한 번의 외부 요청 안에서 무제한 반복한다면 측정값은 1발주 능력이 아니라 미측정 계산량의 결과다. | 추정량을 “한 번의 외부 위임”으로 명확히 낮추거나, 내부 반복·토큰·시간 상한을 고정하고 라운드마다 기록한다. |

## 4. 중단 조건·기록

| 발견한 결함 | 왜 실험을 무효화하는가 | 최소 수정 제안 |
|---|---|---|
| “총점 합계 2회 연속 미개선”에서 미개선의 기준과 비교 대상이 정의되지 않았다. [quality-iteration.md:14](/Users/kang-yunbyeong/Documents/WORK/Projects/cecil-hotel-noir/tools/calibration/quality-iteration.md:14) | 직전 라운드 대비인지 최고점 대비인지 알 수 없고, G3 상승과 G10 하락이 상쇄된다. 채점 잡음 1점만으로 중단 여부가 바뀐다. | `최고 라운드 대비 항목별 중앙값 변화`로 정의한다. 실격·블라인드 악화가 없어야 개선이며, 총점 변화가 반복채점 오차범위 이하면 정체로 처리한다. |
| 성공, 판정 불가, 정체, 4회 상한의 우선순위가 없다. | D5 판정 불가 라운드를 회차로 소비하는지, 4회째 합격 시 성공인지 상한 종료인지가 달라질 수 있다. | 순서를 명시한다: 판정 불가→라운드 무효·재촬영, 통과→즉시 성공, 그 외 정체 검사, 마지막으로 유효 발주 4회 상한. |
| 4회 실패 또는 두 번의 정체를 곧바로 “모델/1발주 한계”로 기록한다. | 작은 표본과 미측정 채점 분산으로 모델 능력의 상한을 추론한다. 입증 가능한 것은 특정 모델·예산·패킷·프레임에서의 미달뿐이다. | 결론 문구를 “고정된 실험 구성과 예산에서 관측된 미달”로 제한한다. 모델 한계 판정은 동일 패킷의 복수 독립 실행에서도 같은 미달이 재현될 때만 허용한다. |
| ① 지시 부족·② 루프 부족·③ 모델 한계가 상호 배타적이지도 완전하지도 않다. [quality-iteration.md:27](/Users/kang-yunbyeong/Documents/WORK/Projects/cecil-hotel-noir/tools/calibration/quality-iteration.md:27) | 평가 잡음, 프레임 관측 불가, 렌더 회귀, 상충 기준, 실행 오류, 계산 예산 부족도 모두 억지로 ①~③에 들어간다. “①·②를 시도했는데 실패”는 ③의 증거가 아니다. | `④ 측정/하네스 결함`, `⑤ 실행·예산 결함`, `판정 유보/혼합`을 추가한다. 각 분류에는 반증 시험과 요구 증거를 붙이고, 증거가 없으면 ③을 금지한다. |
| 기록표에 재현에 필요한 실험 상태가 없다. [quality-iteration.md:49](/Users/kang-yunbyeong/Documents/WORK/Projects/cecil-hotel-noir/tools/calibration/quality-iteration.md:49) | 점수만 남아 있어 모델 변경, 입력 변경, 배경 변경, grader 변동을 사후 구분할 수 없다. 실험을 반복하거나 감사할 수 없다. | 매 라운드에 base commit, 코드·패킷·프롬프트·대상/참조 이미지 해시, 모델/버전/설정, 도구 권한, 내부 반복 수, 비용·시간, grader 원본 JSON, 반복채점 분산을 기록한다. |
| 라운드 0은 다른 파일럿 산출이며 동일 프로토콜로 재생성됐다는 증거가 없다. [quality-iteration.md:53](/Users/kang-yunbyeong/Documents/WORK/Projects/cecil-hotel-noir/tools/calibration/quality-iteration.md:53) | 처치 전 기준선과 처치 후 라운드의 제작·촬영·채점 조건이 다르면 변화량 자체가 정의되지 않는다. | 고정된 최종 프로토콜로 라운드 0을 다시 촬영·반복 채점한 뒤 기준선으로 등록한다. |