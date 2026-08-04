// 현행 빌드에서의 귀속 검증. 다른 에이전트가 같은 라운드에 씬을 바꾸고 있어
// 예전 런의 기준선은 더 이상 같은 씬이 아니다 — 되돌리기 A/B 로 내 몫만 잰다.
const G = 'P.effects.gtao.mMarch.uniforms'
const M = "S.moods['corridor-night']"
const SET = "S.atmo.setMood('corridor-night'); S.settle(24)"

export default {
  cases: [
    { tag: 'V0-mine', apply: `S.settle(150); S.fixExposure(P.composite.exposure)
S.f0 = JSON.parse(JSON.stringify(${M}.fog)); S.h0 = ${M}.look.halation; S.v0 = ${M}.look.volumetricIntensity
S.g0 = { r: ${G}.uRadius.value, m: ${G}.uMaxRad.value, p: ${G}.uPower.value, t: ${G}.uThick.value }
S.info = { ev: +P.composite.exposure.toFixed(3), fog: S.f0, halation: S.h0, volI: S.v0, gtao: S.g0 }; S.settle(20)` },
    { tag: 'V1-oldFog', apply: `Object.assign(${M}.fog, { density: 0.105, albedo: 0.42, ambient: 0.030, extinctK: 2.4 })
${M}.look.volumetricIntensity = 0.30; ${M}.look.halation = 0.24; ${SET}` },
    { tag: 'V2-mineFog', apply: `Object.assign(${M}.fog, S.f0); ${M}.look.volumetricIntensity = S.v0; ${M}.look.halation = S.h0; ${SET}` },
    { tag: 'V3-oldGtao', apply: `${G}.uRadius.value = 1.5; ${G}.uMaxRad.value = 0.055; ${G}.uPower.value = 2.4; ${G}.uThick.value = 0.12; S.settle(20)` },
    { tag: 'V4-mineGtao', apply: `${G}.uRadius.value = S.g0.r; ${G}.uMaxRad.value = S.g0.m; ${G}.uPower.value = S.g0.p; ${G}.uThick.value = S.g0.t; S.settle(20)` },
    // 원경 벽을 실제로 밝히는 항이 무엇인지: scene.fog / 볼류메트릭 인스캐터를 각각 끊는다
    { tag: 'V5-noSceneFog', apply: 'S.fogKeep = E.scene.fog; E.scene.fog = null; E.scene.traverse(o => { if (o.material) { const m = Array.isArray(o.material) ? o.material : [o.material]; for (const mm of m) mm.needsUpdate = true } }); S.settle(20)' },
    { tag: 'V6-noVol', apply: 'E.scene.fog = S.fogKeep; S.settle(6); S.effOff("volumetric"); S.settle(20)' },
    { tag: 'V7-back', apply: 'S.effOn("volumetric"); S.settle(20)' }
  ],
  analyze: (S) => S.info
}
