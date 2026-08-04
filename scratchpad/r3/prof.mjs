import { readPng } from './px.mjs'
const a = readPng(process.argv[2])
const [x0,x1,step] = process.argv[4].split(',').map(Number)
for (const y of process.argv[3].split(',').map(Number)) {
  let s = ''
  for (let x = x0; x < x1; x += step) { const i = (y*a.w+x)*a.ch; s += String(Math.round(0.2126*a.data[i]+0.7152*a.data[i+1]+0.0722*a.data[i+2])).padStart(4) }
  console.log('y'+y+':'+s)
}
