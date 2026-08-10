// 검분 컷의 소품. ui/hud.js 소유의 분권 파일이다(casebook.js·photos.js 와 같은 위치).
// 컷의 상태기계(언제 열리고 언제 내려가는가)는 hud.js 에 있고, 여기는 종이 한 장만 만든다.
//
// 새 소품을 그리지 않는 것이 계약이다 — 수사노트에 끼워질 낱장(casebook.docItem)을 그대로 쓴다.
// 같은 종이가 손에 있었다가 파일로 들어가야 획득이 한 동작으로 읽힌다.
import { crease } from './paper.js'
import { docItem } from './casebook.js'

export function inspectSheet (w, h, ev) {
  const s = docItem(w, h, ev, 7)
  const ctx = s.ctx
  // 손에 든 종이는 평평하지 않다. 접힌 자국 하나가 면을 갈라야 평판으로 안 읽힌다.
  crease(ctx, w, h, -2, h * 0.63, w + 2, h * 0.66, 0.9)
  // 데스크 텅스텐 등을 이 종이도 받는다. 중성 회백으로 남으면 방의 호박색과 어긋나 종이
  // 하나만 장면 위에 얹힌 레이어로 읽힌다(조작 카드가 같은 지적으로 받은 처리).
  // 광원은 프레임에서 오른쪽 위의 데스크 램프라 그쪽이 밝고 반대편이 그늘진다.
  ctx.save()
  ctx.globalCompositeOperation = 'source-atop'
  const warm = ctx.createLinearGradient(w, 0, w * 0.12, h)
  warm.addColorStop(0, 'rgba(255,201,126,0.34)')
  warm.addColorStop(0.45, 'rgba(232,166,96,0.15)')
  warm.addColorStop(1, 'rgba(38,25,14,0.38)')
  ctx.fillStyle = warm
  ctx.fillRect(0, 0, w, h)
  ctx.restore()
  return s
}
