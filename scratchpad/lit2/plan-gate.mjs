// 게이트 회복. 노출을 **풀어 둔다** — dark% 판정은 자동노출 수렴 후의 배달 프레임에서만 유효하다.
// 어두워진 곳은 좌측 천장 대역이다(8x6 격자 row0 col0-2: 1.6/7.7/12.3 → 14.0/14.9/14.2).
// 천장은 법선이 아래를 보므로 HemisphereLight 의 **ground** 색을 받는다 — 벽·바닥을 거의
// 안 건드리고 천장만 올리는 레버다(카펫 바운스라는 물리 근거도 그대로 맞다).
const M = "S.moods['corridor-night']"
const SET = "S.atmo.setMood('corridor-night'); S.settle(90)"
const PICK = `S.pick = S.pick || (() => { const up = []; E.scene.traverse(o => { if (o.isLight && /\\.up$/.test(o.name || '')) up.push(o) }); return { up } })()`
const FREEZE = `S.freeze = S.freeze || ((l, v) => { let c = v; Object.defineProperty(l, 'intensity', { configurable: true, get: () => c, set: () => {} }) })`

export default {
  cases: [
    { tag: 'X0-now', apply: `S.settle(240); ${PICK}; ${FREEZE}
S.g0 = ${M}.hemi.ground.slice(); S.upI = S.pick.up.map(l => l.intensity); S.e0 = ${M}.exposure
S.info = { ev: +P.composite.exposure.toFixed(3), ground: S.g0, exposure: S.e0 }; S.settle(30)` },
    { tag: 'X1-ground25', apply: `${M}.hemi.ground = [0.020, 0.017, 0.015]; ${SET}` },
    { tag: 'X2-ground40', apply: `${M}.hemi.ground = [0.032, 0.027, 0.023]; ${SET}` },
    { tag: 'X3-g25+up144', apply: `${M}.hemi.ground = [0.020, 0.017, 0.015]; ${SET}
${PICK}; for (const [i, l] of S.pick.up.entries()) S.freeze(l, S.upI[i] * 1.44); S.settle(90)` },
    { tag: 'X4-+expo068', apply: `${M}.exposure = 0.68; ${SET}` }
  ],
  analyze: (S) => S.info
}
