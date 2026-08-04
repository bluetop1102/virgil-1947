// 증거판이 걸린 벽과 그 앞의 전경. 다마스크 벽지·굽도리·작업등을 절차 생성한다.
import { surface, grain } from './paper.js'
import { rng } from '../core/util.js'

// 다마스크 벽지 모티프. 타일 경계가 맞도록 중앙과 네 모서리에 같은 문양을 찍는다.
function damaskTile () {
  const tw = 104
  const th = 148
  const c = document.createElement('canvas')
  c.width = tw
  c.height = th
  const x = c.getContext('2d')
  const motif = (cx, cy) => {
    x.save()
    x.translate(cx, cy)
    for (const m of [-1, 1]) {
      x.beginPath()
      x.moveTo(0, -th * 0.34)
      x.quadraticCurveTo(m * tw * 0.42, -th * 0.16, 0, th * 0.02)
      x.quadraticCurveTo(m * tw * 0.30, th * 0.20, 0, th * 0.34)
      x.strokeStyle = 'rgba(252,238,206,0.34)'
      x.lineWidth = 2.2
      x.stroke()
      x.strokeStyle = 'rgba(44,34,18,0.30)'
      x.lineWidth = 0.9
      x.stroke()
      x.beginPath()
      x.ellipse(m * tw * 0.20, -th * 0.02, tw * 0.10, th * 0.06, m * 0.7, 0, 6.2832)
      x.fillStyle = 'rgba(248,232,196,0.22)'
      x.fill()
      x.strokeStyle = 'rgba(48,36,20,0.22)'
      x.lineWidth = 0.8
      x.stroke()
    }
    x.beginPath()
    x.ellipse(0, 0, tw * 0.055, th * 0.05, 0, 0, 6.2832)
    x.fillStyle = 'rgba(252,238,204,0.28)'
    x.fill()
    x.restore()
  }
  motif(tw / 2, th / 2)
  motif(0, 0)
  motif(tw, 0)
  motif(0, th)
  motif(tw, th)
  return c
}

export function wall (w, h) {
  const s = surface(w, h)
  const ctx = s.ctx
  const r = rng(8231)
  const g = ctx.createLinearGradient(0, 0, w * 0.8, h)
  g.addColorStop(0, '#8e8168')
  g.addColorStop(0.5, '#6a5f4c')
  g.addColorStop(1, '#3b352a')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)

  ctx.save()
  const dp = ctx.createPattern(damaskTile(), 'repeat')
  ctx.fillStyle = dp
  ctx.globalAlpha = 0.85
  ctx.fillRect(0, 0, w, h * 0.86)
  ctx.restore()

  // 벽지 이음매 — 반복 문양의 격자감을 끊어준다
  for (let x = w * 0.11; x < w; x += w * 0.208) {
    ctx.strokeStyle = 'rgba(38,30,18,0.30)'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x + 2, h * 0.86)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(252,242,218,0.14)'
    ctx.beginPath()
    ctx.moveTo(x + 2.4, 0)
    ctx.lineTo(x + 4.4, h * 0.86)
    ctx.stroke()
  }

  for (let i = 0; i < 22; i++) {
    const x = r() * w
    const y = r() * h
    const rad = (0.12 + r() * 0.5) * Math.max(w, h)
    const rg = ctx.createRadialGradient(x, y, 0, x, y, rad)
    const dark = r() < 0.55
    rg.addColorStop(0, dark ? `rgba(38,32,22,${0.05 + r() * 0.10})` : `rgba(206,192,164,${0.03 + r() * 0.07})`)
    rg.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = rg
    ctx.fillRect(0, 0, w, h)
  }

  // 회벽 균열 — 갈라진 선은 한쪽에 그림자, 반대쪽에 하이라이트가 있어야 깊이가 생긴다
  for (let c = 0; c < 7; c++) {
    let x = r() * w
    let y = r() * h * 0.9
    const pts = [[x, y]]
    const dir = r() * 6.28
    for (let i = 0; i < 14 + r() * 16; i++) {
      x += Math.cos(dir + (r() - 0.5) * 1.4) * (6 + r() * 16)
      y += Math.sin(dir + (r() - 0.5) * 1.4) * (6 + r() * 16)
      pts.push([x, y])
    }
    for (const [off, col, lw] of [[1.2, 'rgba(232,222,200,0.16)', 1.0], [0, 'rgba(26,20,12,0.44)', 1.3]]) {
      ctx.strokeStyle = col
      ctx.lineWidth = lw
      ctx.beginPath()
      ctx.moveTo(pts[0][0] + off, pts[0][1] + off)
      for (const p of pts) ctx.lineTo(p[0] + off, p[1] + off)
      ctx.stroke()
    }
  }

  // 물자국 — 이 호텔의 모든 벽에는 물이 지나간 흔적이 있다
  const dg = ctx.createLinearGradient(0, 0, 0, h * 0.7)
  dg.addColorStop(0, 'rgba(58,44,24,0.30)')
  dg.addColorStop(1, 'rgba(58,44,24,0)')
  ctx.fillStyle = dg
  ctx.beginPath()
  ctx.moveTo(w * 0.62, 0)
  ctx.quadraticCurveTo(w * 0.70, h * 0.3, w * 0.66, h * 0.62)
  ctx.quadraticCurveTo(w * 0.84, h * 0.34, w * 0.88, 0)
  ctx.closePath()
  ctx.fill()

  // 굽도리와 걸레받이 — 수평 몰딩이 있어야 벽이 평면이 아니라 공간이 된다
  const wy = h * 0.855
  ctx.fillStyle = '#4a3a26'
  ctx.fillRect(0, wy, w, h - wy)
  const pg = ctx.createLinearGradient(0, wy, 0, h)
  pg.addColorStop(0, 'rgba(226,196,150,0.24)')
  pg.addColorStop(0.12, 'rgba(20,14,8,0.34)')
  pg.addColorStop(0.5, 'rgba(96,72,44,0.20)')
  pg.addColorStop(1, 'rgba(8,6,4,0.66)')
  ctx.fillStyle = pg
  ctx.fillRect(0, wy, w, h - wy)
  for (let x = 0; x < w; x += w * 0.104) {
    ctx.strokeStyle = 'rgba(12,8,4,0.42)'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.moveTo(x, wy + 8)
    ctx.lineTo(x + 1, h)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(238,206,158,0.10)'
    ctx.beginPath()
    ctx.moveTo(x + 2.6, wy + 8)
    ctx.lineTo(x + 3.6, h)
    ctx.stroke()
  }
  ctx.fillStyle = 'rgba(246,214,164,0.22)'
  ctx.fillRect(0, wy - 5, w, 4)
  ctx.fillStyle = 'rgba(10,7,4,0.5)'
  ctx.fillRect(0, wy - 1, w, 3)

  // 벽지가 뜬 자리 — 물이 지나간 벽은 반드시 들뜬다
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(w * 0.955, h * 0.02)
  ctx.quadraticCurveTo(w * 0.90, h * 0.16, w * 0.965, h * 0.30)
  ctx.lineTo(w, h * 0.30)
  ctx.lineTo(w, 0)
  ctx.closePath()
  ctx.fillStyle = 'rgba(150,138,116,0.7)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(28,20,10,0.44)'
  ctx.lineWidth = 1.6
  ctx.stroke()
  ctx.restore()

  ctx.save()
  ctx.globalAlpha = 0.5
  ctx.fillStyle = ctx.createPattern(grain(23), 'repeat')
  ctx.fillRect(0, 0, w, h)
  ctx.restore()

  // 좌상단 작업등(따뜻함)과 우측 창의 찬 반사광 — 한 공간에 두 색온도 (루브릭 G1)
  const cool = ctx.createRadialGradient(w * 0.98, h * 0.62, 0, w * 0.98, h * 0.62, w * 0.5)
  cool.addColorStop(0, 'rgba(126,158,196,0.20)')
  cool.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = cool
  ctx.fillRect(0, 0, w, h)
  const lp = ctx.createRadialGradient(w * 0.24, h * 0.14, 0, w * 0.28, h * 0.26, Math.max(w, h) * 0.78)
  lp.addColorStop(0, 'rgba(255,226,164,0.30)')
  lp.addColorStop(0.34, 'rgba(255,206,140,0.08)')
  lp.addColorStop(1, 'rgba(10,8,6,0.84)')
  ctx.fillStyle = lp
  ctx.fillRect(0, 0, w, h)
  return s
}

