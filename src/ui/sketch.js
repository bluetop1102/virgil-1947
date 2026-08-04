// 형사가 노트에 직접 그린 펜 스케치. 물건 증거는 사진이 아니라 손그림으로 붙는다.
// 좌표는 0..1 정규화 — 어느 크기로 뽑아도 같은 손버릇이 나오도록.
import { rng } from '../core/util.js'
import { pen, penLine, INK } from './type.js'

function stroke (ctx, pts, w, h, o) {
  pen(ctx, pts.map(p => [p[0] * w, p[1] * h]), { w: 1.4, ink: INK.pen, ...o })
}

// 사선 해칭. 명암은 이걸로만 준다 — 면을 칠하면 손그림이 아니라 도형이 된다.
function hatch (ctx, pts, w, h, o = {}) {
  const r = rng((o.seed ?? 5) | 0)
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(pts[0][0] * w, pts[0][1] * h)
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] * w, pts[i][1] * h)
  ctx.closePath()
  ctx.clip()
  const n = o.n ?? 16
  const span = Math.max(w, h) * 1.7
  for (let i = 0; i < n; i++) {
    const t = i / n
    const x0 = -w * 0.4 + t * span
    penLine(ctx, x0, -h * 0.2, x0 + h * 0.9, h * 1.2, {
      w: 0.7, alpha: 0.20 + r() * 0.20, ink: o.ink ?? INK.pen, seed: 40 + i * 13
    })
  }
  ctx.restore()
}

