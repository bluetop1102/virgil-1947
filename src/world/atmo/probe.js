// QA 전용 대기 프로브. ?qa=1 + 샷 state {scene:'atmo-probe'} 일 때만 만들어진다.
// 레벨과 겹치지 않도록 월드 y=-500에 격리해 짓는다 — 실제 게임 플레이에서는 절대 생성되지 않는다.
//
// 무드마다 "실제 공간"을 짓는다. 프리미티브 턴테이블은 재질 프리뷰지 씬이 아니라서
// 조명·안개·비가 놓일 자리가 없다(루브릭 D4/G9/G10). 공간은 요청된 무드에서만 지연 생성한다.

import * as THREE from 'three'
import { INTERIORS } from './spaces.js'
import { rooftop } from './roof.js'

export const OY = -500

const BUILDERS = { ...INTERIORS, 'rooftop-rain': rooftop }

export function buildProbe (engine, practical) {
  const g = new THREE.Group()
  g.name = 'atmo.probe'
  g.position.y = OY
  engine.scene.add(g)

  const built = new Map()
  let live = []
  let current = null

  g.userData.setRig = (name) => {
    for (const h of live) h.dispose()
    live = []
    if (current) current.root.visible = false
    current = null
    if (!name) return

    const key = BUILDERS[name] ? name : 'lobby-night'
    let sp = built.get(key)
    if (!sp) {
      sp = BUILDERS[key]()
      sp.root.name = `atmo.space.${key}`
      g.add(sp.root)
      built.set(key, sp)
    }
    sp.root.visible = true
    current = sp

    // 리그 좌표는 공간의 로컬 좌표다. 프로브 전체가 y=-500에 있으므로 광원만 월드로 올린다.
    for (const [kind, o] of sp.lights) {
      const opt = { ...o }
      opt.pos = [o.pos[0], o.pos[1] + OY, o.pos[2]]
      if (o.target) opt.target = [o.target[0], o.target[1] + OY, o.target[2]]
      live.push(practical(kind, opt))
    }
  }

  g.userData.spaceName = () => (current ? current.root.name : null)
  return g
}
