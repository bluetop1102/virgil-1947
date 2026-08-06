import{B as e,F as t,Fn as n,H as r,N as i,Nn as a,O as o,Pn as s,R as c,X as l,Z as u,_n as d,a as f,bn as p,dt as m,f as h,fn as g,ft as _,g as v,o as y,pn as b,pt as x,st as S,u as C,vn as ee}from"./three.core-_aCheQum.js";import{t as w}from"./three.module-BBivSOgF.js";import{a as T,c as E,i as te,o as D,r as O,s as k,t as A}from"./util-Co7KvJK9.js";import{i as j}from"./library-B4oh6zr-.js";import{_ as ne,c as M,d as N,f as P,l as F,m as I,n as re,t as L,u as R,x as z,y as B}from"./kit-D8BSmvWY.js";import{r as ie,t as ae}from"./kit-mat-Bs-bI22y.js";import{d as oe,i as se,n as ce,o as le,r as ue,t as de,u as fe}from"./props-detail-DQex08uq.js";import{a as pe,c as me,d as he,f as ge,i as _e,l as ve,n as ye,o as be,r as xe,s as Se,t as Ce,u as we}from"./props-fixtures-CUNcDhQ2.js";import{a as Te,c as Ee,d as De,f as Oe,h as ke,l as Ae,m as je,n as Me,r as Ne,s as V,u as Pe}from"./props-BbyFAaDu.js";import{a as Fe,i as Ie,n as Le,o as Re,r as ze,t as Be}from"./props-corridor-DGVcxlWx.js";var Ve={"lobby-night":{exposure:1,envIntensity:.58,shaftScale:0,background:!1,fog:{density:.018,albedo:.62,ambient:.38,heightFalloff:.16,color:[.042,.033,.026],scattering:1.3,anisotropy:.62,windDir:[.055,.012,.03],baseHeight:0,noiseScale:.075,spark:3.4,sparkScale:1.3,maxDist:20},look:{lift:[-.01,.002,.02],gamma:[1,.99,.965],gain:[1.1,1,.88],saturation:.9,contrast:1.14,halation:.28,vignette:.44,grainAmount:.042,chromatic:.0022,volumetricIntensity:1.1},hemi:{sky:[.024,.019,.015],ground:[.01,.007,.005],intensity:.45},particles:{dust:.55,smoke:1,rain:0,splash:0,box:[16,5.2,16]},ibl:{zenith:[.005,.005,.007],horizon:[.03,.022,.013],ground:[.021,.015,.01],glow:[.085,.048,.02],glowPow:2.6,glowHeight:.6,stars:0,seed:.7,sun:null,blobs:[{dir:[.15,.86,-.48],col:[1.35,.78,.3],size:26},{dir:[-.9,.05,.42],col:[.13,.17,.22],size:5},{dir:[.72,-.22,.66],col:[.26,.17,.09],size:7}]}},"corridor-night":{exposure:.74,envIntensity:.78,shaftScale:.65,background:!1,fog:{density:.17,albedo:.24,ambient:.012,extinctK:1.1,heightFalloff:.85,color:[2e-4,28e-5,36e-5],scattering:.62,anisotropy:.62,windDir:[.02,.006,.075],baseHeight:0,noiseScale:.1,spark:4.5,sparkScale:2.2,maxDist:10},look:{lift:[-.016,.003,.03],gamma:[1,.985,.945],gain:[1.08,1,.9],saturation:.8,contrast:1.2,halation:.17,vignette:.54,grainAmount:.052,chromatic:.0026,volumetricIntensity:.22},hemi:{sky:[.016,.022,.028],ground:[.008,.007,.007],intensity:.7},particles:{dust:.75,smoke:.35,rain:0,splash:0,box:[7,3.4,26]},ibl:{zenith:[.003,.004,.006],horizon:[.012,.014,.016],ground:[.01,.008,.007],glow:[.03,.02,.01],glowPow:3.4,glowHeight:.42,stars:0,seed:2.1,sun:null,blobs:[{dir:[0,.3,-.95],col:[.55,.31,.12],size:34},{dir:[0,.2,.98],col:[.04,.09,.12],size:12}]}},"room-dusk":{exposure:.88,envIntensity:.52,shaftScale:0,background:!1,fog:{density:.015,albedo:.88,ambient:.3,heightFalloff:.2,color:[.05,.041,.035],scattering:1.7,anisotropy:.8,windDir:[.09,.02,.02],baseHeight:0,noiseScale:.13,spark:5,sparkScale:2.1,maxDist:12},look:{lift:[-.008,.004,.024],gamma:[1,.99,.96],gain:[1.12,1,.86],saturation:.92,contrast:1.12,halation:.32,vignette:.42,grainAmount:.04,chromatic:.002,volumetricIntensity:1.15},hemi:{sky:[.03,.026,.026],ground:[.014,.01,.008],intensity:.45},particles:{dust:1.35,smoke:.5,rain:0,splash:0,box:[9,3.2,9]},ibl:{zenith:[.014,.02,.038],horizon:[.13,.075,.038],ground:[.03,.022,.016],glow:[.3,.14,.045],glowPow:2,glowHeight:.72,stars:0,seed:4.3,sun:{dir:[.62,.22,-.75],col:[3.4,1.55,.62],sharp:220},blobs:[{dir:[.6,.3,-.74],col:[1.1,.62,.28],size:10},{dir:[-.55,-.1,.83],col:[.1,.1,.13],size:5}]}},bathroom:{exposure:.94,envIntensity:.8,shaftScale:0,background:!1,fog:{density:.009,albedo:.52,ambient:.42,heightFalloff:.28,color:[.036,.043,.048],scattering:.95,anisotropy:.36,windDir:[.01,.05,.01],baseHeight:0,noiseScale:.16,spark:2,sparkScale:1.9,maxDist:6},look:{lift:[-.006,.001,.014],gamma:[.99,1,1],gain:[.94,1,1.04],saturation:.72,contrast:1.18,halation:.14,vignette:.36,grainAmount:.034,chromatic:.0014,volumetricIntensity:.85},hemi:{sky:[.038,.043,.048],ground:[.02,.022,.024],intensity:.6},particles:{dust:.3,smoke:.2,rain:0,splash:0,box:[4,2.8,4]},ibl:{zenith:[.1,.113,.126],horizon:[.055,.062,.07],ground:[.04,.044,.048],glow:[.02,.026,.03],glowPow:4,glowHeight:.3,stars:0,seed:6.9,sun:null,blobs:[{dir:[0,.98,.2],col:[1.55,1.72,1.9],size:9},{dir:[0,-.85,.53],col:[.1,.11,.12],size:4}]}},"rooftop-rain":{exposure:.92,envIntensity:.56,shaftScale:.85,background:!0,fog:{density:.019,albedo:.58,ambient:.2,heightFalloff:.12,color:[.028,.033,.045],scattering:1.4,anisotropy:.52,windDir:[.28,-.05,.1],baseHeight:0,noiseScale:.045,spark:2.4,sparkScale:.85,maxDist:62},look:{lift:[-.014,.002,.034],gamma:[1,.995,.975],gain:[1.02,1,.98],saturation:.84,contrast:1.16,halation:.3,vignette:.48,grainAmount:.05,chromatic:.003,volumetricIntensity:1},hemi:{sky:[.024,.029,.042],ground:[.01,.01,.011],intensity:.65},particles:{dust:.1,smoke:.22,rain:1,splash:1,lens:1,box:[22,9,22]},ibl:{zenith:[.01,.014,.026],horizon:[.055,.045,.04],ground:[.014,.014,.016],glow:[.36,.2,.085],glowPow:3.2,glowHeight:.34,stars:.35,seed:1.4,sun:{dir:[-.42,.6,.68],col:[2.6,2.9,3.6],sharp:900},blobs:[{dir:[-.4,.58,.71],col:[.34,.4,.52],size:12},{dir:[.88,-.06,-.47],col:[.42,.16,.2],size:6},{dir:[-.72,-.1,-.68],col:[.16,.26,.34],size:6}]}},interrogation:{exposure:.86,envIntensity:.14,shaftScale:0,background:!1,fog:{density:.024,albedo:.88,ambient:.14,heightFalloff:.14,color:[.026,.026,.03],scattering:1.85,anisotropy:.82,windDir:[.035,.02,.015],baseHeight:0,noiseScale:.16,spark:4.4,sparkScale:2.3,maxDist:6},look:{lift:[-.018,0,.022],gamma:[1,.985,.955],gain:[1.09,1,.89],saturation:.76,contrast:1.28,halation:.22,vignette:.62,grainAmount:.056,chromatic:.0024,volumetricIntensity:1.15},hemi:{sky:[.006,.006,.008],ground:[.003,.003,.003],intensity:.22},particles:{dust:.85,smoke:1.35,rain:0,splash:0,box:[6,3,6]},ibl:{zenith:[.002,.002,.003],horizon:[.006,.006,.007],ground:[.006,.005,.004],glow:[.012,.008,.005],glowPow:4.5,glowHeight:.25,stars:0,seed:3.3,sun:null,blobs:[{dir:[.05,.95,-.3],col:[.95,.62,.3],size:40}]}}},He={lobby:`lobby-night`,corridor:`corridor-night`,room942:`room-dusk`,room944:`room-dusk`,bathroom:`bathroom`,rooftop:`rooftop-rain`},Ue=`lobby-night`,We=`
varying vec3 vDir;
void main () {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,Ge=`
varying vec3 vDir;
uniform vec3 uZenith, uHorizon, uGround, uGlow;
uniform float uGlowPow, uGlowHeight, uStars, uSeed;
uniform vec3 uSunDir, uSunCol;
uniform float uSunSharp;
uniform vec3 uBlobDir[4];
uniform vec3 uBlobCol[4];
uniform float uBlobSize[4];
uniform int uBlobCount;