export const SKETCH = {
  flask (ctx, w, h) {
    const b = [[0.30, 0.24], [0.70, 0.24], [0.78, 0.36], [0.79, 0.72], [0.72, 0.86], [0.28, 0.86], [0.21, 0.72], [0.22, 0.36], [0.30, 0.24]]
    stroke(ctx, b, w, h, { seed: 12 })
    stroke(ctx, [[0.43, 0.24], [0.43, 0.14], [0.57, 0.14], [0.57, 0.24]], w, h, { seed: 13 })
    stroke(ctx, [[0.41, 0.13], [0.59, 0.13]], w, h, { seed: 14, w: 2.2 })
    stroke(ctx, [[0.33, 0.40], [0.67, 0.40]], w, h, { seed: 15, alpha: 0.5 })
    stroke(ctx, [[0.33, 0.46], [0.67, 0.46]], w, h, { seed: 16, alpha: 0.5 })
    hatch(ctx, [[0.62, 0.30], [0.79, 0.40], [0.79, 0.74], [0.66, 0.86], [0.62, 0.86]], w, h, { n: 11, seed: 17 })
  },
  key (ctx, w, h) {
    stroke(ctx, [[0.20, 0.50], [0.72, 0.50]], w, h, { seed: 21, w: 2.0 })
    stroke(ctx, [[0.72, 0.50], [0.72, 0.66], [0.66, 0.66], [0.66, 0.50]], w, h, { seed: 22 })
    stroke(ctx, [[0.58, 0.50], [0.58, 0.62], [0.53, 0.62], [0.53, 0.50]], w, h, { seed: 23 })
    const bow = []
    for (let i = 0; i <= 26; i++) {
      const a = i / 26 * 6.2832
      bow.push([0.20 + Math.cos(a) * 0.11, 0.50 + Math.sin(a) * 0.155])
    }
    stroke(ctx, bow, w, h, { seed: 24 })
    stroke(ctx, [[0.30, 0.36], [0.44, 0.28], [0.50, 0.32], [0.36, 0.40], [0.30, 0.36]], w, h, { seed: 25, alpha: 0.6 })
    hatch(ctx, [[0.20, 0.52], [0.72, 0.52], [0.72, 0.58], [0.20, 0.58]], w, h, { n: 9, seed: 26 })
  },
  keyrack (ctx, w, h) {
    stroke(ctx, [[0.12, 0.20], [0.88, 0.18], [0.90, 0.80], [0.14, 0.82], [0.12, 0.20]], w, h, { seed: 31 })
    for (let i = 0; i < 4; i++) {
      const x = 0.24 + i * 0.18
      stroke(ctx, [[x, 0.30], [x, 0.40], [x + 0.035, 0.44]], w, h, { seed: 32 + i, w: 1.1 })
      if (i !== 1 && i !== 3) stroke(ctx, [[x - 0.03, 0.44], [x + 0.06, 0.44], [x + 0.06, 0.60], [x - 0.03, 0.60], [x - 0.03, 0.44]], w, h, { seed: 36 + i, w: 1.0, alpha: 0.7 })
    }
    stroke(ctx, [[0.20, 0.68], [0.80, 0.67]], w, h, { seed: 40, alpha: 0.45 })
    hatch(ctx, [[0.14, 0.70], [0.90, 0.69], [0.90, 0.80], [0.14, 0.82]], w, h, { n: 10, seed: 41 })
  },
  wrench (ctx, w, h) {
    stroke(ctx, [[0.22, 0.80], [0.30, 0.84], [0.62, 0.42], [0.58, 0.36], [0.26, 0.74], [0.22, 0.80]], w, h, { seed: 51 })
    stroke(ctx, [[0.58, 0.36], [0.66, 0.20], [0.80, 0.16], [0.86, 0.24], [0.78, 0.36], [0.62, 0.42]], w, h, { seed: 52 })
    stroke(ctx, [[0.68, 0.26], [0.79, 0.23]], w, h, { seed: 53, alpha: 0.6 })
    stroke(ctx, [[0.36, 0.66], [0.44, 0.72]], w, h, { seed: 54, alpha: 0.5 })
    hatch(ctx, [[0.26, 0.76], [0.60, 0.40], [0.64, 0.46], [0.30, 0.84]], w, h, { n: 12, seed: 55 })
  },
  shoes (ctx, w, h) {
    for (let s = 0; s < 2; s++) {
      const x = 0.24 + s * 0.30
      stroke(ctx, [
        [x, 0.70], [x - 0.04, 0.56], [x - 0.02, 0.42], [x + 0.05, 0.34], [x + 0.13, 0.36],
        [x + 0.16, 0.48], [x + 0.14, 0.62], [x + 0.10, 0.72], [x, 0.70]
      ], w, h, { seed: 60 + s * 7 })
      stroke(ctx, [[x + 0.10, 0.72], [x + 0.12, 0.84], [x + 0.06, 0.86], [x + 0.03, 0.76]], w, h, { seed: 62 + s * 7 })
      stroke(ctx, [[x + 0.01, 0.44], [x + 0.11, 0.44]], w, h, { seed: 64 + s * 7, alpha: 0.55 })
      hatch(ctx, [[x + 0.06, 0.36], [x + 0.16, 0.48], [x + 0.13, 0.66], [x + 0.06, 0.68]], w, h, { n: 9, seed: 66 + s * 5 })
    }
    stroke(ctx, [[0.16, 0.90], [0.84, 0.88]], w, h, { seed: 70, alpha: 0.4 })
  },
  trap (ctx, w, h) {
    stroke(ctx, [[0.34, 0.10], [0.34, 0.36], [0.28, 0.46], [0.30, 0.58], [0.42, 0.64], [0.56, 0.60], [0.60, 0.48], [0.60, 0.16]], w, h, { seed: 81 })
    stroke(ctx, [[0.46, 0.10], [0.46, 0.34], [0.42, 0.44], [0.44, 0.52], [0.52, 0.52], [0.54, 0.44], [0.54, 0.16]], w, h, { seed: 82, alpha: 0.6 })
    stroke(ctx, [[0.28, 0.14], [0.66, 0.13]], w, h, { seed: 83, w: 2.0 })
    stroke(ctx, [[0.24, 0.72], [0.28, 0.92], [0.64, 0.92], [0.68, 0.72], [0.24, 0.72]], w, h, { seed: 84 })
    stroke(ctx, [[0.30, 0.80], [0.62, 0.79]], w, h, { seed: 85, alpha: 0.5 })
    hatch(ctx, [[0.30, 0.80], [0.63, 0.79], [0.64, 0.90], [0.29, 0.90]], w, h, { n: 10, seed: 86 })
    stroke(ctx, [[0.45, 0.64], [0.45, 0.71]], w, h, { seed: 87, alpha: 0.45, w: 0.9 })
  },
  padlock (ctx, w, h) {
    const arc = []
    for (let i = 0; i <= 22; i++) {
      const a = Math.PI + i / 22 * Math.PI
      arc.push([0.50 + Math.cos(a) * 0.17, 0.44 + Math.sin(a) * 0.20])
    }
    stroke(ctx, arc, w, h, { seed: 91, w: 2.0 })
    stroke(ctx, [[0.28, 0.44], [0.72, 0.44], [0.74, 0.84], [0.26, 0.84], [0.28, 0.44]], w, h, { seed: 92 })
    stroke(ctx, [[0.50, 0.60], [0.50, 0.72]], w, h, { seed: 93, w: 1.8 })
    const kh = []
    for (let i = 0; i <= 14; i++) { const a = i / 14 * 6.2832; kh.push([0.50 + Math.cos(a) * 0.035, 0.60 + Math.sin(a) * 0.045]) }
    stroke(ctx, kh, w, h, { seed: 94 })
    hatch(ctx, [[0.58, 0.46], [0.73, 0.46], [0.74, 0.84], [0.58, 0.84]], w, h, { n: 11, seed: 95 })
  },
  footprints (ctx, w, h) {
    for (let s = 0; s < 3; s++) {
      const x = 0.20 + s * 0.26
      const y = 0.62 - s * 0.15
      const sc = 1 - s * 0.07
      // 앞창 — 안쪽이 잘록한 작업화 밑창
      const sole = []
      for (let i = 0; i <= 24; i++) {
        const t = i / 24 * 6.2832
        const rr = 0.070 * sc * (1 - Math.abs(Math.sin(t)) * 0.22)
        sole.push([x + Math.cos(t) * rr, y + Math.sin(t) * 0.115 * sc - 0.035])
      }
      stroke(ctx, sole, w, h, { seed: 100 + s * 9, alpha: 0.78 - s * 0.14 })
      hatch(ctx, sole, w, h, { n: 7, seed: 104 + s * 9 })
      // 뒷굽 — 따로 떨어져 찍힌다
      const heel = []
      for (let i = 0; i <= 16; i++) {
        const t = i / 16 * 6.2832
        heel.push([x + Math.cos(t) * 0.055 * sc, y + 0.135 * sc + Math.sin(t) * 0.048 * sc])
      }
      stroke(ctx, heel, w, h, { seed: 112 + s * 5, alpha: 0.72 - s * 0.14 })
      hatch(ctx, heel, w, h, { n: 5, seed: 116 + s * 5 })
      // 트레드
      for (let k = 0; k < 3; k++) {
        stroke(ctx, [[x - 0.045 * sc, y - 0.085 + k * 0.042], [x + 0.045 * sc, y - 0.085 + k * 0.042]], w, h, {
          seed: 120 + s * 7 + k, alpha: 0.4, w: 0.8
        })
      }
    }
  }
}

