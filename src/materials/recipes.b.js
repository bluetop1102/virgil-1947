// 금속·유리·직물·기타 레시피. 형식은 recipes.a.js와 동일하다.

export const RECIPES_B = {

  'brass.polished': {
    seed: 149, mult: 0.25, bump: 1.4,
    // 결(U축)을 따라 anisotropy 0.6 — 광택 황동의 하이라이트는 점이 아니라 결에 수직으로 늘어난다.
    mat: { anisotropy: 0.62, anisotropyRotation: 0.0, clearcoat: 0.0, envMapIntensity: 1.35, specularIntensity: 1.0 },
    opts: { stochastic: true, grunge: 0.10, grungeScale: 0.8, detail: 0.22, detailTile: 16.0, ao: 0.3, toks: 0.7, damp: 0.12 },
    glsl: `
float bBrush (vec2 uv) { return FBM(uv, vec2(6.0, 260.0), 3); }
float H (vec2 uv) { return 0.86 + bBrush(uv) * 0.14 - CRK(uv, vec2(12.0, 70.0), 0.008, 1.0) * 0.20; }
void SURF (vec2 uv, out vec3 alb, out float rgh, out float mtl, out float ao, out float alp) {
  float brush = bBrush(uv);
  float scr = CRK(uv, vec2(12.0, 70.0), 0.008, 1.0);
  float tarn = smoothstep(0.70, 0.92, FBM(uv, vec2(4.0), 4));
  alb = vec3(0.752, 0.548, 0.228) * (0.90 + 0.17 * brush);
  alb = mix(alb, vec3(0.238, 0.192, 0.108), tarn * 0.35);
  alb *= 1.0 - scr * 0.12;
  // 손이 닿는 곳만 닦여 광택이 살고 나머지는 흐려진다 — 러프니스 상수 금지(G3)
  float polish = smoothstep(0.42, 0.82, FBM(uv, vec2(2.5, 6.0), 4));
  float haze = cFbm(uv * vec2(2.0, 18.0), vec2(2.0, 18.0), 3) - 0.5;
  rgh = clamp(0.085 + brush * 0.085 + scr * 0.26 + tarn * 0.24 - polish * 0.045 + haze * 0.11, 0.02, 1.0);
  mtl = 1.0 - tarn * 0.14;
  ao = 1.0 - scr * 0.10;
  alp = 1.0;
}` },

  'brass.tarnished': {
    seed: 151, mult: 0.25, bump: 2.2,
    mat: { anisotropy: 0.40, anisotropyRotation: 0.0, specularIntensity: 1.0, envMapIntensity: 1.0 },
    opts: { stochastic: true, grunge: 0.18, grungeScale: 0.7, detail: 0.30, detailTile: 14.0, ao: 0.55, toks: 0.9, damp: 0.16 },
    glsl: `
float tPat (vec2 uv) { return smoothstep(0.34, 0.74, FBM(uv, vec2(3.5), 5)); }
float H (vec2 uv) { return 0.80 + tPat(uv) * 0.14 + FBM(uv, vec2(6.0, 190.0), 3) * 0.08 - CRK(uv, vec2(16.0), 0.010, 1.0) * 0.14; }
void SURF (vec2 uv, out vec3 alb, out float rgh, out float mtl, out float ao, out float alp) {
  float pat = tPat(uv);
  float verd = smoothstep(0.55, 0.86, FBM(uv, vec2(7.0), 4)) * pat;
  float brush = FBM(uv, vec2(6.0, 190.0), 3);
  alb = vec3(0.640, 0.462, 0.186) * (0.86 + 0.22 * brush);
  alb = mix(alb, vec3(0.0785, 0.1010, 0.0680), pat * 0.82);
  alb = mix(alb, vec3(0.1180, 0.1960, 0.1420), verd * 0.62);
  rgh = mix(0.155, 0.74, pat) + verd * 0.14;
  mtl = mix(0.98, 0.22, pat * 0.88);
  ao = 1.0 - pat * 0.28 - verd * 0.18;
  alp = 1.0;
}` },

  'steel.rusted': {
    seed: 163, mult: 0.5, bump: 3.0,
    mat: { envMapIntensity: 0.95 },
    opts: { triplanar: 0.9, grunge: 0.20, grungeScale: 0.55, detail: 0.42, detailTile: 11.0, ao: 0.7, toks: 1.6, damp: 0.24 },
    glsl: `
float rMask (vec2 uv) {
  float m = FBM(uv, vec2(3.0), 5);
  float run = FBM(uv, vec2(11.0, 1.5), 4);
  return clamp(smoothstep(0.42, 0.63, m) + smoothstep(0.66, 0.90, run) * 0.55, 0.0, 1.0);
}
float H (vec2 uv) {
  float r = rMask(uv);
  float pit = 1.0 - smoothstep(0.0, 0.11, WOR(uv, vec2(46.0), 1.0).x);
  return 0.74 + r * 0.16 - pit * r * 0.42 + FBM(uv, vec2(58.0), 3) * 0.08;
}
void SURF (vec2 uv, out vec3 alb, out float rgh, out float mtl, out float ao, out float alp) {
  float r = rMask(uv);
  float f = FBM(uv, vec2(30.0), 4);
  vec3 steel = vec3(0.292, 0.302, 0.318) * (0.88 + 0.24 * FBM(uv, vec2(20.0), 3));
  vec3 ox = mix(vec3(0.1580, 0.0605, 0.0242), vec3(0.2980, 0.1305, 0.0455), f);
  alb = mix(steel, ox, r);
  rgh = mix(0.325, 0.94, r) + f * 0.04;
  mtl = mix(1.0, 0.10, r);
  ao = 1.0 - r * 0.28;
  alp = 1.0;
}` },

  'steel.galvanized': {
    seed: 167, mult: 0.25, bump: 1.8,
    mat: { envMapIntensity: 1.1 },
    opts: { stochastic: true, grunge: 0.16, grungeScale: 0.6, detail: 0.28, detailTile: 12.0, ao: 0.5, toks: 1.0, damp: 0.16 },
    glsl: `
// 아연도금 스팽글은 손톱만 한 결정이다 — 셀이 크면 깨진 달걀 껍데기로 읽힌다
float H (vec2 uv) {
  vec3 w = WOR(uv, vec2(38.0), 1.0);
  return 0.80 + w.z * 0.10 - (1.0 - smoothstep(0.0, 0.020, w.y - w.x)) * 0.20;
}
void SURF (vec2 uv, out vec3 alb, out float rgh, out float mtl, out float ao, out float alp) {
  vec3 w = WOR(uv, vec2(38.0), 1.0);
  float edge = 1.0 - smoothstep(0.0, 0.020, w.y - w.x);
  float facet = w.z;
  alb = vec3(0.478, 0.492, 0.508) * (0.80 + 0.34 * facet) * (1.0 - edge * 0.26);
  float dirt = smoothstep(0.55, 0.84, FBM(uv, vec2(4.0), 4));
  alb = mix(alb, vec3(0.1080, 0.1120, 0.1080), dirt * 0.45);
  rgh = 0.26 + facet * 0.20 + dirt * 0.38 + edge * 0.10;
  mtl = 1.0 - dirt * 0.22;
  ao = 1.0 - edge * 0.22;
  alp = 1.0;
}` },

  'mirror.aged': {
    seed: 173, mult: 0.25, bump: 1.0,
    mat: { envMapIntensity: 1.5 },
    opts: { grunge: 0.09, grungeScale: 1.1, detail: 0.10, detailTile: 6.0, ao: 0.3, toks: 0.5, damp: 0.10 },
    glsl: `
float mLoss (vec2 uv) {
  vec3 w = WOR(uv, vec2(24.0), 1.0);
  float spot = step(0.72, w.z) * (1.0 - smoothstep(0.03, 0.19, w.x));
  float de = smoothstep(0.58, 0.84, FBM(uv, vec2(6.0), 5));
  float edge = 1.0 - smoothstep(0.0, 0.085, min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y)));
  return clamp(de * 0.80 + spot + edge * 0.55, 0.0, 1.0);
}
float H (vec2 uv) { return 0.9 - mLoss(uv) * 0.14; }
void SURF (vec2 uv, out vec3 alb, out float rgh, out float mtl, out float ao, out float alp) {
  float loss = mLoss(uv);
  float grime = smoothstep(0.55, 0.9, FBM(uv, vec2(3.0, 12.0), 4));
  alb = mix(vec3(0.958, 0.952, 0.940), vec3(0.1020, 0.0855, 0.0665), loss);
  alb = mix(alb, vec3(0.240, 0.230, 0.215), grime * 0.28);
  rgh = mix(0.030, 0.82, loss) + grime * 0.12;
  mtl = mix(1.0, 0.12, loss);
  ao = 1.0 - loss * 0.18;
  alp = 1.0;
}` },

  'glass.clear': {
    seed: 179, mult: 0.25, bump: 0.8,
    mat: { transparent: true, opacity: 1.0, depthWrite: false, side: 2, ior: 1.52, specularIntensity: 1.0, envMapIntensity: 1.4 },
    opts: { grunge: 0.14, grungeScale: 0.8, detail: 0.08, detailTile: 6.0, ao: 0.15, toks: 0.3, damp: 0 },
    glsl: `
float H (vec2 uv) { return 0.9 + FBM(uv, vec2(3.0, 40.0), 4) * 0.10; }
void SURF (vec2 uv, out vec3 alb, out float rgh, out float mtl, out float ao, out float alp) {
  float streak = smoothstep(0.56, 0.90, FBM(uv, vec2(3.0, 40.0), 4));
  float dust = smoothstep(0.62, 0.88, FBM(uv, vec2(20.0), 4));
  float grime = clamp(streak * 0.45 + dust * 0.55, 0.0, 1.0);
  alb = mix(vec3(0.840, 0.862, 0.880), vec3(0.400, 0.376, 0.330), grime);
  rgh = 0.028 + grime * 0.34;
  mtl = 0.0;
  ao = 1.0;
  alp = 0.055 + grime * 0.62;
}` },

  'glass.frosted': {
    seed: 181, mult: 0.25, bump: 2.6,
    mat: { transparent: true, opacity: 1.0, depthWrite: false, side: 2, ior: 1.52, envMapIntensity: 1.0 },
    opts: { grunge: 0.12, grungeScale: 0.8, detail: 0.30, detailTile: 18.0, ao: 0.2, toks: 0.6, damp: 0 },
    glsl: `
float H (vec2 uv) {
  vec3 w = WOR(uv, vec2(70.0), 1.0);
  return 0.6 + w.x * 0.4 + FBM(uv, vec2(120.0), 3) * 0.18;
}
void SURF (vec2 uv, out vec3 alb, out float rgh, out float mtl, out float ao, out float alp) {
  float f = FBM(uv, vec2(90.0), 3);
  vec3 w = WOR(uv, vec2(70.0), 1.0);
  alb = vec3(0.780, 0.800, 0.815) * (0.90 + 0.16 * f);
  rgh = 0.46 + f * 0.16 + w.x * 0.10;
  mtl = 0.0;
  ao = 1.0;
  alp = 0.56 + f * 0.16;
}` },

  'fabric.velvet.red': {
    seed: 191, mult: 0.25, bump: 1.6,
    // 벨벳의 정체는 그레이징 각에서 터지는 sheen 롭이다. sheenRoughness가 크면 롭이 퍼져
    // 램버시안과 구분이 안 되므로 좁게 잡고, toks가 러프니스를 1.0으로 밀어올리지 않게 낮춘다.
    mat: { sheen: 1.0, sheenRoughness: 0.22, sheenColor: 0xc0584a, specularIntensity: 0.9, envMapIntensity: 0.60 },
    opts: { stochastic: true, grunge: 0.17, grungeScale: 0.7, detail: 0.50, detailTile: 26.0, ao: 0.6, toks: 1.1, damp: 0.24 },
    glsl: `
float H (vec2 uv) { return 0.5 + FBM(uv, vec2(190.0), 3) * 0.35 + FBM(uv, vec2(9.0, 5.0), 3) * 0.15; }
void SURF (vec2 uv, out vec3 alb, out float rgh, out float mtl, out float ao, out float alp) {
  float pile = FBM(uv, vec2(190.0), 3);
  float crush = FBM(uv, vec2(6.0, 3.0), 4);
  float wear = smoothstep(0.62, 0.92, FBM(uv, vec2(3.0), 4));
  // 벨벳은 파일이 누운 방향에 따라 명도가 갈린다 — 진폭이 작으면 플라스틱으로 읽힌다
  alb = vec3(0.0590, 0.0058, 0.0060) * (0.52 + 0.92 * pile) * (0.68 + 0.64 * crush);
  alb = mix(alb, vec3(0.0745, 0.0245, 0.0165), wear * 0.5);
  // 눌린 파일과 곤두선 파일의 러프니스 차 — 하이라이트가 뭉개진 궤적으로 흐른다
  rgh = clamp(0.62 - crush * 0.20 - wear * 0.12 + (pile - 0.5) * 0.18, 0.24, 1.0);
  mtl = 0.0;
  ao = 0.88 + 0.12 * pile - crush * 0.06;
  alp = 1.0;
}` },

  'fabric.wool.suit': {
    seed: 193, mult: 0.25, bump: 2.4,
    mat: { sheen: 0.60, sheenRoughness: 0.38, sheenColor: 0x8b90a0, specularIntensity: 0.85, envMapIntensity: 0.55 },
    opts: { stochastic: true, grunge: 0.12, grungeScale: 0.9, detail: 0.55, detailTile: 30.0, ao: 0.6, toks: 1.3, damp: 0.15 },
    glsl: `
float wTwill (vec2 uv) {
  float d = fract(uv.x * 96.0 + uv.y * 96.0);
  float t = abs(d - 0.5) * 2.0;
  return t * (0.7 + 0.3 * FBM(uv, vec2(190.0), 2));
}
float H (vec2 uv) { return 0.55 + wTwill(uv) * 0.30 + FBM(uv, vec2(230.0), 2) * 0.15; }
void SURF (vec2 uv, out vec3 alb, out float rgh, out float mtl, out float ao, out float alp) {
  float tw = wTwill(uv);
  float fuzz = FBM(uv, vec2(230.0), 3);
  float slub = FBM(uv, vec2(24.0, 12.0), 3);
  alb = vec3(0.0296, 0.0308, 0.0352) * (0.72 + 0.62 * tw) * (0.88 + 0.26 * fuzz);
  alb = mix(alb, alb * 1.5, smoothstep(0.7, 0.95, slub) * 0.4);
  // 팔꿈치·무릎이 반들거리는 모직 특유의 광택 편차
  float shine = smoothstep(0.55, 0.88, FBM(uv, vec2(2.0), 4));
  rgh = clamp(0.80 - tw * 0.10 - shine * 0.22 + (fuzz - 0.5) * 0.12, 0.28, 1.0);
  mtl = 0.0;
  ao = 0.86 + 0.14 * tw;
  alp = 1.0;
}` },

  'leather.worn.brown': {
    seed: 197, mult: 0.25, bump: 3.0,
    mat: { clearcoat: 0.32, clearcoatRoughness: 0.42, sheen: 0.10, sheenRoughness: 0.6, envMapIntensity: 0.8 },
    opts: { stochastic: true, grunge: 0.16, grungeScale: 0.75, detail: 0.45, detailTile: 20.0, ao: 0.65, toks: 1.6, damp: 0.16 },
    glsl: `
float lPore (vec2 uv) { return 1.0 - smoothstep(0.0, 0.07, WOR(uv, vec2(72.0), 1.0).x); }
float lCrease (vec2 uv) { return CRK(uv, vec2(9.0), 0.022, 0.85); }
float H (vec2 uv) {
  vec3 c = WOR(uv, vec2(26.0), 1.0);
  return 0.72 + smoothstep(0.0, 0.12, c.y - c.x) * 0.18 - lPore(uv) * 0.24 - lCrease(uv) * 0.36;
}
void SURF (vec2 uv, out vec3 alb, out float rgh, out float mtl, out float ao, out float alp) {
  vec3 c = WOR(uv, vec2(26.0), 1.0);
  float pore = lPore(uv), crease = lCrease(uv);
  float wear = smoothstep(0.48, 0.86, FBM(uv, vec2(4.0), 4));
  alb = vec3(0.0392, 0.0202, 0.0112) * (0.84 + 0.32 * c.z);
  alb = mix(alb, vec3(0.0805, 0.0512, 0.0298), wear * 0.55);
  alb *= 1.0 - pore * 0.32 - crease * 0.45;
  rgh = mix(0.70, 0.33, wear) + pore * 0.18 + crease * 0.10;
  mtl = 0.0;
  ao = 1.0 - pore * 0.28 - crease * 0.42;
  alp = 1.0;
}` },

  'water.dark': {
    seed: 199, mult: 0.25, bump: 1.1,
    mat: { ior: 1.333, envMapIntensity: 1.3, specularIntensity: 1.0 },
    opts: { flow: 0.35, grunge: 0.07, grungeScale: 0.35, detail: 0.14, detailTile: 3.0, ao: 0.1, repeat: [2, 2], toks: 0.2, damp: 0 },
    glsl: `
float H (vec2 uv) { return FBM(uv, vec2(7.0), 4) * 0.6 + FBM(uv, vec2(19.0), 3) * 0.4; }
void SURF (vec2 uv, out vec3 alb, out float rgh, out float mtl, out float ao, out float alp) {
  float slick = smoothstep(0.5, 0.85, FBM(uv, vec2(3.0), 4));
  alb = mix(vec3(0.0055, 0.0082, 0.0095), vec3(0.0140, 0.0125, 0.0090), slick * 0.6);
  rgh = 0.038 + FBM(uv, vec2(9.0), 3) * 0.05 + slick * 0.06;
  mtl = 0.0;
  ao = 1.0;
  alp = 1.0;
}` },

  'bakelite.black': {
    seed: 211, mult: 0.125, bump: 1.6,
    mat: { clearcoat: 0.38, clearcoatRoughness: 0.16, envMapIntensity: 0.9 },
    opts: { grunge: 0.09, grungeScale: 1.4, detail: 0.16, detailTile: 20.0, ao: 0.35, toks: 0.7, damp: 0.10 },
    glsl: `
float bSeam (vec2 uv) { float s = fract(uv.y * 2.0); return 1.0 - smoothstep(0.003, 0.012, abs(s - 0.5)); }
float H (vec2 uv) { return 0.86 + FBM(uv, vec2(90.0), 3) * 0.10 - bSeam(uv) * 0.22 - CRK(uv, vec2(40.0), 0.005, 1.0) * 0.12; }
void SURF (vec2 uv, out vec3 alb, out float rgh, out float mtl, out float ao, out float alp) {
  float mold = FBM(uv, vec2(90.0), 3);
  float scr = CRK(uv, vec2(40.0), 0.005, 1.0);
  float seam = bSeam(uv);
  alb = vec3(0.0148, 0.0122, 0.0112) * (0.88 + 0.24 * mold);
  alb = mix(alb, vec3(0.0480, 0.0380, 0.0290), scr * 0.5);
  rgh = 0.205 + mold * 0.07 + scr * 0.30 + seam * 0.18;
  mtl = 0.0;
  ao = 1.0 - seam * 0.25;
  alp = 1.0;
}` },

  // 세탁 카트 자루용 면 캔버스(코튼 덕). fabric.wool.suit(알베도 0.03 짙은 감청)를 쓰면
  // 전경 자루가 통째로 검은 구멍이 돼 재질이 사라진다(심사 D4). 캔버스는 표백 안 한 생지라
  // 밝고, 세탁물이 닿는 자리부터 회색으로 눌어붙는다.
  // 조직 주기는 자루 전체 UV 기준이다. 78×52 는 둘레 2.3m 짜리 자루에서 셀이 3cm 로
  // 나와 캔버스가 아니라 등나무 바구니로 읽혔다(심사 D4 "디테일 0의 자루"의 잔여분).
  // 1.3cm 로 내리고 텍스처를 512 → 1024 로 올려 셀당 5px 를 확보한다.
  'canvas.laundry': {
    seed: 223, mult: 0.5, bump: 3.0,
    mat: { sheen: 0.34, sheenRoughness: 0.62, sheenColor: 0x9a9184, specularIntensity: 0.55, envMapIntensity: 0.45 },
    opts: { stochastic: true, grunge: 0.30, grungeScale: 0.9, detail: 0.60, detailTile: 26.0, ao: 0.62, toks: 1.3, damp: 0.30 },
    glsl: `
// 덕 캔버스는 굵은 씨실 2올을 날실 1올이 넘는 바스켓 조직이다 — 능직(twill)의 사선이 아니라
// 격자가 나와야 하고, 올 굵기가 고르지 않아야 산업용 자루로 읽힌다.
float cWeave (vec2 uv) {
  vec2 t = uv * vec2(176.0, 118.0);
  float wx = abs(fract(t.x) - 0.5) * 2.0;
  float wy = abs(fract(t.y) - 0.5) * 2.0;
  float over = step(0.5, fract(t.y * 0.5 + floor(t.x) * 0.5));
  float f = mix(1.0 - wx, 1.0 - wy, over);
  float slub = 0.80 + 0.40 * FBM(uv, vec2(19.0, 7.0), 3);   // 올 굵기 편차
  return clamp(f * slub, 0.0, 1.0);
}
float cCrease (vec2 uv) {
  vec2 w = WRP(uv, vec2(3.0), 0.22, 3);
  return smoothstep(0.44, 0.90, FBM(w, vec2(5.0, 2.4), 4));
}
// 박음질 이음선 — 자루 둘레를 네 조각으로 자른 세로 솔기 + 밑단 헴 두 줄.
// 지오메트리 쪽 seam(정점 함몰)만으로는 실이 안 보인다. 실 자국을 알베도·높이에 같이 넣는다.
float cStitch (vec2 uv) {
  float v = fract(uv.x * 4.0 + 0.5);
  float run = 1.0 - smoothstep(0.006, 0.016, min(v, 1.0 - v));
  float dash = step(0.42, fract(uv.y * 96.0));            // 땀 간격
  float hem = 1.0 - smoothstep(0.008, 0.019, abs(fract(uv.y * 1.0 - 0.085) - 0.5) - 0.485);
  return clamp(max(run * (0.35 + 0.65 * dash), hem * 0.8), 0.0, 1.0);
}
float H (vec2 uv) { return 0.52 + cWeave(uv) * 0.34 + cCrease(uv) * 0.14 - cStitch(uv) * 0.26; }
void SURF (vec2 uv, out vec3 alb, out float rgh, out float mtl, out float ao, out float alp) {
  float wv = cWeave(uv), cr = cCrease(uv), st = cStitch(uv);
  // 이 자루는 카메라를 향한 면이 어느 실광원도 안 받는 자리에 선다 — 알베도가 낮으면 조명이
  // 아니라 재질 탓으로 검게 죽는다. 생지 캔버스의 실제 반사율(0.55~0.65)을 그대로 쓴다.
  vec3 raw = vec3(0.3820, 0.3390, 0.2680);
  alb = raw * (0.70 + 0.46 * wv);
  // 접힌 골에 때가 앉는다. 얼룩은 두 층으로 — 넓게 눌어붙은 회색 + 국지 갈색 오점
  float grey = smoothstep(0.40, 0.86, FBM(uv, vec2(2.4), 4));
  alb = mix(alb, vec3(0.1180, 0.1105, 0.1010), grey * 0.62);
  alb *= 1.0 - cr * 0.38;
  alb = mix(alb, vec3(0.2180, 0.1930, 0.1520), st * 0.62);   // 실은 천보다 어둡고 때가 먼저 낀다
  float spot = smoothstep(0.70, 0.93, FBM(uv, vec2(6.5, 5.0), 4));
  alb = mix(alb, vec3(0.0880, 0.0576, 0.0330), spot * 0.72);
  // 물 얼룩의 갈색 테두리
  float sf = FBM(uv, vec2(3.2), 4);
  float halo = clamp(smoothstep(0.560, 0.600, sf) - smoothstep(0.625, 0.690, sf), 0.0, 1.0);
  alb = mix(alb, vec3(0.1440, 0.0940, 0.0460), halo * 0.55);
  rgh = clamp(0.86 - wv * 0.10 + cr * 0.06 + grey * 0.05 - st * 0.16, 0.42, 1.0);
  mtl = 0.0;
  ao = 0.78 + 0.22 * wv - cr * 0.10 - st * 0.14;
  alp = 1.0;
}` },

  // 액자 속 인쇄물. paper.aged 는 빈 종이라 액자가 "무텍스처 크림색 슬래브"로 읽힌다(심사 D4).
  // 1940년대 호텔 복도에 걸리는 것은 도시 풍경 포토그라뷰어다 — 지평선·건물 실루엣·비네트가
  // 있으면 6m 밖에서도 "그림이 걸려 있다"로 읽힌다.
  'print.photogravure': {
    seed: 227, mult: 0.25, bump: 1.0,
    mat: { clearcoat: 0.10, clearcoatRoughness: 0.55, envMapIntensity: 0.55 },
    opts: { grunge: 0.16, grungeScale: 1.6, detail: 0.20, detailTile: 16.0, ao: 0.30, toks: 0.9, damp: 0.14 },
    glsl: `
// 스카이라인 — 폭·높이가 제각각인 블록 실루엣. 값 층이 세 개(하늘·원경·근경)라야 사진이 된다
float pSky (vec2 uv, float lo, float amp, float n, float sd) {
  float x = uv.x * n;
  float i = floor(x);
  float h = lo + amp * cHash11(i * 1.37 + sd);
  float roof = step(uv.y, h);
  // 굴뚝·물탱크
  float f = fract(x);
  float ch = step(0.62, cHash11(i * 2.9 + sd + 4.1)) * step(abs(f - 0.68), 0.09);
  return max(roof, ch * step(uv.y, h + 0.055));
}
float H (vec2 uv) { return 0.5 + FBM(uv, vec2(140.0), 2) * 0.5; }
void SURF (vec2 uv, out vec3 alb, out float rgh, out float mtl, out float ao, out float alp) {
  vec2 p = uv;
  float sky = 0.86 - 0.34 * p.y + 0.10 * FBM(p, vec2(2.0), 3);
  float far = pSky(p, 0.44, 0.13, 11.0, 0.0);
  float near = pSky(p, 0.30, 0.16, 6.0, 21.7);
  float v = sky;
  v = mix(v, 0.30 + 0.10 * FBM(p, vec2(9.0, 3.0), 3), far);
  v = mix(v, 0.13 + 0.07 * FBM(p, vec2(14.0, 5.0), 3), near);
  // 창문 격자 — 근경 블록에만
  float win = step(0.55, fract(p.x * 74.0)) * step(0.55, fract(p.y * 46.0));
  v += near * win * 0.16 * step(0.5, cHash12(floor(p * vec2(74.0, 46.0))));
  // 인쇄망점과 잉크 얼룩
  v *= 0.90 + 0.16 * FBM(p, vec2(150.0), 2);
  // 비네트 + 가장자리 퇴색
  vec2 q = (p - 0.5) * 2.0;
  v *= 1.0 - 0.34 * dot(q, q) * 0.5;
  float edge = smoothstep(0.72, 1.0, max(abs(q.x), abs(q.y)));
  v = mix(v, v * 1.25 + 0.12, edge * 0.55);
  // 폭싱(갈색 반점) — 오래된 인화지의 서명
  float fox = smoothstep(0.74, 0.94, FBM(p, vec2(11.0), 4));
  vec3 sep = vec3(1.0, 0.86, 0.66);            // 세피아 토닝
  alb = pow(vec3(clamp(v, 0.02, 1.0)), vec3(2.2)) * sep * 0.62;
  alb = mix(alb, vec3(0.0640, 0.0345, 0.0150), fox * 0.55);
  rgh = clamp(0.46 + FBM(p, vec2(60.0), 2) * 0.14 + fox * 0.16, 0.20, 1.0);
  mtl = 0.0;
  ao = 1.0;
  alp = 1.0;
}` },


  // recipes.a.js 500줄 초과로 이관(§11). 성격상 "기타"에 해당한다.

  'paper.aged': {
    seed: 109, mult: 0.25, bump: 1.2,
    mat: { sheen: 0.40, sheenRoughness: 0.45, sheenColor: 0xbfae8a, specularIntensity: 0.9, envMapIntensity: 0.7 },
    opts: { grunge: 0.06, grungeScale: 1.6, detail: 0.20, detailTile: 14.0, ao: 0.35, toks: 0.8, damp: 0 },
    glsl: `
float H (vec2 uv) {
  float fold = 1.0 - smoothstep(0.0, 0.010, abs(uv.y - 0.48 - FBM(uv, vec2(3.0, 1.0), 2) * 0.03));
  return 0.7 + FBM(uv, vec2(150.0, 130.0), 3) * 0.30 - fold * 0.35;
}
void SURF (vec2 uv, out vec3 alb, out float rgh, out float mtl, out float ao, out float alp) {
  float fiber = FBM(uv, vec2(150.0, 130.0), 3);
  vec3 c = vec3(0.545, 0.487, 0.368) * (0.90 + 0.17 * fiber);
  vec3 fw = WOR(uv, vec2(28.0), 1.0);
  float fox = step(0.78, fw.z) * (1.0 - smoothstep(0.02, 0.20, fw.x));
  c = mix(c, vec3(0.272, 0.176, 0.088), fox * 0.72);
  float edge = 1.0 - smoothstep(0.0, 0.11, min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y)));
  c = mix(c, vec3(0.300, 0.240, 0.145), edge * 0.55);
  alb = c;
  // 캘린더 롤러가 눌러 반들거리는 띠 — 종이도 러프니스 상수가 아니다
  float cal = cFbm(uv * vec2(1.8, 14.0), vec2(1.8, 14.0), 3) - 0.5;
  rgh = clamp(0.78 - fox * 0.06 + edge * 0.06 + cal * 0.20, 0.32, 1.0);
  mtl = 0.0;
  ao = 1.0 - edge * 0.15;
  alp = 1.0;
}` },

  'ceramic.sink': {
    seed: 127, mult: 0.25, bump: 2.0,
    mat: { clearcoat: 1.0, clearcoatRoughness: 0.045, envMapIntensity: 1.2 },
    opts: { grunge: 0.10, grungeScale: 0.9, detail: 0.18, detailTile: 10.0, ao: 0.4, toks: 0.8, damp: 0.20 },
    glsl: `
float H (vec2 uv) { return 0.85 - CRK(uv, vec2(30.0), 0.006, 1.0) * 0.30 + FBM(uv, vec2(60.0), 3) * 0.06; }
void SURF (vec2 uv, out vec3 alb, out float rgh, out float mtl, out float ao, out float alp) {
  float craze = CRK(uv, vec2(30.0), 0.006, 1.0);
  float run = smoothstep(0.58, 0.86, FBM(uv, vec2(4.0, 1.5), 4));
  float rust = smoothstep(0.74, 0.92, FBM(uv, vec2(3.0, 1.1), 4));
  vec3 c = vec3(0.748, 0.758, 0.768);
  c = mix(c, vec3(0.430, 0.386, 0.318), craze * 0.55);
  c = mix(c, vec3(0.330, 0.276, 0.210), run * 0.32);
  c = mix(c, vec3(0.300, 0.152, 0.068), rust * 0.55);
  alb = c;
  // 유약 도자기 = 좁은 롭. 그 위에 행주 자국(가로 8:1)만 얹어 하이라이트가 늘어지게 한다.
  float wipe = cFbm(uv * vec2(2.6, 21.0), vec2(2.6, 21.0), 3) - 0.5;
  float finger = smoothstep(0.66, 0.90, FBM(uv, vec2(11.0), 3));
  rgh = clamp(0.062 + craze * 0.26 + run * 0.14 + rust * 0.30 + wipe * 0.16 + finger * 0.12, 0.02, 1.0);
  mtl = 0.0;
  ao = 1.0 - craze * 0.30;
  alp = 1.0;
}` },

  'grime.overlay': {
    seed: 131, mult: 0.25, bump: 1.0,
    mat: { transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, envMapIntensity: 0.4 },
    opts: { grunge: 0.35, grungeScale: 0.5, detail: 0.25, detailTile: 8.0, ao: 0.3, toks: 1.0, damp: 0 },
    glsl: `
float H (vec2 uv) { return FBM(uv, vec2(14.0), 4); }
void SURF (vec2 uv, out vec3 alb, out float rgh, out float mtl, out float ao, out float alp) {
  float m = FBM(uv, vec2(5.0), 5);
  float d = FBM(uv, vec2(26.0), 3);
  float e = smoothstep(0.42, 0.74, m);
  alb = mix(vec3(0.0400, 0.0345, 0.0270), vec3(0.0145, 0.0122, 0.0100), e) * (0.8 + 0.4 * d);
  rgh = 0.95 - e * 0.06;
  mtl = 0.0;
  ao = 1.0 - e * 0.35;
  alp = clamp(smoothstep(0.34, 0.78, m) * 0.88 + d * 0.10, 0.0, 1.0);
}` },

}
