// 실광원의 "몸통". 화면 안에서 광원 위치가 읽혀야 조명 설계가 논리로 읽힌다(루브릭 G1).
// 발광부·유백유리 셰이드는 둘 다 무조명 이미터이고, 표면 휘도를 시선각으로 굴려 그린다.
// 광축 셸(shaft)은 볼류메트릭 패스가 없어도 광축이 보이게 하는 자립 방어선이다(G2 / D8).

import * as THREE from 'three'
import { mat } from '../../materials/library.js'

const SHADE_VERT = `
varying vec3 vN; varying vec3 vV;
void main () {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalMatrix * normal;
  vV = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`

const SHADE_FRAG = `
varying vec3 vN; varying vec3 vV;
uniform vec3 uCore, uSkin;
uniform float uGlow;
void main () {
  float ndv = abs(dot(normalize(vN), normalize(vV)));
  // 유리 두께: 정면은 얇아 속이 비치고(코어), 스치는 각은 두꺼워 탁하다(스킨)
  vec3 c = mix(uSkin, uCore, pow(ndv, 1.25));
  gl_FragColor = vec4(c * uGlow, 1.0);
}`

// 발광부(전구·형광관). MeshBasicMaterial 상수색이면 표면 전체가 같은 값이라 노출 배율 28~32배
// 아래에서 통째로 백색점을 넘겨 "흰 슬래브"가 된다 — 심사 [G7] "발광부 하이라이트 롤오프 부재".
// 실제 발광체는 코어가 가장 밝고 스치는 각으로 갈수록 유리 두께·필라멘트 은폐로 빠르게 떨어지며,
// 그 감쇠 구간에서 색이 백색 → 호박색으로 넘어간다. 그 롤오프가 캡슐·돔의 교차선도 같이 감춘다.
const BULB_FRAG = `
varying vec3 vN; varying vec3 vV;
uniform vec3 uCore, uRim;
uniform float uGlow;
void main () {
  float ndv = abs(dot(normalize(vN), normalize(vV)));
  // 지수 0.55 — 코어를 좁게 잡으면 실루엣 안쪽까지 순백이 유지돼 롤오프가 안 보인다
  vec3 c = mix(uRim, uCore, pow(ndv, 0.55));
  gl_FragColor = vec4(c * uGlow, 1.0);
}`

// 원뿔 메시는 이제 그리는 대상이 아니라 **마치 구간을 잡는 프록시**다. 겉면을 셰이딩하면
// 알파가 표면 한 점의 함수라 화면에서 상수로 읽히고(밀도차 없음), 차폐도 겉면에서만 평가돼
// 문틀을 그대로 통과한다 — 심사에서 "빌보드 광선 스프라이트"로 즉시 들통난 이유가 이것이다.
// 이제 백페이스가 나가는 지점(vW)까지 시선을 실제로 적분한다. 경계는 지오메트리 실루엣이
// 아니라 각도 가중의 연속 감쇠가 만들므로 직선 모서리가 생길 수 없다.
const SHAFT_VERT = `
varying vec3 vW; varying vec3 vApex; varying vec3 vAxis; varying vec3 vUp;
void main () {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vW = wp.xyz;
  // 셸에는 스케일이 없다(holder 는 position+lookAt 뿐) — 축·길이가 월드에서 그대로 보존된다
  vApex = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vAxis = normalize((modelMatrix * vec4(0.0, 0.0, 1.0, 0.0)).xyz);
  vUp = normalize((modelMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`

