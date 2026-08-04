// raw(이펙트 6개 제거 + 헐레이션 0)에서도 남는 우윳빛 베일과 하드 원뿔의 출처를 가른다.
export default {
  cases: [
    {
      tag: '1-ship',
      apply: `S.fixExposure(P.composite.exposure)
        S.cones = []; S.dumps = []
        E.scene.traverse(o => {
          if (!o.isMesh || !o.material) return
          const g = o.geometry, m = o.material
          const add = m.blending === 2 || m.blending === 1 && m.transparent
          if (g && g.type === 'ConeGeometry') { S.cones.push(o); S.dumps.push({ kind: 'cone', name: o.name, mat: m.type, blending: m.blending, uni: m.uniforms ? Object.keys(m.uniforms).join(',') : null }) }
          else if (m.transparent && add) S.dumps.push({ kind: 'add', name: o.name, geo: g && g.type, mat: m.type })
        })
        S.info = { cones: S.cones.length, dumps: S.dumps.slice(0, 24), fog: E.scene.fog ? { type: E.scene.fog.type || (E.scene.fog.isFogExp2 ? 'exp2' : 'lin'), density: E.scene.fog.density, color: E.scene.fog.color.toArray() } : null,
          look: { vol: P.ctx.look.volumetricIntensity, hal: P.ctx.look.halation, exposure: P.ctx.look.exposure } }`
    },
    { tag: '2-noCone', apply: 'for (const o of S.cones) o.visible = false' },
    { tag: '3-noCone-noDust', apply: 'S.dustHide(true)' },
    { tag: '4-noCone-raw', apply: 'P.ctx.look.halation = 0; for (const n of ["gtao","ssr","volumetric","bloom","dof","motionblur"]) S.effOff(n)' },
    { tag: '5-cone-raw', apply: 'for (const o of S.cones) o.visible = true' }
  ],

  analyze: (S) => {
    const B = S.bufs
    const W = B['1-ship'].w, H = B['1-ship'].h
    const lum = t => {
      const b = B[t].buf, n = W * H, L = new Float32Array(n)
      for (let i = 0; i < n; i++) L[i] = 0.2126 * b[i * 3] + 0.7152 * b[i * 3 + 1] + 0.0722 * b[i * 3 + 2]
      return L
    }
    const BOX = {
      coneMid: [1150, 400, 1500, 800],
      leftWallHi: [100, 200, 700, 600],
      leftWallLo: [100, 850, 700, 1250],
      ceilDark: [1400, 40, 2000, 180],
      farEnd: [1050, 350, 1350, 700],
      rightSconce: [1700, 330, 1950, 500]
    }
    const stat = (L, r) => {
      let s = 0, s2 = 0, n = 0, mn = 255
      for (let y = r[1]; y < r[3]; y++) for (let x = r[0]; x < r[2]; x++) {
        const v = L[y * W + x]; s += v; s2 += v * v; n++; if (v < mn) mn = v
      }
      const m = s / n
      return { mean: +m.toFixed(1), sd: +Math.sqrt(Math.max(s2 / n - m * m, 0)).toFixed(1), min: +mn.toFixed(0) }
    }
    const out = { info: S.info, boxes: {} }
    for (const t of Object.keys(B)) {
      const L = lum(t)
      out.boxes[t] = {}
      for (const k in BOX) out.boxes[t][k] = stat(L, BOX[k])
    }
    return out
  }
}
