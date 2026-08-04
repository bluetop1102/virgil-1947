// 라운드5 귀속. 원경 끝벽(83)이 근경 벽(26)보다 3배 밝다 — 무엇이 그것을 밝히는지 하나씩 끊는다.
// 노출 고정 필수. 안 하면 expo.measure 가 전부 되받아 올려 A/B 가 무효다.
const M = "S.moods['corridor-night']"

export default {
  cases: [
    { tag: 'A0-base', apply: `S.settle(150); S.fixExposure(P.composite.exposure)
S.f0 = JSON.parse(JSON.stringify(${M}.fog)); S.h0 = ${M}.look.halation
S.info = { ev: +P.composite.exposure.toFixed(3) }; S.settle(20)` },
    // scene.fog(FogExp2) 를 끊는다. 15m 에서 density 0.15 면 원경은 거의 안개색이어야 한다
    { tag: 'A1-noSceneFog', apply: 'S.fogKeep = E.scene.fog; E.scene.fog = null; E.scene.traverse(o => { if (o.material) { const m = Array.isArray(o.material) ? o.material : [o.material]; for (const mm of m) mm.needsUpdate = true } }); S.settle(24)' },
    { tag: 'A2-fogBack', apply: 'E.scene.fog = S.fogKeep; E.scene.traverse(o => { if (o.material) { const m = Array.isArray(o.material) ? o.material : [o.material]; for (const mm of m) mm.needsUpdate = true } }); S.settle(24)' },
    { tag: 'A3-noVol', apply: 'S.effOff("volumetric"); S.settle(20)' },
    { tag: 'A4-noVolNoBloom', apply: 'S.effOff("bloom"); S.settle(20)' },
    { tag: 'A5-noVolNoBloomNoHal', apply: 'P.ctx.look.halation = 0; S.settle(20)' },
    { tag: 'A6-plusNoDof', apply: 'S.effOff("dof"); S.settle(20)' },
    { tag: 'A7-plusNoSsr', apply: 'S.effOff("ssr"); S.settle(20)' },
    // 전부 되돌린 뒤 GTAO 만 끈다(접촉부 귀속)
    { tag: 'A8-restore', apply: 'S.effOn("dof"); S.effOn("ssr"); S.effOn("bloom"); S.effOn("volumetric"); P.ctx.look.halation = S.h0; S.settle(24)' },
    { tag: 'A9-noGtao', apply: 'S.effOff("gtao"); P.aoApply.uniforms.uHasGtao.value = 0; S.settle(20)' },
    { tag: 'AA-gtaoBack', apply: 'S.effOn("gtao"); P.aoApply.uniforms.uHasGtao.value = 1; S.settle(20)' }
  ],
  analyze: (S) => S.info
}
