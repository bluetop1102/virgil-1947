# todo — CECIL

## 완료
- [x] 스캐폴드 · three/vite/rapier · 헤드리스 WebGL GPU 검증(ANGLE Metal, M2)
- [x] `docs/AAA-RUBRIC.md` 채점기 · `docs/ARCHITECTURE.md` 계약 · `docs/STORY.md` 사건 성서
- [x] `src/core/*` 엔진 스파인 · 결정론 시간 · QA 하네스 API
- [x] `tools/shoot.mjs` — GPU 락 직렬화, `--off <패스>` A/B, warmup, 노출 게이트
- [x] 시스템 12종 부팅(에러 0): materials · pipeline(+패스 6) · props · atmosphere ·
      narrative/interrogation/deduction · gameplay/evidence · ui(hud/notebook/subtitles) · audio · physics
- [x] 수사노트 UI — 1947 종이 물성 확보(D7 회피)
- [x] `?scene=` 수동 진입로 — 6개 공간 직접 걸어다니기
- [x] 헐레이션 커널 진단·수리 — 램프 가로 막대·복제 돔 소멸

## 다음 세션 시작점 (에이전트 한도 리셋 후)

**복도 최신 심사: 평균 4.6 / 실격 2건** (`shots/final/atmo-corridor-night.png` = 현재 상태)

우선순위대로:
1. **[SHAFTS] 빌보드 광선** — 벽등 V자 쐐기가 밀도 변화·노이즈·차폐 없는 직선 모서리라
   원경 출입구 평면을 관통한다. 섀도맵 차폐 + 3D 노이즈 밀도 + 거리 기반 경계 소프트닝.
   검증: 광축 횡단 스캔라인 휘도가 계단형 플래토가 아니라 종형.
2. **[SURFACES] D3 타일링 실격** — 좌측 벽지 오지 문양이 한 화면에 3회 이상 동일 반복,
   마루 널 배열도 동일 주기. 라지스케일 그런지·이음매 어긋남·습기 얼룩·액자 자국.
3. **[SURFACES] D4 플레이스홀더 실격** — 세탁 카트(모따기 없는 실린더 + 재질 0 검정 자루),
   천장 보(순수 직육면체), 우측 크림색 무텍스처 슬래브.
4. **[POST] 근경 DOF 과다** — 라디에이터·근접 벽등·천장 보가 형태 판별 불가.
   근거리 초점 한계 0.6m, 근측 최대 블러 반경 1/3로.
5. **[POST] 중간톤 압착** — p05=6.9/p50=53.9/p95=155.3, L=0–64에 45% 집중.
   순흑 0.00%·블로우아웃 0.00% 롤오프는 유지한 채 중간톤에만 S자 대비.

## 미착수
- [ ] 레벨 모듈 4종(`world/lobby.js` 등) — 현재 공간은 전부 QA 프로브(`atmo/spaces.js`)로만 존재
- [ ] 인물(`chars/rig.js`, `chars/perf.js`) — 텔 시스템 미구현
- [ ] 시네마틱(`narrative/cinematics.js`)
- [ ] 게임 진행 — 3막, 증거 조사, 심문 선택, 3링크 추리, 엔딩까지 브라우저 완주 검증
- [ ] 게이트 2(내러티브 N1~N8) 채점
- [ ] 게이트 3 블라인드 비교

## 실측 기록 (재조사 방지)

- **three 의 레이캐스터는 `visible` 을 검사하지 않는다**(`three.core.js` 의 `intersect()` 에 가시성 분기가
  없다). `player._scan()` 이 `scene.traverse` 로 훑으면 **꺼진 방의 NPC·포털이 그대로 상호작용 대상으로
  남는다** — 로비에서 942호 인물을 심문할 수 있게 된다. 레벨 모듈을 세우는 순간 바로 걸리는 결함이라
  `_scan()` 은 이미 꺼진 가지를 잘라내는 재귀 walk 로 바꿔뒀다(`src/gameplay/player.js:118`).
  레벨 모듈이 없는 지금은 재현되지 않으니, 그 수정을 "쓸모없어 보인다"고 되돌리지 마라.

- 그림자는 실제로 동작 중이다: 캐스터 메시 337개, 그림자 스포트 12개(shadowFar 26/11/9/4.6/3.6m).
  심사자의 "그림자를 하나도 던지지 않는다"는 **너무 부드러워 안 읽히는 것**이지 미설정이 아니다.
  → 다음 라운드는 섀도 바이어스·페넘브라·해상도를 볼 것. castShadow 플래그를 다시 뒤지지 마라.
- 카펫 "단색 면"의 원인이던 UV 종횡비(2m×17.3m 평면에 정사각 repeat)는 `PC.floorUv(run.geometry, 2.7)`로
  이미 등방 재전개됐다. 다시 손대기 전에 현재 렌더부터 확인하라.
- `composite`은 EFFECTS가 아니라 PIPELINE-CORE 직속이라 `--off`가 닿지 않는다.
  광원 주변 아티팩트 A/B 전에 `pipeline.composite.mat.uniforms.uHalation.value = 0`을 먼저 걸어라.