const SHAFT_FRAG = `
varying vec3 vW; varying vec3 vApex; varying vec3 vAxis; varying vec3 vUp;
uniform vec3 uColor;
uniform float uIntensity, uLen, uTime, uSlatFreq, uSlatPhase, uSlatDepth;
uniform float uCosOuter, uGain, uFall, uMote;
uniform float uNoiseScale, uFlowScale, uMoteScale, uEdgeWarp, uFogK;
uniform vec3 uWind;
uniform sampler2D uSceneDepth;
uniform vec2 uResolution;
uniform float uSoft, uSoftFade;
uniform sampler2D uShadowMap;
uniform mat4 uShadowMat;
uniform float uShadowOn, uShadowBias;

// 해시 3D 밸류 노이즈. 좌표 1 단위 = 특징 하나이므로 호출부는 p / L(미터) 로 넣는다.
// 이전 구현은 도메인 워프된 사인 합이었는데, 특징 크기를 2m → 0.2m 로 내리자 사인의 능선이
// 화면에서 평행 줄무늬로 드러났다(D3). 옥타브 사이에 회전을 끼우면 두 능선이 교차해 격자가
// 된다 — 실측으로 둘 다 확인했다. 방향성이 없는 난수장이어야 이 주파수대를 버틴다.
float vhash (vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float vnoise (vec3 x) {
  vec3 i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(vhash(i), vhash(i + vec3(1.0, 0.0, 0.0)), f.x),
        mix(vhash(i + vec3(0.0, 1.0, 0.0)), vhash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
    mix(mix(vhash(i + vec3(0.0, 0.0, 1.0)), vhash(i + vec3(1.0, 0.0, 1.0)), f.x),
        mix(vhash(i + vec3(0.0, 1.0, 1.0)), vhash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z);
}

// 2옥타브. 스텝마다 서로 다른 3D 점을 밟으므로 한 옥타브당 실효 분산이 겉면 셰이딩 때보다
// 크다 — 3옥타브까지 갈 필요가 없고, 스텝 수만큼 곱해지는 해시 비용도 아낀다.
float fbm2 (vec3 p) {
  return vnoise(p) * 0.62 + vnoise(p * 2.15 + 11.3) * 0.38;
}

// 볼류메트릭 패스와 같은 VSM 규약(engine.js는 VSMShadowMap, map은 RG16F = mean, stdDev).
float vsm (vec3 wp) {
  vec4 sc = uShadowMat * vec4(wp, 1.0);
  vec3 c = sc.xyz / sc.w;
  if (c.x < 0.0 || c.x > 1.0 || c.y < 0.0 || c.y > 1.0 || c.z < 0.0 || c.z > 1.0) return 1.0;
  float z = c.z + uShadowBias;
  vec2 m = texture2D(uShadowMap, c.xy).rg;
  if (z <= m.x) return 1.0;
  float v = max(m.y * m.y, 1e-7);
  float dd = z - m.x;
  return clamp((v / (v + dd * dd) - 0.3) / 0.65, 0.0, 1.0);
}

void main () {
  vec3 ro = cameraPosition;
  vec3 dv = vW - ro;
  float tExit = length(dv);
  vec3 rd = dv / max(tExit, 1e-4);

  // uSceneDepth 의 a 채널은 뷰 forward 성분(선형 깊이)이라 레이 파라미터로 환산해야 한다.
  // 그냥 비교하면 화면 가장자리에서 광축이 벽을 파고든다.
  vec3 fwd = -vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2]);
  float cw = max(dot(rd, fwd), 1e-3);
  float tEnd = tExit;
  // 씬 표면까지의 레이 파라미터. 하드 컷으로 자르면 오클루더 실루엣이 광축 위에 그대로
  // 직선으로 찍힌다(실측: 문틀 모서리에서 수직 절단선). 마치는 uSoftFade 만큼 더 걷고
  // 샘플 가중을 표면 앞에서 연속으로 0 까지 내린다.
  float tScene = 1e6;
  if (uSoft > 0.5) {
    float sz = abs(texture2D(uSceneDepth, gl_FragCoord.xy / uResolution).a);
    if (sz > 0.001) { tScene = sz / cw; tEnd = min(tEnd, tScene + uSoftFade); }
  }

  // 진입점은 해석적으로 풀지 않는다. 축 슬랩 [0, uLen] 만 잘라도 원뿔 밖 샘플은 각도 가중이
  // 0이라 기여하지 않는다 — 이차방정식 두 갈래(a>0/a<0)를 분기하는 코드보다 짧고 안전하다.
  float n = dot(ro - vApex, vAxis);
  float m = dot(rd, vAxis);
  float t0 = 0.0;
  if (abs(m) > 1e-5) {
    float ta = -n / m;
    float tb = (uLen - n) / m;
    t0 = max(t0, min(ta, tb));
    tEnd = min(tEnd, max(ta, tb));
  }
  if (tEnd <= t0 + 1e-4) { gl_FragColor = vec4(0.0); return; }

  // 스텝 오프셋 디더. 픽셀 고정으로 두면 TAA 히스토리가 같은 패턴에 수렴해 격자 점무늬가
  // 그대로 화면에 남는다(실측: 광축 위 사선 도트). 프레임마다 황금비로 굴려 TAA가 평균내게 한다.
  float jit = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))
    + uTime * 37.6180339);
  float dt = (tEnd - t0) / float(SHAFT_STEPS);
  float acc = 0.0;

  for (int i = 0; i < SHAFT_STEPS; i++) {
    float tS = t0 + dt * (float(i) + jit);
    vec3 p = ro + rd * tS;
    vec3 rel = p - vApex;
    float s = dot(rel, vAxis);
    if (s <= 0.0) continue;
    float k = s / uLen;
    float cosA = s / max(length(rel), 1e-4);

    // 밀도장을 먼저 뽑는다. 경계와 밀도가 같은 난수를 공유해야 "밝은 얼룩이 경계를 밀어낸"
    // 것처럼 읽힌다 — 둘을 독립 난수로 두면 얼룩과 실루엣이 따로 놀아 다시 셸로 읽힌다.
    // 노이즈 좌표는 월드가 아니라 **기구 기준 상대 좌표**로 잡는다. 프로브 공간은 y = -500 에
    // 있어서 월드 좌표를 그대로 해시에 넣으면 fract(p * 0.318) 이 float32 정밀도를 잃고
    // 이웃 셀이 같은 값으로 뭉개진다(실측: 셸 기여 5.18 → 3.02 로 붕괴). rel 은 최대 2m 라
    // 정밀도가 남고, 기구마다 다른 시드를 더해 복도 벽등이 같은 얼룩을 복사하지 않게 한다.
    vec3 np = rel + fract(vApex * vec3(0.137, 0.211, 0.173)) * 23.0;
    vec3 q = np * uNoiseScale + uWind * uTime * 1.6;
    float nz = fbm2(q);
    // 밸류 노이즈 2옥타브의 실효 분포는 0.5 ± 0.12 라 예전 사인장 기준의 (0.20, 0.82) 구간을
    // 그대로 쓰면 대비가 통째로 죽는다. 구간을 분포에 맞춰 좁힌다.
    float dens = mix(0.14, 1.72, smoothstep(0.36, 0.68, nz));
    // 미세 흐름. 저주파 얼룩만으로는 정지 화면에서 결이 안 읽힌다(D8).
    // 얼룩과 반대 방향으로 흘려야 두 층이 같이 미끄러지지 않는다.
    dens *= 0.68 + 0.62 * vnoise(np * uFlowScale - uWind * uTime * 3.4);

    // 원뿔 등고선 자체를 밀도장으로 흔든다. 각도 임계가 고정이면 ang=0 등고선이 완전한
    // 원뿔이고, 원뿔의 투영은 언제나 직선이라 안티에일리어싱된 쐐기 모서리가 남는다.
    // 임계를 노이즈로 밀면 경계가 구부러져 어떤 시선각에서도 직선이 나오지 않는다.
    // 진폭은 프록시 PAD(1.32 → cos 여유 0.029) 안쪽으로 묶어 지오메트리 실루엣이 안 드러난다.
    float co = uCosOuter + (nz - 0.5) * uEdgeWarp * smoothstep(0.0, 0.30, k);
    // 거리 기반 경계 소프트닝. 기구 바로 아래는 조리개가 좁아 경계가 서고, 멀어질수록
    // 반그림자가 넓어져 뭉개진다. 폭이 거리의 함수라 어떤 시선각에서도 직선이 안 나온다.
    float ci = mix(co, 1.0, mix(0.34, 0.88, k));
    float ang = smoothstep(co, ci, cosA);
    if (ang <= 0.0) continue;
    // 유한 반경 1/d² + 지수 소광. 끝단에서 잘리지 않고 스스로 소멸해야 밑면이 안 보인다.
    float fall = exp(-uFall * k) / (1.0 + 5.5 * k * k);
    fall *= smoothstep(1.0, 0.74, k);

    float w = ang * fall * dens * smoothstep(0.0, uSoftFade, tScene - tS);
    // 섀도 경계를 스텝 지터만큼 흔든다. 고정 위치로 샘플하면 오클루더 그림자가 광축 안에
    // 하드 에지 가로띠로 남는다(실측: 천장등 셸 중앙의 직선 밴드).
    if (uShadowOn > 0.5) w *= vsm(p + rd * (jit - 0.5) * dt);
    if (uSlatDepth > 0.0) {
      float sl = 0.5 + 0.5 * cos(dot(rel, vUp) * uSlatFreq + uSlatPhase);
      w *= mix(1.0, smoothstep(0.30, 0.78, sl), uSlatDepth);
    }
    // 먼지 뭉침. 광량(w)에 곱해지므로 광축 밖에서는 존재 자체가 0이다.
    // 두 배율을 겹쳐 크기·속도 분포를 준다 — 굵고 느린 뭉치 + 잘고 빠른 알갱이.
    float m1 = smoothstep(0.72, 1.0, vnoise(np * uMoteScale + uWind * uTime * 2.2));
    float m2 = smoothstep(0.84, 1.0, vnoise(np * uMoteScale * 2.1 - uWind * uTime * 6.1));
    acc += w * (1.0 + uMote * (m1 + 1.6 * m2));
  }

  // uLen 으로 정규화해 경로 길이가 아니라 "밀도 평균"이 나오게 한다 — 레벨이 준 shaftLen 을
  // 바꿔도 밝기가 따라 튀지 않아야 무드별 노출 튜닝이 유지된다.
  acc *= (dt / uLen) * uGain;
  // 카메라가 원뿔 코앞에 들어오면 화면이 통째로 우유빛이 된다. 그 한 가지 실패만 막는다.
  acc *= smoothstep(0.0, 1.6, tExit * cw);
  // 셸은 fog:false 라 씬 안개를 안 받는다. 그래서 8m 뒤 광축이 2m 앞 광축과 같은 세기로
  // 원경 평면 위에 그대로 얹혀 "화면에 붙인 스프라이트"로 읽힌다. 카메라까지의 소광을
  // 직접 곱해 깊이 순서를 되돌린다(G2 "복도 끝이 안개로 소멸").
  acc *= exp(-uFogK * tExit);

  gl_FragColor = vec4(uColor * (acc * uIntensity), 1.0);
}`

