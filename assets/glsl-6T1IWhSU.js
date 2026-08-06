var e=`
float cHash11 (float p) { p = fract(p * 0.1031); p *= p + 33.33; return fract((p + p) * p); }
float cHash12 (vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
vec2 cHash22 (vec2 p) { vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); q += dot(q, q.yzx + 33.33); return fract((q.xx + q.yz) * q.zy); }
float cHash13 (vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
vec3 cHash33 (vec3 p) { p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.xxy + p.yxx) * p.zyx); }

float cVal2 (vec2 p, vec2 per) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = cHash12(mod(i, per));
  float b = cHash12(mod(i + vec2(1.0, 0.0), per));
  float c = cHash12(mod(i + vec2(0.0, 1.0), per));
  float d = cHash12(mod(i + vec2(1.0, 1.0), per));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float cVal3 (vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = mix(cHash13(i), cHash13(i + vec3(1.0, 0.0, 0.0)), f.x);
  float b = mix(cHash13(i + vec3(0.0, 1.0, 0.0)), cHash13(i + vec3(1.0, 1.0, 0.0)), f.x);
  float c = mix(cHash13(i + vec3(0.0, 0.0, 1.0)), cHash13(i + vec3(1.0, 0.0, 1.0)), f.x);
  float d = mix(cHash13(i + vec3(0.0, 1.0, 1.0)), cHash13(i + vec3(1.0, 1.0, 1.0)), f.x);
  return mix(mix(a, b, f.y), mix(c, d, f.y), f.z);
}

float cFbm (vec2 p, vec2 per, int oct) {
  float s = 0.0, a = 0.5, n = 0.0;
  for (int i = 0; i < 8; i++) {
    if (i >= oct) break;
    s += a * cVal2(p, per); n += a; p *= 2.0; per *= 2.0; a *= 0.5;
  }
  return s / n;
}

float cFbmR (vec2 p, vec2 per, int oct) {
  float s = 0.0, a = 0.5, n = 0.0;
  for (int i = 0; i < 8; i++) {
    if (i >= oct) break;
    float v = 1.0 - abs(cVal2(p, per) * 2.0 - 1.0);
    s += a * v * v; n += a; p *= 2.0; per *= 2.0; a *= 0.55;
  }
  return s / n;
}

float cFbm3 (vec3 p, int oct) {
  float s = 0.0, a = 0.5, n = 0.0;
  for (int i = 0; i < 5; i++) {
    if (i >= oct) break;
    s += a * cVal3(p); n += a; p *= 2.02; a *= 0.5;
  }
  return s / n;
}

// 도메인 워핑 — 상수 오프셋은 주기를 깨지 않는다(격자 인덱스 mod가 그대로 유지됨)
vec2 cWarp (vec2 p, vec2 per, float amt, int oct) {
  float a = cFbm(p, per, oct);
  float b = cFbm(p + vec2(5.2, 1.3), per, oct);
  return p + amt * (vec2(a, b) * 2.0 - 1.0);
}

// x=F1, y=F2, z=셀 난수
vec3 cWorley (vec2 p, vec2 per, float jit) {
  vec2 ip = floor(p), fp = fract(p);
  float f1 = 9.0, f2 = 9.0, id = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 o = vec2(float(x), float(y));
      vec2 cell = mod(ip + o, per);
      vec2 r = o + 0.5 + (cHash22(cell) - 0.5) * jit - fp;
      float d = dot(r, r);
      if (d < f1) { f2 = f1; f1 = d; id = cHash12(cell + 3.71); }
      else if (d < f2) { f2 = d; }
    }
  }
  return vec3(sqrt(f1), sqrt(f2), id);
}

// 보로노이 균열망 — 셀 경계선만 남긴다
float cCrack (vec2 p, vec2 per, float w, float jit) {
  vec3 c = cWorley(p, per, jit);
  return 1.0 - smoothstep(0.0, w, c.y - c.x);
}

// 심플렉스(비주기) — 미세 요동 전용. 진폭을 작게 써서 이음매를 노출시키지 않는다.
float cSimplex (vec2 v) {
  const vec4 C = vec4(0.211324865, 0.366025403, -0.577350269, 0.024390243);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1;
  vec3 p = vec3(cHash12(i), cHash12(i + i1), cHash12(i + 1.0)) * 6.2831853;
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 g = vec3(cos(p.x) * x0.x + sin(p.x) * x0.y,
                cos(p.y) * x12.x + sin(p.y) * x12.y,
                cos(p.z) * x12.z + sin(p.z) * x12.w);
  return 130.0 * dot(m, g) * 0.5 + 0.5;
}
`,t=`
// 육각 격자. p = uv * N * vec2(1.0, 1.7320508) 로 넣으면 N칸 주기로 정확히 반복된다.
// xy=셀 로컬좌표, zw=셀 인덱스
vec4 cHexGrid (vec2 p) {
  vec2 s = vec2(1.0, 1.7320508);
  vec4 hC = floor(vec4(p, p - vec2(0.5, 1.0)) / s.xyxy) + 0.5;
  vec4 h = vec4(p - hC.xy * s, p - (hC.zw + 0.5) * s);
  return dot(h.xy, h.xy) < dot(h.zw, h.zw) ? vec4(h.xy, hC.xy) : vec4(h.zw, hC.zw + vec2(0.5, 1.0));
}
float cHexEdge (vec2 p) {
  p = abs(p);
  return max(dot(p, vec2(0.8660254, 0.5)), p.y);
}

// 벽돌 쌓기. xy=셀 로컬(-0.5..0.5), zw=셀 인덱스
vec4 cBrick (vec2 uv, vec2 n) {
  float row = floor(uv.y * n.y);
  float off = mod(row, 2.0) * 0.5;
  vec2 c = vec2(uv.x * n.x + off, uv.y * n.y);
  vec2 id = floor(c);
  return vec4(fract(c) - 0.5, id);
}

// 다마스크 오지 모티프 — 셀 내부를 거울대칭시켜 좌우 대칭 무늬를 만든다.
// 열마다 반 칸씩 내리는 하프드롭 반복(실제 다마스크 벽지 규약)이라 격자 반복이 눈에 덜 걸린다.
// n.x는 짝수여야 하프드롭이 텍스처 경계에서 이어진다.
//
// 셀마다 모티프 3종(팜 잎맥 수·격자 두께·덩굴 주파수) 중 하나를 뽑고 ±3% 스케일 / ±2° 회전을 준다.
// 이게 없으면 같은 픽셀 덩어리가 가로로 n.x회 그대로 되풀이돼 D3(타일링) 실격이다.
// 반환 x=무늬 마스크, y=셀 난수(레시피가 명도·마모 변주에 쓴다).
vec2 cDamask (vec2 uv, vec2 n) {
  vec2 c = uv * n;
  c.y += mod(floor(c.x), 2.0) * 0.5;
  vec2 id = mod(floor(c), n);
  vec2 f = fract(c) - 0.5;
  vec2 h = cHash22(id + 0.5);
  float r = cHash12(id + 9.13);
  // 스케일·회전 지터. 회전은 거울대칭 이전에 걸어야 모티프 전체가 기운다.
  float a = (h.y - 0.5) * 0.0698;
  float ca = cos(a), sa = sin(a);
  f = mat2(ca, -sa, sa, ca) * f * (1.0 + (h.x - 0.5) * 0.06);
  f.x = abs(f.x);
  float v = floor(r * 3.0);
  float petals = 5.0 + v;                       // 5·6·7엽
  float lw = 0.036 + v * 0.006;                 // 격자 굵기
  float vf = 12.566 + v * 3.14159;              // 덩굴 감김
  // 오지(ogee) 격자 — 위아래 두 호가 만나 뾰족한 양파형 카투슈를 이룬다.
  // 채운 덩어리가 아니라 선으로 짜야 다마스크로 읽힌다(채우면 물방울 무늬가 된다).
  float w = 0.5 * sin(3.14159265 * (f.y + 0.5));
  float lat = 1.0 - smoothstep(lw * 0.5, lw, abs(f.x - w * 0.84));
  float ang = atan(f.y, max(f.x, 1e-4));
  float rad = length(f * vec2(1.0, 0.74 + v * 0.06));
  float palm = 1.0 - smoothstep(0.020, 0.042, abs(rad - (0.098 + 0.052 * cos(ang * petals))));
  float core = 1.0 - smoothstep(0.026 + v * 0.004, 0.046, rad);
  float vine = 1.0 - smoothstep(0.016, 0.034, abs(f.x - 0.055 - 0.075 * sin((f.y + 0.5) * vf)));
  float m = clamp(max(max(lat, palm * 0.92), max(core * 0.85, vine * 0.62)), 0.0, 1.0);
  return vec2(m, r);
}

// 결 방향 스트라이프(목재 나이테·직물 조직)
float cGrain (vec2 uv, vec2 per, float freq, float wob) {
  float w = cFbm(uv * per, per, 4) * 2.0 - 1.0;
  return fract(uv.y * freq + w * wob);
}
`;function n(e={}){return`
vec3 cTriBlend (vec3 n) {
  vec3 b = pow(abs(n), vec3(${(e.sharpness??6).toFixed(1)}));
  return b / max(b.x + b.y + b.z, 1e-4);
}
vec4 cTriSample (sampler2D t, vec3 wp, vec3 w, float s) {
  return texture2D(t, wp.zy * s) * w.x + texture2D(t, wp.xz * s) * w.y + texture2D(t, wp.xy * s) * w.z;
}
// whiteout 블렌드 — 3축 접선공간 노멀을 월드 노멀로 합성.
// vlen은 정규화 전 평균 길이(밉맵으로 소실된 노멀 분산의 척도) — cToksvig가 러프니스로 되돌린다.
vec3 cTriNormal (sampler2D t, vec3 wp, vec3 n, vec3 w, float s, out float height, out float vlen) {
  vec4 sx = texture2D(t, wp.zy * s), sy = texture2D(t, wp.xz * s), sz = texture2D(t, wp.xy * s);
  height = sx.a * w.x + sy.a * w.y + sz.a * w.z;
  vec3 tx = sx.xyz * 2.0 - 1.0, ty = sy.xyz * 2.0 - 1.0, tz = sz.xyz * 2.0 - 1.0;
  vlen = length(tx) * w.x + length(ty) * w.y + length(tz) * w.z;
  tx = vec3(tx.xy + n.zy, abs(tx.z) * n.x);
  ty = vec3(ty.xy + n.xz, abs(ty.z) * n.y);
  tz = vec3(tz.xy + n.xy, abs(tz.z) * n.z);
  return normalize(tx.zyx * w.x + ty.xzy * w.y + tz.xyz * w.z);
}
`}function r(e={}){return`
// Heitz-Neyret 계열 삼각 격자 스토캐스틱 타일링 — 3개 셀을 무작위 오프셋으로 뽑아 가중 혼합
void cTriGrid (vec2 uv, out vec3 w, out vec2 v1, out vec2 v2, out vec2 v3) {
  vec2 su = mat2(1.0, 0.0, -0.57735027, 1.15470054) * (uv * 3.464);
  vec2 base = floor(su);
  vec3 t = vec3(fract(su), 0.0);
  t.z = 1.0 - t.x - t.y;
  if (t.z > 0.0) { w = vec3(t.z, t.y, t.x); v1 = base; v2 = base + vec2(0.0, 1.0); v3 = base + vec2(1.0, 0.0); }
  else { w = vec3(-t.z, 1.0 - t.y, 1.0 - t.x); v1 = base + vec2(1.0, 1.0); v2 = base + vec2(1.0, 0.0); v3 = base + vec2(0.0, 1.0); }
  w = pow(w, vec3(${(e.blendPower??7).toFixed(1)}));
  w /= max(w.x + w.y + w.z, 1e-4);
}
vec4 cStoch (sampler2D t, vec2 uv, vec2 dx, vec2 dy, vec3 w, vec2 v1, vec2 v2, vec2 v3) {
  return texture2DGradEXT(t, uv + cHash22(v1), dx, dy) * w.x
       + texture2DGradEXT(t, uv + cHash22(v2), dx, dy) * w.y
       + texture2DGradEXT(t, uv + cHash22(v3), dx, dy) * w.z;
}
`}var i=`
// 화면 미분으로 접선 프레임 구성 — map_fragment 시점엔 three의 tbn이 아직 없다
mat3 cTangentFrame (vec3 eye, vec3 n, vec2 uv) {
  vec3 q0 = dFdx(eye), q1 = dFdy(eye);
  vec2 s0 = dFdx(uv), s1 = dFdy(uv);
  vec3 q1p = cross(q1, n), q0p = cross(n, q0);
  vec3 T = q1p * s0.x + q0p * s1.x;
  vec3 B = q1p * s0.y + q0p * s1.y;
  float det = max(dot(T, T), dot(B, B));
  float sc = (det == 0.0) ? 0.0 : inversesqrt(det);
  return mat3(T * sc, B * sc, n);
}

// 라지스케일 그런지 — 텍스처 반복 주기와 무관한 월드 공간 얼룩. 항상 곱해 반복 인지를 깬다.
float cGrunge (vec3 wp, float s) {
  float a = cVal3(wp * s);
  float b = cVal3(wp * s * 2.83 + 11.3);
  float c = cVal3(wp * s * 0.31 - 5.1);
  return clamp(0.30 * a + 0.22 * b + 0.48 * c, 0.0, 1.0);
}

// 수 미터 주기의 저역 얼룩. 텍스처 반복 주기보다 한참 커서 D3 반복 인지를 끊고,
// 습기/때가 낀 넓은 구역을 만들어 같은 재질 안에서도 톤이 갈리게 한다.
float cMacroLow (vec3 wp, float s) {
  return clamp(cVal3(wp * s * 0.21 + 7.13) * 0.62 + cVal3(wp * s * 0.53 - 3.11) * 0.38, 0.0, 1.0);
}

// UDN 디테일 노멀 블렌딩
vec3 cUdn (vec3 base, vec3 det, float k) {
  return normalize(vec3(base.xy + det.xy * k, base.z));
}

// Toksvig — 밉맵이 평균내 없앤 노멀 분산을 러프니스로 되돌린다.
// 이게 없으면 원거리 카펫·콘크리트가 노멀이 평탄해지며 거울처럼 번들거린다(루브릭 G3/G5).
float cToksvig (float len, float rgh, float k) {
  float v = 1.0 - clamp(len, 0.0, 1.0);
  return clamp(sqrt(rgh * rgh + v * v * k), 0.015, 1.0);
}
`;function a(e=24){let t=Math.max(4,Math.min(64,e|0));return`
// 패럴랙스 오클루전 매핑 — 실루엣 클리핑 없이 UV만 밀어낸다. 높이는 normalMap.a에 패킹돼 있다.
vec2 cPom (sampler2D hmap, vec2 uv, vec3 vts, float depth, float fade) {
  if (fade <= 0.001 || vts.z <= 0.05) return uv;
  float layers = mix(float(${t}) * 0.4, float(${t}), clamp(vts.z, 0.0, 1.0));
  float dl = 1.0 / layers;
  vec2 P = (vts.xy / vts.z) * depth * fade;
  vec2 duv = P * dl;
  float cur = 0.0;
  vec2 cuv = uv;
  float d = 1.0 - texture2D(hmap, cuv).a;
  for (int i = 0; i < ${t}; i++) {
    if (cur >= d) break;
    cuv -= duv; cur += dl;
    d = 1.0 - texture2D(hmap, cuv).a;
  }
  vec2 prev = cuv + duv;
  float after = d - cur;
  float before = (1.0 - texture2D(hmap, prev).a) - cur + dl;
  float wgt = after / max(after - before, 1e-4);
  return mix(cuv, prev, clamp(wgt, 0.0, 1.0));
}
`}export{r as a,a as i,t as n,n as o,i as r,e as t};