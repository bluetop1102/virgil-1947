// 화면 픽셀 → 레이캐스트 → 맞은 메시·재질 보고. "이 계단의 양쪽이 무엇인가"를 이름으로 답한다.
//   node scratchpad/r6/pick.mjs <shot> <x,y> <x,y> ...      (2560x1440 좌표)
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const [SHOT, ...PTS] = process.argv.slice(2)
const PORT = Number(process.env.SHOT_PORT || 5957)
const srv = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { stdio: 'ignore', env: { ...process.env, SHOT: '1' } })
process.on('exit', () => { try { srv.kill('SIGKILL') } catch {} })
for (let i = 0; i < 120; i++) { try { if ((await fetch(`http://localhost:${PORT}/`)).ok) break } catch {} await sleep(250) }

const br = await chromium.launch({ headless: true, args: ['--use-angle=metal', '--ignore-gpu-blocklist'] })
const pg = await br.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 })
pg.setDefaultTimeout(240000)
await pg.goto(`http://localhost:${PORT}/?qa=1`, { waitUntil: 'load', timeout: 120000 })
await pg.waitForFunction('window.__CECIL__ && window.__CECIL__.ready', null, { timeout: 240000 })
await pg.evaluate(() => window.__CECIL__.warmup())

const res = await pg.evaluate(async ([shot, pts]) => {
  await window.__CECIL__.goto(shot)
  const E = window.__ENGINE__
  // three 를 전역에서 못 얻으므로 player 가 이미 들고 있는 Raycaster 인스턴스를 빌린다
  const rc = E.get('player')?.ray
  const out = []
  const cam = E.camera
  const camPos = cam.getWorldPosition(new cam.position.constructor())
  for (const p of pts) {
    const [px, py] = p.split(',').map(Number)
    const ndc = { x: (px / 2560) * 2 - 1, y: 1 - (py / 1440) * 2 }
    // 카메라 언프로젝트: 수동 계산으로 three 의존을 피한다
    const dir = new cam.position.constructor(ndc.x, ndc.y, 0.5).unproject(cam).sub(camPos).normalize()
    let best = null
    if (rc) {
      rc.set(camPos, dir); rc.near = 0.01; rc.far = 400
      // 광축·먼지 프록시는 depthTest 를 끈 가산합성 셸이라 깊이 버퍼에 없다. 표면을 물어야 한다.
      const hits = rc.intersectObject(E.scene, true).filter(h => {
        const m = h.object.material
        return h.object.visible && m && m.visible !== false && !m.transparent && !(m.defines && m.defines.SHAFT_STEPS)
      })
      if (hits.length) best = hits[0]
    }
    if (!best) { out.push({ px, py, err: 'no hit' }); continue }
    const m = best.object.material
    const par = []
    let o = best.object
    while (o.parent) { if (o.name) par.push(o.name); o = o.parent }
    out.push({
      px, py, dist: +best.distance.toFixed(2),
      obj: best.object.name || '(익명)', chain: par.slice(0, 4).join(' < '),
      mat: m.name || '(무명)', type: m.type,
      rough: +Number(m.roughness ?? -1).toFixed(3), metal: +Number(m.metalness ?? -1).toFixed(3),
      cc: +Number(m.clearcoat ?? 0).toFixed(3), ccR: +Number(m.clearcoatRoughness ?? 0).toFixed(3),
      color: m.color ? '#' + m.color.getHexString() : null,
      defines: m.defines ? Object.keys(m.defines) : [],
      hasMap: !!m.map, hasRough: !!m.roughnessMap, hasNorm: !!m.normalMap,
      recv: best.object.receiveShadow, cast: best.object.castShadow
    })
  }
  return out
}, [SHOT, PTS])

await br.close()
srv.kill('SIGKILL')
for (const r of res) console.log(JSON.stringify(r))