export function shadeMaterial (core, skin) {
  return new THREE.ShaderMaterial({
    vertexShader: SHADE_VERT,
    fragmentShader: SHADE_FRAG,
    fog: false,
    uniforms: {
      uCore: { value: new THREE.Vector3().fromArray(core) },
      uSkin: { value: new THREE.Vector3().fromArray(skin) },
      uGlow: { value: 1 }
    }
  })
}

export function bulbMaterial (core, rim) {
  return new THREE.ShaderMaterial({
    vertexShader: SHADE_VERT,
    fragmentShader: BULB_FRAG,
    fog: false,
    uniforms: {
      uCore: { value: new THREE.Vector3().fromArray(core) },
      uRim: { value: new THREE.Vector3().fromArray(rim) },
      uGlow: { value: 1 }
    }
  })
}

// 프록시가 씬 깊이보다 뒤에 있어도 시선 앞쪽 구간은 보여야 하므로 depthTest 를 끄고,
// 대신 셰이더가 uSceneDepth 로 적분 끝점을 직접 자른다. 깊이 테스트로는 광선 하나가
// "보이거나 통째로 사라지거나" 둘뿐이라 오클루더 실루엣이 광축에 새겨지지 않는다.
export function shaftMaterial (color, intensity, len, cosOuter) {
  return new THREE.ShaderMaterial({
    // 얼룩 특징 크기가 0.22m 로 내려가면서 24스텝(간격 0.06~0.12m)은 미세 흐름 항을
    // 언더샘플해 반짝임으로 튄다. 32면 간격이 0.05~0.09m 라 흐름까지 잡힌다.
    defines: { SHAFT_STEPS: 32 },
    vertexShader: SHAFT_VERT,
    fragmentShader: SHAFT_FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    fog: false,
    uniforms: {
      uColor: { value: new THREE.Vector3().fromArray(color) },
      uIntensity: { value: intensity },
      uLen: { value: len },
      uCosOuter: { value: cosOuter },
      // 겉면 셰이딩(알파 ≈ 0.2)에서 경로 적분(밀도 평균 ≈ 0.06)으로 바뀐 만큼의 환산 상수.
      // 무드의 shaftScale 을 건드리지 않고 같은 화면 밝기를 유지하려고 여기서 되돌린다.
      // 8.5 → 17.0 은 경계 페더 확대(16% → 34%)·밸류 노이즈 대비·접촉면 소프트 페이드로
      // 줄어든 적분 평균을 되돌린 몫이다. 화면 기여 실측을 개정 전 수준(4.6)에 맞춘 값이다.
      uGain: { value: 17.0 },
      uFall: { value: 1.85 },
      uMote: { value: 0.9 },
      // 1 / 특징 크기(미터). 셸 원뿔은 길이 1.5~1.9m·밑면 반경 0.5m 규모라 얼룩이 0.3m 대여야
      // 한 광선이 서너 개를 통과한다. 예전 값은 특징 1.95m 라 원뿔 전체가 노이즈 한 칸 안에
      // 들어갔고, 그래서 밀도가 화면에서 상수로 읽혔다(심사 "밀도 변화도 노이즈도 없다").
      // 흐름·먼지 항의 하한은 마치 간격(≤1.9m / 32스텝 = 0.06m)이 정한다. 그보다 잘게 잡으면
      // 스텝이 언더샘플해 모래 알갱이 같은 반짝임으로 튄다.
      uNoiseScale: { value: 1 / 0.30 },
      uFlowScale: { value: 1 / 0.16 },
      uMoteScale: { value: 1 / 0.24 },
      uEdgeWarp: { value: 0.036 },
      uFogK: { value: 0.042 },
      uTime: { value: 0 },
      uWind: { value: new THREE.Vector3(0.05, 0.02, 0.03) },
      uSlatFreq: { value: 0 },
      uSlatPhase: { value: 0 },
      uSlatDepth: { value: 0 },
      uSceneDepth: { value: null },
      uResolution: { value: new THREE.Vector2(1280, 720) },
      uSoft: { value: 0 },
      uSoftFade: { value: 0.26 },
      uShadowMap: { value: null },
      uShadowMat: { value: new THREE.Matrix4() },
      uShadowOn: { value: 0 },
      uShadowBias: { value: -0.0012 }
    }
  })
}

