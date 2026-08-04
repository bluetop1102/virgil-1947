// 라운드5 레버 탐색. 노출 고정.
// 판정: (1) 좌측 천장 줄무늬 가독 (2) 접촉부 (3) 근/원 국소대비 3:1
const M = "S.moods['corridor-night']"
const G = 'P.effects.gtao.mMarch.uniforms'
const PICK = `S.pick = S.pick || (() => {
  const up = [], fill = []
  E.scene.traverse(o => { if (o.isLight && /\\.up$/.test(o.name || '')) up.push(o); else if (o.isLight && /\\.fill$/.test(o.name || '')) fill.push(o) })
  return { up, fill }
})()`
// 플리커가 매 프레임 intensity 를 되쓴다 — 값을 얼려야 A/B 가 성립한다
const FREEZE = `S.freeze = S.freeze || ((l, v) => { let c = v; Object.defineProperty(l, 'intensity', { configurable: true, get: () => c, set: () => {} }) })`

export default {
  cases: [
    { tag: 'T0-base', apply: `S.settle(150); S.fixExposure(P.composite.exposure); ${PICK}; ${FREEZE}
S.fog0 = ${M}.fog.color.slice(); S.g0 = { r: ${G}.uRadius.value, p: ${G}.uPower.value }
S.upI = S.pick.up.map(l => l.intensity); S.fillI = S.pick.fill.map(l => l.intensity); S.fillD = S.pick.fill.map(l => l.distance)
S.info = { ev: +P.composite.exposure.toFixed(3), ups: S.upI, fills: S.fillI, fillDist: S.fillD, fog: S.fog0 }; S.settle(20)` },
    // 진단: 국소대비의 몇 %가 필름 그레인인가
    { tag: 'T1-noGrain', apply: 'P.ctx.quality.grain = false; S.settle(12)' },
    { tag: 'T2-grainBack', apply: 'P.ctx.quality.grain = true; S.settle(12)' },
    // L3 안개색 — 원경 베일 바닥
    { tag: 'T3-fog40', apply: `${M}.fog.color = S.fog0.map(v => v * 0.40); S.atmo.setMood('corridor-night'); S.settle(24)` },
    { tag: 'T4-fog18', apply: `${M}.fog.color = S.fog0.map(v => v * 0.18); S.atmo.setMood('corridor-night'); S.settle(24)` },
    // L2 벽등 fill 을 벽 웅덩이로 — 사거리 0.26 → 1.15, 세기 6배, 살짝 아래로
    { tag: 'T5-fog18+pool', apply: `${PICK}
for (const [i, l] of S.pick.fill.entries()) { l.distance = 1.15; l.position.y -= 0.10; S.freeze(l, S.fillI[i] * 7) }
S.settle(20)` },
    // L1 천장 스필 — 좌측 천장 대역
    { tag: 'T6-+up2.4', apply: `for (const [i, l] of S.pick.up.entries()) S.freeze(l, S.upI[i] * 2.4); S.settle(20)` },
    // L4 GTAO 월드 창을 좁혀 넓은 감광만 회수(접촉부는 화면반경이 잡는다)
    { tag: 'T7-+gtaoR0.5', apply: `${G}.uRadius.value = 0.5; S.settle(20)` },
    { tag: 'T8-+gtaoP3.0', apply: `${G}.uPower.value = 3.0; S.settle(20)` },
    { tag: 'T9-gtaoBack', apply: `${G}.uRadius.value = S.g0.r; ${G}.uPower.value = S.g0.p; S.settle(20)` }
  ],
  analyze: (S) => S.info
}
