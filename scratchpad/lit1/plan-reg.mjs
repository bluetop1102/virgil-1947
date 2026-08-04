// gtao.js 는 전 무드 공유다 — 복도 밖 무드에서 회귀가 없는지 되돌리기 A/B 로 확인한다.
const G = 'P.effects.gtao.mMarch.uniforms'
export default {
  cases: [
    { tag: 'R0-mine', apply: `S.settle(150); S.fixExposure(P.composite.exposure); S.info = { ev: +P.composite.exposure.toFixed(3) }; S.settle(20)` },
    { tag: 'R1-oldGtao', apply: `${G}.uRadius.value = 1.5; ${G}.uMaxRad.value = 0.055; ${G}.uPower.value = 2.4; ${G}.uThick.value = 0.12; S.settle(24)` },
    { tag: 'R2-mine', apply: `${G}.uRadius.value = 0.9; ${G}.uMaxRad.value = 0.020; ${G}.uPower.value = 3.6; ${G}.uThick.value = 0.05; S.settle(24)` }
  ],
  analyze: (S) => S.info
}