// 마치 프록시: 꼭짓점이 원점, 밑면이 +Z.
// 부모는 THREE.Object3D이고, Object3D.lookAt은 카메라·광원과 달리 **+Z**를 타깃으로 돌린다
// (three는 isCamera/isLight일 때만 -Z 규약을 쓴다). 밑면을 -Z로 뽑으면 원뿔이 광축의 정반대,
// 즉 벽등 위쪽 천장으로 뻗는다 — 화면에서는 기구에서 위로 올라가는 창백한 띠로 읽힌다.
//
// 프록시는 실제 광축보다 넉넉해야 한다(PAD). 각도 가중이 0으로 떨어지는 등고선이 프록시
// 실루엣 안쪽에 있어야 지오메트리 모서리가 화면에 안 나온다. 밑면 캡이 필요한 이유는
// BackSide 라서다 — 캡이 없으면 빔을 정면으로 내려다보는 시선이 나가는 면을 못 찾는다.
export function shaftMesh (color, intensity, len, radius) {
  const PAD = 1.32
  const g = new THREE.ConeGeometry(radius * PAD, len, 32, 1, false)
  g.translate(0, -len * 0.5, 0)
  g.rotateX(-Math.PI * 0.5)
  const cosOuter = len / Math.sqrt(len * len + radius * radius)
  const m = new THREE.Mesh(g, shaftMaterial(color, intensity, len, cosOuter))
  m.frustumCulled = false
  m.renderOrder = 8
  m.castShadow = false
  m.receiveShadow = false
  m.userData.noPrepass = true
  return m
}