// 전경 오클루더: 화면 밖에서 들어온 등갓. 광원이 화면 논리로 설명되고 심도 레이어가 생긴다.
export function lampShade (w, h) {
  const s = surface(w, h)
  const ctx = s.ctx
  ctx.save()
  ctx.filter = 'blur(7px)'
  ctx.beginPath()
  ctx.moveTo(w * 0.02, -h * 0.1)
  ctx.lineTo(w * 0.20, -h * 0.1)
  ctx.quadraticCurveTo(w * 0.185, h * 0.10, w * 0.075, h * 0.14)
  ctx.quadraticCurveTo(w * -0.04, h * 0.13, w * 0.02, -h * 0.1)
  ctx.closePath()
  const g = ctx.createLinearGradient(0, 0, w * 0.2, h * 0.15)
  g.addColorStop(0, 'rgba(12,9,6,0.94)')
  g.addColorStop(1, 'rgba(30,22,14,0.80)')
  ctx.fillStyle = g
  ctx.fill()
  ctx.restore()
  ctx.save()
  ctx.filter = 'blur(5px)'
  const rim = ctx.createLinearGradient(0, h * 0.11, 0, h * 0.175)
  rim.addColorStop(0, 'rgba(30,22,14,0.9)')
  rim.addColorStop(1, 'rgba(255,226,168,0.85)')
  ctx.fillStyle = rim
  ctx.beginPath()
  ctx.ellipse(w * 0.115, h * 0.134, w * 0.072, h * 0.022, 0.03, 0, 6.2832)
  ctx.fill()
  ctx.filter = 'blur(14px)'
  ctx.fillStyle = 'rgba(255,208,144,0.34)'
  ctx.beginPath()
  ctx.ellipse(w * 0.13, h * 0.19, w * 0.14, h * 0.07, 0, 0, 6.2832)
  ctx.fill()
  ctx.restore()
  return s
}

// 초점 밖 전경. 판이 방 안에 있다는 걸 알려주는 유일한 단서다.
export function fgCard (w, h) {
  const s = surface(w, h)
  const ctx = s.ctx
  const g = ctx.createRadialGradient(w * 1.02, h * 1.06, 0, w * 1.02, h * 1.06, w * 0.46)
  g.addColorStop(0, 'rgba(3,3,3,0.92)')
  g.addColorStop(0.55, 'rgba(5,4,4,0.45)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  const g2 = ctx.createRadialGradient(-w * 0.04, h * 1.02, 0, -w * 0.04, h * 1.02, w * 0.34)
  g2.addColorStop(0, 'rgba(3,3,3,0.80)')
  g2.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g2
  ctx.fillRect(0, 0, w, h)
  return s
}
