// GTAO 접촉부 전용. 셰이더 상수(노멀 오프셋·블러 폭)는 uniform 이 아니라서 런타임에서 못 흔든다 —
// 소스를 임시로 고쳐 넣지 않고, uniform 으로 흔들 수 있는 축만 먼저 판별한다.
const G = 'P.effects.gtao.mMarch.uniforms'
const A = 'P.aoApply.uniforms'
export default {
  cases: [
    { tag: 'A0-ship', apply: `S.settle(150); S.fixExposure(P.composite.exposure); E.look.halation = 0.14
S.g0 = { r: ${G}.uRadius.value, m: ${G}.uMaxRad.value, p: ${G}.uPower.value, t: ${G}.uThick.value }
S.info = { ev: +P.composite.exposure.toFixed(3), aoPow: ${A}.uPow.value, aoStr: ${A}.uStrength.value }; S.settle(20)` },
    { tag: 'A1-gtaoOFF', apply: `${A}.uHasGtao.value = 0; S.settle(20)` },
    { tag: 'A2-contactOFF', apply: `${A}.uHasGtao.value = 1; ${A}.uHasContact.value = 0; S.settle(20)` },
    { tag: 'A3-bothON', apply: `${A}.uHasContact.value = 1; S.settle(20)` },
    { tag: 'A4-tiny', apply: `${G}.uRadius.value = 0.35; ${G}.uMaxRad.value = 0.010; ${G}.uPower.value = 3.0; S.settle(20)` },
    { tag: 'A5-tinyThick0', apply: `${G}.uThick.value = 0.0; S.settle(20)` },
    { tag: 'A6-small', apply: `${G}.uRadius.value = 0.7; ${G}.uMaxRad.value = 0.018; ${G}.uThick.value = 0.05; ${G}.uPower.value = 3.2; S.settle(20)` },
    { tag: 'A7-smallStrong', apply: `${G}.uPower.value = 4.2; S.settle(20)` },
    { tag: 'A8-mid', apply: `${G}.uRadius.value = 1.1; ${G}.uMaxRad.value = 0.032; ${G}.uThick.value = 0.06; ${G}.uPower.value = 3.4; S.settle(20)` }
  ],
  analyze: (S) => S.info
}
