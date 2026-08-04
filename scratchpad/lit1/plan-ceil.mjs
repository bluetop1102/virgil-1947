// 천장 A/B 2차. 1차에서 up.intensity 직접 대입이 무효였다 — atmosphere.update 의 플리커가
// 매 프레임 upBase*k 로 되돌려 쓴다. color 는 생성 후 아무도 안 건드리므로 그쪽으로 흔든다.
const CASTON = `
if (!S.batt) { S.batt = []; E.scene.traverse(o => { if (o.isMesh && o.geometry) { o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox
  if (b.max.y > 2.9 && b.max.y < 3.2 && (b.max.y - b.min.y) < 0.09 && (b.max.x - b.min.x) > 2.4) S.batt.push(o) } }) }
for (const o of S.batt) o.castShadow = true
S.shadowRefresh()`

export default {
  cases: [
    { tag: 'F0-base', apply: `S.settle(150); S.fixExposure(P.composite.exposure); E.look.halation = 0
S.shadowRefresh = () => { E.scene.traverse(o => { if (o.isLight && o.shadow) o.shadow.needsUpdate = true }); S.settle(4) }
S.ups = []; E.scene.traverse(o => { if (/\\.up$/.test(o.name)) S.ups.push(o) })
S.upC = S.ups.map(o => o.color.clone())
S.upScale = (k) => { S.ups.forEach((o, i) => o.color.copy(S.upC[i]).multiplyScalar(k)); S.settle(8) }
S.info = { ev: +P.composite.exposure.toFixed(3), ups: S.ups.map(o => +o.intensity.toFixed(2)) }
S.settle(20)` },
    { tag: 'F1-upOFF', apply: 'S.upScale(0)' },
    { tag: 'F2-upON', apply: 'S.upScale(1)' },
    { tag: 'F3-up3x', apply: 'S.upScale(3)' },
    { tag: 'F4-up3x-cast', apply: CASTON },
    { tag: 'F5-up3x-cast-tight', apply: 'for (const o of S.ups) { o.shadow.radius = 0.35; o.shadow.bias = -0.00008; o.shadow.normalBias = 0.002 } S.shadowRefresh()' },
    { tag: 'F6-up3x-nocast-tight', apply: 'for (const o of S.batt) o.castShadow = false; S.shadowRefresh()' },
    { tag: 'F7-up6x-cast', apply: 'for (const o of S.batt) o.castShadow = true; S.shadowRefresh(); S.upScale(6)' },
    // 주광(벽등 스포트) 하나를 천장 쪽으로 돌려도 되는지: 천장 밝기의 출처를 가른다
    { tag: 'F8-mainOFF', apply: `S.upScale(3); S.mains = []; E.scene.traverse(o => { if (o.isSpotLight && !/\\.up$/.test(o.name)) S.mains.push(o) })
S.mainC = S.mains.map(o => o.color.clone()); S.mains.forEach((o, i) => o.color.setRGB(0, 0, 0)); S.settle(8)` },
    { tag: 'F9-restore', apply: 'S.mains.forEach((o, i) => o.color.copy(S.mainC[i])); S.upScale(1); S.settle(8)' }
  ],
  analyze: (S) => S.info
}
