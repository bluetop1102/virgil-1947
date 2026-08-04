// 회귀 게이트. 기준선 대비 "좋아졌는가 / 나빠졌는가"를 사람 눈이 아니라 수치로 판정한다.
//
//   node tools/regress.mjs <candidate.png> [baseline.png]
//
// 이전 4라운드가 평균 4.6에서 정체한 이유는 능력이 아니라 구조였다 — 심사자가 매 사이클 백지에서
// 절대 점수만 매기니 "좋았던 것이 나빠진 것"이 보이지 않았고, 라운드4는 카펫·카트를 개선하면서
// 수직 스미어와 D1 실격을 새로 만들었는데 아무도 잡지 못했다. 이 스크립트가 그 구멍을 막는다.
//
// 판정 축 (전부 픽셀에서 직접 계산, 모델 판단 없음)
//   detail   고주파 에너지. 텍스처 디테일이 살아 있는가. 스미어·과블러가 나면 떨어진다
//   contrast 국소 대비(RMS). 베일이 끼면 떨어진다
//   veil     하위 15% 휘도의 평균. 블랙이 들려 있으면 올라간다(낮을수록 좋다)
//   spread   중간톤 점유율(L 64~192). 톤이 좁은 띠로 압착되면 떨어진다
//   clip     순흑·순백 비율. 둘 다 낮아야 한다(D6)
//   fringe   인접 픽셀 R/B 채널 분리. 색수차·이중상이 나면 올라간다(낮을수록 좋다)

import { readFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const [cand, base = 'shots/_baseline/corridor-r4-current.png'] = process.argv.slice(2)
if (!cand) { console.error('사용법: node tools/regress.mjs <candidate.png> [baseline.png]'); process.exit(2) }
for (const f of [cand, base]) if (!existsSync(f)) { console.error(`없는 파일: ${f}`); process.exit(2) }

// PNG 디코더가 없으므로 sips로 raw RGB를 뽑는다. 폭을 줄여 비교 비용을 낮추되
// 고주파 지표가 죽지 않도록 1024로 유지한다.
const W = 1024
function raw (png, tag) {
  const bmp = join(tmpdir(), `regress-${tag}-${process.pid}.bmp`)
  execFileSync('sips', ['-Z', String(W), '-s', 'format', 'bmp', png, '--out', bmp], { stdio: 'ignore' })
  const b = readFileSync(bmp)
  const off = b.readUInt32LE(10)
  const w = b.readInt32LE(18)
  const h = Math.abs(b.readInt32LE(22))
  const bpp = b.readUInt16LE(28) / 8
  const rowPad = (4 - ((w * bpp) % 4)) % 4
  const px = new Uint8Array(w * h * 3)
  for (let y = 0; y < h; y++) {
    const src = off + (h - 1 - y) * (w * bpp + rowPad)   // BMP는 상하 반전 저장
    for (let x = 0; x < w; x++) {
      const s = src + x * bpp, d = (y * w + x) * 3
      px[d] = b[s + 2]; px[d + 1] = b[s + 1]; px[d + 2] = b[s]
    }
  }
  return { px, w, h }
}

function metrics ({ px, w, h }) {
  const n = w * h
  const lum = new Float32Array(n)
  let black = 0, white = 0
  for (let i = 0; i < n; i++) {
    const r = px[i * 3], g = px[i * 3 + 1], b = px[i * 3 + 2]
    lum[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b
    if (r < 2 && g < 2 && b < 2) black++
    if (r > 253 && g > 253 && b > 253) white++
  }

  // 고주파 에너지 — 라플라시안 절대값 평균. 스미어·과블러에 민감하다.
  let hf = 0, hfN = 0
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      hf += Math.abs(4 * lum[i] - lum[i - 1] - lum[i + 1] - lum[i - w] - lum[i + w])
      hfN++
    }
  }

  // 국소 대비 — 8x8 타일 내 표준편차의 평균. 전역 히스토그램이 같아도 베일이 끼면 떨어진다.
  let cSum = 0, cN = 0
  for (let ty = 0; ty + 8 <= h; ty += 8) {
    for (let tx = 0; tx + 8 <= w; tx += 8) {
      let s = 0, s2 = 0
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const v = lum[(ty + y) * w + tx + x]; s += v; s2 += v * v }
      const m = s / 64
      cSum += Math.sqrt(Math.max(s2 / 64 - m * m, 0)); cN++
    }
  }

  const sorted = Float32Array.from(lum).sort()
  const q = (p) => sorted[Math.min(n - 1, Math.floor(n * p))]
  let veilSum = 0
  const veilN = Math.floor(n * 0.15)
  for (let i = 0; i < veilN; i++) veilSum += sorted[i]

  let mid = 0
  for (let i = 0; i < n; i++) if (lum[i] >= 64 && lum[i] <= 192) mid++

  // 색분리 — 가로 이웃 간 (R-B) 차분. 색수차·이중상이 생기면 올라간다.
  let fr = 0, frN = 0
  for (let y = 0; y < h; y++) {
    for (let x = 1; x < w - 1; x++) {
      const a = (y * w + x) * 3, b2 = (y * w + x + 1) * 3
      fr += Math.abs((px[a] - px[a + 2]) - (px[b2] - px[b2 + 2]))
      frN++
    }
  }

  return {
    detail: +(hf / hfN).toFixed(3),
    contrast: +(cSum / cN).toFixed(3),
    veil: +(veilSum / veilN).toFixed(2),
    spread: +(mid * 100 / n).toFixed(2),
    blackPct: +(black * 100 / n).toFixed(3),
    whitePct: +(white * 100 / n).toFixed(3),
    fringe: +(fr / frN).toFixed(3),
    p05: +q(0.05).toFixed(1), p50: +q(0.5).toFixed(1), p95: +q(0.95).toFixed(1)
  }
}

