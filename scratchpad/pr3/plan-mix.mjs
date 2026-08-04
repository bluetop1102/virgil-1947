// R3 조합 스윕: 셸(광원별 광축)을 켜는 대신 볼류메트릭 인스캐터를 낮춰 총 산란 예산을 유지한다.
// 셸은 fixture 마다 sqrt(cd/25) 로 세기가 붙어 "광원별 산란 세기 차"를 만들고 fbm/VSM 으로
// 내부 구조가 있다. 볼류메트릭은 가장 가까운 벽등 하나만 지배해 그 차이를 만들지 못한다.
const M = "S.moods['corridor-night']"
const set = (s, v) => `${M}.shaftScale = ${s}; E.look.volumetricIntensity = ${v}; S.settle(70)`
export default {
  cases: [
    { tag: 'E0-ship', apply: `S.dustHide(true); S.settle(120); S.fixExposure(P.composite.exposure); S.info = { ev: +P.composite.exposure.toFixed(3), vol0: E.look.volumetricIntensity }` },
    { tag: 'E1-s045-v045', apply: set(0.45, 0.45) },
    { tag: 'E2-s065-v038', apply: set(0.65, 0.38) },
    { tag: 'E3-s085-v030', apply: set(0.85, 0.30) },
    { tag: 'E4-s065-v030', apply: set(0.65, 0.30) },
    { tag: 'E5-free-e2', apply: `${M}.shaftScale = 0.65; E.look.volumetricIntensity = 0.38; S.freeExposure(); S.settle(160); S.info.evE2 = +P.composite.exposure.toFixed(3)` }
  ],
  analyze: (S) => {
    const B = S.bufs
    const W = B['E0-ship'].w, H = B['E0-ship'].h
    const lum = t => { const b = B[t].buf, n = W * H, L = new Float32Array(n); for (let i = 0; i < n; i++) L[i] = 0.2126 * b[i * 3] + 0.7152 * b[i * 3 + 1] + 0.0722 * b[i * 3 + 2]; return L }
    const BOX = {
      shaftCore: [1390, 600, 1620, 920],
      ceilBeamR: [1150, 340, 1500, 620],
      shaftOut: [700, 580, 1000, 950],
      leftNearWall: [90, 140, 700, 760],
      nearWallL: [200, 900, 800, 1400],
      carpet: [900, 1160, 1650, 1400],
      farEnd: [1100, 560, 1580, 880],
      damaskMid: [1660, 430, 1830, 720]
    }
    const stat = (L, r) => { let s = 0, s2 = 0, n = 0; for (let y = r[1]; y < r[3]; y++) for (let x = r[0]; x < r[2]; x++) { const v = L[y * W + x]; s += v; s2 += v * v; n++ } const m = s / n; return { m: +m.toFixed(1), sd: +Math.sqrt(Math.max(s2 / n - m * m, 0)).toFixed(1) } }
    // 상인방 계단 끊김: 세로 프로파일의 행간 최대 점프
    const step = (L) => { let mx = 0, at = 0, prev = 0; for (let y = 360; y < 580; y++) { let s = 0; for (let x = 1150; x < 1500; x++) s += L[y * W + x]; const m = s / 350; if (y > 360 && Math.abs(m - prev) > mx) { mx = Math.abs(m - prev); at = y } prev = m } return { jump: +mx.toFixed(2), y: at } }
    const out = { info: S.info, box: {}, frame: {}, step: {} }
    for (const t of Object.keys(B)) {
      const L = lum(t); out.box[t] = {}
      for (const k in BOX) out.box[t][k] = stat(L, BOX[k])
      out.step[t] = step(L)
      let s = 0; const hist = new Uint32Array(256)
      for (let i = 0; i < L.length; i++) { s += L[i]; hist[Math.min(255, L[i] | 0)]++ }
      let c = 0, p50 = 0, p99 = 0
      for (let i = 0; i < 256; i++) { c += hist[i]; if (!p50 && c >= L.length * 0.5) p50 = i; if (!p99 && c >= L.length * 0.99) p99 = i }
      out.frame[t] = {
        mean: +(s / L.length).toFixed(1), p50, p99,
        darkPct: +((hist.slice(0, 7).reduce((a, b) => a + b, 0) / L.length) * 100).toFixed(2),
        whitePct: +((hist.slice(250).reduce((a, b) => a + b, 0) / L.length) * 100).toFixed(3),
        farOverNear: +((out.box[t].farEnd.m / out.box[t].nearWallL.m) * 100).toFixed(1)
      }
    }
    return out
  }
}
