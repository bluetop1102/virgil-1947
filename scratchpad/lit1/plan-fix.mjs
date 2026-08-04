// 수정안 후보 A/B. 누적식이라 각 단계의 증분이 그 레버의 기여다.
const G = 'P.effects.gtao.mMarch.uniforms'
const V = 'P.effects.volumetric.mMarch.uniforms'
const M = "S.moods['corridor-night']"

export default {
  cases: [
    { tag: 'X0-ship', apply: `S.settle(150); S.fixExposure(P.composite.exposure)
S.ups = []; E.scene.traverse(o => { if (/\\.up$/.test(o.name)) S.ups.push(o) })
S.upC = S.ups.map(o => o.color.clone())
S.upScale = (k) => { S.ups.forEach((o, i) => o.color.copy(S.upC[i]).multiplyScalar(k)); S.settle(8) }
S.info = { ev: +P.composite.exposure.toFixed(3) }; S.settle(20)` },
    { tag: 'X1-halo14', apply: 'E.look.halation = 0.14; S.settle(10)' },
    { tag: 'X2-up18', apply: 'S.upScale(1.8)' },
    { tag: 'X3-gtaoTight', apply: `${G}.uRadius.value = 0.9; ${G}.uMaxRad.value = 0.024; ${G}.uPower.value = 3.0; S.settle(20)` },
    { tag: 'X4-gtaoPow38', apply: `${G}.uPower.value = 3.8; S.settle(20)` },
    { tag: 'X5-gtaoMid', apply: `${G}.uRadius.value = 1.1; ${G}.uMaxRad.value = 0.038; ${G}.uPower.value = 3.2; S.settle(20)` },
    { tag: 'X6-fogQuad', apply: `${M}.fog.density = 0.135; ${M}.fog.albedo = 0.24; ${M}.fog.ambient = 0.012
S.atmo.setMood('corridor-night'); E.look.halation = 0.14
${V}.uExtinct.value = 0.135 * 1.1; ${V}.uScatter.value = 0.135 * 1.1 * 0.24; S.settle(24)` },
    { tag: 'X7-vol22', apply: 'E.look.volumetricIntensity = 0.22; S.settle(20)' },
    { tag: 'X8-den160', apply: `${M}.fog.density = 0.160; S.atmo.setMood('corridor-night'); E.look.halation = 0.14; E.look.volumetricIntensity = 0.22
${V}.uExtinct.value = 0.160 * 1.1; ${V}.uScatter.value = 0.160 * 1.1 * 0.24; S.settle(24)` }
  ],
  analyze: (S) => S.info
}
