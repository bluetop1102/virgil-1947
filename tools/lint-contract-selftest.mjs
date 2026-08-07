// 계약 린터의 자기 검사 — 규칙이 실제로 잡는지·우회가 막히는지 확인한다.
// lint-contract.mjs 가 500줄 계약을 지키도록 본체에서 분리(2026-08-07).
import { lintFiles, printFindings, RULES, DIRECT_CALL_PATTERNS, DISPLAY_NAME } from './lint-contract.mjs'

export function runSelfTest() {
  const directMaterial = ['new THREE', 'MeshStandardMaterial()'].join('.')
  const directLight = ['new THREE', 'PointLight()'].join('.')
  const directCalls = DIRECT_CALL_PATTERNS
    .map(({ label }) => `${label}()`)
    .join('\n')
  const cases = [
    {
      name: 'material',
      expected: RULES.material,
      files: [{ path: 'src/world/material-fixture.js', source: directMaterial }]
    },
    {
      name: 'light',
      expected: RULES.light,
      files: [{ path: 'src/world/light-fixture.js', source: directLight }]
    },
    {
      name: 'random-clock',
      expected: RULES.deterministic,
      files: [{ path: 'src/core/time-fixture.js', source: directCalls }]
    },
    {
      name: 'display-name-latin',
      expected: RULES.display,
      files: [{ path: 'src/world/neon-fixture.js', source: `const sign = 'HOTEL ${['CE', 'CIL'].join('')}'` }]
    },
    {
      name: 'line-count',
      expected: RULES.lines,
      files: [{
        path: 'tools/long-fixture.mjs',
        source: Array.from({ length: 501 }, (_, index) => `export const n${index} = ${index}`).join('\n')
      }]
    },
    {
      name: 'display-name-index',
      expected: RULES.display,
      files: [{ path: 'index.html', source: `<main>${DISPLAY_NAME}</main>` }]
    }
  ]

  let failed = false
  for (const fixture of cases) {
    const findings = lintFiles(fixture.files)
    const simulatedExit = findings.length === 0 ? 0 : 1
    printFindings(findings)
    const valid = simulatedExit === 1 && findings.some(item =>
      item.rule === fixture.expected && item.path && item.line > 0
    )
    console.log(`SELF-TEST ${valid ? 'PASS' : 'FAIL'} ${fixture.name} exit ${simulatedExit}`)
    if (!valid) failed = true
  }

  const allowedDisplay = `const hotel = '${DISPLAY_NAME}' // lint-allow: display-name`
  const commentOnly = `// ${directMaterial}\n/* ${directLight}\n${directCalls} */`
  const clean = lintFiles([
    { path: 'src/materials/allowed.js', source: directMaterial },
    { path: 'src/world/atmosphere.js', source: directLight },
    { path: 'src/world/atmo/allowed.js', source: directLight },
    { path: 'src/ui/allowed.js', source: allowedDisplay },
    { path: 'src/ui/allowed-latin.js', source: `const key = '${['ce', 'cil'].join('')}-wear' // lint-allow: display-name` },
    { path: 'src/ui/ident-context.js', source: `const define = '${['CE', 'CIL'].join('')}_POM'; const boot = 'window.__${['CE', 'CIL'].join('')}__'` },
    { path: 'tools/comments.mjs', source: commentOnly },
    { path: 'tools/harness-scope.mjs', source: [directLight, directMaterial, directCalls].join('\n') },
    { path: 'tools/short.mjs', source: Array(500).fill('export {}').join('\n') }
  ])
  const cleanExit = clean.length === 0 ? 0 : 1
  printFindings(clean)
  console.log(`SELF-TEST ${cleanExit === 0 ? 'PASS' : 'FAIL'} clean exit ${cleanExit}`)
  if (cleanExit !== 0) failed = true

  const stringBypass = lintFiles([{
    path: 'src/ui/not-allowed.js',
    source: `const marker = 'lint-allow: display-name'; const hotel = '${DISPLAY_NAME}'`
  }])
  const bypassBlocked = stringBypass.some(item => item.rule === RULES.display)
  console.log(`SELF-TEST ${bypassBlocked ? 'PASS' : 'FAIL'} display-allow-comment-only exit ${bypassBlocked ? 1 : 0}`)
  if (!bypassBlocked) failed = true

  // E9 §2 패턴 lint-allow 의 2중 결박 — 등재 좌표에서만 통하고, 등재 밖은 그 자체가 위반이다.
  const directLightCall = ['new THREE', 'PointLight()'].join('.')
  const allowMarker = ['lint-allow', 'light-direct'].join(': ')
  const registered = lintFiles([{
    path: 'src/world/testbed.js',
    source: `const l = ${directLightCall}  // ${allowMarker}`
  }])
  const registeredClean = registered.length === 0
  console.log(`SELF-TEST ${registeredClean ? 'PASS' : 'FAIL'} light-allow-registered exit ${registeredClean ? 0 : 1}`)
  if (!registeredClean) failed = true

  const unregistered = lintFiles([{
    path: 'src/world/newcomer.js',
    source: `const l = ${directLightCall}  // ${allowMarker}`
  }])
  const unregisteredBlocked = unregistered.filter(item => item.rule === RULES.light).length === 2
  console.log(`SELF-TEST ${unregisteredBlocked ? 'PASS' : 'FAIL'} light-allow-unregistered exit ${unregisteredBlocked ? 1 : 0}`)
  if (!unregisteredBlocked) failed = true

  const overQuota = lintFiles([{
    path: 'src/world/testbed.js',
    source: [`const a = ${directLightCall}  // ${allowMarker}`, `const b = ${directLightCall}  // ${allowMarker}`].join('\n')
  }])
  const quotaBlocked = overQuota.some(item => item.message.startsWith('unregistered'))
  console.log(`SELF-TEST ${quotaBlocked ? 'PASS' : 'FAIL'} light-allow-over-quota exit ${quotaBlocked ? 1 : 0}`)
  if (!quotaBlocked) failed = true

  if (failed) process.exitCode = 1
}