export const SKETCH_FOR = {
  flask: 'flask',
  roofkey: 'key',
  keyrack: 'keyrack',
  wrench: 'wrench',
  shoes: 'shoes',
  'sink-trap': 'trap',
  'hatch-lock': 'padlock',
  footprints: 'footprints'
}

// ── 하드웨어: 종이를 붙잡는 물건들 ──────────────────────────────

export function paperclip (ctx, x, y, s = 1, angle = 0) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.scale(s, s)
  ctx.lineCap = 'round'
  const path = (o) => {
    ctx.beginPath()
    ctx.moveTo(-4 + o, 12)
    ctx.lineTo(-4 + o, -7)
    ctx.quadraticCurveTo(-4 + o, -13, 1 + o, -13)
    ctx.quadraticCurveTo(6 + o, -13, 6 + o, -7)
    ctx.lineTo(6 + o, 8)
    ctx.quadraticCurveTo(6 + o, 12, 1.5 + o, 12)
    ctx.quadraticCurveTo(-1 + o, 12, -1 + o, 8)
    ctx.lineTo(-1 + o, -9)
    ctx.stroke()
  }
  ctx.strokeStyle = 'rgba(18,14,10,0.34)'
  ctx.lineWidth = 3.4
  path(1.2)
  const g = ctx.createLinearGradient(-6, -13, 8, 12)
  g.addColorStop(0, '#e7e2d6')
  g.addColorStop(0.45, '#8d8878')
  g.addColorStop(0.62, '#cfc8b6')
  g.addColorStop(1, '#6a6455')
  ctx.strokeStyle = g
  ctx.lineWidth = 2.5
  path(0)
  ctx.strokeStyle = 'rgba(255,250,232,0.5)'
  ctx.lineWidth = 0.7
  path(-0.5)
  ctx.restore()
}

