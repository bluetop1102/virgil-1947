// atmo-corridor-night 카메라로 월드 좌표 → 픽셀 투영. 측정선을 눈대중이 아니라 지오메트리로 잡는다.
const P = [0.4, -498.40, 6.2], T = [-0.4, -498.65, -6.0], FOV = 32, W = 2560, H = 1440
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const nz = a => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l] }
const f = nz(sub(T, P)), r = nz(cr(f, [0, 1, 0])), u = cr(r, f)
const t = Math.tan(FOV * Math.PI / 360), asp = W / H
export function px (w) {
  const d = sub(w, P), z = -dot(d, [-f[0], -f[1], -f[2]])
  const zc = dot(d, f)
  const x = dot(d, r) / (zc * t * asp), y = dot(d, u) / (zc * t)
  return [Math.round((x * 0.5 + 0.5) * W), Math.round((0.5 - y * 0.5) * H), +zc.toFixed(2)]
}
if (process.argv[2]) {
  for (const s of process.argv.slice(2)) {
    const w = s.split(',').map(Number)
    console.log(s, '->', px([w[0], -500 + w[1], w[2]]))
  }
}