const B = metrics(raw(base, 'b'))
const C = metrics(raw(cand, 'c'))

// higher: 클수록 좋음 / lower: 작을수록 좋음. tol은 노이즈로 볼 상대 변화폭.
const AXES = [
  ['detail', 'higher', 0.03, '텍스처 디테일 (스미어·과블러에 민감)'],
  ['contrast', 'higher', 0.03, '국소 대비 (베일에 민감)'],
  ['veil', 'lower', 0.08, '블랙 리프트 (낮을수록 좋음)'],
  ['spread', 'higher', 0.05, '중간톤 점유율'],
  ['fringe', 'lower', 0.08, '색분리·이중상 (낮을수록 좋음)']
]

console.log(`기준선: ${base}`)
console.log(`후보  : ${cand}\n`)
console.log('축'.padEnd(10) + '기준선'.padStart(10) + '후보'.padStart(10) + '변화'.padStart(10) + '  판정')
console.log('-'.repeat(62))

let regressions = [], improvements = []
for (const [k, dir, tol, note] of AXES) {
  const b = B[k], c = C[k]
  const rel = b === 0 ? 0 : (c - b) / Math.abs(b)
  const better = dir === 'higher' ? rel > tol : rel < -tol
  const worse = dir === 'higher' ? rel < -tol : rel > tol
  const mark = better ? '개선' : worse ? '회귀' : '유지'
  if (worse) regressions.push(`${k} ${(rel * 100).toFixed(1)}% (${note})`)
  if (better) improvements.push(`${k} ${(rel > 0 ? '+' : '')}${(rel * 100).toFixed(1)}%`)
  console.log(k.padEnd(10) + String(b).padStart(10) + String(c).padStart(10) + `${(rel * 100).toFixed(1)}%`.padStart(10) + `  ${mark}`)
}

// D6은 절대 기준으로도 본다 — 상대 변화만 보면 둘 다 나빠도 통과한다.
const hardFail = []
if (C.blackPct > 1.0) hardFail.push(`순흑 ${C.blackPct}% > 1.0% (D6)`)
if (C.whitePct > 1.0) hardFail.push(`순백 ${C.whitePct}% > 1.0% (D6)`)

console.log('-'.repeat(62))
console.log(`클리핑  순흑 ${C.blackPct}% / 순백 ${C.whitePct}%   분포 p05=${C.p05} p50=${C.p50} p95=${C.p95}`)
console.log(`개선: ${improvements.join(', ') || '없음'}`)
console.log(`회귀: ${regressions.join(', ') || '없음'}`)
if (hardFail.length) console.log(`실격: ${hardFail.join(', ')}`)

const verdict = (regressions.length === 0 && hardFail.length === 0)
  ? (improvements.length ? 'IMPROVED' : 'NEUTRAL')
  : 'REGRESSED'
console.log(`\nVERDICT: ${verdict}`)
process.exit(verdict === 'REGRESSED' ? 1 : 0)
