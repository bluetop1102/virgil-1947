// 원경 잔여 국소대비(4.8)는 그레인도 DOF 도 볼류메트릭도 아니다 — **감쇠된 끝벽 표면 자체**다.
// 안개색이 표면보다 3자릿수 어두워서, FogExp2 가 99.4% 를 섞어도 남은 0.6% 의 표면 복사가
// 안개색을 9:1 로 이긴다. 감쇠는 곱셈이라 상대 대비가 보존된다 — 색이 아니라 **밀도**가 레버다.
const M = "S.moods['corridor-night']"
const SET = "S.atmo.setMood('corridor-night'); S.settle(26)"
export default {
  cases: [
    { tag: 'D0-now', apply: `S.settle(200); S.fixExposure(P.composite.exposure); S.d0 = ${M}.fog.density
S.info = { ev: +P.composite.exposure.toFixed(3), density: S.d0 }; S.settle(20)` },
    { tag: 'D1-den170', apply: `${M}.fog.density = 0.170; ${SET}` },
    { tag: 'D2-den190', apply: `${M}.fog.density = 0.190; ${SET}` },
    { tag: 'D3-den215', apply: `${M}.fog.density = 0.215; ${SET}` },
    { tag: 'D4-back', apply: `${M}.fog.density = S.d0; ${SET}` }
  ],
  analyze: (S) => S.info
}