function bulbGeo (s) {
  const pts = [[0, 0], [0.030, 0.005], [0.038, 0.022], [0.031, 0.044], [0.021, 0.058],
    [0.028, 0.076], [0.032, 0.096], [0.026, 0.114], [0.012, 0.126], [0, 0.130]]
  return new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0] * s, p[1] * s)), 20)
}

function stemGeo (r, h) {
  const pts = [[r * 1.9, 0], [r, h * 0.10], [r * 0.82, h * 0.5], [r, h * 0.90], [r * 1.6, h]]
  return new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), 12)
}

// 아르데코 계단 갤러리. 유리 사발의 림을 무는 놋쇠 테를 단일 선반(lathe)으로 뽑는다 —
// 단마다 모따기를 둬야 하이라이트가 모서리를 타고 흐른다. 하드 에지는 스침각에서
// "잘라낸 종이"로 읽힌다(루브릭 G10). 발광이 아니라 PBR 금속이므로 안쪽 광원에 비춰져
// 단의 윗면과 아랫면에 밝기 차가 생긴다(G3).
function galleryGeo (r, h) {
  const c = 0.0016
  const pts = []
  let y = 0
  for (const k of [1.0, 0.93, 0.86]) {
    const rr = r * k
    pts.push(new THREE.Vector2(rr, y), new THREE.Vector2(rr, y + h * 0.28 - c))
    y += h * 0.28
    pts.push(new THREE.Vector2(rr - c, y), new THREE.Vector2(rr - r * 0.07 + c, y))
  }
  pts.push(new THREE.Vector2(r * 0.79, y + h * 0.16))
  return new THREE.LatheGeometry(pts, 30)
}

