// 최종 후보 수렴. 노출 고정.
// 핵심 가설: 원경은 안개색×노출이 만든 바닥에 고정돼 있고(표면 정보 없음),
// 근경은 안개를 거의 안 받는다 — 그래서 IBL/hemi 는 근경만 올리는 '사다리 레버'다.
const M = "S.moods['corridor-night']"
const G = 'P.effects.gtao.mMarch.uniforms'
const SET = "S.atmo.setMood('corridor-night'); S.settle(26)"
const PICK = `S.pick = S.pick || (() => { const up = []; E.scene.traverse(o => { if (o.isLight && /\\.up$/.test(o.name || '')) up.push(o) }); return { up } })()`
const FREEZE = `S.freeze = S.freeze || ((l, v) => { let c = v; Object.defineProperty(l, 'intensity', { configurable: true, get: () => c, set: () => {} }) })`

export default {
  cases: [
    { tag: 'W0-base', apply: `S.settle(150); S.fixExposure(P.composite.exposure); ${PICK}; ${FREEZE}
S.fog0 = ${M}.fog.color.slice(); S.env0 = ${M}.envIntensity; S.hemi0 = JSON.parse(JSON.stringify(${M}.hemi))
S.upI = S.pick.up.map(l => l.intensity); S.p0 = ${G}.uPower.value
S.info = { ev: +P.composite.exposure.toFixed(3), env: S.env0, hemi: S.hemi0 }; S.settle(20)` },
    { tag: 'W1-fog30', apply: `${M}.fog.color = S.fog0.map(v => v * 0.30); ${SET}` },
    { tag: 'W2-env062', apply: `${M}.envIntensity = 0.62; ${M}.hemi.intensity = 0.55; ${SET}` },
    { tag: 'W3-env085', apply: `${M}.envIntensity = 0.85; ${M}.hemi.intensity = 0.75; ${SET}` },
    { tag: 'W4-env062+up', apply: `${M}.envIntensity = 0.62; ${M}.hemi.intensity = 0.55; ${SET}
${PICK}; for (const [i, l] of S.pick.up.entries()) S.freeze(l, S.upI[i] * 2.35); S.settle(20)` },
    { tag: 'W5-+gtaoP4.2', apply: `${G}.uPower.value = 4.2; S.settle(20)` },
    { tag: 'W6-fog12', apply: `${G}.uPower.value = S.p0; ${M}.fog.color = S.fog0.map(v => v * 0.12); ${SET}` }
  ],
  analyze: (S) => S.info
}
