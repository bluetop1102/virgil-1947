const M = "S.moods['corridor-night']"
export default {
  cases: [{ tag: 'chk', png: false, apply: `S.settle(60)
S.info = { exposure: ${M}.exposure, env: ${M}.envIntensity, density: ${M}.fog.density, color: ${M}.fog.color,
  hemiI: ${M}.hemi.intensity, gtaoP: P.effects.gtao.mMarch.uniforms.uPower.value,
  ups: (() => { const a = []; E.scene.traverse(o => { if (o.isLight && /\\.up$/.test(o.name || '')) a.push(+o.intensity.toFixed(2)) }); return a })(),
  ev: +P.composite.exposure.toFixed(2), tris: E.renderer.info.render.triangles }` }],
  analyze: (S) => S.info
}
