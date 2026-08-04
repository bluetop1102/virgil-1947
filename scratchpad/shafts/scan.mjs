// 광축을 가로지르는 수평 스캔라인의 "광축 단독" 프로파일을 뽑는다.
// on - off 차분이라 배경 지오메트리가 상쇄되고 광축이 만든 형상만 남는다.
// 판정: 계단형 플래토(양 어깨가 가파르고 가운데가 평평)인가, 노이즈 실린 종형인가.
import { readFileSync } from 'node:fs'

const [dir, onV = 'nohal', offV = 'noshaft'] = process.argv.slice(2)
const j = JSON.parse(readFileSync(`${dir}/ab.json`, 'utf8'))
const on = j.rows.find(r => r.v === onV)
const off = j.rows.find(r => r.v === offV)
const X0 = Number(process.env.AB_SCANX?.split(',')[0] ?? 600)
const STEP = 4

for (const y of Object.keys(on.scans)) {
  const a = on.scans[y], b = off.scans[y]
  const d = a.map((v, i) => v - b[i])
  // 피크 위치와 반치폭
  let pk = 0, pi = 0
  d.forEach((v, i) => { if (v > pk) { pk = v; pi = i } })
  if (pk < 1.0) { console.log(`y=${y}  peak=${pk.toFixed(1)} (광축 기여 없음)`); continue }
  const half = pk * 0.5
  let l = pi, r = pi
  while (l > 0 && d[l] > half) l--
  while (r < d.length - 1 && d[r] > half) r++
  const fw = (r - l) * STEP
  // 플래토 판정: 반치폭 구간 안에서 피크의 85% 이상인 표본 비율.
  // 종형이면 낮고(<0.35), 상수 알파 웨지면 높다(>0.6).
  const band = d.slice(l, r + 1)
  const flat = band.filter(v => v > pk * 0.85).length / band.length
  // 어깨 급경사: 반치폭 지점의 국소 기울기를 피크로 정규화
  const slope = (i) => Math.abs((d[Math.min(i + 1, d.length - 1)] - d[Math.max(i - 1, 0)]) / 2) / pk
  // 국소 요철(노이즈): 2차 차분 RMS / peak
  let s2 = 0, c = 0
  for (let i = l + 1; i < r; i++) { const v = d[i - 1] - 2 * d[i] + d[i + 1]; s2 += v * v; c++ }
  const rough = c ? Math.sqrt(s2 / c) / pk : 0
  console.log(`y=${y}  peak=${pk.toFixed(1)} @x=${X0 + pi * STEP}  FWHM=${fw}px  flatTop=${(flat * 100).toFixed(0)}%  shoulder=${(slope(l) * 100).toFixed(1)}%/${(slope(r) * 100).toFixed(1)}%  rough=${(rough * 100).toFixed(1)}%`)
  // 프로파일 스파크라인
  const ticks = ' .:-=+*#%@'
  console.log('        ' + d.map(v => ticks[Math.max(0, Math.min(9, Math.round(v / pk * 9)))]).join(''))
}
