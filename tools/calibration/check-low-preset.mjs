#!/usr/bin/env node
// T-P0-06 수용 기준 A1 — QUALITY.low 프리셋 검증 (실발주 회수 시 신설)
// low 실샷 게이트는 shoot.mjs 의 URL 쿼리 주입 지원 후 추가 (docs/HANDOFF.md T-P0-06 항목)
import { resolve } from 'node:path'
const { pickQuality } = await import(resolve(process.cwd(), 'src/core/config.js'))
const low = pickQuality('?q=low')
let warned = 0
const orig = console.warn
console.warn = () => warned++
const fb = pickQuality('?q=zzz')
console.warn = orig
const checks = [
  ['low 선택', low.name === 'low'],
  ['volumetric 비활성', low.volumetric === false],
  ['gtao 비활성', low.gtao === false],
  ['ssr 비활성', low.ssr === false],
  ['taa 비활성', low.taa === false],
  ['미지 값 경고 1회', warned === 1],
  ['미지 값 high 폴백', fb.name === 'high'],
  ['무지정 high 유지', pickQuality('').name === 'high'],
]
let fail = 0
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`); if (!ok) fail++ }
process.exit(fail ? 1 : 0)