float hash31 (vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

void main () {
  vec3 d = normalize(vDir);
  float h = d.y;

  // 천정→지평 그라디언트. 지수를 낮게 잡아야 지평 근처가 눌리지 않는다
  vec3 col = mix(uHorizon, uZenith, pow(clamp(h, 0.0, 1.0), 0.55));
  col = mix(col, uGround, smoothstep(0.03, -0.30, h));

  // 도시 광해: 지평선 띠 + 방위각 변조(다운타운 방향이 더 밝다)
  float band = pow(clamp(1.0 - abs(h) / max(uGlowHeight, 1e-3), 0.0, 1.0), uGlowPow);
  float az = 0.62 + 0.38 * sin(atan(d.z, d.x) + uSeed);
  col += uGlow * band * az;

  // 별. 광해에 잠기도록 지평 근처에서 감쇠시킨다
  if (uStars > 0.0 && h > 0.02) {
    vec3 g = floor(d * 260.0);
    float s = hash31(g + uSeed);
    float star = smoothstep(0.9975, 0.99985, s) * smoothstep(0.02, 0.55, h);
    col += vec3(0.85, 0.90, 1.0) * star * uStars * 2.2;
  }

  // 달/석양 디스크 + 광륜
  float sd = max(dot(d, normalize(uSunDir)), 0.0);
  col += uSunCol * (pow(sd, uSunSharp) + 0.06 * pow(sd, 6.0));

  // 실내 반사원: 창·조명·복도 끝 같은 방향성 블랍
  for (int i = 0; i < 4; i++) {
    if (i >= uBlobCount) break;
    float b = pow(max(dot(d, normalize(uBlobDir[i])), 0.0), uBlobSize[i]);
    col += uBlobCol[i] * b;
  }

  gl_FragColor = vec4(max(col, vec3(0.0)), 1.0);
}`,Ke=class{constructor(e){this.renderer=e,this.pmrem=new w(e),this.pmrem.compileCubemapShader(),this.cache=new Map,this.mat=new b({side:1,depthWrite:!1,fog:!1,vertexShader:We,fragmentShader:Ge,uniforms:{uZenith:{value:new s},uHorizon:{value:new s},uGround:{value:new s},uGlow:{value:new s},uGlowPow:{value:3},uGlowHeight:{value:.5},uStars:{value:0},uSeed:{value:0},uSunDir:{value:new s(0,1,0)},uSunCol:{value:new s},uSunSharp:{value:400},uBlobDir:{value:[new s(0,1,0),new s(0,1,0),new s(0,1,0),new s(0,1,0)]},uBlobCol:{value:[new s,new s,new s,new s]},uBlobSize:{value:[8,8,8,8]},uBlobCount:{value:0}}}),this.skyScene=new g,this.sky=new u(new d(60,48,32),this.mat),this.sky.frustumCulled=!1,this.skyScene.add(this.sky)}_apply(e){let t=this.mat.uniforms;t.uZenith.value.fromArray(e.zenith),t.uHorizon.value.fromArray(e.horizon),t.uGround.value.fromArray(e.ground),t.uGlow.value.fromArray(e.glow),t.uGlowPow.value=e.glowPow,t.uGlowHeight.value=e.glowHeight,t.uStars.value=e.stars||0,t.uSeed.value=e.seed||0,e.sun?(t.uSunDir.value.fromArray(e.sun.dir).normalize(),t.uSunCol.value.fromArray(e.sun.col),t.uSunSharp.value=e.sun.sharp):(t.uSunCol.value.set(0,0,0),t.uSunSharp.value=400);let n=e.blobs||[];t.uBlobCount.value=Math.min(n.length,4);for(let e=0;e<4;e++){let r=n[e];r&&(t.uBlobDir.value[e].fromArray(r.dir).normalize(),t.uBlobCol.value[e].fromArray(r.col),t.uBlobSize.value[e]=r.size)}}bake(e,t,n=256){let r=this.cache.get(e);if(r)return r.texture;this._apply(t);let i=this.pmrem.fromScene(this.skyScene,.015,.1,200,{size:n});return i.texture.name=`atmo.env.${e}`,this.cache.set(e,i),i.texture}dispose(){for(let e of this.cache.values())e.dispose();this.cache.clear(),this.pmrem.dispose(),this.sky.geometry.dispose(),this.mat.dispose()}},qe=`
varying vec3 vN; varying vec3 vV;
void main () {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalMatrix * normal;
  vV = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`,Je=`
varying vec3 vN; varying vec3 vV;
uniform vec3 uCore, uSkin;
uniform float uGlow;
void main () {
  float ndv = abs(dot(normalize(vN), normalize(vV)));
  // 유리 두께: 정면은 얇아 속이 비치고(코어), 스치는 각은 두꺼워 탁하다(스킨)
  vec3 c = mix(uSkin, uCore, pow(ndv, 1.25));
  gl_FragColor = vec4(c * uGlow, 1.0);
}`,Ye=`
varying vec3 vN; varying vec3 vV;
uniform vec3 uCore, uRim;
uniform float uGlow;
void main () {
  float ndv = abs(dot(normalize(vN), normalize(vV)));
  // 지수 0.55 — 코어를 좁게 잡으면 실루엣 안쪽까지 순백이 유지돼 롤오프가 안 보인다
  vec3 c = mix(uRim, uCore, pow(ndv, 0.55));
  gl_FragColor = vec4(c * uGlow, 1.0);
}`,Xe=`
varying vec3 vW; varying vec3 vApex; varying vec3 vAxis; varying vec3 vUp;
void main () {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vW = wp.xyz;
  // 셸에는 스케일이 없다(holder 는 position+lookAt 뿐) — 축·길이가 월드에서 그대로 보존된다
  vApex = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vAxis = normalize((modelMatrix * vec4(0.0, 0.0, 1.0, 0.0)).xyz);
  vUp = normalize((modelMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`,Ze=`
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
}`;function Qe(e,t){return new b({vertexShader:qe,fragmentShader:Je,fog:!1,uniforms:{uCore:{value:new s().fromArray(e)},uSkin:{value:new s().fromArray(t)},uGlow:{value:1}}})}function $e(e,t){return new b({vertexShader:qe,fragmentShader:Ye,fog:!1,uniforms:{uCore:{value:new s().fromArray(e)},uRim:{value:new s().fromArray(t)},uGlow:{value:1}}})}function et(e,t,n,r){return new b({defines:{SHAFT_STEPS:32},vertexShader:Xe,fragmentShader:Ze,transparent:!0,depthWrite:!1,depthTest:!1,blending:2,side:1,fog:!1,uniforms:{uColor:{value:new s().fromArray(e)},uIntensity:{value:t},uLen:{value:n},uCosOuter:{value:r},uGain:{value:17},uFall:{value:1.85},uMote:{value:.9},uNoiseScale:{value:1/.3},uFlowScale:{value:1/.16},uMoteScale:{value:1/.24},uEdgeWarp:{value:.036},uFogK:{value:.042},uTime:{value:0},uWind:{value:new s(.05,.02,.03)},uSlatFreq:{value:0},uSlatPhase:{value:0},uSlatDepth:{value:0},uSceneDepth:{value:null},uResolution:{value:new a(1280,720)},uSoft:{value:0},uSoftFade:{value:.26},uShadowMap:{value:null},uShadowMat:{value:new l},uShadowOn:{value:0},uShadowBias:{value:-.0012}}})}function tt(e,t,n,r){let i=new v(r*1.32,n,32,1,!1);i.translate(0,-n*.5,0),i.rotateX(-Math.PI*.5);let a=n/Math.sqrt(n*n+r*r),o=new u(i,et(e,t,n,a));return o.frustumCulled=!1,o.renderOrder=8,o.castShadow=!1,o.receiveShadow=!1,o.userData.noPrepass=!0,o}function H(e){return new r([[0,0],[.03,.005],[.038,.022],[.031,.044],[.021,.058],[.028,.076],[.032,.096],[.026,.114],[.012,.126],[0,.13]].map(t=>new a(t[0]*e,t[1]*e)),20)}function nt(e,t){let n=[[e*1.9,0],[e,t*.1],[e*.82,t*.5],[e,t*.9],[e*1.6,t]];return new r(n.map(e=>new a(e[0],e[1])),12)}function rt(e,t){let n=.0016,i=[],o=0;for(let r of[1,.93,.86]){let s=e*r;i.push(new a(s,o),new a(s,o+t*.28-n)),o+=t*.28,i.push(new a(s-n,o),new a(s-e*.07+n,o))}return i.push(new a(e*.79,o+t*.16)),new r(i,30)}function it(e,t){let n=[];for(let r=0;r<=12;r++){let i=r/12*t;n.push(new a(Math.sin(i)*e,Math.cos(i)*e*.78))}return n.push(new a(Math.sin(t)*e*.97,Math.cos(t)*e*.78-.012)),new r(n,28)}var at=[[-.082,0],[.082,0],[.082,-.052],[.074,-.062],[.058,-.066],[.058,-.056],[.07,-.052],[.07,-.006],[-.07,-.006],[-.07,-.052],[-.058,-.056],[-.058,-.066],[-.074,-.062],[-.082,-.052]],ot=[[-.066,-.004],[-.062,-.044],[-.03,-.056],[.03,-.056],[.062,-.044],[.066,-.004],[.06,-.004],[.056,-.042],[.028,-.051],[-.028,-.051],[-.056,-.042],[-.06,-.004]];function st(e,t,n){let r=Math.sin(e[0]*127.1+e[1]*311.7+e[2]*74.7+t*45.3+n*19.1)*43758.5453;return r-Math.floor(r)}function ct(e,t,n){let r=new c,i=[],a=[],o=()=>{let e=$e([(t[0]*.55+.45)*n,(t[1]*.55+.45)*n,(t[2]*.55+.45)*n],[t[0]*n*.46,t[1]*n*.28,t[2]*n*.14]);return i.push(e),e},s=(e,r=1)=>{let i=e*r,o=Qe([t[0]*n*e,t[1]*n*e,t[2]*n*e],[t[0]*n*i*.22,t[1]*n*i*.24,t[2]*n*i*.3]);return a.push(o),o},l=(e,t,n=0,i=0,a=0)=>{let o=new u(e,t);return o.position.set(n,i,a),o.castShadow=!1,o.receiveShadow=!1,r.add(o),o};if(e===`sconce`){let e=st(t,n,1),r=st(t,n,2),i=st(t,n,3),a=.126+e*.022,c=Math.PI*(.58+r*.09);l(it(a,c),s(.55,.35+i*.65)).rotation.x=Math.PI,l(rt(Math.sin(c)*a*1.02,.034),j(`brass.tarnished`),0,Math.cos(c)*a*-.78,0),l(H(.55),o(),0,-.05,0),l(nt(.016,.1),j(`brass.tarnished`),0,.02,0)}else if(e===`chandelier`){let e=j(`brass.tarnished`);l(new p(.4,.016,8,48),e).rotation.x=Math.PI*.5,l(new p(.24,.012,8,40),e,0,.18,0).rotation.x=Math.PI*.5,l(nt(.02,.42),e,0,.16,0);for(let e=0;e<8;e++){let t=e/8*Math.PI*2,n=e%2?.24:.4,r=e%2?.2:.02;l(H(.62),o(),Math.cos(t)*n,r,Math.sin(t)*n),l(it(.052,Math.PI*.5),s(.42),Math.cos(t)*n,r-.012,Math.sin(t)*n)}}else if(e===`desk`)l(it(.115,Math.PI*.6),s(.48)).rotation.x=Math.PI,l(H(.44),o(),0,-.04,0);else if(e===`ceiling`)if(t[2]>t[0]*.35){let e=st(t,n,4),r=j(`bakelite.black`);l(I(at,[[-.3,0,0],[.3,0,0]],{up:[0,1,0]}),r);for(let e of[-1,1])l(L(.01,.062,.16,.0025,1),r,e*.295,-.033,0),l(L(.016,.034,.026,.004,1),j(`brass.tarnished`),e*.282,-.03,0);l(I(ot,[[-.289,0,0],[.289,0,0]],{up:[0,1,0]}),s(.22,.55+e*.45)),l(new C(.019,.51,6,16),o(),0,-.049,0).rotation.z=Math.PI*.5;for(let e of[-.17,.17])l(L(.07,.006,.07,.002,1),j(`steel.galvanized`),e,.004,0)}else l(new d(.15,24,16),s(.62)),l(H(.5),o(),0,-.02,0);else if(e===`neon`){let e=new p(.34,.02,10,44,Math.PI*1.45);l(e,o()).rotation.z=Math.PI*.28,l(new C(.02,.42,6,14),o(),.3,-.26,0).rotation.z=.35}else if(e===`bare-bulb`)l(H(1),o()),l(nt(.006,.46),j(`bakelite.black`),0,.125,0);else if(e===`elevator`)l(new h(.2,32),s(.5)).rotation.x=Math.PI*.5,l(rt(.212,.026),j(`brass.polished`),0,-.006,0);else return null;return r.userData.emissive=i,r.userData.shades=a,r}function lt(e,t,n,r){if(e){for(let t of e.userData.emissive)t.uniforms.uGlow.value=r;for(let t of e.userData.shades)t.uniforms.uGlow.value=r}}var U=`
uniform vec4 uLP[4];   // xyz=위치, w=사거리(0=무한)
uniform vec4 uLC[4];   // rgb=색, w=세기
uniform vec4 uLD[4];   // xyz=스팟 축, w=cos(외각). w<-0.5면 점광원
uniform vec3 uAmbient;

uniform float uGain, uCeil, uAmbScale, uVisRef, uKnee;

// 직전 scatter() 호출이 채우는 광원 볼륨 마스크. 0 = 광축 밖, 1 = 콘 코어.
// 소비처가 알파에 물려 "조명이 닿지 않는 구석에도 같은 밀도로 뜨는 오버레이"를 막는다.
float gVis;

// 광원 세기는 three와 같은 역제곱으로 감쇠시킨다. 최소 반경(0.6m)을 두지 않으면 광원에
// 붙은 입자 하나가 발산해 블룸·DOF가 그걸 화면만 한 보케로 부풀린다.
vec3 scatter (vec3 wp, vec3 V, float fwd) {
  vec3 lit = uAmbient * uAmbScale;
  float acc = 0.0;
  for (int i = 0; i < 4; i++) {
    if (uLC[i].w <= 0.0) continue;
    vec3 toL = uLP[i].xyz - wp;
    float d2 = max(dot(toL, toL), 1e-4);
    vec3 L = toL * inversesqrt(d2);
    float att = 1.0 / max(d2, 0.36);
    if (uLP[i].w > 0.0) att *= pow(clamp(1.0 - d2 / (uLP[i].w * uLP[i].w), 0.0, 1.0), 2.0);
    float cone = 1.0;
    if (uLD[i].w > -0.5) {
      float cd = dot(-L, uLD[i].xyz);
      cone = smoothstep(uLD[i].w, mix(uLD[i].w, 1.0, 0.40), cd);
    }
    // 미 산란 근사: 역광에서 강한 전방 로브. 광축 밖에서는 cone이 0이라 모티가 죽는다
    float hg = 0.16 + fwd * pow(max(dot(V, -L), 0.0), 6.0);
    lit += uLC[i].rgb * uLC[i].w * att * cone * hg * uGain;
    // 마스크는 시선각(hg)을 빼고 순수 조도만 쌓는다 — 역광이 아닌 방향의 광축도 광축이다
    acc += uLC[i].w * att * cone;
  }
  gVis = clamp(acc / max(uVisRef, 1e-4), 0.0, 1.0);
  float m = max(lit.r, max(lit.g, lit.b));
  // 하드 클램프는 조도가 천장을 넘는 순간 모든 입자를 같은 값으로 눌러 붙인다. 스팟 하나가
  // 수백 cd라 실내에서는 사실상 전부 포화하고, 결과가 "같은 흰색 덩어리 20개"가 된다(D8).
  // 소프트 니는 순서를 보존하므로 같은 상한 안에서도 값 층이 남는다.
  if (uKnee > 0.5) return lit * (uCeil / (uCeil + m));
  // 천장을 두면 광축 안 모티는 여전히 하이라이트로 남고, 발산만 잘린다
  return m > uCeil ? lit * (uCeil / m) : lit;
}`,W=`
uniform sampler2D uSceneDepth;
uniform vec2 uResolution;
uniform float uSoft, uSoftFade;
float softFade (float vz) {
  if (uSoft < 0.5) return 1.0;
  float sceneZ = abs(texture2D(uSceneDepth, gl_FragCoord.xy / uResolution).a);
  if (sceneZ < 0.001) return 1.0;
  return clamp((sceneZ - vz) / uSoftFade, 0.0, 1.0);
}`,ut=`
vec3 wrapBox (vec3 p, vec3 box, vec3 c) {
  vec3 d = p - c + box * 0.5;
  return c + mod(mod(d, box) + box, box) - box * 0.5;
}`;function dt(e,t,n=3){let r=k(t),i=new Float32Array(e*n);for(let t=0;t<e*n;t++)i[t]=r();return new f(i,n)}function ft(e,t,n){let r=k(n),i=new Float32Array(e*3);for(let n=0;n<e;n++)i[n*3]=(r()-.5)*t[0],i[n*3+1]=(r()-.5)*t[1],i[n*3+2]=(r()-.5)*t[2];return new f(i,3)}function G(e){return{uTime:{value:0},uBox:{value:new s().fromArray(e)},uCam:{value:new s},uWind:{value:new s(.05,.01,.03)},uPix:{value:600},uOpacity:{value:1},uTint:{value:new s(1,1,1)},uAmbient:{value:new s(.02,.02,.025)},uLP:{value:[0,1,2,3].map(()=>new n)},uLC:{value:[0,1,2,3].map(()=>new n)},uLD:{value:[0,1,2,3].map(()=>new n(0,-1,0,-1))},uSceneDepth:{value:null},uResolution:{value:new a(1280,720)},uSoft:{value:0},uSoftFade:{value:.6},uGain:{value:1},uCeil:{value:2.2},uAmbScale:{value:1},uVisRef:{value:.55},uKnee:{value:0}}}function pt(e){return e.frustumCulled=!1,e.castShadow=!1,e.receiveShadow=!1,e.renderOrder=10,e.userData.noPrepass=!0,e.userData.atmoParticles=!0,e}function mt(e,t,n){let r=new y;r.setAttribute(`position`,ft(e,t,n)),r.setAttribute(`aSeed`,dt(e,n+17));let i=G(t);i.uSize={value:.0042},i.uMaxPx={value:8},i.uFocus={value:0},i.uNearRef={value:2.4},i.uApertureK={value:1.7},i.uAmbScale.value=.15,i.uSoftFade.value=.15;let a=new b({transparent:!0,depthWrite:!1,blending:2,fog:!1,uniforms:i,vertexShader:`
      attribute vec3 aSeed;
      uniform float uTime, uSize, uPix, uMaxPx, uFocus, uNearRef, uApertureK;
      uniform vec3 uBox, uCam, uWind;
      varying vec3 vLit; varying float vTw; varying float vZ; varying float vA;
      ${U}
      ${ut}
      void main () {
        float t = uTime;
        float f = 0.25 + aSeed.y * 0.9;
        vec3 p = position;
        p.x += sin(t * f * 0.70 + aSeed.x * 6.283) * 0.34 + uWind.x * t;
        p.y += sin(t * f * 0.46 + aSeed.x * 3.141) * 0.22 + uWind.y * t;
        p.z += cos(t * f * 0.61 + aSeed.x * 4.712) * 0.34 + uWind.z * t;
        vec3 wp = wrapBox(p, uBox, uCam);
        vec3 V = normalize(uCam - wp);
        vLit = scatter(wp, V, 1.35);
        vec4 mv = viewMatrix * vec4(wp, 1.0);
        vZ = -mv.z;
        vTw = 0.45 + 0.55 * pow(abs(sin(t * (1.1 + aSeed.z * 3.0) + aSeed.x * 12.0)), 1.5);

        // 파티클은 depthWrite:false 라 DOF가 뒤 지오메트리의 CoC를 물려준다 — 0.8m 앞 모티가
        // 6m 벽의 초점을 따라가 언제나 선명하다. 정점에서 자기 CoC를 계산해 스스로 부풀고 옅어진다.
        float defoc = uFocus > 0.0
          ? abs(vZ - uFocus) / max(vZ, 0.08)
          : max(uNearRef - vZ, 0.0) / uNearRef;
        float coc = defoc * uApertureK;

        // 하한 1px에 전부 걸리면 크기 분포가 죽어 같은 점 3000개가 된다. 하한 아래는
        // 크기 대신 알파로 줄여 서브픽셀 입자를 보존한다.
        float want = uSize * (0.35 + aSeed.z) * uPix / max(vZ, 0.08) * (1.0 + coc);
        float px = clamp(want, 1.0, uMaxPx);
        gl_PointSize = px;
        vA = clamp(want / px, 0.0, 1.0) * mix(0.15, 1.0, gVis) / ((1.0 + coc) * (1.0 + coc));
        gl_Position = projectionMatrix * mv;
      }`,fragmentShader:`
      uniform float uOpacity; uniform vec3 uTint;
      varying vec3 vLit; varying float vTw; varying float vZ; varying float vA;
      ${W}
      void main () {
        float r = length(gl_PointCoord - 0.5) * 2.0;
        // smoothstep(1.0, 0.05, r)는 2px 스프라이트에서 모든 프래그먼트가 같은 알파를 받아
        // 각진 정사각형이 된다. 가우시안은 중심에서 가장자리까지 연속으로 떨어진다.
        float a = exp(-4.5 * r * r);
        a *= uOpacity * vTw * vA * softFade(vZ);
        gl_FragColor = vec4(vLit * uTint, a);
      }`});return pt(new x(r,a))}function ht(e,t,n){let r=new y;r.setAttribute(`position`,ft(e,t,n+3)),r.setAttribute(`aSeed`,dt(e,n+41));let i=G(t);i.uSize={value:.085},i.uRise={value:.11},i.uMaxPx={value:96},i.uRefPx={value:46},i.uAmbScale.value=.3,i.uGain.value=.18,i.uCeil.value=.26,i.uKnee.value=1;let a=new b({transparent:!0,depthWrite:!1,blending:1,fog:!1,uniforms:i,vertexShader:`
      attribute vec3 aSeed;
      uniform float uTime, uSize, uPix, uRise, uMaxPx, uRefPx;
      uniform vec3 uBox, uCam, uWind;
      varying vec3 vLit; varying float vLife; varying float vZ; varying float vRot; varying float vA;
      ${U}
      ${ut}
      void main () {
        float t = uTime;
        float life = fract(aSeed.x + t * (0.020 + aSeed.y * 0.028));
        vec3 p = position;
        p.y += life * uBox.y * uRise * 6.0;
        p.x += sin(t * 0.19 + aSeed.x * 6.283) * 0.55 + uWind.x * t * 2.2;
        p.z += cos(t * 0.23 + aSeed.z * 6.283) * 0.55 + uWind.z * t * 2.2;
        vec3 wp = wrapBox(p, uBox, uCam);
        vec3 V = normalize(uCam - wp);
        vLit = scatter(wp, V, 0.55);
        vLife = life;
        vRot = aSeed.z * 6.283;
        vec4 mv = viewMatrix * vec4(wp, 1.0);
        vZ = -mv.z;
        float px = clamp(uSize * (0.5 + aSeed.y + life * 1.6) * uPix / max(vZ, 0.08), 2.0, uMaxPx);
        gl_PointSize = px;
        // 같은 연기 질량이 넓게 퍼지면 그만큼 옅어져야 한다. 크기만 키우고 알파를 두면
        // 근경 퍼프가 불투명 흰 덩어리가 된다. 광축 밖에서는 방의 빛을 못 받아 거의 사라진다.
        vA = clamp(uRefPx / px, 0.14, 1.0) * mix(0.10, 1.0, gVis);
        gl_Position = projectionMatrix * mv;
      }`,fragmentShader:`
      uniform float uOpacity; uniform vec3 uTint;
      varying vec3 vLit; varying float vLife; varying float vZ; varying float vRot; varying float vA;
      ${W}
      void main () {
        vec2 c = gl_PointCoord - 0.5;
        float s = sin(vRot), co = cos(vRot);
        c = mat2(co, -s, s, co) * c;
        float r = length(c) * 2.0;
        float th = atan(c.y, c.x);
        // 옛 코드는 반경을 3-로브로 변조한 뒤 smoothstep(wob, 0.0, r)로 잘랐다 —
        // 경계가 하드해서 흰 삼각형/나비 스티커가 됐다(D8). 연기에는 경계가 없다:
        // 가우시안 코어에 저진폭 방위 흔들림만 얹어 실루엣만 비대칭으로 만든다.
        float wob = 1.0 + 0.13 * sin(th * 3.0 + vRot * 2.0) + 0.08 * sin(th * 7.0 - vRot * 1.3);
        float q = r / wob;
        float a = exp(-3.1 * q * q) * uOpacity * vA;
        a *= smoothstep(0.0, 0.16, vLife) * smoothstep(1.0, 0.55, vLife);
        a *= softFade(vZ);
        gl_FragColor = vec4(vLit * uTint, a);
      }`});return pt(new x(r,a))}var gt=class{constructor(e){let t=Math.max(e?.particles??1,.05);this.group=new c,this.group.name=`atmo.particles`,this.sys={dust:mt(Math.round(4200*t),[16,5,16],991),smoke:ht(Math.round(220*t),[10,3.2,10],227)};for(let e of Object.keys(this.sys))this.group.add(this.sys[e]);this.base={dust:.55,smoke:.3}}applyMood(e){let t=e.particles,n=t.box||[16,5,16];for(let n of Object.keys(this.sys)){let r=this.sys[n],i=t[n]??0;r.visible=i>.001,r.material.uniforms.uOpacity.value=this.base[n]*i,r.material.uniforms.uWind.value.fromArray(e.fog.windDir).multiplyScalar(3.5)}this.sys.dust.material.uniforms.uBox.value.set(n[0],n[1],n[2]),this.sys.smoke.material.uniforms.uBox.value.set(n[0]*.7,n[1]*.8,n[2]*.7);let r=e.fog.color,i=Math.max(r[0],r[1],r[2],1e-5),a=.55;this.sys.dust.material.uniforms.uTint.value.set((.35+.65*r[0]/i)*a,(.35+.65*r[1]/i)*a,(.35+.65*r[2]/i)*a),this.sys.smoke.material.uniforms.uTint.value.set(.85,.86,.9);let o=e.hemi.sky;for(let e of Object.keys(this.sys))this.sys[e].material.uniforms.uAmbient.value.set(o[0]*1.4,o[1]*1.4,o[2]*1.4)}update(e,t,n,r,i,a,o=2){let s=this.sys.dust.material.uniforms;s.uMaxPx.value=4*o,s.uFocus.value=t.userData?.focus??0;for(let o of Object.keys(this.sys)){let s=this.sys[o].material.uniforms;s.uTime.value=e,s.uCam.value.copy(t.position),s.uPix.value=a,s.uSceneDepth.value=r,s.uSoft.value=+!!r,s.uResolution.value.copy(i);for(let e=0;e<4;e++){let t=n[e];if(!t){s.uLC.value[e].set(0,0,0,0);continue}s.uLP.value[e].set(t.pos.x,t.pos.y,t.pos.z,t.range),s.uLC.value[e].set(t.col.x,t.col.y,t.col.z,t.power),s.uLD.value[e].set(t.dir.x,t.dir.y,t.dir.z,t.cos)}}}dispose(){for(let e of Object.keys(this.sys))this.sys[e].geometry.dispose(),this.sys[e].material.dispose()}};function _t(e,t,n,r={}){let i=k(n),a=new Float32Array(e*4*3),o=new Float32Array(e*4*2),s=new Float32Array(e*4*3),c=new Uint32Array(e*6),l=[[-1,0],[1,0],[1,1],[-1,1]];for(let n=0;n<e;n++){let e=(i()-.5)*t[0],r=(i()-.5)*t[1],u=(i()-.5)*t[2],d=i(),f=i(),p=i();for(let t=0;t<4;t++){let i=n*4+t;a[i*3]=e,a[i*3+1]=r,a[i*3+2]=u,o[i*2]=l[t][0],o[i*2+1]=l[t][1],s[i*3]=d,s[i*3+1]=f,s[i*3+2]=p}let m=n*4;c.set([m,m+1,m+2,m,m+2,m+3],n*6)}let d=new y;d.setAttribute(`position`,new f(a,3)),d.setAttribute(`aCorner`,new f(o,2)),d.setAttribute(`aSeed`,new f(s,3)),d.setIndex(new f(c,1));let p=G(t);p.uSpeed={value:r.speed??16},p.uShutter={value:r.shutter??.048},p.uPxWidth={value:r.px??1.5},p.uHead={value:r.head??.3},p.uSoftFade.value=.35;let m=new b({transparent:!0,depthWrite:!1,blending:2,fog:!1,uniforms:p,vertexShader:`
      attribute vec2 aCorner; attribute vec3 aSeed;
      uniform float uTime, uSpeed, uShutter, uPxWidth, uPix;
      uniform vec3 uBox, uCam, uWind;
      varying vec3 vLit; varying float vAlong; varying float vSide; varying float vZ;
      ${U}
      ${ut}
      void main () {
        float sp = uSpeed * (0.78 + aSeed.y * 0.52);
        vec3 vel = vec3(uWind.x * 7.0, -sp, uWind.z * 7.0);
        vec3 c = wrapBox(position + vel * uTime, uBox, uCam);
        vec3 mv = (viewMatrix * vec4(c, 1.0)).xyz;
        // 스트릭 길이 = 낙하속도 x 셔터 시간. 노출 시간 안에 이동한 거리가 곧 모션블러다
        float len = sp * uShutter * (0.72 + aSeed.z * 0.66);
        vec3 aV = normalize((viewMatrix * vec4(normalize(vel), 0.0)).xyz);
        vec3 pv = mv + aV * (len * (aCorner.y - 0.5));
        vec3 side = normalize(cross(aV, normalize(-pv)));
        float px = uPxWidth * (0.72 + aSeed.x * 0.62);
        pv += side * (aCorner.x * 0.5 * px * max(-pv.z, 0.05) / max(uPix, 1.0));
        vZ = -pv.z;
        vAlong = aCorner.y;
        vSide = aCorner.x;
        vLit = scatter(c, normalize(uCam - c), 2.6);
        gl_Position = projectionMatrix * vec4(pv, 1.0);
      }`,fragmentShader:`
      uniform float uOpacity, uHead; uniform vec3 uTint;
      varying vec3 vLit; varying float vAlong; varying float vSide; varying float vZ;
      ${W}
      void main () {
        float across = smoothstep(1.0, 0.15, abs(vSide));
        float a = across * mix(uHead, 1.0, vAlong) * uOpacity * softFade(vZ);
        gl_FragColor = vec4(uTint * (0.7 + vLit * 1.8), a);
      }`});return pt(new u(d,m))}function vt(e,t,n){let r=k(n),i=new Float32Array(e*4*3),a=new Float32Array(e*4*2),o=new Float32Array(e*4*2),s=new Uint32Array(e*6),c=[[-1,-1],[1,-1],[1,1],[-1,1]];for(let n=0;n<e;n++){let e=(r()-.5)*t[0],l=(r()-.5)*t[2],u=r(),d=.55+r()*1.15;for(let t=0;t<4;t++){let r=n*4+t;i[r*3]=c[t][0],i[r*3+1]=0,i[r*3+2]=c[t][1],a[r*2]=e,a[r*2+1]=l,o[r*2]=u,o[r*2+1]=d}let f=n*4;s.set([f,f+1,f+2,f,f+2,f+3],n*6)}let l=new y;l.setAttribute(`position`,new f(i,3)),l.setAttribute(`aCenter`,new f(a,2)),l.setAttribute(`aSeed`,new f(o,2)),l.setIndex(new f(s,1));let d=G(t);d.uMaxR={value:.3},d.uGroundY={value:0},d.uSoftFade.value=.25;let p=new b({transparent:!0,depthWrite:!1,blending:2,fog:!1,uniforms:d,vertexShader:`
      attribute vec2 aCenter; attribute vec2 aSeed;
      uniform float uTime, uMaxR, uGroundY;
      uniform vec3 uBox, uCam;
      varying vec2 vUv; varying float vLife; varying vec3 vLit; varying float vZ;
      ${U}
      void main () {
        float life = fract(aSeed.x + uTime * aSeed.y);
        vec2 d = aCenter - uCam.xz + uBox.xz * 0.5;
        vec2 cxz = uCam.xz + mod(mod(d, uBox.xz) + uBox.xz, uBox.xz) - uBox.xz * 0.5;
        float s = 0.03 + uMaxR * life;
        vec3 wp = vec3(cxz.x + position.x * s, uGroundY + 0.008, cxz.y + position.z * s);
        vUv = position.xz;
        vLife = life;
        vLit = scatter(wp, normalize(uCam - wp), 0.8);
        vec4 mv = viewMatrix * vec4(wp, 1.0);
        vZ = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,fragmentShader:`
      uniform float uOpacity; uniform vec3 uTint;
      varying vec2 vUv; varying float vLife; varying vec3 vLit; varying float vZ;
      ${W}
      void main () {
        float r = length(vUv);
        // 두 겹 링 — 바깥 파면이 앞서고 안쪽이 뒤따른다
        float ring = smoothstep(0.55, 0.88, r) * smoothstep(1.02, 0.90, r);
        float ring2 = smoothstep(0.20, 0.44, r) * smoothstep(0.62, 0.48, r) * 0.55;
        float crown = smoothstep(0.34, 0.0, r) * (1.0 - smoothstep(0.0, 0.22, vLife));
        float a = (ring + ring2 + crown * 0.9) * pow(1.0 - vLife, 1.5) * uOpacity * softFade(vZ);
        gl_FragColor = vec4(uTint * (0.9 + vLit * 1.4), a);
      }`});return pt(new u(l,p))}function yt(e,t,n){let r=k(n),i=new Float32Array(e*3),a=new Float32Array(e*3);for(let n=0;n<e;n++)i[n*3]=(r()-.5)*t[0],i[n*3+1]=0,i[n*3+2]=(r()-.5)*t[2],a[n*3]=r(),a[n*3+1]=r(),a[n*3+2]=r();let o=new y;o.setAttribute(`position`,new f(i,3)),o.setAttribute(`aSeed`,new f(a,3));let s=G(t);s.uGroundY={value:0},s.uSize={value:.01},s.uSoftFade.value=.2;let c=new b({transparent:!0,depthWrite:!1,blending:2,fog:!1,uniforms:s,vertexShader:`
      attribute vec3 aSeed;
      uniform float uTime, uGroundY, uSize, uPix;
      uniform vec3 uBox, uCam;
      varying vec3 vLit; varying float vLife; varying float vZ;
      ${U}
      void main () {
        float life = fract(aSeed.x + uTime * (1.6 + aSeed.y * 1.9));
        vec2 d = position.xz - uCam.xz + uBox.xz * 0.5;
        vec2 cxz = uCam.xz + mod(mod(d, uBox.xz) + uBox.xz, uBox.xz) - uBox.xz * 0.5;
        // 포물선 — 0.16m 남짓 튀어오르고 떨어진다
        float hgt = 4.0 * life * (1.0 - life) * (0.09 + aSeed.z * 0.11);
        float spread = life * (0.05 + aSeed.y * 0.08);
        float ang = aSeed.z * 6.283;
        vec3 wp = vec3(cxz.x + cos(ang) * spread, uGroundY + hgt, cxz.y + sin(ang) * spread);
        vLit = scatter(wp, normalize(uCam - wp), 1.6);
        vLife = life;
        vec4 mv = viewMatrix * vec4(wp, 1.0);
        vZ = -mv.z;
        gl_PointSize = clamp(uSize * (0.5 + aSeed.y) * uPix / max(vZ, 0.08), 1.0, 12.0);
        gl_Position = projectionMatrix * mv;
      }`,fragmentShader:`
      uniform float uOpacity; uniform vec3 uTint;
      varying vec3 vLit; varying float vLife; varying float vZ;
      ${W}
      void main () {
        float r = length(gl_PointCoord - 0.5) * 2.0;
        float a = smoothstep(1.0, 0.1, r) * (1.0 - vLife) * uOpacity * softFade(vZ);
        gl_FragColor = vec4(uTint * (0.8 + vLit * 1.6), a);
      }`});return pt(new x(o,c))}function bt(){let e=new b({transparent:!0,depthWrite:!1,depthTest:!1,fog:!1,blending:1,uniforms:{uTime:{value:0},uOpacity:{value:0},uTint:{value:new s(.55,.62,.78)},uAspect:{value:1.78}},vertexShader:`
      varying vec2 vUv;
      void main () {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,fragmentShader:`
      uniform float uTime, uOpacity, uAspect;
      uniform vec3 uTint;
      varying vec2 vUv;

      vec3 h3 (vec2 p) {
        float n = sin(dot(p, vec2(41.3, 289.1))) * 43758.5453;
        return fract(vec3(n, n * 1.7361, n * 3.4142));
      }

      // 셀당 물방울 하나. 셀 크기를 바꿔 두 겹으로 겹치면 크기 분포가 생긴다.
      //
      // 옛 코드는 rim 을 두 smoothstep 의 곱으로 만들어 **닫힌 링**을 그렸고, 그 링을
      // uTint*1.25 로 칠했다 — 크기·밝기·간격이 전부 같은 흰 도넛 100개가 화면을 균일하게
      // 덮어 렌즈에 맺힌 물이 아니라 오버레이 텍스처로 읽혔다(심사 D6/G8 보고분).
      // 실제 물방울은 (1) 광원 쪽 한쪽 호에서만 스펙큘러가 서고 (2) 나머지는 배경을 눌러
      // 어둡게 모으며 (3) 개체마다 크기·불투명도가 크게 다르다. 셋을 전부 넣는다.
      float drops (vec2 uv, float cell, float sizeMul, float slide, float live0, out float rim) {
        vec2 g = uv * cell;
        vec2 id = floor(g);
        vec2 f = fract(g) - 0.5;
        vec3 r = h3(id);
        float live = step(live0, r.x);
        // 흘러내림: 큰 방울일수록 빨리 미끄러진다
        float sp = slide * (0.15 + r.y * 0.85);
        float yo = fract(r.x * 7.3 + uTime * sp);
        f.y += 0.5 - yo;
        f.x += (r.z - 0.5) * 0.72;
        f.y = fract(f.y + 0.5) - 0.5;
        // 크기 분포를 세제곱으로 벌린다 — 선형이면 대부분이 중간 크기에 몰려 같은 점이 된다
        float rad = (0.055 + 0.30 * r.y * r.y * r.y) * sizeMul;
        float d = length(f * vec2(1.0, 0.78));
        float body = smoothstep(rad, rad * 0.50, d) * live;
        // 스펙큘러는 닫힌 링이 아니라 광원 쪽 한 호에만 선다
        float arc = clamp(0.5 + 0.5 * dot(normalize(f + 1e-5), vec2(-0.42, 0.91)), 0.0, 1.0);
        rim = smoothstep(rad * 1.02, rad * 0.72, d) * smoothstep(rad * 0.42, rad * 0.74, d)
          * pow(arc, 2.6) * live * (0.35 + 0.65 * r.z);
        return body;
      }

      void main () {
        vec2 uv = vec2(vUv.x * uAspect, vUv.y);
        float r1, r2;
        // 밀도를 절반 이하로 내린다. 옛 값(live 0.42, 셀 7·15)은 화면에 280개 넘게 깔렸다
        float b1 = drops(uv, 6.0, 1.0, 0.030, 0.62, r1);
        float b2 = drops(uv + 13.7, 13.0, 0.70, 0.055, 0.80, r2);
        float body = max(b1, b2 * 0.8);
        float rim = max(r1, r2 * 0.9);
        // 물방울은 배경을 눌러 어둡게 모으고, 광원 쪽 호에서만 빛을 튕긴다
        float a = clamp(body * 0.26 + rim * 0.42, 0.0, 1.0) * uOpacity;
        vec3 col = mix(uTint * 0.10, uTint * 0.95, rim);
        gl_FragColor = vec4(col, a);
      }`}),t=new u(new m(1,1),e);return t.frustumCulled=!1,t.castShadow=!1,t.receiveShadow=!1,t.renderOrder=40,t.name=`atmo.rain.lens`,t}function xt(e,t=1){let n=ae(e,{key:`cecil-wet`});return n.roughness=A((e.roughness??1)-.4*t,.03,1),n.envMapIntensity=(e.envMapIntensity??1)*(1+.6*t),n.clearcoat=Math.max(e.clearcoat??0,.9*t),n.clearcoatRoughness=A(.05+(1-t)*.3,.03,.5),n.color.multiplyScalar(1-.3*t),n.name=`${e.name||`mat`}.wet`,n}var St=class{constructor(e){let t=Math.max(e?.particles??1,.05);this.group=new c,this.group.name=`atmo.rain`,this.sys={far:_t(Math.round(15e3*t),[15,11,15],613,{px:1.4,speed:17,shutter:.046}),near:_t(Math.round(1100*t),[3.4,3.2,3.4],811,{px:4,speed:17,shutter:.062,head:.12}),ripple:vt(Math.round(700*t),[20,1,20],449),spray:yt(Math.round(1600*t),[16,1,16],523)};for(let e of Object.keys(this.sys))this.group.add(this.sys[e]);this.lens=bt(),this.group.add(this.lens),this.base={far:.62,near:.34,ripple:.75,spray:.6},this.fwd=new s}applyMood(e,t=0){let n=e.particles,r=n.rain??0,i=n.splash??0,a={far:r,near:r,ripple:i,spray:i};for(let t of Object.keys(this.sys)){let n=this.sys[t];n.visible=a[t]>.001,n.material.uniforms.uOpacity.value=this.base[t]*a[t],n.material.uniforms.uWind.value.fromArray(e.fog.windDir).multiplyScalar(1);let r=e.hemi.sky;n.material.uniforms.uAmbient.value.set(r[0]*2.2,r[1]*2.2,r[2]*2.2)}let o=e.ibl.zenith,c=new s(.42+o[0]*6,.5+o[1]*6,.66+o[2]*6);this.sys.far.material.uniforms.uTint.value.copy(c),this.sys.near.material.uniforms.uTint.value.copy(c).multiplyScalar(.85),this.sys.ripple.material.uniforms.uTint.value.copy(c).multiplyScalar(.6),this.sys.spray.material.uniforms.uTint.value.copy(c).multiplyScalar(.75),this.lens.material.uniforms.uTint.value.copy(c),this.lens.material.uniforms.uOpacity.value=(n.lens??r)*.85,this.lens.visible=this.lens.material.uniforms.uOpacity.value>.001,this.setGround(t)}setGround(e){this.sys.ripple.material.uniforms.uGroundY.value=e,this.sys.spray.material.uniforms.uGroundY.value=e}update(e,t,n,r,i,a){for(let o of Object.keys(this.sys)){let s=this.sys[o].material.uniforms;s.uTime.value=e,s.uCam.value.copy(t.position),s.uPix.value=a,s.uSceneDepth.value=r,s.uSoft.value=+!!r,s.uResolution.value.copy(i);for(let e=0;e<4;e++){let t=n[e];if(!t){s.uLC.value[e].set(0,0,0,0);continue}s.uLP.value[e].set(t.pos.x,t.pos.y,t.pos.z,t.range),s.uLC.value[e].set(t.col.x,t.col.y,t.col.z,t.power),s.uLD.value[e].set(t.dir.x,t.dir.y,t.dir.z,t.cos)}}if(!this.lens.visible)return;let o=.3;this.fwd.set(0,0,-1).applyQuaternion(t.quaternion),this.lens.position.copy(t.position).addScaledVector(this.fwd,o),this.lens.quaternion.copy(t.quaternion);let s=2*o*Math.tan(t.fov*Math.PI/360)*1.08;this.lens.scale.set(s*t.aspect,s,1),this.lens.material.uniforms.uTime.value=e,this.lens.material.uniforms.uAspect.value=t.aspect}dispose(){for(let e of Object.keys(this.sys))this.sys[e].geometry.dispose(),this.sys[e].material.dispose();this.lens.geometry.dispose(),this.lens.material.dispose()}},Ct=[[0,0],[.135,0],[.135,.02],[.118,.028],[.116,.04],[.128,.048],[.104,.058],[.018,.058],[.012,.028],[0,.024]],wt=[[0,0],[.062,0],[.058,.018],[.04,.026],[.034,.044],[.014,.052],[0,.05]],Tt=[[0,0],[.165,0],[.156,.034],[.13,.05],[.108,.086],[.066,.122],[.026,.138],[0,.14]],K=.22;function Et(e,t,n,r,i){return[[[e,i,n],[t,i,n],[0,0,1]],[[t,i,n],[t,i,r],[-1,0,0]],[[t,i,r],[e,i,r],[0,0,-1]],[[e,i,r],[e,i,n],[1,0,0]]]}function Dt(e,t){let n=[];for(let[r,i,a]of t)n.push(I(e,[r,i],{up:a}));return N(n)}function q(e){let t=F(`shell`),n=(e.x0+e.x1)*.5,r=(e.z0+e.z1)*.5,i=e.x1-e.x0,a=e.z1-e.z0,o=e.h;t.add(P(new m(i,a,12,12),e.floor,{rot:[-Math.PI/2,0,0],pos:[n,0,r],cast:!1})),e.ceil&&t.add(P(new m(i,a,6,6),e.ceil,{rot:[Math.PI/2,0,0],pos:[n,o,r],cast:!1}));let s=e.wall;if(e.skipZ0||t.add(P(L(i+K*2,o,K,.02,2),s,{pos:[n,o*.5,e.z0-K*.5],cast:!1})),e.skipZ1||t.add(P(L(i+K*2,o,K,.02,2),s,{pos:[n,o*.5,e.z1+K*.5],cast:!1})),e.skipX0||t.add(P(L(K,o,a,.02,2),s,{pos:[e.x0-K*.5,o*.5,r],cast:!1})),e.skipX1||t.add(P(L(K,o,a,.02,2),s,{pos:[e.x1+K*.5,o*.5,r],cast:!1})),e.wainscot){let o=e.wainscotH??1.02,s=[],c=(e,t,n,r,i)=>{s.push(L(r,o,i,.012,2).clone().translate(e,t,n))};c(n,o*.5,e.z0+.03,i,.06),c(n,o*.5,e.z1-.03,i,.06),c(e.x0+.03,o*.5,r,.06,a),c(e.x1-.03,o*.5,r,.06,a),t.add(P(N(s),e.wainscot,{wear:.8,seed:31,cast:!1})),t.add(P(Dt(wt,Et(e.x0+.005,e.x1-.005,e.z0+.005,e.z1-.005,o)),e.wainscot,{wear:.9,seed:33,cast:!1}))}return t.add(P(Dt(Ct,Et(e.x0+.002,e.x1-.002,e.z0+.002,e.z1-.002,0)),e.trim??`wood.painted.white`,{wear:.85,seed:35,cast:!1})),e.ceil&&t.add(P(Dt(Tt,Et(e.x0+.002,e.x1-.002,e.z0+.002,e.z1-.002,o-.14)),e.trim??`wood.painted.white`,{wear:.6,seed:37,cast:!1})),t}function Ot(e,t,n,r,i,a,o={}){let s=[],[c,l]=i,[u,d]=a,f=o.sill??.9,p=o.head??2.25,m=(n,r,i,a)=>{let o=r-n,c=a-i;if(o<=.001||c<=.001)return;let l=L(e===`x`?K:o,c,e===`x`?o:K,.02,2).clone();l.translate(e===`x`?t:(n+r)*.5,(i+a)*.5,e===`x`?(n+r)*.5:t),s.push(l)};return m(c,u,0,n),m(d,l,0,n),m(u,d,0,f),m(u,d,p,n),P(N(s),r,{cast:!1})}function kt(e,t,n,r,i=.62){let a=k(r),o=[],s=[],c=L(e,.004,.052,.0015,1);for(let e=0;e<n;e++){let r=t-(e+.5)*(t/n),u=i+(a()-.5)*.1;o.push(c),s.push(new l().makeRotationX(u).setPosition(0,r,(a()-.5)*.004))}let u=P(N(o,s),`wood.painted.white`,{wear:.5,seed:r+2}),d=L(.006,t,.006,.002,1).clone().translate(e*.32,t*.5,.02);return u.add(P(d,`wood.painted.white`,{cast:!1})),u}function At(e,t,n,r){return P(L(e,t,.01,.003,1),n,{wear:.6,seed:r})}function jt(e,t,n,r,i,a,o){let s=k(o),c=[],u=[],d=Math.max(1,Math.round((t-e)/a)),f=Math.max(1,Math.round((r-n)/a)),p=L(a*.97,.018,a*.97,.004,1);for(let t=0;t<d;t++)for(let r=0;r<f;r++)c.push(p),u.push(new l().makeRotationY((s()-.5)*.012).setPosition(e+(t+.5)*a,T(-.004,.002,s()),n+(r+.5)*a));return P(N(c,u),i,{cast:!1,wear:.35,seed:o+1})}function J(e,t){let n=e.index?e.toNonIndexed():e.clone(),r=n.attributes.position,i=new Float32Array(r.count*3);for(let e=0;e<r.count;e++){let n=t(r.getX(e),r.getY(e),r.getZ(e));typeof n==`number`?i[e*3]=i[e*3+1]=i[e*3+2]=n:(i[e*3]=n[0],i[e*3+1]=n[1],i[e*3+2]=n[2])}return n.setAttribute(`color`,new f(i,3)),n.computeBoundingBox(),n}function Mt(e,t,n,r,i,a,o,s){let c=new m(a-i,r-n,o,s);return c.rotateY(-e*Math.PI*.5),c.translate(e*t,(n+r)*.5,(i+a)*.5),c}function Nt(e,t){let n=e.attributes.position,r=new Float32Array(n.count*2);for(let e=0;e<n.count;e++)r[e*2]=n.getZ(e)/t,r[e*2+1]=n.getY(e)/t;return e.setAttribute(`uv`,new f(r,2)),e}function Pt(e,t,n,r,i,a){let o=k(a),s=D(a+3),c=r-n,l=[],u=Mt(e,t-.028,.055,i-0,n,r,Math.round(c*5.5),18);Nt(u,.86),l.push(P(J(u,(e,t,n)=>{let r=.7;return r-=.34*Math.exp(-((t/.2)**2)),r-=.22*(O(s,n*1.15,t*2.2,4)*.5+.5)*E(A((.75-t)/.6,0,1)),r-=.14*(O(s,n*.42+11,t*.5,3)*.5+.5),r+=.09*O(s,n*6.1-4,t*6.1,3),r-=.2*Math.exp(-(((t-.62)/.05)**2))*(.4+.6*(O(s,n*9,3,2)*.5+.5)),r-=.16*Math.max(0,O(s,n*2.7+63,t*2.7,3)),A(r,.22,.95)}),`wood.painted.white`,{vcol:!0,cast:!1}));let d=[],f=[],p=(e,t,n,r,i,a)=>{d.push(L(e,t,n,.006,1)),f.push(z([r,i,a]))},m=e*(t-.041);p(.026,.155,c-.02,m,.135,(n+r)*.5),p(.026,.115,c-.02,m,i-.135,(n+r)*.5);let h=Math.max(2,Math.round(c/1.85)),g=e=>T(n+.06,r-.06,e/h);for(let e=0;e<=h;e++)p(.026,i-.3,.098,m,(i+.02)*.5,g(e));for(let n=0;n<h;n++){let r=g(n)+.075,a=g(n+1)-.075,o=(r+a)*.5,s=a-r;if(s<.2)continue;let c=.245,l=i-.215,u=e*(t-.035);p(.014,.03,s,u,c,o),p(.014,.03,s,u,l,o),p(.014,l-c,.03,u,(c+l)*.5,r),p(.014,l-c,.03,u,(c+l)*.5,a)}l.push(P(J(N(d,f),(e,t,n)=>{let r=.78-.26*Math.exp(-((t/.26)**2));return r-=.18*(O(s,n*1.7+31,t*3,3)*.5+.5),r+=.1*E(A((t-.9)/.2,0,1)),A(r,.28,1)}),`wood.painted.white`,{vcol:!0}));let _=e>0?[n+.005,r-.005]:[r-.005,n+.005],v=I(wt,[[e*(t-.005),i,_[0]],[e*(t-.005),i,_[1]]],{up:[-e,0,0]});l.push(P(J(v,(e,t,n)=>A(.84-.22*(O(s,n*2.1+7,t*4,3)*.5+.5),.3,.96)),`wood.painted.white`,{vcol:!0}));let y=[],b=[],x=[],S=[],C=L(.005,.04,.031,.0022,1),ee=L(.003,.0125,.0022,6e-4,1),w=R([[0,0],[.0034,6e-4],[.0036,.0022],[.0016,.0026],[0,.0022]],10);for(let i=0;i<4;i++){let a=T(n+1.6,r-1.4,(i+.3*o())/3.5),s=e*(t-.05),c=.3+o()*.02,l=(o()-.5)*.1,u=(t,n,r,i,o,u=0)=>{i.push(r),o.push(z([s+e*u,c+t,a+n],[0,0,l]))};u(0,0,L(.012,.115,.072,.0055,1),y,b);for(let e of[.026,-.026])u(e,0,C,y,b,.008),u(e+.008,-.0062,ee,y,b,.0095),u(e+.008,.0062,ee,y,b,.0095);u(0,0,w.clone().rotateZ(e*Math.PI*.5),x,S,.011)}return l.push(P(N(y,b),`bakelite.black`,{wear:.6,seed:a+9,cast:!1})),l.push(P(N(x,S),`brass.tarnished`,{wear:.75,seed:a+10,cast:!1})),l}function Ft(e,t,n,r,i,a,o,s=[]){let c=D(o),l=r-n,u=i+.055,d=a-.145,f=Mt(e,t-.008,u,d,n,r,Math.round(l*4),14),p=[n+l*.3,n+l*.72];return P(J(f,(e,t,r)=>{let i=A((t-u)/(d-u),0,1),a=1;a-=.13*(O(c,r*.55,t*.9,4)*.5+.5),a-=.1*E(A((i-.72)/.28,0,1));for(let e of p){let n=Math.exp(-(((r-e)/.3)**2));a-=.26*n*E(A((i-.3)/.55,0,1))*(.55+.45*O(c,r*7,t*3,3))}for(let e of s){let t=Math.exp(-(((r-e)/(.16+.5*i))**2));a-=.28*t*E(A((i-.34)/.3,0,1))}return a+=.05*O(c,r*3.3+19,t*3.3,3),a-=.05*Math.exp(-((((r-n)%.68-.34)/.03)**2)),A(a,.3,1.05)}),`wallpaper.damask.green`,{vcol:!0,cast:!1})}var It=[[-.36,8.55,.3,.42,.44],[.44,9.35,.17,.21,.36],[.08,6.4,.44,.28,.26],[-.62,4.55,.13,.16,.42],[.66,7.2,.22,.34,.3],[-.14,9.05,.52,.31,.3],[.72,8.72,.24,.19,.4],[-.8,7.75,.2,.46,.26]],Lt=[4.6,8.95,12.8];function Rt(e,t,n,r,i){let a=D(r),o=n-t,s=new m(e,o,64,Math.round(o*7));s.rotateX(-Math.PI/2),s.translate(0,0,(t+n)*.5);let c=s.attributes.position,l=-.16,u=e=>E(A((i[0]-e)/(i[0]-i[1]),0,1)),d=t=>Math.exp(-(((Math.abs(t)-(e*.5-.165))/.058)**2)),f=e=>{let n=0;for(let r of Lt)n=Math.max(n,Math.exp(-(((e-(t+r))/.022)**2)));return n},p=(e,n)=>{let r=0;for(let[i,a,o,s,c]of It)r+=c*Math.exp(-(((e-i)/o)**2+((n-(t+a))/s)**2));return Math.min(r,.4)};for(let t=0;t<c.count;t++){let n=c.getX(t),r=c.getZ(t),i=E(A((e*.5-Math.abs(n))/.09,0,1)),o=Math.exp(-(((n-l)/.3)**2)),s=.014*i;s+=O(a,n*4.5,r*2.2,4)*.004*i,s-=o*.006*u(r),s+=(1-i)*.011*(.5+.5*Math.sin(r*2.3+O(a,r,0,2)*3)),s-=.0035*f(r)*i,c.setY(t,s)}return s.computeVertexNormals(),P(J(s,(t,n,r)=>{let i=E(A((e*.5-Math.abs(t))/.26,0,1)),o=Math.exp(-(((t-l)/.26)**2))*u(r),s=d(t),c=f(r),m=p(t,r),h=Math.exp(-(((t-l)/.42)**2))*(.55+.45*(O(a,r*.62+7,0,3)*.5+.5)),g=O(a,r*.27-19,t*.3,3),_=.78;return _-=.52*(1-i),_-=.22*(O(a,t*3.6,r*1.9,4)*.5+.5),_-=.3*Math.max(0,O(a,t*2.4+41,r*1.5-13,3)),_+=.13*O(a,t*8.5,r*4.6,3),_+=.11*g,_-=.13*h,_-=.55*s,_-=.3*c,_-=m,_=A(_,.24,1.06),[_*(1-.3*o)*(1-.34*s)*(1-.11*h),_*(1+.44*o)*(1+.1*s)*(1+.07*h),_*(1+.4*o)*(1+.06*s)*(1+.06*h)]}),`carpet.corridor.red`,{vcol:!0,cast:!1})}function zt(e,t,n,r,i,a){let o=F(`stairHead`),s=k(a),c=D(a+4),l=-e,u=-e+r,d=t-1.05,f=[],p=[];f.push(L(1.62,.1,1.05,.02,1)),p.push(z([u-.71,-.05,t-.525])),f.push(L(3.3,.1,1.05,.02,1)),p.push(z([l-.05,n+.05,t-.525])),f.push(L(3.52,n,.22,.02,1)),p.push(z([l-.05,n*.5,d-.11])),f.push(L(.22,n,1.05,.02,1)),p.push(z([l-1.81,n*.5,t-.525])),f.push(L(.22,n,1.05,.02,1)),p.push(z([u+.11,n*.5,t-.525])),o.add(P(J(N(f,p),(e,t,n)=>A(.52-.22*(O(c,n*1.4,t*1.1,4)*.5+.5)-.2*E(A((1.6-t)/1.6,0,1)),.16,.72)),`wood.varnished.dark`,{vcol:!0,cast:!1}));let m=[],h=[];for(let[e,n]of[[l-.055,1],[u+.055,-1]])m.push(L(.11,i+.11,.055,.01,1)),h.push(z([e,(i+.11)*.5,t-.055])),m.push(L(.055,i+.11,.03,.008,1)),h.push(z([e+n*.028,(i+.11)*.5,t-.095]));m.push(L(r+.22,.11,.055,.01,1)),h.push(z([(l+u)*.5,i+.055,t-.055])),m.push(L(r+.22,.055,.03,.008,1)),h.push(z([(l+u)*.5,i+.083,t-.095])),o.add(P(N(m,h),`wood.painted.white`,{wear:.95,seed:a+1}));let g=[],_=[];for(let e=0;e<6;e++)g.push(L(.28,.05,1.6,.01,1)),_.push(z([l-.14-e*.28,-.03-e*.175,t-.52]));o.add(P(N(g,_),`wood.varnished.dark`,{wear:.95,seed:a+2,cast:!1}));let v=[],y=[];v.push(L(.085,.98,.085,.012,2)),y.push(z([l+.1,.49,t-.34])),v.push(L(.13,.085,.13,.016,2)),y.push(z([l+.1,1.02,t-.34])),v.push(L(.055,.055,.8,.01,1)),y.push(z([l+.1,.9,t-.72]));for(let e=0;e<3;e++)v.push(L(.032,.72,.032,.008,1)),y.push(z([l+.1,.53-e*.07,t-.5-e*.22]));let b=P(N(v,y),`wood.varnished.dark`,{wear:.9,seed:a+3});return b.rotation.y=(s()-.5)*.03,o.add(b),o}function Y(e,t){let n=e.index?e.toNonIndexed():e.clone(),r=n.attributes.position,i=new Float32Array(r.count*3);for(let e=0;e<r.count;e++){let n=t(r.getX(e),r.getY(e),r.getZ(e));typeof n==`number`?i[e*3]=i[e*3+1]=i[e*3+2]=n:(i[e*3]=n[0],i[e*3+1]=n[1],i[e*3+2]=n[2])}return n.setAttribute(`color`,new f(i,3)),n.computeBoundingBox(),n}function X(e,t){let n=M(e,t);return t.rot&&n.rotation.set(t.rot[0],t.rot[1],t.rot[2]),n}function Bt(e,t,n,r,i,a){let o=F(`corridor.endWall`),s=k(a),c=D(a+2),l=-e+i,u=e,d=(l+u)*.5,f=u-l,p=t+.062;{let e=n+.06,i=r-.02,s=new m(f-.02,i-e,26,30);s.translate(d,(e+i)*.5,t+.012);let u=l+1.02,p=[[l+.3,.34],[l+.92,.2]];o.add(P(Y(s,(e,t)=>{let i=1;i-=.17*(O(c,e*.9+5,t*.8,4)*.5+.5),i-=.19*E(A((t-(r-.65))/.6,0,1)),i-=.3*Math.exp(-(((t-(n+.1))/.13)**2));for(let[a,o]of p){let s=(.09+.16*A((r-t)/(r-n),0,1))*o*3.4,l=Math.exp(-(((e-a)/s)**2))*E(A((t-(n+.35))/1.1,0,1));i-=.46*l*(.55+.45*(O(c,e*9+3,t*3.5,3)*.5+.5))}let a=Math.max(Math.abs(e-u)/.28,Math.abs(t-2.5)/.34);i+=.24*(1-E(.94,1.02,a)),i-=.3*Math.exp(-(((a-1.01)/.05)**2)),i-=.13*Math.max(0,O(c,e*4.4+27,t*4.4,3)),i=A(i,.34,1.22);let o=A((1-i)*1.4,0,.5);return[i*(1+.14*o),i*(1-.06*o),i*(1-.2*o)]}),`wallpaper.damask.green`,{vcol:!0,cast:!1}));let h=P(L(.01,.008,.012,.0025,1),`steel.rusted`,{pos:[u,2.84+.03,t+.02],wear:.9,seed:a+7,cast:!1});o.add(h)}o.add(P(Y(I(wt,[[l-.02,n,t+.012],[u,n,t+.012]],{up:[0,0,1]}),(e,t)=>A(.86-.2*(O(c,e*2.4,t*5,3)*.5+.5),.34,.98)),`wood.painted.white`,{vcol:!0}));let h=[],g=[],_=(e,t,n,r,i)=>{h.push(L(e,t,n,.005,1)),g.push(z([r,i,p]))};for(let[e,t]of[[l+.42,.7],[l+1.24,.62]]){let r=.235,i=n-.2;_(t,.026,.016,e,r),_(t,.026,.016,e,i),_(.026,i-r,.016,e-t*.5,(r+i)*.5),_(.026,i-r,.016,e+t*.5,(r+i)*.5)}o.add(P(Y(N(h,g),(e,t)=>A(.8-.3*Math.exp(-((t/.3)**2))-.16*(O(c,e*3+9,t*4,3)*.5+.5),.26,.98)),`wood.painted.white`,{vcol:!0}));for(let[e,[n,r,i,c]]of[[l+.52,1.92,.4,.52],[l+1.22,1.74,.3,.38]].entries()){let l=V(a+11+e,{w:i,h:c}).root;l.position.set(n,r,t+.03),l.rotation.z=(s()-.5)*.06,o.add(l)}let v=P(L(.076,.118,.014,.004,1),`bakelite.black`,{wear:.6,seed:a+3});return v.position.set(l+.16,1.28,t+.045),v.rotation.z=(s()-.5)*.08,o.add(v),X(o,{x:d,y:r-.16,z:t+.028,radius:f*.52,radiusZ:.22,strength:.4,rot:[0,0,0]}),X(o,{x:d,y:n-.06,z:t+.03,radius:f*.5,radiusZ:.1,strength:.34,rot:[0,0,0]}),o}function Vt(e,t,n,r,i,a){let o=F(`corridor.stairWell`),s=D(a+6),c=t-1.05,l=-e,u=-e+r,d=[],f=[];return d.push(L(2.3,.052,.03,.008,1)),f.push(z([l-.3,.92,c+.018])),d.push(L(2.3,.03,.03,.006,1)),f.push(z([l-.3,.86,c+.014])),d.push(L(2.3,.135,.026,.006,1)),f.push(z([l-.3,.068,c+.016])),d.push(L(.052,n-.1,.038,.008,1)),f.push(z([u+.02,(n-.1)*.5,c+.02])),o.add(P(Y(N(d,f),(e,t)=>A(.62-.24*(O(s,e*2.2,t*3.1,3)*.5+.5)-.16*E(A((.8-t)/.8,0,1)),.18,.8)),`wood.varnished.dark`,{vcol:!0,cast:!1})),X(o,{x:l-.25,y:1.3,z:c+.008,radius:1.55,radiusZ:1.45,strength:.4,rot:[0,0,0]}),X(o,{x:(l+u)*.5,y:.006,z:t-.3,radius:r*.62,radiusZ:.42,strength:.72}),o}function Ht(e,t,n,r,i,a,o,s){let c=F(`corridor.break${e>0?`R`:`L`}`),l=k(o),u=D(o+8),d=-e*Math.PI*.5,f=i+.06,p=a-.16,m=r-n,h=(e,t,r)=>n+.9+(m-1.8)*((e+.2+r*.6)/t),g=2.62,_=e>0?[n+.02,r-.02]:[r-.02,n+.02];c.add(P(Y(I(wt,[[e*(t-.012),g,_[0]],[e*(t-.012),g,_[1]]],{up:[-e,0,0]}),(e,t,n)=>A(.8-.22*(O(u,n*1.9,t*5,3)*.5+.5),.3,.96)),`wood.painted.white`,{vcol:!0}));let v=.34+l()*.16,y=.4+l()*.18,b=V(o+40,{w:v,h:y}).root;b.position.set(e*(t-.03),2-y*.5,s),b.rotation.y=-e*Math.PI*.5,b.rotation.z=(l()-.5)*.07,c.add(b);let x=P(L(.004,.62,.004,.0012,1),`fabric.wool.suit`,{pos:[e*(t-.022),2.31,s],cast:!1});x.rotation.x=(l()-.5)*.05,c.add(x);for(let n=0;n<2;n++){let r=P(L(.006,g-f-.14,.052,.0015,1),`wallpaper.damask.green`,{wear:.5,seed:o+21+n});r.position.set(e*(t-.014),(f+g)*.5,h(n,2,l())),r.rotation.y=e*(.3+l()*.14),c.add(r)}for(let n=0;n<7;n++){let r=n%3==0;X(c,{x:e*(t-.01),y:f+(p-f)*(.1+l()*.85),z:h(n,7,l()),radius:r?1.05+l()*.75:.34+l()*.42,radiusZ:r?.55+l()*.45:.28+l()*.4,strength:r?.22+l()*.14:.34+l()*.18,rot:[0,d,0]})}let S=(n+r)*.5;return X(c,{x:e*(t-.048),y:.075,z:S,radius:(r-n)*.46,radiusZ:.11,strength:.58,rot:[0,d,0]}),X(c,{x:e*(t-.052),y:i-.02,z:S,radius:(r-n)*.44,radiusZ:.07,strength:.3,rot:[0,d,0]}),c}function Ut(e,t,n,r){let i=F(`corridor.joint`),a=(t+n)*.5,o=(n-t)*.5;for(let t of[-1,1])X(i,{x:t*(e-.1),y:.0045,z:a,radius:.16,radiusZ:o*.92,strength:.58}),X(i,{x:t*(e-.26),y:.004,z:a,radius:.22,radiusZ:o*.86,strength:.26});return X(i,{x:.55,y:.0045,z:t+.13,radius:.86,radiusZ:.17,strength:.52}),i}var Wt=[[0,0],[.052,0],[.056,.008],[.052,.017],[.04,.021],[.008,.021],[0,.015]];function Gt(e,t,n,r){let i=F(`corridor.runnerTrim`),a=k(r),o=D(r+4),s=n-t,c=(t+n)*.5,l=[],u=[],d=Math.max(8,Math.round(s*4));for(let r of[-1,1]){let i=r*(e*.5-.052),a=I(Wt,[[i,.002,r>0?t:n],[i,.002,r>0?n:t]],{up:[0,1,0],steps:d}),s=a.attributes.position,c=e*.5-.016;for(let e=0;e<s.count;e++){let t=s.getX(e),n=s.getY(e),i=s.getZ(e);if(Math.abs(t)<c)continue;let a=O(o,i*3.3+r*5,0,3);s.setXYZ(e,t+r*(a*.011+.002),n+a*.003,i)}a.computeVertexNormals(),l.push(a),u.push(null)}i.add(P(Y(N(l,u),(e,t,n)=>A(.72-.24*(O(o,n*1.4,e*6,3)*.5+.5),.3,.92)),`fabric.wool.suit`,{vcol:!0,cast:!1}));for(let t of[-1,1])X(i,{x:t*(e*.5+.012),y:.0055,z:c,radius:.055,radiusZ:s*.5,strength:.58});for(let[e,r,o,s,c]of[[-.34,t+6.2,.3,.42,.46],[.46,t+2.7,.19,.24,.36],[-.1,n-3.4,.44,.3,.28]])X(i,{x:e+(a()-.5)*.1,y:.021,z:r,radius:o,radiusZ:s,strength:c});return i}function Kt(e){for(let t of e.lights||[])t.target?.parent?.remove(t.target),t.parent?.remove(t),t.dispose?.();return e.root}function qt(){let e=F(`space.lobby`);e.add(q({x0:-7.2,x1:7.2,z0:-9,z1:7.6,h:5,floor:`marble.lobby.floor`,ceil:`plaster.cracked`,wall:`wallpaper.damask.green`,wainscot:`wood.varnished.dark`,wainscotH:1.24}));let t=N([R([[.3,0],[.34,.04],[.3,.1],[.26,.16]],26),R([[.255,.16],[.243,1.6],[.222,3.4],[.238,3.9]],26),R([[.245,3.9],[.31,4.02],[.35,4.16],[.3,4.3],[.26,4.34]],26)]),n=L(.86,.16,.86,.03,2);for(let[r,[i,a]]of[[-3.5,2.2],[3.5,2.2],[-3.5,-3.4],[3.5,-3.4]].entries()){let o=F(`column`,P(t,`marble.lobby.floor`,{wear:.55,seed:40+r}),P(n,`plaster.cracked`,{pos:[0,4.42,0],wear:.7,seed:44+r}));o.position.set(i,0,a),o.rotation.y=r*.4,M(o,{strength:.7,radius:.42,radiusZ:.42}),e.add(o)}let r=F(`desk`);r.add(P(L(4.6,1.12,.72,.02,2),`wood.varnished.dark`,{pos:[0,.56,0],wear:.8,seed:51})),r.add(P(L(4.9,.07,.96,.014,2),`marble.lobby.floor`,{pos:[0,1.16,.04],wear:.5,seed:52})),r.add(P(B([[-2.3,.12,.42],[2.3,.12,.42]],.028,4,10),`brass.polished`,{wear:.75,seed:53}));let i=[],a=[];for(let e=0;e<6;e++)i.push(L(.62,.74,.03,.01,2)),a.push(z([-1.95+e*.78,.6,.375]));r.add(P(N(i,a),`wood.varnished.dark`,{wear:.9,seed:54})),r.position.set(-2.4,0,-4.9),r.rotation.y=.06,M(r,{strength:.72,spread:1.05}),e.add(r);let o=pe(61,{cols:9,rows:5}).root;o.position.set(-2.4,1.95,-8.82),e.add(o);let s=le(62).root;s.position.set(-1.6,1.2,-4.86),s.rotation.y=-.22,e.add(s);let c=oe(63).root;c.position.set(-3.7,1.2,-4.92),c.rotation.y=.5,e.add(c);let l=xe(71,{w:1.34,h:2.34}).root;l.position.set(7.06,0,-1.4),l.rotation.y=-Math.PI/2,e.add(l);let u=ke(81).root;u.position.set(4.3,0,2.6),u.rotation.y=-1.35,e.add(u);let d=Me(82).root;d.position.set(1.7,0,3.5),d.rotation.y=2.5,e.add(d);let f=je(83).root;f.position.set(3.2,0,4.2),e.add(f);let p=de(84).root;p.position.set(3.2,.56,4.2),e.add(p);let m=De(85).root;m.position.set(-5.6,0,1.4),e.add(m);let h=Oe(86,{w:3.4,len:5}).root;h.position.set(2.6,0,2.4),e.add(h);let g=Ee(87).root;g.position.set(-5.2,0,-2.2),g.rotation.y=.8,e.add(g);for(let[t,n]of[-6.2,-4.4].entries()){let r=V(90+t,{w:.62,h:.82}).root;r.position.set(n,2.4,-8.78),e.add(r)}return{root:e,lights:[[`chandelier`,{pos:[.4,4.1,.4],kelvin:2500,lumens:7200,radius:14,flicker:.05,hot:3}],[`ceiling`,{pos:[-2.4,3.55,-4.4],kelvin:4400,lumens:3400,radius:7.5,angle:1.1,flicker:.14,shaft:.3}],[`sconce`,{pos:[-7.05,2.45,-1.2],kelvin:2700,lumens:1100,radius:5.6,flicker:.06,dir:[1,-.5,.15],shaft:.26}],[`sconce`,{pos:[7.05,2.45,1.8],kelvin:2650,lumens:900,radius:5.2,flicker:.09,dir:[-1,-.5,-.15],shaft:.24}],[`desk`,{pos:[-3.9,1.55,-4.6],kelvin:2700,lumens:700,radius:4.2,flicker:.05,shaft:.22}],[`elevator`,{pos:[6.2,2.62,-1.4],kelvin:3300,lumens:900,radius:5,flicker:.1,shaft:.28,dir:[-.35,-1,0]}]]}}function Jt(){let e=F(`space.corridor`),t=1.42,n=-8.9,r=8.4,i=3.05,a=1.06,o=1.18,s=2.28,c=k(7);e.add(q({x0:-1.42,x1:t,z0:n,z1:r,h:i,skipZ0:!0,floor:`wood.varnished.dark`,ceil:`plaster.cracked`,wall:`wallpaper.damask.green`})),e.add(Ot(`z`,-9.01,i,`wallpaper.damask.green`,[-1.64,1.64],[-1.42,-.24],{sill:0,head:s})),e.add(P(L(2*t-o,a,.055,.01,1),`wood.varnished.dark`,{pos:[o*.5,a*.5,-8.872],wear:.95,seed:41,cast:!1})),e.add(zt(t,n,i,o,s,45)),e.add(Bt(t,n,a,i,o,210)),e.add(Vt(t,n,i,o,s,220));let l=[4.4,.7,-3,-6.6];for(let o of[-1,1]){for(let i of Pt(o,t,n,r,a,51+(o>0?7:0)))e.add(i);e.add(Ft(o,t,n,r,a,i,61+(o>0?7:0),l.filter((e,t)=>(t%2?1:-1)===o))),e.add(Ht(o,t,n,r,a,i,230+(o>0?9:0),o>0?2:-.6))}e.add(Fe([[.18,.7],[1,.62]],.235,.8600000000000001,-8.848,270));for(let t of Re(.94,1.416,-8.88,8.38,280))e.add(t);e.add(Ut(t,n,r,250));let u=Rt(2,-8.450000000000001,8.200000000000001,71,[1.9,-3.6]);Le(u.geometry,2.7),e.add(u),e.add(Gt(2,-8.450000000000001,8.200000000000001,260));let d=[101,102,103].map(e=>ye(e,{w:.86,h:2.06}).root),f=0;for(let t of[5.6,1.9,-1.8,-5.5])for(let n of[-1,1]){let r=t+(n>0?1.85:0),i=re(d[f%3],110+f,{pos:.02,rot:.03,scale:.022});i.position.set(n*1.4,0,r),i.rotation.y=n>0?-Math.PI/2:Math.PI/2,ne(i,!0,!0),M(e,{x:n*1.29,z:r,radius:.17,radiusZ:.5,strength:.62+f%3*.06,y:.005}),e.add(i);let a=At(.088,.132,f%4==1?`brass.polished`:`brass.tarnished`,120+f);a.position.set(n*1.3519999999999999,1.66+(c()-.5)*.05,r+.6),a.rotation.y=n>0?-Math.PI/2:Math.PI/2,a.rotation.x=f===4?.26:(c()-.5)*.09,e.add(a),f++}let p=.05;e.add(P(L(.03,.34,.86,.008,1),`glass.frosted`,{pos:[1.3719999999999999,2.36,p],cast:!1})),e.add(P(N([L(.055,.045,.94,.01,1),L(.055,.045,.94,.01,1)],[z([1.38,2.19,p]),z([1.38,2.545,p])]),`wood.painted.white`,{wear:.9,seed:131}));let m=-4.4,h=[],g=[];for(let e of[-1,1])h.push(L(.26,i,.3,.016,2)),g.push(z([e*1.29,i*.5,m])),h.push(L(.075,i,.4,.01,1)),g.push(z([e*1.13,i*.5,m]));h.push(L(2*t-.04,.62,.3,.016,2)),g.push(z([0,2.7399999999999998,m])),h.push(L(2*t-.04,.075,.4,.01,1)),g.push(z([0,2.3949999999999996,m])),e.add(P(N(h,g),`wood.painted.white`,{wear:.95,seed:181}));let _=Se(141,{cols:9}).root;_.position.set(-1.23,0,2.2),_.rotation.y=Math.PI/2,M(_,{strength:.74,radius:.62,radiusZ:.18}),e.add(_);for(let[t,[n,r,i,a]]of[[-1,3.9,.44,.58],[1,-2.5,.52,.4]].entries()){let o=V(191+t,{w:i,h:a}).root;o.position.set(n*1.385,1.72+t*.06,r),o.rotation.y=n>0?-Math.PI/2:Math.PI/2,o.rotation.z=(c()-.5)*.05,e.add(o)}let v=ze(151);v.position.set(t,1.46,3.5),e.add(v);let y=Ie(161);y.position.set(1,0,1.05),y.rotation.y=-1.52,M(y,{strength:.66,radius:.34,radiusZ:.46}),e.add(y);for(let n of Be(t,i,7.7,-4,88))e.add(n);let b=[];for(let[e,t]of l.entries()){let n=e%2?1:-1,r=e===3;b.push([`sconce`,{pos:[n*1.27,2.16,t],kelvin:2560+(c()-.5)*260,lumens:r?.6:e===0?600:1120-e*70,radius:r?2:11,flicker:r?0:.05+c()*.14,hot:r?.05:1.35+c()*.45,dir:[-n*.62,-.7,0],angle:.72,penumbra:.8,shaft:r?0:e===1?.17:.3,shaftLen:1.5,shaftAngle:.34,fixtureRot:[0,0,n*(.02+c()*.05)]}])}return b.push([`ceiling`,{pos:[0,2.92,-2.2],kelvin:4400,lumens:3400,radius:9,angle:1.24,flicker:.34,shaft:.34,shaftLen:1.5,shaftAngle:.5,hot:1.9}]),b.push([`desk`,{pos:[1.345,2.3,p],target:[.3699999999999999,0,p],kelvin:2450,lumens:210,radius:3.4,angle:.7,penumbra:.92,flicker:.03,shaft:.26,shaftLen:1.9,shaftAngle:.22,fixture:!1}]),{root:e,lights:b}}function Yt(){let e=F(`space.room942`),t=-5.2,n=5.4,r=3.15;e.add(q({x0:-4.3,x1:4.7,z0:t,z1:n,h:r,skipX1:!0,floor:`wood.varnished.dark`,ceil:`plaster.cracked`,wall:`wallpaper.damask.green`,wainscot:`wood.painted.white`,wainscotH:.98})),e.add(Ot(`x`,4.8100000000000005,r,`wallpaper.damask.green`,[t,n],[-1.6,.9],{sill:.92,head:2.42}));let i=F(`sash`),a=[],o=[];a.push(L(.06,1.56,.1,.012,1)),o.push(z([0,1.67,-1.62])),a.push(L(.06,1.56,.1,.012,1)),o.push(z([0,1.67,.92])),a.push(L(.06,.1,2.62,.012,1)),o.push(z([0,.92,-.35])),a.push(L(.06,.1,2.62,.012,1)),o.push(z([0,2.42,-.35])),a.push(L(.05,.07,2.5,.01,1)),o.push(z([0,1.67,-.35]));for(let e=0;e<3;e++)a.push(L(.04,1.44,.05,.008,1)),o.push(z([0,1.67,-1.3+e*.62]));i.add(P(N(a,o),`wood.painted.white`,{wear:.9,seed:161})),i.add(P(L(.014,1.44,2.44,.004,1),`glass.clear`,{pos:[.02,1.67,-.35],cast:!1})),i.position.set(4.72,0,0),e.add(i);let s=kt(2.42,1.3,22,171,.58);s.rotation.y=-Math.PI/2,s.position.set(4.6000000000000005,1.1,-.35),e.add(s);let c=Ne(181,{w:1.42,len:2.05}).root;c.position.set(-2.5,0,-1.4),c.rotation.y=Math.PI/2,e.add(c);let l=Pe(182).root;l.position.set(-3.3,0,1.15),e.add(l);let u=Kt(Te(183));u.position.set(-3.3,.62,1.15),u.rotation.y=1.1,e.add(u);let d=Se(184,{cols:12}).root;d.position.set(1.9,0,-5.04),e.add(d);let f=fe(185).root;f.position.set(1.2,0,2.4),f.rotation.y=-.4,e.add(f);let p=Me(186).root;p.position.set(2.9,0,-2.6),p.rotation.y=2.1,e.add(p);let m=V(187,{w:.72,h:.56}).root;m.position.set(-2.5,2.1,-5.07),e.add(m);let h=Oe(188,{w:2.2,len:3}).root;return h.position.set(.6,0,.4),e.add(h),{root:e,lights:[[`street`,{pos:[10.5,6.4,1.2],target:[-2.6,.35,-2.2],kelvin:3100,lumens:9e3,radius:22,angle:.4,flicker:.02,shaft:1,slats:{count:22,phase:.4,depth:.92},fixture:!1}],[`desk`,{pos:[-3.3,1.02,1.15],kelvin:2600,lumens:420,radius:3.4,flicker:.05,shaft:.2,fixture:!1}],[`sconce`,{pos:[-4.16,2.2,2.6],kelvin:2750,lumens:320,radius:4,flicker:.05,dir:[1,-.6,0],shaft:.2}]]}}function Xt(){let e=F(`space.bathroom`),t=-2.2,n=3.3,r=-3.1,i=4.1;e.add(q({x0:t,x1:n,z0:r,z1:i,h:2.8,floor:`tile.hex.bathroom`,ceil:`plaster.cracked`,wall:`plaster.cracked`,wainscot:`tile.subway.white`,wainscotH:1.62})),e.add(jt(t,n,r,i,`tile.hex.bathroom`,.28,191));let a=me(201).root;a.position.set(-1.55,0,-1),a.rotation.y=Math.PI/2,e.add(a);let o=be(202).root;o.position.set(-2.1100000000000003,1.62,-1),o.rotation.y=Math.PI/2,e.add(o);let s=Ce(203).root;s.position.set(1.5,0,-2),s.rotation.y=Math.PI/2,e.add(s);let c=ve(204).root;c.position.set(2.6,0,1.5),c.rotation.y=-Math.PI/2,e.add(c);let l=we(205,{w:.6}).root;l.position.set(-2.1,1.3,1.6),l.rotation.y=Math.PI/2,e.add(l);let u=Se(206,{cols:7}).root;return u.position.set(.2,0,3.8999999999999995),u.rotation.y=Math.PI,e.add(u),{root:e,lights:[[`ceiling`,{pos:[.3,2.62,-.4],kelvin:4500,lumens:3200,radius:7,angle:1.24,flicker:.26,shaft:.22}],[`sconce`,{pos:[-2.04,1.98,-1],kelvin:2950,lumens:380,radius:3.6,flicker:.05,dir:[1,-.35,0],shaft:.2}],[`bare-bulb`,{pos:[2.5,2.3,2.6],kelvin:2400,lumens:220,radius:3.4,flicker:.22}]]}}function Zt(){let e=F(`space.interro`);e.add(q({x0:-1.9,x1:1.9,z0:-2.6,z1:1.9,h:2.72,floor:`concrete.rooftop`,ceil:`plaster.cracked`,wall:`plaster.cracked`,wainscot:`wood.painted.white`,wainscotH:.92}));let t=F(`table`);t.add(P(L(1.42,.052,.82,.01,2),`wood.varnished.dark`,{pos:[0,.735,0],wear:.95,seed:211}));let n=[],r=[];for(let[e,t]of[[-1,-1],[1,-1],[-1,1],[1,1]])n.push(R([[.036,0],[.03,.06],[.026,.6],[.032,.71]],12)),r.push(z([e*.6,0,t*.3]));n.push(B([[-.6,.14,-.3],[-.6,.14,.3]],.016,4,6)),r.push(null),n.push(B([[.6,.14,-.3],[.6,.14,.3]],.016,4,6)),r.push(null),t.add(P(N(n,r),`steel.galvanized`,{wear:.9,seed:212})),t.position.set(0,0,-.55),t.rotation.y=.05,M(t,{strength:.7,spread:1}),e.add(t);let i=P((()=>{let e=[],t=[];e.push(L(.42,.038,.4,.01,2)),t.push(z([0,.45,0])),e.push(L(.4,.46,.034,.01,2)),t.push(z([0,.7,-.18],[-.1,0,0]));for(let[n,r]of[[-1,-1],[1,-1],[-1,1],[1,1]])e.push(R([[.02,0],[.017,.44]],10)),t.push(z([n*.17,0,r*.16]));return N(e,t)})(),`wood.varnished.dark`,{wear:1,seed:221});i.position.set(.12,0,-1.42),i.rotation.y=Math.PI+.16,M(i,{strength:.62,spread:.8}),e.add(i);let a=de(231).root;a.position.set(.3,.762,-.42),e.add(a);let o=ce(232).root;o.position.set(.3,.782,-.4),o.rotation.y=.7,e.add(o);let s=ue(233).root;s.position.set(-.34,.762,-.66),e.add(s);let c=se(234).root;c.position.set(-.1,.762,-.3),c.rotation.y=-.24,e.add(c);let l=Se(235,{cols:8}).root;return l.position.set(-1.3,0,-2.42),e.add(l),{root:e,lights:[[`desk`,{pos:[.06,1.92,-.62],target:[0,.74,-.6],kelvin:2750,lumens:620,radius:4.4,angle:.5,penumbra:.26,flicker:.08,shaft:.95,hot:3.4}],[`sconce`,{pos:[-1.76,2.1,1.5],kelvin:3050,lumens:130,radius:3.2,flicker:.05,dir:[1,-.5,-.4],shaft:.14}]]}}var Qt={"lobby-night":qt,"corridor-night":Jt,"room-dusk":Yt,bathroom:Xt,interrogation:Zt};function Z(e,t,n={}){let r=P(e,t,n);return r.material=xt(r.material,n.wet??1),r}function $t(e,t){let n=k(t),r=[],a=[],o=[];r.push(0,0,0),o.push(.5,.5);let s=[];for(let r=0;r<34;r++)s.push(e*(.62+.38*(.5+.5*Math.sin(r*1.7+t)*n())));for(let e=0;e<34;e++){let t=e/34*Math.PI*2,n=(s[e]*2+s[(e+1)%34]+s[(e+34-1)%34])*.25;r.push(Math.cos(t)*n,0,Math.sin(t)*n*.78),o.push(.5+Math.cos(t)*.5,.5+Math.sin(t)*.5),a.push(0,1+e,1+(e+1)%34)}let c=new y;c.setAttribute(`position`,new i(r,3)),c.setAttribute(`uv`,new i(o,2)),c.setIndex(a),c.computeVertexNormals();let l=new u(c,xt(ie(`water.dark`),1));return l.castShadow=!1,l.receiveShadow=!0,l}function en(){let e=F(`space.rooftop`),t=k(303),n=Z(new m(23.5,25.5,24,24),`concrete.rooftop`,{rot:[-Math.PI/2,0,0],pos:[-1.25,0,-3.25],cast:!1,wet:.9});e.add(n);let r=[],i=[];for(let e=0;e<14;e++)r.push(L(23.5,.012,.16,.004,1)),i.push(z([-1.25,.006,-15.2+e*1.86+(t()-.5)*.12],[0,(t()-.5)*.006,0]));e.add(Z(N(r,i),`steel.rusted`,{cast:!1,wear:1,seed:311,wet:.7}));let a=[],o=[],s=1.04,c=(e,t,n,r)=>{a.push(L(n,s,r,.02,2)),o.push(z([e,s*.5,t])),a.push(L(n+.1,.09,r+.1,.014,2)),o.push(z([e,1.085,t]))};c(-1.25,-16.16,24.14,.32),c(-1.25,9.66,24.14,.32),c(-13.16,-3.25,.32,25.5),c(10.66,-3.25,.32,25.5),e.add(Z(N(a,o),`concrete.rooftop`,{wear:.9,seed:321,wet:.75}));let l=F(`bulkhead`);l.add(Z(L(3.4,2.85,3,.03,2),`plaster.cracked`,{pos:[0,1.425,0],wear:.95,seed:331,wet:.6})),l.add(Z(L(3.7,.16,3.3,.02,2),`concrete.rooftop`,{pos:[0,2.92,0],wear:.9,seed:332,wet:.8}));let u=ye(333,{w:.9,h:2.02,door:`steel.rusted`,trim:`steel.galvanized`}).root;u.position.set(0,0,1.52),l.add(u),l.position.set(-7.4,0,-1.2),l.rotation.y=.12,ne(l,!0,!0),e.add(l);let d=Ae(341,{text:`CECIL`,scale:.46}).root;d.position.set(-7,3.35,.35),d.rotation.y=.34,e.add(d);for(let[t,[n,r,i,a,o]]of[[-1.9,-6.4,.32,1.45,2.45],[3.6,-10.2,-.55,1.15,2.05]].entries()){let s=ge(351+t*7,{r:a,h:o}).root,c=F(`cradle`),l=[],u=[];for(let e of[-1,1])l.push(L(a*2.4,.22,.28,.014,2)),u.push(z([0,.11,e*a*.62]));for(let e=0;e<4;e++)l.push(L(.24,.22,a*1.7,.012,2)),u.push(z([(e-1.5)*a*.72,.11,0]));c.add(Z(N(l,u),`wood.varnished.dark`,{wear:1,seed:361+t,wet:.7})),s.position.y=.22;let d=F(`tank`,c,s);d.position.set(n,0,r),d.rotation.y=i,M(d,{strength:.8,radius:a*1.5,radiusZ:a*1.5}),ne(d,!0,!0),e.add(d)}let f=Z(N([B([[-1.9,1.9,-5],[-1.9,1.35,-3.6],[-3.6,1.15,-2.4],[-6,.95,-1.6],[-7.2,.55,-1]],.075,44,12),B([[3.6,1.6,-9.1],[3.2,1.2,-7.4],[1.2,.85,-5.6],[-1.2,.72,-4.4]],.055,36,10)]),`steel.rusted`,{wear:1,seed:371,wet:.8});e.add(f);let p=[],h=[];for(let[e,t]of[[-3.6,-2.4],[-6,-1.6],[1.2,-5.6]])p.push(R([[.09,0],[.13,.02],[.13,.06],[.09,.08]],16)),h.push(z([e,.72,t],[Math.PI/2,0,.3]));e.add(Z(N(p,h),`steel.galvanized`,{wear:1,seed:372,wet:.7}));let g=F(`vents`);for(let[e,[t,n,r,i]]of[[0,0,1.55,.2],[.72,-.5,1.15,-.6],[-.55,-.86,.92,1.1]].entries()){let a=he(381+e,{h:r}).root;a.position.set(t,0,n),a.rotation.y=i,g.add(a)}let _=Z(L(2,.34,1.9,.03,2),`concrete.rooftop`,{pos:[.1,.17,-.3],wear:.95,seed:385,wet:.85});g.add(_),g.position.set(3.9,0,3.6),g.rotation.y=-.4,ne(g,!0,!0),e.add(g);let v=_e(391,{w:2.2,d:1.15}).root;v.position.set(10.8,1.06,3.2),v.rotation.y=Math.PI/2,e.add(v);let y=[],b=[];for(let e of[-1,1])y.push(B([[e*.21,0,0],[e*.19,2.6,-.5]],.022,6,8)),b.push(null);for(let e=0;e<9;e++){let t=e/8;y.push(B([[-.2,t*2.6,-t*.5],[.2,t*2.6,-t*.5]],.016,4,7)),b.push(null)}let x=Z(N(y,b),`steel.galvanized`,{wear:1,seed:395,wet:.8});x.position.set(-5.4,0,1.9),x.rotation.y=-.5,M(x,{strength:.5,radius:.5,radiusZ:.5}),e.add(x);for(let[n,[r,i,a]]of[[1.2,2.4,1.35],[-2.6,1.2,.95],[4.6,-2.2,1.1],[-4.4,-4,1.5],[.4,-1.2,.8]].entries()){let o=$t(a,401+n);o.position.set(r,.014,i),o.rotation.y=t()*3.14,e.add(o)}return{root:e,lights:[[`moon`,{pos:[-28,40,44],target:[0,0,-4],kelvin:7600,lux:130,extent:30}],[`neon`,{pos:[-6.6,3.35,.72],kelvin:2100,lumens:1600,radius:8.5,flicker:.34,fixture:!1}],[`street`,{pos:[12.5,7.2,6],target:[1,.2,-3],kelvin:2050,lumens:14e3,radius:26,angle:.62,flicker:.05,shaft:.75,fixture:!1}],[`bare-bulb`,{pos:[-7.4,2.32,2.78],kelvin:2400,lumens:300,radius:4.6,flicker:.26}]]}}var tn=-500,nn={...Qt,"rooftop-rain":en};function rn(e,t){let n=new c;n.name=`atmo.probe`,n.position.y=tn,e.scene.add(n);let r=new Map,i=[],a=null;return n.userData.setRig=e=>{for(let e of i)e.dispose();if(i=[],a&&(a.root.visible=!1),a=null,!e)return;let o=nn[e]?e:`lobby-night`,s=r.get(o);s||(s=nn[o](),s.root.name=`atmo.space.${o}`,n.add(s.root),r.set(o,s)),s.root.visible=!0,a=s;for(let[e,n]of s.lights){let r={...n};r.pos=[n.pos[0],n.pos[1]+tn,n.pos[2]],n.target&&(r.target=[n.target[0],n.target[1]+tn,n.target[2]]),i.push(t(e,r))}},n.userData.spaceName=()=>a?a.root.name:null,n}var an=.035,on=.055,sn=25,cn={sconce:{type:`spot`,kelvin:2700,lumens:420,radius:5.2,angle:1.15,penumbra:.78,flick:`incandescent`,shaft:.18,shadow:!0,dir:[0,-.55,.4],prio:1,hot:2.6,fill:.014,up:.8,upAngle:1.3,upRadius:3.6},chandelier:{type:`point`,kelvin:2550,lumens:2400,radius:12,flick:`incandescent`,shaft:0,shadow:!1,prio:1.5,hot:2.8},desk:{type:`spot`,kelvin:2700,lumens:560,radius:4.2,angle:.98,penumbra:.55,flick:`incandescent`,shaft:.14,shadow:!0,dir:[0,-1,0],prio:1.1,hot:2.4},ceiling:{type:`spot`,kelvin:4500,lumens:2200,radius:8.5,angle:1.32,penumbra:.62,flick:`fluorescent`,shaft:.15,shadow:!0,dir:[0,-1,0],prio:1.2,hot:3.2,up:.17,upAngle:1.36,upRadius:4.6,upY:-.32,spd:[.93,1.053,1.012]},neon:{type:`point`,kelvin:6200,lumens:460,radius:5.5,flick:`neon`,shaft:0,shadow:!1,prio:.85,hot:5},moon:{type:`dir`,kelvin:8e3,lux:15,shadow:!0,flick:`none`,dir:[.42,-.6,-.68],prio:4,hot:0},street:{type:`spot`,kelvin:2050,lumens:12e3,radius:30,angle:.9,penumbra:.42,flick:`sodium`,shaft:.5,shadow:!0,dir:[0,-1,0],prio:1.8,hot:0},"bare-bulb":{type:`point`,kelvin:2400,lumens:280,radius:4.2,flick:`voltage`,shaft:0,shadow:!1,prio:.9,hot:4},elevator:{type:`spot`,kelvin:3200,lumens:780,radius:4.8,angle:1.24,penumbra:.86,flick:`hum`,shaft:.22,shadow:!0,dir:[0,-1,0],prio:1.05,hot:2.8}},Q=[.2126,.7152,.0722];function ln(e,t){if(!t)return e;let n=[e[0]*t[0],e[1]*t[1],e[2]*t[2]],r=Q[0]*e[0]+Q[1]*e[1]+Q[2]*e[2],i=Q[0]*n[0]+Q[1]*n[1]+Q[2]*n[2],a=i>1e-6?r/i:1;return[n[0]*a,n[1]*a,n[2]*a]}var un=e=>{let t=Math.sin(e*127.1+311.7)*43758.5453;return t-Math.floor(t)};function dn(e,t,n,r){if(!r||e===`none`)return 1;let i=n*6.2831;if(e===`incandescent`)return 1+r*(.55*Math.sin(t*.63+i)+.3*Math.sin(t*1.87+i*2.1)+.15*Math.sin(t*4.31+i*3.7));if(e===`voltage`){let e=.5*Math.sin(t*.9+i)+.5*Math.sin(t*2.7+i*1.7),a=un(Math.floor(t*2.3+n*31))<.09?-1.9:0;return A(1+r*(e+a*(.5+.5*Math.sin(t*19+i))),.05,1.6)}if(e===`fluorescent`){let e=.5+.5*Math.sin(t*45.9+i),a=Math.floor(t*9+n*53),o=un(a),s=o<.055?.18+.55*un(a+7):1,c=o>.985?.62:1;return A((1-r*.55*e)*s*c,.03,1.3)}if(e===`neon`){let e=.5+.5*Math.sin(t*81.7+i),a=un(Math.floor(t*1.7+n*17))<.05?.1:1;return A((1-r*.4*e)*a,.02,1.2)}return e===`sodium`?1+r*.35*Math.sin(t*.31+i):e===`hum`?1+r*(.6*Math.sin(t*7.3+i)+.4*Math.sin(t*2.1+i*3)):1}function fn(e,t,n){return e.type===`dir`?t:e.type===`spot`?t/(2*Math.PI*(1-Math.cos(n))):t/(4*Math.PI)}var $={e:null,baker:null,field:null,rain:null,pool:[],queue:[],mood:Ue,rig:null,frame:0,depth:null,res:new a(1280,720),atmo:null,probe:null,seed:0,top:[],groundY:0};function pn(){return Ve[$.mood]||Ve[`lobby-night`]}function mn(){return $.mood}function hn(t={}){let n=t.sky||[.03,.03,.035],r=t.ground||[.012,.01,.009];return $.rig||($.rig={hemi:new e(16777215,16777215,1)},$.rig.hemi.name=`atmo.hemi`,$.rig.hemi.position.set(0,6,0),$.e&&$.e.scene.add($.rig.hemi)),$.rig.hemi.color.setRGB(n[0],n[1],n[2]),$.rig.hemi.groundColor.setRGB(r[0],r[1],r[2]),$.rig.hemi.intensity=t.intensity??.5,$.rig}function gn(e){let t=$.e.scene;t.add(e.light),e.light.target&&t.add(e.light.target),e.fixture&&t.add(e.fixture),e.holder&&t.add(e.holder),e.fill&&t.add(e.fill),e.up&&(t.add(e.up),t.add(e.up.target));let n=$.e.quality;if(e.wantShadow){let t=e.type===`dir`?n.shadowMap:Math.min(n.shadowMap,1024);e.light.shadow.mapSize.set(t,t)}e.up&&e.up.shadow.mapSize.set(n.shadowMap,n.shadowMap)}function _n(e,t={}){let n=cn[e]||cn.sconce,r=t.pos||[0,2.4,0],i=t.kelvin??n.kelvin,a=ln(te(i),t.spd??n.spd),c=t.angle??n.angle??1,l=t.lumens??t.lux??n.lumens??n.lux??500,u=t.radius??n.radius??6,d=fn(n,l,c)*an,f=$.seed=($.seed+.6180339887)%1,p;n.type===`dir`?(p=new o(16777215,d),p.shadow.camera.left=-(t.extent??24),p.shadow.camera.right=t.extent??24,p.shadow.camera.top=t.extent??24,p.shadow.camera.bottom=-(t.extent??24),p.shadow.camera.near=.5,p.shadow.camera.far=120):n.type===`spot`?(p=new ee(16777215,d,u,c,t.penumbra??n.penumbra??.6,2),p.shadow.camera.near=.08,p.shadow.camera.far=u*1.25):p=new _(16777215,d,u,2),p.color.setRGB(a[0],a[1],a[2]),p.position.set(r[0],r[1],r[2]),p.name=t.name||`atmo.${e}`;let m=(t.castShadow??n.shadow)&&n.type!==`point`;p.castShadow=!1,m&&(p.shadow.bias=-9e-4,p.shadow.normalBias=.022,p.shadow.radius=2,p.shadow.blurSamples=8,p.shadow.autoUpdate=!1);let h=new s;if(t.target)h.fromArray(t.target);else{let e=new s().fromArray(t.dir||n.dir||[0,-1,0]);e.lengthSq()<1e-6&&e.set(0,-1,0),h.copy(p.position).add(e.normalize().multiplyScalar(Math.max(u*.5,1)))}p.target&&p.target.position.copy(h);let g=t.hot??n.hot??3,v=t.fixture===!1||g<=0?null:ct(e,a,g);v&&(v.position.set(r[0],r[1],r[2]),t.fixtureRot&&v.rotation.set(t.fixtureRot[0],t.fixtureRot[1],t.fixtureRot[2]),v.name=`${p.name}.body`);let y=null,b=t.fill??n.fill??0;v&&b>0&&(y=new _(16777215,l/(4*Math.PI)*an*b,t.fillRadius??.26,2),y.color.setRGB(a[0],a[1],a[2]),y.position.set(r[0],r[1]+(t.fillY??-.05),r[2]),y.castShadow=!1,y.name=`${p.name}.fill`);let x=null,C=t.up??n.up??0;if(C>0&&n.type!==`dir`){let e=Math.min(t.upAngle??n.upAngle??1.3,1.5),i=t.upRadius??n.upRadius??Math.max(u*.4,2.5);x=new ee(16777215,d*C,i,e,t.upPenumbra??.94,2),x.color.setRGB(a[0],a[1],a[2]),x.position.set(r[0],r[1]+(t.upY??n.upY??.04),r[2]),x.target.position.set(r[0],r[1]+2,r[2]),x.name=`${p.name}.up`,x.castShadow=!1,x.shadow.camera.near=.05,x.shadow.camera.far=i*1.2,x.shadow.bias=-2e-4,x.shadow.normalBias=.004,x.shadow.radius=.6,x.shadow.blurSamples=8,x.shadow.autoUpdate=!1}let w=null,T=null,E=(t.shaft??n.shaft??0)*on*A(Math.sqrt(d/sn),.45,1.15);if(E>0&&n.type===`spot`){let e=Math.min(t.shaftLen??u*.42,7),n=Math.min(t.shaftAngle??c*.4,.42);if(T=tt(a,E,e,Math.tan(n)*e*.98),w=new S,w.position.copy(p.position),w.lookAt(h),w.add(T),t.slats){let e=T.material.uniforms;e.uSlatFreq.value=t.slats.count??28,e.uSlatPhase.value=t.slats.phase??0,e.uSlatDepth.value=t.slats.depth??.85}}let D={kind:e,light:p,fixture:v,holder:w,shaft:T,fill:y,up:x,wantShadow:m,type:n.type,col:a,hot:g,radius:u,prio:n.prio??1,seed:f,baseI:d,fillBase:y?y.intensity:0,upBase:x?x.intensity:0,shape:t.flickerShape||n.flick,amt:t.flicker??(n.flick===`none`?0:.05),shaftBase:E,k:-1,packet:null};return $.pool.push(D),$.e?gn(D):$.queue.push(D),{light:p,helperMesh:v,shaft:T,target:p.target||null,dispose:()=>vn(D)}}function vn(e){let t=$.pool.indexOf(e);t>=0&&$.pool.splice(t,1),$.top=$.top.filter(t=>t!==e);for(let t of[e.light,e.light.target,e.fixture,e.holder,e.fill,e.up,e.up?.target])t?.parent?.remove(t);e.light.shadow?.dispose?.(),e.light.dispose?.(),e.fill?.dispose?.(),e.up?.shadow?.dispose?.(),e.up?.dispose?.(),e.shaft?.geometry.dispose(),e.shaft?.material.dispose(),e.fixture?.traverse(e=>{e.geometry?.dispose(),e.material?.dispose()})}function yn(e){let t=$.atmo||={};t.density=e.fog.density,t.heightFalloff=e.fog.heightFalloff,t.color=e.fog.color.slice(),t.scattering=e.fog.scattering,t.anisotropy=e.fog.anisotropy,t.windDir=e.fog.windDir.slice(),t.baseHeight=e.fog.baseHeight??0,t.intensity=e.look.volumetricIntensity,t.mood=$.mood,t.sunDir=e.ibl.sun?e.ibl.sun.dir.slice():[0,1,0],t.sunColor=e.ibl.sun?e.ibl.sun.col.slice():[0,0,0],window.__ATMO__=t}function bn(e){let t=$.e?.get(`pipeline`)?.effects?.volumetric;if(!t||!t.params)return;let n=e.fog,r=t.params;r.extinct=n.density*(n.extinctK??2.4),r.scatter=r.extinct*A(n.albedo??.72,.02,.95),r.g=n.anisotropy,r.ambient=n.ambient??.42,r.fogY=$.groundY+(n.baseHeight??0),r.fogFall=Math.max(n.heightFalloff,.02),r.nScale=n.noiseScale??.085,r.spark=n.spark??3.2,r.sparkScale=n.sparkScale??1.35,r.maxDist=n.maxDist??58,t.fogColor?.setRGB(n.color[0],n.color[1],n.color[2]);let i=t.mMarch?.uniforms;if(!i)return;let a={uExtinct:r.extinct,uScatter:r.scatter,uG:r.g,uAmbient:r.ambient,uFogY:r.fogY,uFogFall:r.fogFall,uNScale:r.nScale,uSpark:r.spark,uSparkScale:r.sparkScale,uMaxDist:r.maxDist};for(let e in a)i[e]&&(i[e].value=a[e])}function xn(e){$.mood=Ve[e]?e:Ue;let n=pn();if(yn(n),!$.e)return $.mood;let r=$.e,i=n.fog.color;(!r.scene.fog||!r.scene.fog.isFogExp2)&&(r.scene.fog=new t(0,n.fog.density)),r.scene.fog.color.setRGB(i[0],i[1],i[2]),r.scene.fog.density=n.fog.density;let a=r.look;a.exposure=n.exposure,a.fogDensity=n.fog.density,a.fogColor=n.fog.color.slice();for(let e of[`lift`,`gamma`,`gain`,`saturation`,`contrast`,`halation`,`vignette`,`grainAmount`,`chromatic`,`volumetricIntensity`])n.look[e]!==void 0&&(a[e]=Array.isArray(n.look[e])?n.look[e].slice():n.look[e]);r.renderer.toneMappingExposure=n.exposure;let o=$.baker.bake($.mood,n.ibl,r.quality.texRes>=2048?256:128);r.scene.environment=o,r.scene.environmentIntensity=n.envIntensity,r.scene.background=n.background?o:null,r.scene.backgroundIntensity=.9,r.scene.backgroundBlurriness=.02,hn(n.hemi),$.field?.applyMood(n),$.rain?.applyMood(n,$.groundY),bn(n);for(let e of $.pool)e.shaft&&e.shaft.material.uniforms.uWind.value.fromArray(n.fog.windDir).multiplyScalar(2.5);return $.mood}function Sn(){let e=$.e,t=e.camera,n=e.quality.maxLights??16,r=e.quality.name===`cinematic`?4:e.quality.name===`high`?3:2,i=e.quality.name===`cinematic`?2:1;for(let e of $.pool){if(e.type===`dir`){e.score=1e9,e.dist=0;continue}e.dist=e.light.position.distanceTo(t.position),e.score=e.prio*(e.radius+2)/(e.dist+1)}let a=e.quality.name===`cinematic`?4:e.quality.name===`high`?2:1,o=$.pool.slice().sort((e,t)=>t.score-e.score),s=$.pool.filter(e=>e.up).sort((e,t)=>t.upBase/(t.dist+3)-e.upBase/(e.dist+3)),c=0,l=0,u=0;for(let e of o){let t=e.type===`dir`?1/0:e.radius*1.15+1.5,a=c<n&&e.dist<t;a&&(c+=1+ +!!e.fill+ +!!e.up),e.light.visible!==a&&(e.light.visible=a),e.holder&&(e.holder.visible=a),e.fill&&(e.fill.visible=a),e.up&&(e.up.visible=a),a&&e.wantShadow&&l<r?(e.light.castShadow||(e.light.castShadow=!0,e.light.shadow.needsUpdate=!0),e.light.shadow.autoUpdate=l<i,!e.light.shadow.autoUpdate&&$.frame%90==0&&(e.light.shadow.needsUpdate=!0),l++):e.light.castShadow&&(e.light.castShadow=!1)}for(let e of s)e.up.visible&&e.upBase>1e-4&&u<a?(e.up.castShadow||(e.up.castShadow=!0,e.up.shadow.needsUpdate=!0),u++):e.up.castShadow&&(e.up.castShadow=!1);$.top=o.filter(e=>e.light.visible&&e.type!==`dir`).slice(0,4)}function Cn(e){let t=e.packet||={pos:e.light.position,dir:new s(0,-1,0),cos:-1,range:e.type===`dir`?0:e.radius,col:new s(e.col[0],e.col[1],e.col[2]),power:0};return e.light.isSpotLight&&(t.dir.copy(e.light.target.position).sub(e.light.position).normalize(),t.cos=Math.cos(e.light.angle)),t.power=e.light.intensity,t}function wn(){let e=$.e.get(`pipeline`);return(e?.ctx||e?.context)?.targets?.normal?.texture||null}var Tn={name:`atmosphere`,order:65,async init(e){$.e=e,$.baker=new Ke(e.renderer),$.field=new gt(e.quality),e.scene.add($.field.group),$.rain=new St(e.quality),e.scene.add($.rain.group),$.rig&&e.scene.add($.rig.hemi);for(let e of $.queue)gn(e);$.queue.length=0,e.bus.on(`room:changed`,({room:e})=>{let t=He[e];t&&t!==$.mood&&xn(t)}),e.bus.on(`interrogation:start`,()=>xn(`interrogation`)),e.bus.on(`qa:state`,t=>{t&&(t.scene===`atmo-probe`?($.probe||=rn(e,_n),$.probe.visible=!0,$.groundY=tn,$.probe.userData.setRig(Ve[t.mood]?t.mood:Ue)):$.probe&&($.probe.visible=!1,$.probe.userData.setRig(null),$.groundY=0),xn(t.mood||$.mood))}),xn($.mood),e.renderer.getDrawingBufferSize($.res)},update(e,t){let n=$.e;if(!n)return;let r=n.time;$.frame++;let i=pn().shaftScale;for(let e of $.pool){if(e.light.visible){let t=dn(e.shape,r,e.seed,e.amt);Math.abs(t-e.k)>.002&&(e.light.intensity=e.baseI*t,e.fill&&(e.fill.intensity=e.fillBase*t),e.up&&(e.up.intensity=e.upBase*t),lt(e.fixture,e.col,e.hot,A(t,.02,2)),e.shaft&&(e.shaft.material.uniforms.uIntensity.value=e.shaftBase*i*t),e.k=t)}e.shaft&&(e.shaft.material.uniforms.uTime.value=r)}$.frame%12==1&&(Sn(),$.depth=wn(),n.renderer.getDrawingBufferSize($.res));let a=$.top.map(Cn),o=n.camera.fov*Math.PI/180,s=$.res.y/(2*Math.tan(o*.5));$.field.update(r,n.camera,a,$.depth,$.res,s,n.size?.dpr??2),$.rain.update(r,n.camera,a,$.depth,$.res,s);for(let e of $.pool){if(!e.shaft)continue;let t=e.shaft.material.uniforms;t.uSceneDepth.value=$.depth,t.uSoft.value=+!!$.depth,t.uResolution.value.copy($.res);let n=e.light.castShadow?e.light.shadow?.map?.texture:null;t.uShadowOn.value=+!!n,n&&(t.uShadowMap.value=n,t.uShadowMat.value.copy(e.light.shadow.matrix),t.uShadowBias.value=-Math.abs(e.light.shadow.bias??0)-9e-4)}$.atmo&&($.atmo.time=r)},resize(e,t){$.e&&$.e.renderer.getDrawingBufferSize($.res)},dispose(){$.baker?.dispose(),$.field?.dispose(),$.rain?.dispose(),$.pool.length=0}};export{hn as ambientRig,mn as currentMood,Tn as default,_n as practical,xn as setMood};