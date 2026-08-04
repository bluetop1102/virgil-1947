// R3 광축 내부 구조 스윕. 인스캐터 단독 델타(ship - volOFF)의 박스 내 sd/mean 으로
// "매끈한 원뿔"인지 "밀도 얼룩이 있는 산란"인지를 잰다. 배경은 전 케이스 동일하므로
// volOFF 한 장을 공통 기준으로 쓴다.
const U = 'P.effects.volumetric.mMarch.uniforms'
const V = 'P.effects.volumetric'
export default {
  cases: [
    {
      tag: 'B0-ship',
      apply: `
        S.dustHide(true); S.settle(120); S.fixExposure(P.composite.exposure);
        S.keep = { scatter: ${U}.uScatter.value, nScale: ${U}.uNScale.value, maxLights: ${V}.maxLights };
        const cam = E.camera.position;
        S.info = {
          ev: +P.composite.exposure.toFixed(3), steps: ${V}.steps, maxLights: ${V}.maxLights,
          fogY: ${U}.uFogY.value, fogFall: ${U}.uFogFall.value, nScale: ${U}.uNScale.value,
          marched: ${V}.lights.map(l => ({
            n: l.obj.name || l.obj.type, t: l.type, sh: l.shadowIdx,
            i: +l.obj.intensity.toFixed(1),
            d: +l.obj.getWorldPosition(new l.obj.position.constructor()).distanceTo(cam).toFixed(2)
          })),
          allLights: (() => { const a = []; E.scene.traverse(o => { if (o.isLight && o.visible && !o.isAmbientLight && !o.isHemisphereLight) a.push({ n: o.name || o.type, i: +(o.intensity ?? 0).toFixed(1), d: +o.getWorldPosition(new o.position.constructor()).distanceTo(cam).toFixed(2), sp: !!o.isSpotLight }) }); a.sort((x, y) => x.d - y.d); return a.slice(0, 14) })(),
          shells: (() => { const a = []; E.scene.traverse(o => { const u = o.material && o.material.uniforms; if (u && u.uIntensity) a.push({ n: o.name || o.type, v: u.uIntensity.value }) }); return a })()
        }`
    },
    { tag: 'Bref-volOFF', apply: `${U}.uScatter.value = 0`, png: false },
    { tag: 'B1-n035', apply: `${U}.uScatter.value = S.keep.scatter; ${U}.uNScale.value = 0.35` },
    { tag: 'B2-n080', apply: `${U}.uNScale.value = 0.80` },
    { tag: 'B3-n160', apply: `${U}.uNScale.value = 1.60` },
    { tag: 'B4-n080-L6', apply: `${U}.uNScale.value = 0.80; ${V}.maxLights = 6; ${V}.lights = ${V}._collect(P.ctx); ${V}._build(P.ctx, ${V}.lights); ${V}._upload(${V}.lights)` },
    { tag: 'B5-restore', apply: `${U}.uNScale.value = S.keep.nScale; ${V}.maxLights = S.keep.maxLights`, png: false }
  ],
  analyze: (S) => {
    const B = S.bufs
    const W = B['B0-ship'].w
    const lum = t => { const b = B[t].buf, n = W * B[t].h, L = new Float32Array(n); for (let i = 0; i < n; i++) L[i] = 0.2126 * b[i * 3] + 0.7152 * b[i * 3 + 1] + 0.0722 * b[i * 3 + 2]; return L }
    const BOX = {
      shaftCore: [1390, 600, 1620, 920],
      shaftEdge: [1180, 640, 1370, 960],
      shaftOut: [700, 580, 1000, 950],
      ceilBeam: [1150, 340, 1500, 560],
      farEnd: [1100, 560, 1580, 880],
      nearWallL: [200, 900, 800, 1400],
      lintel: [1050, 450, 1750, 950]
    }
    const ref = lum('Bref-volOFF')
    const stat = (L, r) => { let s = 0, s2 = 0, n = 0; for (let y = r[1]; y < r[3]; y++) for (let x = r[0]; x < r[2]; x++) { const v = L[y * W + x]; s += v; s2 += v * v; n++ } const m = s / n; return { m: +m.toFixed(2), sd: +Math.sqrt(Math.max(s2 / n - m * m, 0)).toFixed(2) } }
    const delta = t => { const L = lum(t), n = L.length, D = new Float32Array(n); for (let i = 0; i < n; i++) D[i] = L[i] - ref[i]; return D }
    const out = { info: S.info, dstat: {}, ratio: {} }
    for (const t of Object.keys(B)) {
      if (t === 'Bref-volOFF') continue
      const D = delta(t); out.dstat[t] = {}; out.ratio[t] = {}
      for (const k in BOX) { const s = stat(D, BOX[k]); out.dstat[t][k] = s; out.ratio[t][k] = +(s.sd / Math.max(Math.abs(s.m), 0.5)).toFixed(2) }
    }
    return out
  }
}