export function pushpin (ctx, x, y, seed = 1) {
  const r = rng(seed | 0)
  const hue = ['#8a2b22', '#3d4a63', '#7a6a2c', '#5c4636'][Math.floor(r() * 4) % 4]
  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = 'rgba(10,8,6,0.42)'
  ctx.beginPath()
  ctx.ellipse(3.5, 5.5, 7.5, 3.4, 0.2, 0, 6.2832)
  ctx.fill()
  ctx.fillStyle = 'rgba(30,24,18,0.8)'
  ctx.beginPath()
  ctx.moveTo(-1, 1)
  ctx.lineTo(1.6, 1)
  ctx.lineTo(0.6, 7)
  ctx.closePath()
  ctx.fill()
  const g = ctx.createRadialGradient(-2.4, -3.4, 0.4, 0, 0, 8)
  g.addColorStop(0, '#fff6e2')
  g.addColorStop(0.28, hue)
  g.addColorStop(1, '#1c1410')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.ellipse(0, 0, 6.4, 5.4, 0, 0, 6.2832)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,248,230,0.85)'
  ctx.beginPath()
  ctx.ellipse(-2.3, -2.4, 1.5, 1.0, -0.5, 0, 6.2832)
  ctx.fill()
  ctx.restore()
}

export function tape (ctx, x, y, w, h, angle = 0, seed = 3) {
  const r = rng(seed | 0)
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.beginPath()
  ctx.moveTo(-w / 2, -h / 2)
  for (let i = 0; i <= 5; i++) ctx.lineTo(-w / 2 + w * i / 5, -h / 2 + (r() - 0.5) * 2.2)
  ctx.lineTo(w / 2 + (r() - 0.5) * 3, -h / 2 + (r() - 0.5) * 2)
  for (let i = 5; i >= 0; i--) ctx.lineTo(-w / 2 + w * i / 5, h / 2 + (r() - 0.5) * 2.2)
  ctx.closePath()
  const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2)
  g.addColorStop(0, 'rgba(226,208,166,0.42)')
  g.addColorStop(0.45, 'rgba(198,178,138,0.30)')
  g.addColorStop(1, 'rgba(224,206,164,0.44)')
  ctx.fillStyle = g
  ctx.fill()
  ctx.strokeStyle = 'rgba(120,100,70,0.26)'
  ctx.lineWidth = 0.7
  ctx.stroke()
  ctx.fillStyle = 'rgba(255,250,232,0.22)'
  ctx.fillRect(-w / 2, -h / 2 + h * 0.18, w, h * 0.12)
  ctx.restore()
}

export function staple (ctx, x, y, angle = 0) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.strokeStyle = 'rgba(16,12,8,0.32)'
  ctx.lineWidth = 2.6
  ctx.beginPath()
  ctx.moveTo(-5, 1.4)
  ctx.lineTo(5, 1.4)
  ctx.stroke()
  ctx.strokeStyle = '#a9a190'
  ctx.lineWidth = 1.9
  ctx.beginPath()
  ctx.moveTo(-5, 0)
  ctx.lineTo(5, 0)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(255,252,238,0.55)'
  ctx.lineWidth = 0.6
  ctx.beginPath()
  ctx.moveTo(-5, -0.7)
  ctx.lineTo(5, -0.7)
  ctx.stroke()
  ctx.restore()
}
