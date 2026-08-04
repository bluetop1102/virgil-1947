// 인벤토리 덤프. 천장 반자틀 메시의 castShadow 실태와 up 스포트의 섀도 상태를 런타임에서 확인한다.
export default {
  cases: [
    {
      tag: 'I0', png: false, apply: `
S.settle(60)
const sc = E.scene
const batt = [], ups = [], mains = []
sc.traverse(o => {
  if (o.isMesh && o.geometry) {
    o.geometry.computeBoundingBox()
    const bb = o.geometry.boundingBox
    if (bb.max.y > 2.9 && bb.max.y < 3.2 && (bb.max.x - bb.min.x) > 2.4 && (bb.max.z - bb.min.z) < 0.25) {
      batt.push({ y: +bb.max.y.toFixed(3), z: +((bb.max.z + bb.min.z) / 2).toFixed(2), dep: +(bb.max.y - bb.min.y).toFixed(3), cast: o.castShadow, recv: o.receiveShadow, mat: o.material.name, par: o.parent.name })
    }
  }
  if (o.isLight) {
    const rec = { name: o.name, type: o.type, cast: o.castShadow, pos: o.position.toArray().map(v => +v.toFixed(2)), int: +o.intensity.toFixed(3), vis: o.visible }
    if (o.shadow) { rec.map = o.shadow.mapSize.toArray(); rec.bias = o.shadow.bias; rec.nb = o.shadow.normalBias; rec.rad = o.shadow.radius; rec.near = o.shadow.camera.near; rec.far = o.shadow.camera.far; rec.hasMap = !!o.shadow.map }
    if (o.isSpotLight) { rec.angle = +o.angle.toFixed(3); rec.pen = o.penumbra; rec.dist = o.distance }
    if (/\\.up$/.test(o.name)) ups.push(rec); else mains.push(rec)
  }
})
let casters = 0, meshes = 0
sc.traverse(o => { if (o.isMesh && o.visible) { meshes++; if (o.castShadow) casters++ } })
S.info = { battens: batt, ups, mains, casters, meshes, camY: +E.camera.position.y.toFixed(2), shadowType: E.renderer.shadowMap.type }
` }
  ],
  analyze: (S) => S.info
}
