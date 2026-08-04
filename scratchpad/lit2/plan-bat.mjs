// 반자틀 캐스트 섀도가 원리적으로 불가능한지 재검증한다(라운드4 결론의 재현).
// 기하 재계산: 천장등(z=-2.2)보다 카메라 쪽(z>-2.2)에 있는 반자틀 7개는 그림자를 카메라 쪽으로
// 던지고, 카메라가 가리는 대역은 반대편이다 — 원리상 보여야 한다. 안 보인다면 VSM 광누출이다.
const REBAKE = 'E.scene.traverse(o => { if (o.isLight && o.shadow) o.shadow.needsUpdate = true }); S.settle(8)'
const FIND = `S.bat = S.bat || (() => {
  const a = []
  E.scene.traverse(o => {
    if (!o.isMesh || !o.geometry) return
    o.geometry.computeBoundingBox()
    const b = o.geometry.boundingBox
    const sz = { x: b.max.x - b.min.x, y: b.max.y - b.min.y, z: b.max.z - b.min.z }
    const wp = o.getWorldPosition(new (o.position.constructor)())
    // 반자틀: 폭 2.7m 이상, 높이 6cm 이하, 천장(-496.95) 근처
    if (sz.x > 2.6 && sz.y < 0.07 && Math.abs(wp.y + b.max.y - (-496.95)) < 0.2) a.push(o)
  })
  return a
})()`
const UPS = `S.ups = S.ups || (() => { const a = []; E.scene.traverse(o => { if (o.isLight && /\\.up$/.test(o.name || '')) a.push(o) }); return a })()`

export default {
  cases: [
    { tag: 'V0-base', apply: `S.settle(150); S.fixExposure(P.composite.exposure); S.dustHide(true)
${FIND}; ${UPS}
S.info = { ev: +P.composite.exposure.toFixed(3), found: S.bat.length,
  bat: S.bat.map(m => ({ n: m.name || '(anon)', z: +m.getWorldPosition(new (m.position.constructor)()).z.toFixed(2), cast: m.castShadow })) }
S.settle(20)` },
    { tag: 'V1-cast', apply: `${FIND}; for (const m of S.bat) m.castShadow = true; ${REBAKE}; S.settle(16)` },
    { tag: 'V2-tightFar', apply: `${UPS}; S.up0 = S.ups.map(l => ({ far: l.shadow.camera.far, rad: l.shadow.radius, b: l.shadow.bias, nb: l.shadow.normalBias, ang: l.angle }))
for (const l of S.ups) { l.shadow.camera.far = 1.30; l.shadow.camera.near = 0.03; l.shadow.radius = 0.25; l.shadow.bias = -0.00006; l.shadow.normalBias = 0.0015; l.shadow.camera.updateProjectionMatrix() }
${REBAKE}; S.settle(16)` },
    { tag: 'V3-pcf', apply: `E.renderer.shadowMap.type = 1
E.scene.traverse(o => { if (o.material) { const a = Array.isArray(o.material) ? o.material : [o.material]; for (const m of a) m.needsUpdate = true } })
${REBAKE}; S.settle(20)` },
    { tag: 'V4-pcfNarrow', apply: 'for (const l of S.ups) l.angle = 1.10; ' + REBAKE + '; S.settle(16)' },
    { tag: 'V5-vsmTight', apply: `E.renderer.shadowMap.type = 3
E.scene.traverse(o => { if (o.material) { const a = Array.isArray(o.material) ? o.material : [o.material]; for (const m of a) m.needsUpdate = true } })
${REBAKE}; S.settle(20)` },
    { tag: 'V6-restore', apply: `for (const [i, l] of S.ups.entries()) { l.shadow.camera.far = S.up0[i].far; l.shadow.radius = S.up0[i].rad; l.shadow.bias = S.up0[i].b; l.shadow.normalBias = S.up0[i].nb; l.angle = S.up0[i].ang; l.shadow.camera.updateProjectionMatrix() }
for (const m of S.bat) m.castShadow = false; ${REBAKE}; S.dustHide(false); S.settle(20)` }
  ],
  analyze: (S) => S.info
}
