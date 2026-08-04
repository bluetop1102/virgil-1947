// 잔여 갭 귀속: 국소대비비 1.44 vs 판정 3.0 — 남은 몫이 필름 그레인인지 DOF 인지 가른다.
export default {
  cases: [
    { tag: 'R0-now', apply: 'S.settle(200); S.fixExposure(P.composite.exposure); S.info = { ev: +P.composite.exposure.toFixed(3) }; S.settle(20)' },
    { tag: 'R1-noGrain', apply: 'P.ctx.quality.grain = false; S.settle(16)' },
    { tag: 'R2-noGrainNoDof', apply: 'S.effOff("dof"); S.settle(20)' },
    { tag: 'R3-noDof', apply: 'P.ctx.quality.grain = true; S.settle(16)' },
    { tag: 'R4-back', apply: 'S.effOn("dof"); S.settle(20)' }
  ],
  analyze: (S) => S.info
}
