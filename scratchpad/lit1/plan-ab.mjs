// 라운드 A/B. 결함 3건을 각각 격리해 레버 하나씩만 흔든다.
// 광원 주변 판정은 헐레이션 오염을 먼저 끈다(PIPELINE-CORE 직속이라 --off 가 안 닿는다).
// composite 는 매 프레임 look.halation 을 uniform 에 다시 쓴다 — uniform 직접 대입은 1프레임 만에 되돌아온다
const HALO0 = 'E.look.halation = 0; P.composite.mat.uniforms.uHalation.value = 0; S.settle(6)'
const CASTON = `
if (!S.batt) { S.batt = []; E.scene.traverse(o => { if (o.isMesh && o.geometry) { o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox
  if (b.max.y > 2.9 && b.max.y < 3.2 && (b.max.y - b.min.y) < 0.09 && (b.max.x - b.min.x) > 2.4) S.batt.push(o) } }) }
for (const o of S.batt) o.castShadow = true
S.shadowRefresh()`
const CASTOFF = 'for (const o of (S.batt || [])) o.castShadow = false; S.shadowRefresh()'
const G = 'P.effects.gtao.mMarch.uniforms'

export default {
  cases: [
    // --- 기준선 ---
    { tag: 'C0-ship', apply: `S.settle(150); S.fixExposure(P.composite.exposure)
S.shadowRefresh = () => { E.scene.traverse(o => { if (o.isLight && o.shadow) o.shadow.needsUpdate = true }); S.settle(4) }
S.g0 = { r: ${G}.uRadius.value, m: ${G}.uMaxRad.value, p: ${G}.uPower.value, t: ${G}.uThick.value }
S.ups = []; E.scene.traverse(o => { if (/\\.up$/.test(o.name)) S.ups.push(o) })
S.upI = S.ups.map(o => o.intensity)
S.info = { ev: +P.composite.exposure.toFixed(3), gtao: S.g0, ups: S.ups.length }` },
    { tag: 'C1-halo0', apply: HALO0 },

    // --- G4 천장 반자틀 그림자 ---
    { tag: 'C2-cast', apply: CASTON },
    { tag: 'C3-castTight', apply: 'for (const o of S.ups) { o.shadow.radius = 0.5; o.shadow.bias = -0.00012; o.shadow.normalBias = 0.003 } S.shadowRefresh()' },
    { tag: 'C4-castTightUp2', apply: 'S.ups.forEach((o, i) => { o.intensity = S.upI[i] * 2.4 }); S.settle(6)' },
    { tag: 'C5-noCastUp2', apply: CASTOFF },
    { tag: 'C6-castBack', apply: `S.ups.forEach((o, i) => { o.intensity = S.upI[i] }); ${CASTON}` },

    // --- GTAO 접촉부 ---
    { tag: 'D1-gtaoR3', apply: `${G}.uRadius.value = 3.0; S.settle(20)` },
    { tag: 'D2-gtaoR3M13', apply: `${G}.uMaxRad.value = 0.13; S.settle(20)` },
    { tag: 'D3-gtaoPow34', apply: `${G}.uPower.value = 3.4; S.settle(20)` },
    { tag: 'D4-gtaoThick', apply: `${G}.uThick.value = 0.30; S.settle(20)` },
    { tag: 'D5-gtaoBack', apply: `${G}.uRadius.value = S.g0.r; ${G}.uMaxRad.value = S.g0.m; ${G}.uPower.value = S.g0.p; ${G}.uThick.value = S.g0.t; S.settle(20)` },

    // --- G2 거리 안개 ---
    { tag: 'E1-alb20', apply: "S.moods['corridor-night'].fog.albedo = 0.20; S.moods['corridor-night'].fog.ambient = 0.010; S.atmo.setMood('corridor-night'); E.look.halation = 0; S.settle(20)" },
    { tag: 'E2-den135', apply: "S.moods['corridor-night'].fog.density = 0.135; S.atmo.setMood('corridor-night'); E.look.halation = 0; S.settle(20)" },
    { tag: 'E3-vol15', apply: 'E.look.volumetricIntensity = 0.15; S.settle(20)' },
    { tag: 'E4-den170', apply: "S.moods['corridor-night'].fog.density = 0.170; S.atmo.setMood('corridor-night'); E.look.halation = 0; S.settle(20)" }
  ],
  analyze: (S) => S.info
}
