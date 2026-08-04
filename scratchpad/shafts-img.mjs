// BMP(sips 변환) 픽셀 분석기. PNG 디코더가 환경에 없어 sips -s format bmp 로 굽고 여기서 읽는다.
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

export function load (png) {
  const bmp = png.replace(/\.png$/, '.bmp')
  execSync(`sips -s format bmp "${png}" --out "${bmp}"`, { stdio: 'ignore' })
  const b = readFileSync(bmp)
  const off = b.readUInt32LE(10)
  const w = b.readInt32LE(18)
  const hRaw = b.readInt32LE(22)
  const h = Math.abs(hRaw)
  const topDown = hRaw < 0
  const stride = (w * 3 + 3) & ~3
  const at = (x, y) => {
    const row = topDown ? y : h - 1 - y
    const i = off + row * stride + x * 3
    return [b[i + 2], b[i + 1], b[i]]
  }
  const lum = (x, y) => { const p = at(x, y); return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2] }
  return { w, h, at, lum }
}

export function region (img, x0, y0, x1, y1) {
  let s = 0, n = 0, mx = 0, mn = 255
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const l = img.lum(x, y); s += l; n++; if (l > mx) mx = l; if (l < mn) mn = l
  }
  return { mean: +(s / n).toFixed(2), min: +mn.toFixed(1), max: +mx.toFixed(1) }
}

// 수평 스캔라인 휘도 프로파일. 세로로 avg 줄 평균해 그레인을 지운다.
export function scan (img, y, x0, x1, avg = 5) {
  const out = []
  for (let x = x0; x < x1; x++) {
    let s = 0
    for (let k = 0; k < avg; k++) s += img.lum(x, y + k - (avg >> 1))
    out.push(+(s / avg).toFixed(2))
  }
  return out
}

// 프로파일 형상 지표: 플래토 비율(최대값 90% 이상 구간), 1차 미분의 계단성, 국소 분산
export function shape (p) {
  const mx = Math.max(...p), mn = Math.min(...p)
  const plateau = p.filter(v => v >= mn + (mx - mn) * 0.9).length / p.length
  const d = p.slice(1).map((v, i) => v - p[i])
  const dAbs = d.map(Math.abs)
  const dMax = Math.max(...dAbs)
  // 노이즈 지표: 3점 라플라시안 RMS / 진폭
  let lap = 0
  for (let i = 1; i < p.length - 1; i++) { const v = p[i - 1] - 2 * p[i] + p[i + 1]; lap += v * v }
  const lapRms = Math.sqrt(lap / Math.max(1, p.length - 2))
  return {
    min: +mn.toFixed(1), max: +mx.toFixed(1), amp: +(mx - mn).toFixed(1),
    plateauPct: +(plateau * 100).toFixed(1), maxSlope: +dMax.toFixed(2),
    lapRms: +lapRms.toFixed(3), ripple: +(lapRms / Math.max(1e-3, mx - mn)).toFixed(4)
  }
}

export function diff (a, b, x0, y0, x1, y1) {
  let s = 0, n = 0, mx = 0
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const d = Math.abs(a.lum(x, y) - b.lum(x, y)); s += d; n++; if (d > mx) mx = d
  }
  return { mean: +(s / n).toFixed(2), max: +mx.toFixed(1) }
}

// 그레인과 빔 구조를 분리한다. 그레인은 1~2px, 밀도 얼룩은 40~80px, 종형 포락선은 300px+.
// 그래서 9px 평활 = 구조 보존/그레인 제거, 121px 평활 = 포락선. 그 차이가 "실린 노이즈"다.
function box (p, n) {
  const h = n >> 1, out = []
  for (let i = 0; i < p.length; i++) {
    let s = 0, c = 0
    for (let k = -h; k <= h; k++) { const j = i + k; if (j >= 0 && j < p.length) { s += p[j]; c++ } }
    out.push(s / c)
  }
  return out
}

export function profile (p) {
  const sm = box(p, 9)
  const env = box(p, 121)
  const mx = Math.max(...sm), mn = Math.min(...sm)
  const amp = mx - mn
  const plateau = sm.filter(v => v >= mn + amp * 0.9).length / sm.length
  let s = 0
  for (let i = 0; i < sm.length; i++) s += (sm[i] - env[i]) ** 2
  const struct = Math.sqrt(s / sm.length)
  let grain = 0
  for (let i = 0; i < p.length; i++) grain += (p[i] - sm[i]) ** 2
  return {
    amp: +amp.toFixed(1), plateauPct: +(plateau * 100).toFixed(1),
    structPct: +(struct / amp * 100).toFixed(2),
    grainRms: +Math.sqrt(grain / p.length).toFixed(2)
  }
}