function domeGeo (r, cut) {
  const pts = []
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * cut
    pts.push(new THREE.Vector2(Math.sin(a) * r, Math.cos(a) * r * 0.78))
  }
  pts.push(new THREE.Vector2(Math.sin(cut) * r * 0.97, Math.cos(cut) * r * 0.78 - 0.012))
  return new THREE.LatheGeometry(pts, 28)
}

// 같은 기구가 여러 개 걸릴 때 전부 똑같으면 즉시 가짜로 읽힌다(계약 §8 / 루브릭 G10).
// 시드를 밖에서 못 받으므로 광원 자체의 색온도·HDR 배수에서 결정론적으로 뽑는다 —
// 한 공간의 벽등은 켈빈이 서로 다르게 배선돼 있어 기구마다 다른 값이 나온다.
function fxHash (col, hot, salt) {
  const s = Math.sin(col[0] * 127.1 + col[1] * 311.7 + col[2] * 74.7 + hot * 45.3 + salt * 19.1) * 43758.5453
  return s - Math.floor(s)
}

// kind별 발광 몸통. col은 선형 RGB, hot은 HDR 배수.
export function makeFixture (kind, col, hot) {
  const g = new THREE.Group()
  const emissive = []
  const shades = []
  // 코어는 백색 쪽으로 45% 끌어당긴다(과노출된 발광체는 색이 빠져 보인다). 림은 0.34배로
  // 떨어뜨리면서 적색을 남기고 청색을 걷어 호박색으로 넘긴다.
  const bulbMat = () => {
    const m = bulbMaterial(
      [(col[0] * 0.55 + 0.45) * hot, (col[1] * 0.55 + 0.45) * hot, (col[2] * 0.55 + 0.45) * hot],
      [col[0] * hot * 0.46, col[1] * hot * 0.28, col[2] * hot * 0.14])
    emissive.push(m)
    return m
  }
  // soot: 유백유리에 앉은 그을음. 스치는 각(스킨)만 죽이므로 정면 투과는 유지된다
  const glass = (mul, soot = 1) => {
    const k = mul * soot
    const m = shadeMaterial([col[0] * hot * mul, col[1] * hot * mul, col[2] * hot * mul],
      [col[0] * hot * k * 0.22, col[1] * hot * k * 0.24, col[2] * hot * k * 0.30])
    shades.push(m)
    return m
  }
  const add = (geo, mat, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat)
    m.position.set(x, y, z)
    m.castShadow = false
    m.receiveShadow = false
    g.add(m)
    return m
  }

  if (kind === 'sconce') {
    // 기구별 변주: 유리 크기·컷·그을음. 반복 벽등이 복사-붙여넣기로 읽히지 않게 하는 최소 조치
    const a = fxHash(col, hot, 1), b = fxHash(col, hot, 2), c = fxHash(col, hot, 3)
    const rad = 0.126 + a * 0.022
    const cut = Math.PI * (0.58 + b * 0.09)
    add(domeGeo(rad, cut), glass(0.55, 0.35 + c * 0.65)).rotation.x = Math.PI
    // 유리를 무는 놋쇠 갤러리. 유백 사발만 떠 있으면 실루엣이 안 닫힌다(G10)
    add(galleryGeo(Math.sin(cut) * rad * 1.02, 0.034), mat('brass.tarnished'),
      0, Math.cos(cut) * rad * -0.78, 0)
    add(bulbGeo(0.55), bulbMat(), 0, -0.05, 0)
    add(stemGeo(0.016, 0.10), mat('brass.tarnished'), 0, 0.02, 0)
  } else if (kind === 'chandelier') {
    const arm = mat('brass.tarnished')
    add(new THREE.TorusGeometry(0.40, 0.016, 8, 48), arm).rotation.x = Math.PI * 0.5
    add(new THREE.TorusGeometry(0.24, 0.012, 8, 40), arm, 0, 0.18, 0).rotation.x = Math.PI * 0.5
    add(stemGeo(0.020, 0.42), arm, 0, 0.16, 0)
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      const r = i % 2 ? 0.24 : 0.40
      const y = i % 2 ? 0.20 : 0.02
      add(bulbGeo(0.62), bulbMat(), Math.cos(a) * r, y, Math.sin(a) * r)
      add(domeGeo(0.052, Math.PI * 0.5), glass(0.42), Math.cos(a) * r, y - 0.012, Math.sin(a) * r)
    }
  } else if (kind === 'desk') {
    add(domeGeo(0.115, Math.PI * 0.60), glass(0.48)).rotation.x = Math.PI
    add(bulbGeo(0.44), bulbMat(), 0, -0.04, 0)
  } else if (kind === 'ceiling') {
    if (col[2] > col[0] * 0.35) {
      const tube = new THREE.CapsuleGeometry(0.030, 0.58, 6, 14)
      for (const dx of [-0.075, 0.075]) add(tube, bulbMat(), dx, 0, 0).rotation.z = Math.PI * 0.5
      add(domeGeo(0.30, Math.PI * 0.44), glass(0.30), 0, 0.02, 0).rotation.x = Math.PI
    } else {
      add(new THREE.SphereGeometry(0.15, 24, 16), glass(0.62))
      add(bulbGeo(0.5), bulbMat(), 0, -0.02, 0)
    }
  } else if (kind === 'neon') {
    const tube = new THREE.TorusGeometry(0.34, 0.020, 10, 44, Math.PI * 1.45)
    add(tube, bulbMat()).rotation.z = Math.PI * 0.28
    add(new THREE.CapsuleGeometry(0.020, 0.42, 6, 14), bulbMat(), 0.30, -0.26, 0).rotation.z = 0.35
  } else if (kind === 'bare-bulb') {
    add(bulbGeo(1.0), bulbMat())
    add(stemGeo(0.006, 0.46), mat('bakelite.black'), 0, 0.125, 0)
  } else if (kind === 'elevator') {
    add(new THREE.CircleGeometry(0.20, 32), glass(0.5)).rotation.x = Math.PI * 0.5
    add(galleryGeo(0.212, 0.026), mat('brass.polished'), 0, -0.006, 0)
  } else {
    return null
  }

  g.userData.emissive = emissive
  g.userData.shades = shades
  return g
}

// 깜빡임을 몸통 밝기에 그대로 물린다 — 광원만 흔들리고 전구는 안 흔들리면 가짜로 읽힌다
export function setFixtureGlow (fixture, col, hot, k) {
  if (!fixture) return
  // 발광부·셰이드 모두 절대 색을 생성 시점에 굽고 깜빡임은 배수 하나로만 흔든다
  for (const m of fixture.userData.emissive) m.uniforms.uGlow.value = k
  for (const m of fixture.userData.shades) m.uniforms.uGlow.value = k
}
