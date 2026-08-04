// R3 진단: 심사자가 지목한 증상의 원인 귀속.
//  (1) 오른쪽 3분의 1(x>2100) 뭉갬 = DOF 인가 안개인가
//  (2) 근경 베일 = 볼류메트릭 인스캐터인가 scene.fog(FogExp2)인가
//  (3) 광축 내부 밀도차 / 광축 밖 베일
const U = 'P.effects.volumetric.mMarch.uniforms'
export default {
  cases: [
    {
      tag: 'A0-ship',
      apply: `
        S.dustHide(true); S.settle(120); S.fixExposure(P.composite.exposure);
        S.keep = { scatter: ${U}.uScatter.value, fog: E.scene.fog };
        S.info = {
          ev: +P.composite.exposure.toFixed(3),
          dof: { focusFixed: P.effects.dof.mComp.uniforms.uFocusFixed.value,
                 fstop: P.effects.dof.mComp.uniforms.uFstop.value,
                 maxCoc: P.effects.dof.mComp.uniforms.uMaxCoc.value,
                 near: P.effects.dof.mComp.uniforms.uNear.value },
          vol: { scatter: ${U}.uScatter.value, extinct: ${U}.uExtinct.value,
                 maxDist: ${U}.uMaxDist.value,
                 nearFade: [${U}.uNearFade.value.x, ${U}.uNearFade.value.y],
                 beam: ${U}.uBeam.value, rim: ${U}.uRim.value, g: ${U}.uG.value,
                 ambient: ${U}.uAmbient.value, nScale: ${U}.uNScale.value },
          sceneFog: E.scene.fog ? { d: E.scene.fog.density, c: E.scene.fog.color.getHexString() } : null,
          cam: E.camera.position.toArray().map(v => +v.toFixed(2))
        }`
    },
    { tag: 'A1-dofOFF', apply: 'S.effOff("dof")' },
    { tag: 'A2-volOFF', apply: `S.effOn("dof"); ${U}.uScatter.value = 0` },
    { tag: 'A3-volOFF-fogOFF', apply: 'E.scene.fog = null' },
    { tag: 'A4-volON-fogOFF', apply: `${U}.uScatter.value = S.keep.scatter` },
    { tag: 'A5-restore', apply: 'E.scene.fog = S.keep.fog', png: false }
  ],
  analyze: (S) => {
    const B = S.bufs
    const W = B['A0-ship'].w
    const lum = t => { const b = B[t].buf, n = W * B[t].h, L = new Float32Array(n); for (let i = 0; i < n; i++) L[i] = 0.2126 * b[i * 3] + 0.7152 * b[i * 3 + 1] + 0.0722 * b[i * 3 + 2]; return L }
    const BOX = {
      rightFore: [2100, 300, 2540, 1150],
      rightFrame: [2150, 330, 2420, 900],
      leftNearWall: [90, 140, 700, 760],
      ceilDome: [1250, 225, 1470, 350],
      rightSconce: [1770, 360, 1970, 480],
      shaft: [1360, 580, 1660, 950],
      shaftOut: [700, 580, 1000, 950],
      midDoor: [820, 480, 1010, 900],
      damaskMid: [1660, 430, 1830, 720],
      carpet: [900, 1160, 1650, 1400],
      farEnd: [1100, 560, 1580, 880],
      nearWallL: [200, 900, 800, 1400],
      cart: [1580, 960, 1930, 1400]
    }
    const grad = (L, r) => { let s = 0, n = 0; for (let y = r[1]; y < r[3] - 1; y++) for (let x = r[0]; x < r[2] - 1; x++) { const i = y * W + x, dx = L[i + 1] - L[i], dy = L[i + W] - L[i]; s += dx * dx + dy * dy; n++ } return +Math.sqrt(s / n).toFixed(2) }
    const stat = (L, r) => { let s = 0, s2 = 0, n = 0; for (let y = r[1]; y < r[3]; y++) for (let x = r[0]; x < r[2]; x++) { const v = L[y * W + x]; s += v; s2 += v * v; n++ } const m = s / n; return { m: +m.toFixed(1), sd: +Math.sqrt(Math.max(s2 / n - m * m, 0)).toFixed(1) } }
    const out = { info: S.info, grad: {}, box: {} }
    for (const t of Object.keys(B)) {
      const L = lum(t); out.grad[t] = {}; out.box[t] = {}
      for (const k in BOX) { out.grad[t][k] = grad(L, BOX[k]); out.box[t][k] = stat(L, BOX[k]) }
    }
    return out
  }
}
