// DOF 반경 확정 검증. 먼지를 양쪽 다 숨겨야 그래디언트 비교가 성립한다(먼지가 고주파를 더한다).
const SETCOC = v => `for (const m of [P.effects.dof.mPrep, P.effects.dof.mGather, P.effects.dof.mComp]) m.uniforms.uMaxCoc.value = ${v}`
export default {
  cases: [
    { tag: 'K0-ship-coc3', apply: 'S.dustHide(true); S.settle(90); S.fixExposure(P.composite.exposure); S.info = { ev: P.composite.exposure, coc: P.effects.dof.mGather.uniforms.uMaxCoc.value }' },
    { tag: 'K1-coc6', apply: SETCOC(6), png: false },
    { tag: 'K2-dofOFF', apply: 'S.effOff("dof")', png: false }
  ],
  analyze: (S) => {
    const B = S.bufs
    const W = B['K0-ship-coc3'].w, H = B['K0-ship-coc3'].h
    const lum = t => { const b = B[t].buf, n = W * H, L = new Float32Array(n); for (let i = 0; i < n; i++) L[i] = 0.2126 * b[i * 3] + 0.7152 * b[i * 3 + 1] + 0.0722 * b[i * 3 + 2]; return L }
    const BOX = { ceilLamp: [1203, 243, 1459, 346], rightSconce: [1779, 371, 1920, 461], leftSconce: [954, 493, 1024, 544], midWall: [576, 512, 896, 794], nearWall: [320, 1024, 896, 1408], farEnd: [1216, 640, 1600, 896], cart: [1620, 1000, 1900, 1200] }
    const grad = (L, r) => { let s = 0, n = 0; for (let y = r[1]; y < r[3] - 1; y++) for (let x = r[0]; x < r[2] - 1; x++) { const i = y * W + x, dx = L[i + 1] - L[i], dy = L[i + W] - L[i]; s += dx * dx + dy * dy; n++ } return +Math.sqrt(s / n).toFixed(2) }
    const stat = (L, r) => { let s = 0, s2 = 0, n = 0; for (let y = r[1]; y < r[3]; y++) for (let x = r[0]; x < r[2]; x++) { const v = L[y * W + x]; s += v; s2 += v * v; n++ } const m = s / n; return { mean: +m.toFixed(1), sd: +Math.sqrt(Math.max(s2 / n - m * m, 0)).toFixed(1) } }
    const out = { info: S.info, grad: {}, boxes: {} }
    const ref = lum('K2-dofOFF')
    for (const t of Object.keys(B)) {
      const L = lum(t); out.grad[t] = {}; out.boxes[t] = {}
      for (const k in BOX) { out.grad[t][k] = { g: grad(L, BOX[k]), pct: +((grad(L, BOX[k]) / grad(ref, BOX[k])) * 100).toFixed(1) }; out.boxes[t][k] = stat(L, BOX[k]) }
    }
    out.farOverNear = +((out.boxes['K0-ship-coc3'].farEnd.mean / out.boxes['K0-ship-coc3'].nearWall.mean) * 100).toFixed(1)
    return out
  }
}
