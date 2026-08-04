// 반자틀 그림자 줄무늬가 원리적으로 가능한지 가른다.
// 가설 A: 반자틀 cast:false 라서 (라운드4 는 아니라고 했다 — 재검증)
// 가설 B: VSM 광누출(occluder-receiver 거리 5cm) 이라 캐스터를 켜도 그림자가 안 나온다
// 가설 C: up 광원이 천장에서 너무 멀어(0.45~0.85m) 스침각이 안 나온다
const BAT = `S.bat = S.bat || (() => { const a = []; E.scene.traverse(o => { if (o.isMesh && o.name && /batten|반자/i.test(o.name)) a.push(o) }); return a })()`
const UPS = `S.ups = S.ups || (() => { const a = []; E.scene.traverse(o => { if (o.isLight && /\\.up$/.test(o.name || '')) a.push(o) }); return a })()`
const REBAKE = 'E.scene.traverse(o => { if (o.isLight && o.shadow) o.shadow.needsUpdate = true }); S.settle(6)'

export default {
  cases: [
    { tag: 'C0-base', apply: `S.settle(150); S.fixExposure(P.composite.exposure); S.dustHide(true)
${BAT}; ${UPS}
S.info = { ev: +P.composite.exposure.toFixed(3), battens: S.bat.length, batCast: S.bat.map(m => m.castShadow),
  ups: S.ups.map(l => ({ n: l.name, y: +l.position.y.toFixed(2), tz: +l.target.position.z.toFixed(2), ty: +l.target.position.y.toFixed(2),
    ang: +l.angle.toFixed(2), pen: +l.penumbra.toFixed(2), cast: l.castShadow, i: +l.intensity.toFixed(2),
    map: l.shadow.mapSize.x, far: +l.shadow.camera.far.toFixed(2), rad: l.shadow.radius, bias: l.shadow.bias, nb: l.shadow.normalBias })),
  meshTotal: (() => { let n = 0; E.scene.traverse(o => { if (o.isMesh && o.castShadow) n++ }); return n })() }
S.settle(20)` },
    { tag: 'C1-batCast', apply: `${BAT}; for (const m of S.bat) m.castShadow = true; ${REBAKE}; S.settle(20)` },
    { tag: 'C2-pcf', apply: `E.renderer.shadowMap.type = 2 /* PCFSoftShadowMap */
E.scene.traverse(o => { if (o.material) { const a = Array.isArray(o.material) ? o.material : [o.material]; for (const m of a) m.needsUpdate = true } })
${REBAKE}; S.settle(24)` },
    { tag: 'C3-pcfHiUp', apply: `${UPS}; S.upSave = S.ups.map(l => ({ y: l.position.y, ang: l.angle, pen: l.penumbra, i: l.intensity }))
for (const l of S.ups) { l.position.y = 2.90; l.angle = 1.05; l.penumbra = 0.55; l.intensity *= 1.6 }
${REBAKE}; S.settle(24)` },
    { tag: 'C4-vsmHiUp', apply: `E.renderer.shadowMap.type = 3 /* VSM */
E.scene.traverse(o => { if (o.material) { const a = Array.isArray(o.material) ? o.material : [o.material]; for (const m of a) m.needsUpdate = true } })
${REBAKE}; S.settle(24)` },
    { tag: 'C5-vsmHiUpTight', apply: `for (const l of S.ups) { l.shadow.radius = 0.15; l.shadow.blurSamples = 4; l.shadow.bias = -0.00005; l.shadow.normalBias = 0.001; l.shadow.camera.far = 1.6; l.shadow.camera.updateProjectionMatrix() }
${REBAKE}; S.settle(24)` },
    { tag: 'C6-restore', apply: `for (const [i, l] of S.ups.entries()) { l.position.y = S.upSave[i].y; l.angle = S.upSave[i].ang; l.penumbra = S.upSave[i].pen; l.intensity = S.upSave[i].i }
for (const m of S.bat) m.castShadow = false; ${REBAKE}; S.dustHide(false); S.settle(24)` }
  ],
  analyze: (S) => S.info
}
