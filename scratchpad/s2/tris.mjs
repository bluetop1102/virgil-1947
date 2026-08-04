import { INTERIORS } from '../../src/world/atmo/spaces.js'
const { root } = INTERIORS['corridor-night']()
const acc = new Map()
root.traverse(o => {
  if (!o.isMesh) return
  const g = o.geometry
  const n = g.index ? g.index.count / 3 : g.attributes.position.count / 3
  let p = o, path = []
  while (p) { path.push(p.name || p.type); p = p.parent }
  const key = path.slice(0, 3).reverse().join('/')
  acc.set(key, (acc.get(key) || 0) + n)
})
const rows = [...acc.entries()].sort((a, b) => b[1] - a[1])
let t = 0
for (const [k, v] of rows) { t += v; console.log(String(Math.round(v)).padStart(8), k) }
console.log('TOTAL', Math.round(t))
