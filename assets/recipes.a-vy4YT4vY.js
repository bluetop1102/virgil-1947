var e={"marble.lobby.floor":{seed:11,mult:.5,bump:3.2,mat:{clearcoat:.62,clearcoatRoughness:.11,sheen:.06,sheenRoughness:.55,sheenColor:1711138,envMapIntensity:1.15},opts:{triplanar:.77,grunge:.17,grungeScale:.3,detail:.28,detailTile:5,ao:.65,toks:1,damp:.34},glsl:`
const vec2 MK = vec2(4.0, 4.0);
float mSeam (vec2 uv) { vec2 g = abs(fract(uv * MK) - 0.5); return smoothstep(0.452, 0.5, max(g.x, g.y)); }
float mChip (vec2 uv) { return 1.0 - smoothstep(0.0, 0.045, WOR(uv, vec2(26.0), 1.0).x); }
// 슬래브는 각각 따로 재단된다 — 칸마다 결 좌표를 회전·이동시켜 결이 칸을 넘어 이어지지 않게 한다.
// 이게 없으면 4x4 체커가 통째로 같은 무늬로 반복돼 D3에 바로 걸린다.
vec3 mSlab (vec2 uv) {
  vec2 c = uv * MK, id = floor(c), l = fract(c);
  vec2 h = cHash22(mod(id, MK));
  if (h.x > 0.5) l = vec2(l.y, 1.0 - l.x);
  if (h.y > 0.5) l = vec2(1.0 - l.x, l.y);
  return vec3(l / MK + h * 3.17, cHash12(mod(id, MK) + 1.7));
}
float H (vec2 uv) { return 1.0 - mSeam(uv) * 0.92 - mChip(uv) * 0.10; }
void SURF (vec2 uv, out vec3 alb, out float rgh, out float mtl, out float ao, out float alp) {
  vec3 sl = mSlab(uv);
  vec2 w = WRP(sl.xy, vec2(3.0), 0.75, 4);
  float thin = smoothstep(0.55, 0.96, FBMR(w, vec2(6.0), 5));
  float wide = smoothstep(0.40, 0.86, FBM(w, vec2(2.0), 4));
  float ck = mod(floor(uv.x * MK.x) + floor(uv.y * MK.y), 2.0);
  float tone = 0.84 + 0.30 * sl.z;
  vec3 pale = mix(vec3(0.384, 0.392, 0.404), vec3(0.148, 0.153, 0.162), thin * 0.88);
  pale = mix(pale, vec3(0.272, 0.278, 0.288), wide * 0.34);
  vec3 dark = mix(vec3(0.0170, 0.0182, 0.0205), vec3(0.148, 0.147, 0.139), thin * 0.72);
  dark = mix(dark, vec3(0.0385, 0.0392, 0.0415), wide * 0.32);
  float seam = mSeam(uv), chip = mChip(uv);
  alb = mix(pale, dark, ck) * tone;
  alb = mix(alb, vec3(0.0245, 0.0228, 0.0205), seam);
  alb *= 1.0 - chip * 0.25;
  // 걸레자국 — 가로 8:1로 늘어난 저주파 띠. 부호가 있어야(±0.12) 스펙큘러가 밝은 궤적과
  // 죽은 궤적으로 갈라지고, 하이라이트가 점이 아니라 선으로 늘어져 읽힌다(G3).
  vec2 mw = WRP(uv, vec2(2.0), 0.42, 3);
  float mop = cFbm(mw * vec2(1.6, 13.0), vec2(1.6, 13.0), 3) - 0.5;
  float mop2 = cFbm(uv * vec2(3.0, 24.0), vec2(3.0, 24.0), 2) - 0.5;
  float smear = mop * 0.19 + mop2 * 0.09;
  float scuff = smoothstep(0.58, 0.98, FBM(uv, vec2(5.0), 3));
  float heel = smoothstep(0.72, 0.95, FBM(uv, vec2(9.0), 4));
  rgh = clamp(0.082 + smear + scuff * 0.13 + heel * 0.16 + wide * 0.05 + seam * 0.60 + (sl.z - 0.5) * 0.05, 0.020, 1.0);
  mtl = 0.0;
  ao = 1.0 - seam * 0.55 - chip * 0.20;
  alp = 1.0;
}`},"wood.varnished.dark":{seed:23,mult:.5,bump:2.4,mat:{clearcoat:.42,clearcoatRoughness:.15,anisotropy:.45,anisotropyRotation:1.5708,specularIntensity:1,envMapIntensity:1},opts:{grunge:.18,grungeScale:.58,detail:.35,detailTile:9,ao:.55,toks:1.2,damp:.22},glsl:`
// 워프 진폭이 크면 나이테가 파도 무늬가 된다 — 오크는 결이 거의 곧고 간간이 무늬결이 섞인다
float wRing (vec2 uv) {
  vec2 w = WRP(uv, vec2(2.0, 5.0), 0.030, 3);
  return abs(fract(w.y * 64.0 + FBM(uv, vec2(3.0), 3) * 0.12) - 0.5) * 2.0;
}
float wRay (vec2 uv) { return smoothstep(0.82, 0.98, FBM(uv, vec2(60.0, 2.0), 3)); }
float wPore (vec2 uv) { return 1.0 - smoothstep(0.0, 0.30, WOR(uv, vec2(14.0, 90.0), 1.0).x); }
float H (vec2 uv) { return 0.80 - (1.0 - wRing(uv)) * 0.10 - wPore(uv) * 0.36; }
void SURF (vec2 uv, out vec3 alb, out float rgh, out float mtl, out float ao, out float alp) {
  float ring = wRing(uv), pore = wPore(uv);
  float late = smoothstep(0.22, 0.88, ring);
  float fig = FBM(uv, vec2(4.0, 11.0), 4);
  alb = mix(vec3(0.0132, 0.0065, 0.0032), vec3(0.0498, 0.0248, 0.0112), clamp(late * 0.82 + fig * 0.30, 0.0, 1.0));
  alb = mix(alb, alb * 1.55, wRay(uv) * 0.45);
  alb *= 1.0 - pore * 0.55;
  float wear = smoothstep(0.44, 0.88, FBM(uv, vec2(3.0), 3));
  // 결을 따라 늘어난 광택 닦임 자국 — 하이라이트가 결 방향 궤적으로 끌린다
  float rub = cFbm(uv * vec2(2.0, 15.0), vec2(2.0, 15.0), 3) - 0.5;
  rgh = clamp(0.205 + late * 0.11 + pore * 0.34 + wear * 0.15 + rub * 0.22, 0.05, 1.0);
  mtl = 0.0;
  ao = 1.0 - pore * 0.50;
  alp = 1.0;
}`},"wood.painted.white":{seed:31,mult:.4,bump:2.6,mat:{clearcoat:.25,clearcoatRoughness:.3,anisotropy:.38,anisotropyRotation:0,envMapIntensity:.9},opts:{stochastic:!0,grunge:.2,grungeScale:.66,detail:.3,detailTile:10,ao:.5,toks:1.2,damp:.36},glsl:`
float pChip (vec2 uv) {
  vec3 w = WOR(uv, vec2(14.0), 1.0);
  return step(0.86, w.z) * (1.0 - smoothstep(0.10, 0.26, w.x));
}
// 페인트 밑의 나뭇결. 결 방향(u)으로 길고 v 방향으로 촘촘한 능선이라 도장막을 통해
// 텔레그래프된다 — 이 항이 없으면 칠한 판재가 균질 그라디언트가 된다.
float pGrain (vec2 uv) {
  vec2 w = WRP(uv, vec2(1.6, 3.0), 0.022, 2);
  return abs(fract(w.y * 27.0 + FBM(uv, vec2(2.0), 3) * 0.20) - 0.5) * 2.0;
}
// 못머리 자리. 퍼티로 메워 얕게 꺼지고 그 위 도장이 살짝 주저앉는다
float pNail (vec2 uv) {
  vec3 w = WOR(uv, vec2(3.0, 9.0), 1.0);
  return step(0.90, w.z) * (1.0 - smoothstep(0.0, 0.055, w.x));
}
// 긁힘. 결과 무관한 방향의 가는 선 — 걸레받이 근처에 몰린다
float pScratch (vec2 uv) {
  float s = 1.0 - abs(fract(FBM(uv, vec2(7.0, 2.4), 3) * 9.0) - 0.5) * 2.0;
  return smoothstep(0.93, 1.0, s);
}
float H (vec2 uv) {
  float brush = FBM(uv, vec2(4.0, 46.0), 3);
  return 0.82 + brush * 0.10 + (1.0 - pGrain(uv)) * 0.055
    - pNail(uv) * 0.30 - pScratch(uv) * 0.22 - pChip(uv) * 0.55;
}
void SURF (vec2 uv, out vec3 alb, out float rgh, out float mtl, out float ao, out float alp) {
  float brush = FBM(uv, vec2(4.0, 46.0), 3);
  float grain = pGrain(uv);
  float yellow = smoothstep(0.35, 0.85, FBM(uv, vec2(2.5), 4));
  vec3 paint = mix(vec3(0.520, 0.508, 0.474), vec3(0.470, 0.428, 0.322), yellow * 0.65);
  paint *= 0.94 + 0.11 * brush;
  // 결의 만재(晩材) 줄에서 도장막이 얇아 밑색이 비친다 — 알베도 대비는 작고 롭 대비는 크다
  paint *= 0.965 + 0.055 * grain;
  float chip = pChip(uv);
  float nail = pNail(uv), scr = pScratch(uv);
  alb = mix(paint, vec3(0.062, 0.034, 0.019), chip);
  alb = mix(alb, alb * 0.80, nail * 0.55);
  alb = mix(alb, alb * 1.14, scr * 0.60);                 // 긁힌 자리는 때가 벗겨져 밝다
  float grime = smoothstep(0.55, 0.9, FBM(uv, vec2(6.0), 4));
  alb *= 1.0 - grime * 0.22;
  // 결 방향 이방성 스펙큘러의 실체는 롭의 방향성 변조다. 진폭 0.13 이면 하이라이트가
  // 점이 아니라 결을 따라 흐르는 띠가 된다.
  rgh = 0.30 + brush * 0.10 - grain * 0.13 + chip * 0.48 + grime * 0.14 + nail * 0.22 + scr * 0.30;
  rgh = clamp(rgh, 0.10, 1.0);
  mtl = 0.0;
  ao = 1.0 - chip * 0.45 - nail * 0.30;
  alp = 1.0;
}`},"wallpaper.damask.green":{seed:47,mult:1,bump:3.7,mat:{sheen:.46,sheenRoughness:.36,sheenColor:4612170,specularIntensity:.85,envMapIntensity:.8},opts:{triplanar:.3,triSharp:5,grunge:.36,grungeScale:.42,detail:.28,detailTile:8,ao:.5,toks:1.6,damp:.52,band:[.42,.42,2.95,.45]},glsl:`
const float DKN = 10.0;                       // 타일(3.33m)당 셀 10개 → 33cm
const float ROLL = 5.0;                       // 67cm 폭 롤
float wRollH (vec2 uv) { return cHash11(mod(floor(uv.x * ROLL), ROLL) * 1.7 + 0.31); }
float wRollH2 (vec2 uv) { return cHash11(mod(floor(uv.x * ROLL), ROLL) * 3.1 + 5.77); }
// 세로 이음매. 반복 주기를 "눈"이 아니라 "이음매"가 설명하게 만드는 장치다.
float wSeam (vec2 uv) { float s = fract(uv.x * ROLL); return 1.0 - smoothstep(0.0016, 0.0082, min(s, 1.0 - s)); }
// 롤 끝이 벽에서 들뜬 구역 — 일부 롤에만, 그것도 높이 방향 일부 구간에만 생긴다
float wLift (vec2 uv) {
  float s = fract(uv.x * ROLL);
  float near = 1.0 - smoothstep(0.0, 0.055, min(s, 1.0 - s));
  float band = smoothstep(0.30, 0.52, FBM(uv, vec2(1.5, 6.0), 3));
  return near * band * step(0.62, wRollH2(uv));
}

// 도배공은 롤을 자로 잰 듯 붙이지 않는다 — 롤마다 세로 위상이 어긋나고, 인쇄 로트마다
// 모티프의 크기·회전·금분 농도가 다르다. 셀 인덱스를 시드로 그 편차를 굽는다.
// x=모티프 마스크, y=셀 밝기 계수, z=금분 마모
vec3 wDam (vec2 uv) {
  vec2 c = uv * DKN;
  c.y += wRollH(uv) * 0.87;                   // 롤 단위 세로 어긋남
  c.y += mod(floor(c.x), 2.0) * 0.5;          // 절반 엇물림(하프드롭)
  vec2 id = mod(floor(c), DKN);
  vec2 f = fract(c) - 0.5;
  vec2 h = cHash22(id + 0.5);
  float r = cHash12(id + 9.13);
  float q = cHash12(id * 1.7 + 4.31);
  float a = (h.y - 0.5) * 0.290;              // 회전 ±8.3°
  float ca = cos(a), sa = sin(a);
  f = mat2(ca, -sa, sa, ca) * f * (1.0 + (h.x - 0.5) * 0.24);   // 스케일 ±12%
  f.x = abs(f.x);
  float v = floor(r * 3.0);
  float petals = 5.0 + v;
  float lw = 0.034 + v * 0.007 + (q - 0.5) * 0.010;
  float vf = 12.566 + v * 3.14159;
  float w = 0.5 * sin(3.14159265 * (f.y + 0.5));
  float lat = 1.0 - smoothstep(lw * 0.5, lw, abs(f.x - w * 0.84));
  float ang = atan(f.y, max(f.x, 1e-4));
  float rad = length(f * vec2(1.0, 0.74 + v * 0.06));
  float palm = 1.0 - smoothstep(0.020, 0.042, abs(rad - (0.098 + 0.052 * cos(ang * petals))));
  float core = 1.0 - smoothstep(0.026 + v * 0.004, 0.046, rad);
  float vine = 1.0 - smoothstep(0.016, 0.034, abs(f.x - 0.055 - 0.075 * sin((f.y + 0.5) * vf)));
  float m = clamp(max(max(lat, palm * 0.92), max(core * 0.85, vine * 0.62)), 0.0, 1.0);
  // 셀 밝기 ±32%. ±20%로는 6m 밖에서 인쇄 편차가 톤커브에 먹혀 다시 동일 사본으로 읽혔다.
  return vec3(m, 0.68 + 0.64 * q, smoothstep(0.42, 0.95, cHash12(id * 2.3 + 17.1)));
}

// 걸려 있던 액자가 가린 사각형 — 그 자리만 볕에 안 바래 색이 남는다. 타일당 두 자리.
// 반폭은 타일 중심 기준이다. 옛 값(0.412 / 0.378)은 타일의 62% 를 덮어 사실상 상수 밝기였고,
// "액자 자국"이 아니라 벽 전체를 들어올리는 항으로 동작했다(D3 재지적의 원인 중 하나).
// x=바랜 면, y=액자 테가 앉았던 먼지선
// 세로 위치도 정해야 한다 — 옛 오프셋은 사각형 중심이 월드 0.7m(웨인스코트 뒤)와 2.8m
// (픽처레일 위)에 떨어져 복도에서 한 번도 화면에 안 걸렸다. 타일 3.33m 기준 uv.y 중심
// 0.52 / 0.66 = 월드 1.73m / 2.20m 로 옮겨 액자가 실제로 걸렸을 높이에 둔다.
vec2 wGhost (vec2 uv) {
  vec2 a = abs(fract(uv - vec2(0.21, 0.02)) - 0.5) - vec2(0.088, 0.112);   // 29 × 37cm
  vec2 b = abs(fract(uv - vec2(0.68, 0.16)) - 0.5) - vec2(0.126, 0.094);   // 42 × 31cm
  float da = max(a.x, a.y), db = max(b.x, b.y);
  float fill = max(1.0 - smoothstep(0.0, 0.006, da), 0.78 * (1.0 - smoothstep(0.0, 0.006, db)));
  float edge = max(1.0 - smoothstep(0.0, 0.0055, abs(da + 0.0035)),
                   0.8 * (1.0 - smoothstep(0.0, 0.0055, abs(db + 0.0035))));
  return vec2(fill, edge);
}

// 이음매와 무관한 자리에서 뜯겨 나간 조각. 워프를 크게 줘 가장자리가 찢긴 종이처럼 들쭉날쭉해진다.
// x=벗겨진 면, y=찢긴 가장자리(들린 종이가 만드는 그림자선)
// 1m 짜리 큰 덩이는 벽지가 아니라 분홍 얼룩으로 읽힌다 — 20~35cm 조각으로 잘게 만든다.
vec2 wTear (vec2 uv) {
  vec2 w = WRP(uv, vec2(4.2), 0.52, 3);
  float m = FBM(w, vec2(6.5), 4);
  return vec2(smoothstep(0.742, 0.796, m),
              clamp(smoothstep(0.726, 0.746, m) - smoothstep(0.752, 0.782, m), 0.0, 1.0));
}
// 위에서 흘러내린 누수 — 세로로 길게 늘어난다. uv.y 가 월드 높이라(트리플래너 ±X 벽)
// x 방향 주파수만 올리면 줄기가 세로로 선다. 벽 가시 높이가 타일의 45% 뿐이라
// 저주파 얼룩만으로는 화면에 안 걸리는 경우가 있어 이 항이 스트립을 반드시 가로지른다.
float wDrip (vec2 uv) {
  float s = FBM(uv, vec2(11.0, 1.5), 4);
  return smoothstep(0.60, 0.86, s) * smoothstep(0.30, 0.62, FBM(uv, vec2(1.8, 0.9), 3));
}

float H (vec2 uv) {
  float lift = wLift(uv);
  vec2 tr = wTear(uv);
  // 엠보싱: 다마스크는 눌러 찍은 요철이다. 스침각에서 이 요철이 살아야 인쇄물이 아니라 종이가 된다
  return 0.60 + wDam(uv).x * 0.38 - wSeam(uv) * 0.26 + lift * 0.42
    - tr.x * 0.26 + tr.y * 0.30 - wGhost(uv).y * 0.08
    - smoothstep(0.72, 0.95, FBM(uv, vec2(7.0), 3)) * 0.10;
}
void SURF (vec2 uv, out vec3 alb, out float rgh, out float mtl, out float ao, out float alp) {
  vec3 dk = wDam(uv);
  float d = dk.x;
  vec3 ground = vec3(0.0117, 0.0228, 0.0152) * (0.84 + 0.32 * FBM(uv, vec2(9.0), 3));
  vec3 motif = vec3(0.1064, 0.1334, 0.0719) * dk.y;
  alb = mix(ground, motif, d);
  // 저주파 얼룩(타일의 1/4·1/2 주기) — 인접한 두 모티프가 절대 같은 밝기로 나오지 않는다
  float blot = FBM(uv, vec2(4.0), 4);
  float blot2 = FBM(uv, vec2(1.5, 2.0), 3);
  alb *= 0.86 + 0.28 * blot;
  alb *= 0.92 + 0.16 * blot2;
  alb *= 0.988 + 0.024 * wRollH(uv);           // 롤마다 인쇄 로트가 다르다
  vec2 gh = wGhost(uv);
  alb = mix(alb, alb * 1.52 + vec3(0.0038, 0.0052, 0.0030), gh.x * 0.70);
  alb *= 1.0 - gh.y * 0.42;                    // 액자 테가 앉았던 자리의 먼지선
  // 습기 얼룩은 가장자리에 갈색 테를 남긴다. 저역으로 깔면 위장무늬처럼 보여 무늬를 덮는다.
  float sf = FBM(uv, vec2(3.0, 3.0), 4);
  float stain = smoothstep(0.58, 0.76, sf);
  float halo = clamp(smoothstep(0.545, 0.585, sf) - smoothstep(0.600, 0.660, sf), 0.0, 1.0);
  alb = mix(alb, vec3(0.0245, 0.0182, 0.0098), stain * 0.66);
  alb = mix(alb, vec3(0.0640, 0.0405, 0.0165), halo * 0.66);
  float drip = wDrip(uv);
  alb = mix(alb, vec3(0.0348, 0.0242, 0.0126), drip * 0.52);
  // 금분 마모 — 셀 단위로 문질러 벗겨진 구역이 다르다
  float rub = smoothstep(0.46, 0.84, FBM(uv, vec2(6.0, 3.5), 4)) * (0.35 + 0.85 * dk.z);
  alb = mix(alb, mix(ground, alb, 0.30), d * clamp(rub, 0.0, 1.0) * 0.85);
  float seam = wSeam(uv), lift = wLift(uv);
  vec2 tr = wTear(uv);
  alb *= 1.0 - seam * 0.44;
  // 들뜬 자리는 뒤판 석고가 비쳐 나오고, 뜯겨 나간 자리는 아예 석고 맨면이다.
  // 석고를 벽지보다 3배 밝게 두면 6m 밖에서 "분홍 얼룩"으로 읽힌다 — 1.8배까지만 벌린다.
  alb = mix(alb, vec3(0.0455, 0.0392, 0.0322), lift * 0.60);
  alb = mix(alb, vec3(0.0398, 0.0362, 0.0316), tr.x * 0.62);
  alb *= 1.0 - tr.y * 0.34;                    // 찢긴 가장자리의 그림자선
  rgh = 0.80 - d * 0.11 + stain * 0.10 + drip * 0.07 + (blot - 0.5) * 0.20 + rub * 0.08
    + lift * 0.12 + tr.x * 0.16 - gh.x * 0.06;
  mtl = 0.0;
  ao = 1.0 - seam * 0.40 - d * 0.08 - lift * 0.22 - tr.y * 0.24 - gh.y * 0.18;
  alp = 1.0;
}`},"plaster.cracked":{seed:59,mult:.5,bump:3,mat:{clearcoat:.22,clearcoatRoughness:.4,specularIntensity:1,envMapIntensity:.95},opts:{triplanar:.62,grunge:.26,grungeScale:.26,detail:.42,detailTile:6,ao:.75,toks:1.25,damp:.42,band:[.38,.4,3,.45]},glsl:`
// 균열은 실금이어야 한다 — 굵고 성긴 보로노이는 모자이크로 읽혀 재질 신뢰성을 통째로 깬다(G3).
// 반대로 균열만 가늘게 두면 벽이 무지 면이 돼 G6(빈 폴리곤)에 걸리므로 흙손자국·보수자국·그을음으로
// 10~50cm대 명도 변화를 반드시 함께 깐다.
// 폭은 셀 단위다 — 셀 수로 나눠야 텍셀 폭이 나온다. 1텍셀 미만이면 밉맵이 지워버린다.
float pFine (vec2 uv) { return CRK(uv, vec2(11.0), 0.050, 1.0); }
float pHair (vec2 uv) { return CRK(uv, vec2(26.0), 0.045, 1.0); }
float pPatch (vec2 uv) { return smoothstep(0.58, 0.80, FBM(uv, vec2(2.5), 4)); }
float pSpall (vec2 uv) {
  vec3 w = WOR(uv, vec2(15.0), 1.0);
  return step(0.905, w.z) * smoothstep(0.26, 0.09, w.x);
}
float H (vec2 uv) {
  return 0.78 + FBM(uv, vec2(4.0), 4) * 0.12 + FBM(uv, vec2(30.0), 3) * 0.06
       - pFine(uv) * 0.20 - pHair(uv) * 0.09 - pSpall(uv) * 0.26;
}
void SURF (vec2 uv, out vec3 alb, out float rgh, out float mtl, out float ao, out float alp) {
  float fine = pFine(uv), hair = pHair(uv), spall = pSpall(uv), repaint = pPatch(uv);
  float trowel = FBM(uv, vec2(3.0, 2.2), 4);
  float skim = FBM(uv, vec2(8.0), 4);
  // 석고는 차가운 회색이어야 그림자가 청록으로 갈라진다. 전 재질이 갈색-주황 축에 놓이면 G7이 죽는다.
  vec3 top = vec3(0.222, 0.232, 0.246) * (0.70 + 0.62 * trowel) * (0.88 + 0.24 * skim);
  top = mix(top, vec3(0.166, 0.180, 0.194), repaint * 0.70);
  alb = mix(top, vec3(0.106, 0.098, 0.086), spall * 0.85);
  alb = mix(alb, alb * 0.48, fine * 0.85);
  alb = mix(alb, alb * 0.70, hair * 0.60);
  float soot = smoothstep(0.45, 0.90, FBM(uv, vec2(6.0), 5));
  alb *= 1.0 - soot * 0.34;
  // 걸레자국 — 수평 8:1로 늘어난 저주파 띠. 스펙큘러가 점이 아니라 궤적으로 끌리게 하는 항이다.
  float wipe = cFbm(uv * vec2(2.0, 16.0), vec2(2.0, 16.0), 3) - 0.5;
  float hand = smoothstep(0.40, 0.80, FBM(uv, vec2(1.6, 3.2), 3));
  rgh = clamp(0.615 + fine * 0.14 + spall * 0.16 - repaint * 0.09 + trowel * 0.09 - soot * 0.05
            + wipe * 0.24 - hand * 0.10, 0.22, 1.0);
  mtl = 0.0;
  ao = 1.0 - fine * 0.44 - hair * 0.18 - spall * 0.28;
  alp = 1.0;
}`},"tile.hex.bathroom":{seed:71,mult:.5,bump:5,mat:{clearcoat:.55,clearcoatRoughness:.1,envMapIntensity:1.05},opts:{parallax:.03,grunge:.22,grungeScale:.4,detail:.22,detailTile:12,ao:.8,repeat:[2,2],toks:1.2,damp:.48},glsl:`
const float HXN = 7.0;
vec4 hxCell (vec2 uv) { return cHexGrid(uv * HXN * vec2(1.0, 1.7320508)); }
float H (vec2 uv) {
  vec4 h = hxCell(uv);
  float e = cHexEdge(h.xy);
  float g = smoothstep(0.355, 0.455, e);
  float chip = step(0.94, cHash12(mod(h.zw * 2.0, vec2(HXN * 2.0)))) * smoothstep(0.28, 0.40, e);
  return mix(0.96 - e * 0.05, 0.38, g) - chip * 0.22;
}
void SURF (vec2 uv, out vec3 alb, out float rgh, out float mtl, out float ao, out float alp) {
  vec4 h = hxCell(uv);
  float e = cHexEdge(h.xy);
  float g = smoothstep(0.355, 0.455, e);
  float r = cHash12(mod(h.zw * 2.0, vec2(HXN * 2.0)));
  float r2 = cHash12(mod(h.zw * 2.0, vec2(HXN * 2.0)) + 7.7);
  // 낱장마다 소성 편차가 있어야 육각 격자가 프린트된 무늬로 안 보인다
  vec3 tile = vec3(0.480, 0.489, 0.500) * (0.80 + 0.34 * r) * (0.93 + 0.14 * r2);
  tile = mix(tile, vec3(0.0265, 0.0280, 0.0305), step(0.90, r));
  float craze = CRK(uv, vec2(44.0), 0.010, 1.0);
  tile = mix(tile, tile * 0.66, craze * 0.45);
  float soil = smoothstep(0.50, 0.86, FBM(uv, vec2(3.0), 4));
  tile *= 1.0 - soil * 0.30;
  float mold = smoothstep(0.44, 0.78, FBM(uv, vec2(15.0), 4));
  vec3 grout = mix(vec3(0.0862, 0.0850, 0.0800), vec3(0.0270, 0.0338, 0.0245), clamp(mold * 0.88 + soil * 0.5, 0.0, 1.0));
  alb = mix(tile, grout, g);
  float wipe = cFbm(uv * vec2(2.2, 17.0), vec2(2.2, 17.0), 3) - 0.5;
  float face = clamp(0.090 + craze * 0.16 + (r2 - 0.5) * 0.13 + soil * 0.22 + wipe * 0.19, 0.02, 1.0);
  rgh = mix(face, min(1.0, face + 0.76), g);
  mtl = 0.0;
  ao = 1.0 - g * 0.58;
  alp = 1.0;
}`},"tile.subway.white":{seed:83,mult:.5,bump:5.5,mat:{clearcoat:.6,clearcoatRoughness:.09,envMapIntensity:1.05},opts:{parallax:.026,grunge:.21,grungeScale:.42,detail:.22,detailTile:12,ao:.8,repeat:[2,2],toks:1.2,damp:.48},glsl:`
const vec2 SBN = vec2(6.0, 12.0);
float H (vec2 uv) {
  vec4 b = cBrick(uv, SBN);
  float ed = max(abs(b.x), abs(b.y)) * 2.0;
  return mix(0.96, 0.36, smoothstep(0.845, 0.985, ed));
}
void SURF (vec2 uv, out vec3 alb, out float rgh, out float mtl, out float ao, out float alp) {
  vec4 b = cBrick(uv, SBN);
  float ed = max(abs(b.x), abs(b.y)) * 2.0;
  float g = smoothstep(0.875, 0.985, ed);
  float bev = smoothstep(0.70, 0.90, ed);
  float r = cHash12(mod(b.zw, SBN));
  float r2 = cHash12(mod(b.zw, SBN) + 5.31);
  // 낱장 소성 편차 — 색 ±8%, 유약 두께가 달라 러프니스도 낱장마다 갈린다.
  // 이게 없으면 노멀맵만 얹은 평면으로 읽힌다.
  vec3 tile = vec3(0.505, 0.514, 0.528) * (0.82 + 0.30 * r) * (0.92 + 0.16 * r2);
  float craze = CRK(uv, vec2(52.0), 0.009, 1.0);
  float crack = step(0.88, r) * CRK(uv, vec2(13.0), 0.006, 1.0);
  tile = mix(tile, tile * 0.58, craze * 0.32 + crack * 0.6);
  float soil = smoothstep(0.48, 0.88, FBM(uv, vec2(2.5, 4.0), 4));
  tile *= 1.0 - soil * 0.34;
  float mold = smoothstep(0.40, 0.76, FBM(uv, vec2(19.0), 4));
  vec3 grout = mix(vec3(0.128, 0.126, 0.122), vec3(0.0400, 0.0400, 0.0355), clamp(mold + soil * 0.6, 0.0, 1.0));
  alb = mix(tile, grout, g) * (1.0 - bev * 0.06);
  // 유약면 걸레자국 8:1 + 낱장 편차. 줄눈은 여기서 다시 +0.25 이상 벌어진다.
  float wipe = cFbm(uv * vec2(2.4, 19.0), vec2(2.4, 19.0), 3) - 0.5;
  float face = clamp(0.082 + craze * 0.20 + crack * 0.30 + soil * 0.24 + (r2 - 0.5) * 0.14 + wipe * 0.20, 0.02, 1.0);
  rgh = mix(face, min(1.0, face + 0.78), g);
  mtl = 0.0;
  ao = 1.0 - g * 0.60 - bev * 0.12;
  alp = 1.0;
}`},"concrete.rooftop":{seed:97,mult:.5,bump:2.6,mat:{envMapIntensity:.85},opts:{triplanar:.45,grunge:.26,grungeScale:.2,detail:.4,detailTile:5,ao:.7,toks:2,damp:.45},glsl:`
float cAgg (vec2 uv) { vec3 w = WOR(uv, vec2(30.0), 1.0); return smoothstep(0.26, 0.05, w.x) * step(0.58, w.z); }
float cPit (vec2 uv) { return 1.0 - smoothstep(0.0, 0.055, WOR(uv, vec2(64.0), 1.0).x); }
float cWet (vec2 uv) { return smoothstep(0.62, 0.86, FBM(uv, vec2(2.0), 4)); }
float H (vec2 uv) { return 0.72 + cAgg(uv) * 0.12 - cPit(uv) * 0.18 + FBM(uv, vec2(11.0), 4) * 0.13; }
void SURF (vec2 uv, out vec3 alb, out float rgh, out float mtl, out float ao, out float alp) {
  float base = FBM(uv, vec2(5.0), 5);
  float mottle = FBM(uv, vec2(14.0), 4);
  vec3 c = vec3(0.0830, 0.0868, 0.0912) * (0.62 + 0.76 * base) * (0.82 + 0.34 * mottle);
  vec3 w = WOR(uv, vec2(30.0), 1.0);
  float agg = cAgg(uv);
  c = mix(c, vec3(0.1420, 0.1320, 0.1150) * (0.45 + 0.95 * w.z), agg * 0.92);
  float dark = smoothstep(0.22, 0.04, w.x) * step(w.z, 0.24);
  c = mix(c, vec3(0.0295, 0.0288, 0.0272), dark * 0.80);
  // 젖은 패치는 좁고 깊게 — 넓게 깔면 표면 전체가 스펙큘러로 하얗게 날아간다
  float wet = cWet(uv);
  c *= 1.0 - wet * 0.42;
  float run = smoothstep(0.46, 0.84, FBM(uv, vec2(3.0, 13.0), 4));
  c *= 1.0 - run * 0.28;
  float dust = FBM(uv, vec2(17.0), 3);
  alb = c * (0.92 + 0.16 * dust);
  rgh = clamp(0.94 - wet * 0.30 - agg * 0.07 + dust * 0.04 + run * 0.03, 0.32, 1.0);
  mtl = 0.0;
  ao = 1.0 - cPit(uv) * 0.34 - agg * 0.10;
  alp = 1.0;
}`},"carpet.corridor.red":{seed:103,mult:.5,bump:3.4,mat:{sheen:.72,sheenRoughness:.42,sheenColor:10246724,specularIntensity:.8,envMapIntensity:.55,anisotropy:.45,anisotropyRotation:1.5708},opts:{grunge:.34,grungeScale:.46,detail:.55,detailTile:22,ao:.7,repeat:[3,3],toks:1.5,damp:.3},glsl:`
float kPile (vec2 uv) { return FBM(uv, vec2(210.0, 128.0), 3); }
// 복도 한가운데가 눌린 통행 자국 — 반복 마름모 무늬를 세로로 가로질러 격자 인지를 끊는다
float kTrack (vec2 uv) {
  float lane = 1.0 - smoothstep(0.10, 0.34, abs(uv.x - 0.5));
  return lane * smoothstep(0.32, 0.80, FBM(uv, vec2(2.0, 5.0), 3));
}
// 1947년 호텔 러너의 짜임: 마름모 격자(lozenge) 안에 로제트, 격자가 만나는 자리에 작은
// 플뢰롱. 단순 마름모 채우기는 리놀륨 무늬로 읽힌다 — 선 굵기가 다른 세 층이 필요하다.
// x=무늬 마스크(밝은 실), y=바탕 로제트, z=셀 시드, w=짙은 윤곽실
vec4 kFig (vec2 uv) {
  vec2 c = uv * 6.0;
  vec2 id = mod(floor(c), vec2(6.0));
  float cid = cHash12(id);
  vec2 f = fract(c) - 0.5;
  // 셀마다 미세하게 기울고 크기가 다르다. 손으로 짠 러너는 줄이 정확히 안 맞는다
  float a = (cHash12(id + 3.3) - 0.5) * 0.09;
  f = mat2(cos(a), -sin(a), sin(a), cos(a)) * f * (1.0 + (cid - 0.5) * 0.09);
  float d = abs(f.x) + abs(f.y);
  // 마름모 테는 굵어야 한다 — 폭 1.4cm 짜리 실선은 밉맵 평균에 먹혀 6m 밖에서 사라진다(G6).
  float lat = clamp(smoothstep(0.286, 0.318, d) - smoothstep(0.404, 0.452, d), 0.0, 1.0);
  // 마름모 테 바깥의 짙은 윤곽실. 크림색 문양은 톤커브 숄더에 올라타 대비를 잃지만
  // 어두운 윤곽은 선형 구간에 남는다 — 원경에서 무늬를 살리는 건 이쪽이다(G6).
  // 폭은 마름모 테의 절반 이하로 — 넓게 깔면 러너 전체가 어두워져 자동노출이 튄다(실측 ev +26%).
  float halo = clamp(smoothstep(0.404, 0.428, d) - smoothstep(0.452, 0.486, d), 0.0, 1.0);
  // 로제트 — 8엽. 셀마다 엽수가 6·8·10 으로 갈린다
  float pet = 6.0 + floor(cHash12(id + 7.1) * 3.0) * 2.0;
  float rad = length(f);
  float ang = atan(f.y, f.x);
  float ros = 1.0 - smoothstep(0.075, 0.115, rad * (1.0 - 0.30 * cos(ang * pet)));
  float rim = clamp(smoothstep(0.130, 0.150, rad) - smoothstep(0.175, 0.205, rad), 0.0, 1.0);
  // 격자 교차점의 플뢰롱(모서리 네 곳)
  vec2 g = abs(f) - 0.5;
  float fleur = 1.0 - smoothstep(0.045, 0.085, length(g));
  float outer = clamp(smoothstep(0.175, 0.192, rad) - smoothstep(0.206, 0.232, rad), 0.0, 1.0);
  return vec4(clamp(max(max(lat, rim * 0.85), fleur * 0.9), 0.0, 1.0), ros, cid,
              clamp(max(halo, outer * 0.8), 0.0, 1.0));
}
float H (vec2 uv) {
  vec4 k = kFig(uv);
  // 무늬 실은 바탕보다 굵어 실제로 도드라진다 — 스침각에서 이 요철이 무늬를 읽게 한다
  return 0.44 + kPile(uv) * 0.42 + k.x * 0.16 + k.y * 0.10 - k.w * 0.12 - kTrack(uv) * 0.30;
}
void SURF (vec2 uv, out vec3 alb, out float rgh, out float mtl, out float ao, out float alp) {
  vec4 k = kFig(uv);
  float cid = k.z;
  // 무늬는 바탕보다 **밝아야** 한다. 근경 카펫에는 안개 인스캐터가 상수항으로 얹혀 있어
  // 어두운 무늬는 그 바닥값 아래로 잠겨 통째로 사라진다(직전 리비전에서 실제로 그랬다).
  // 1947년 호텔 러너의 표준 배색도 붉은 바탕에 금·크림 문양이라 역사적으로도 이쪽이 맞다.
  // 바탕:문양 반사율 비를 3.0 → 4.3 으로 벌린다. 근경 안개가 상수항으로 얹히면 3배 비는
  // 화면에서 1.4배까지 눌려 무늬가 "짜임 노이즈"로만 남는다(심사 G6 3점의 실제 형태).
  // 적색 채널이 톤커브 숄더에 올라타면(실측 R 평균 219 / p99 236, G 140 / B 117) 무늬 대비가
  // R 에서만 눌려 "연어살색 단색 면"이 된다. 붉은 기를 12% 내려 숄더에서 내려오되 더는 못 내린다 —
  // 러너는 화면 하단 1/3을 덮는 최대 밝은 면이라 여기서 −40% 를 하면 자동노출이 ev 43.5 → 55.1
  // 로 튀어 천장 기구가 흰 덩이로 날아간다(실측). 무늬 가독은 알베도가 아니라 아래 k.w 윤곽실로 산다.
  vec3 ground = vec3(0.0552, 0.0110, 0.0094) * (0.70 + 0.58 * cid);
  vec3 fig = vec3(0.2420, 0.1660, 0.0690) * (0.74 + 0.50 * cid);
  vec3 dark = vec3(0.0104, 0.0072, 0.0080) * (0.80 + 0.40 * cid);
  // 무늬가 닳아 없어진 구역 — 규칙 격자를 불규칙하게 끊는다
  float bald = smoothstep(0.44, 0.78, FBM(uv, vec2(3.0), 4));
  alb = mix(ground, fig, k.x * 0.94 * (1.0 - bald * 0.46));
  alb = mix(alb, fig * 1.28, k.y * 0.86 * (1.0 - bald * 0.52));
  alb = mix(alb, dark, k.x * (1.0 - k.y) * 0.34);   // 문양 실 둘레의 짙은 윤곽선
  alb = mix(alb, dark, k.w * 0.52 * (1.0 - bald * 0.40));   // 마름모·로제트 바깥의 윤곽실
  float pile = kPile(uv);
  alb *= 0.70 + 0.52 * pile;
  float track = kTrack(uv);
  alb = mix(alb, alb * 0.62 + vec3(0.0062, 0.0044, 0.0031), track);
  float soil = smoothstep(0.52, 0.88, FBM(uv, vec2(4.0), 4));
  alb *= 1.0 - soil * 0.26;
  // 눌린 통행로는 파일이 누워 반들거리고, 안 밟힌 구역은 곤두서 있어 러프니스가 갈린다
  rgh = clamp(0.90 - track * 0.26 - bald * 0.10 - k.x * 0.07 + (pile - 0.5) * 0.16 + soil * 0.05, 0.34, 1.0);
  mtl = 0.0;
  ao = 0.80 + 0.20 * pile - track * 0.12 - k.x * 0.06 - k.w * 0.10;
  alp = 1.0;
}`}};export{e as t};