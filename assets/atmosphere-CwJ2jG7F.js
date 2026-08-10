import{$ as e,B as t,F as n,Fn as r,H as i,O as a,Pn as o,Q as s,R as c,ct as l,f as u,g as d,mn as f,pn as p,pt as m,u as h,vn as g,xn as _,yn as v}from"./three.core-BesWO3HN.js";import{t as y}from"./three.module-BfmM4iuI.js";import{i as ee,t as b}from"./util-Co7KvJK9.js";import{m as x,t as S}from"./kit-B67v3mBg.js";import{i as C}from"./library-BzxB0_ct.js";import{i as w,n as T,r as E,t as D}from"./probe-Dtpfow4M.js";var O={"lobby-night":{exposure:1,envIntensity:.58,shaftScale:0,background:!1,fog:{density:.018,albedo:.62,ambient:.38,heightFalloff:.16,color:[.042,.033,.026],scattering:1.3,anisotropy:.62,windDir:[.055,.012,.03],baseHeight:0,noiseScale:.075,spark:3.4,sparkScale:1.3,maxDist:20},look:{lift:[-.01,.002,.02],gamma:[1,.99,.965],gain:[1.1,1,.88],saturation:.9,contrast:1.14,halation:.28,vignette:.62,grainAmount:.042,chromatic:.0022,volumetricIntensity:1.1},hemi:{sky:[.024,.019,.015],ground:[.01,.007,.005],intensity:.45},particles:{dust:.55,smoke:1,rain:0,splash:0,box:[16,5.2,16]},ibl:{zenith:[.005,.005,.007],horizon:[.03,.022,.013],ground:[.021,.015,.01],glow:[.085,.048,.02],glowPow:2.6,glowHeight:.6,stars:0,seed:.7,sun:null,blobs:[{dir:[.15,.86,-.48],col:[1.35,.78,.3],size:26},{dir:[-.9,.05,.42],col:[.13,.17,.22],size:5},{dir:[.72,-.22,.66],col:[.26,.17,.09],size:7}]}},"corridor-night":{exposure:.74,envIntensity:.78,shaftScale:.65,background:!1,fog:{density:.17,albedo:.24,ambient:.012,extinctK:1.1,heightFalloff:.85,color:[2e-4,28e-5,36e-5],scattering:.62,anisotropy:.62,windDir:[.02,.006,.075],baseHeight:0,noiseScale:.1,spark:4.5,sparkScale:2.2,maxDist:10},look:{lift:[-.016,.003,.03],gamma:[1,.985,.945],gain:[1.08,1,.9],saturation:.8,contrast:1.2,halation:.17,vignette:.54,grainAmount:.052,chromatic:.0026,volumetricIntensity:.22},hemi:{sky:[.016,.022,.028],ground:[.008,.007,.007],intensity:.7},particles:{dust:.75,smoke:.35,rain:0,splash:0,box:[7,3.4,26]},ibl:{zenith:[.003,.004,.006],horizon:[.012,.014,.016],ground:[.01,.008,.007],glow:[.03,.02,.01],glowPow:3.4,glowHeight:.42,stars:0,seed:2.1,sun:null,blobs:[{dir:[0,.3,-.95],col:[.55,.31,.12],size:34},{dir:[0,.2,.98],col:[.04,.09,.12],size:12}]}},"room-dusk":{exposure:.88,envIntensity:.52,shaftScale:0,background:!1,fog:{density:.015,albedo:.88,ambient:.3,heightFalloff:.2,color:[.05,.041,.035],scattering:1.7,anisotropy:.8,windDir:[.09,.02,.02],baseHeight:0,noiseScale:.13,spark:5,sparkScale:2.1,maxDist:12},look:{lift:[-.008,.004,.024],gamma:[1,.99,.96],gain:[1.12,1,.86],saturation:.92,contrast:1.12,halation:.32,vignette:.42,grainAmount:.04,chromatic:.002,volumetricIntensity:1.15},hemi:{sky:[.03,.026,.026],ground:[.014,.01,.008],intensity:.45},particles:{dust:1.35,smoke:.5,rain:0,splash:0,box:[9,3.2,9]},ibl:{zenith:[.014,.02,.038],horizon:[.13,.075,.038],ground:[.03,.022,.016],glow:[.3,.14,.045],glowPow:2,glowHeight:.72,stars:0,seed:4.3,sun:{dir:[.62,.22,-.75],col:[3.4,1.55,.62],sharp:220},blobs:[{dir:[.6,.3,-.74],col:[1.1,.62,.28],size:10},{dir:[-.55,-.1,.83],col:[.1,.1,.13],size:5}]}},bathroom:{exposure:.94,envIntensity:.8,shaftScale:0,background:!1,fog:{density:.009,albedo:.52,ambient:.42,heightFalloff:.28,color:[.036,.043,.048],scattering:.95,anisotropy:.36,windDir:[.01,.05,.01],baseHeight:0,noiseScale:.16,spark:2,sparkScale:1.9,maxDist:6},look:{lift:[-.006,.001,.014],gamma:[.99,1,1],gain:[.94,1,1.04],saturation:.72,contrast:1.18,halation:.14,vignette:.36,grainAmount:.034,chromatic:.0014,volumetricIntensity:.85},hemi:{sky:[.038,.043,.048],ground:[.02,.022,.024],intensity:.6},particles:{dust:.3,smoke:.2,rain:0,splash:0,box:[4,2.8,4]},ibl:{zenith:[.1,.113,.126],horizon:[.055,.062,.07],ground:[.04,.044,.048],glow:[.02,.026,.03],glowPow:4,glowHeight:.3,stars:0,seed:6.9,sun:null,blobs:[{dir:[0,.98,.2],col:[1.55,1.72,1.9],size:9},{dir:[0,-.85,.53],col:[.1,.11,.12],size:4}]}},"rooftop-rain":{exposure:.92,envIntensity:.56,shaftScale:.85,background:!0,fog:{density:.019,albedo:.58,ambient:.2,heightFalloff:.12,color:[.028,.033,.045],scattering:1.4,anisotropy:.52,windDir:[.28,-.05,.1],baseHeight:0,noiseScale:.045,spark:2.4,sparkScale:.85,maxDist:62},look:{lift:[-.014,.002,.034],gamma:[1,.995,.975],gain:[1.02,1,.98],saturation:.84,contrast:1.16,halation:.3,vignette:.48,grainAmount:.05,chromatic:.003,volumetricIntensity:1},hemi:{sky:[.024,.029,.042],ground:[.01,.01,.011],intensity:.65},particles:{dust:.1,smoke:.22,rain:1,splash:1,lens:1,box:[22,9,22]},ibl:{zenith:[.01,.014,.026],horizon:[.055,.045,.04],ground:[.014,.014,.016],glow:[.36,.2,.085],glowPow:3.2,glowHeight:.34,stars:.35,seed:1.4,sun:{dir:[-.42,.6,.68],col:[2.6,2.9,3.6],sharp:900},blobs:[{dir:[-.4,.58,.71],col:[.34,.4,.52],size:12},{dir:[.88,-.06,-.47],col:[.42,.16,.2],size:6},{dir:[-.72,-.1,-.68],col:[.16,.26,.34],size:6}]}},interrogation:{exposure:.86,envIntensity:.14,shaftScale:0,background:!1,fog:{density:.024,albedo:.88,ambient:.14,heightFalloff:.14,color:[.026,.026,.03],scattering:1.85,anisotropy:.82,windDir:[.035,.02,.015],baseHeight:0,noiseScale:.16,spark:4.4,sparkScale:2.3,maxDist:6},look:{lift:[-.018,0,.022],gamma:[1,.985,.955],gain:[1.09,1,.89],saturation:.76,contrast:1.28,halation:.22,vignette:.62,grainAmount:.056,chromatic:.0024,volumetricIntensity:1.15},hemi:{sky:[.006,.006,.008],ground:[.003,.003,.003],intensity:.22},particles:{dust:.85,smoke:1.35,rain:0,splash:0,box:[6,3,6]},ibl:{zenith:[.002,.002,.003],horizon:[.006,.006,.007],ground:[.006,.005,.004],glow:[.012,.008,.005],glowPow:4.5,glowHeight:.25,stars:0,seed:3.3,sun:null,blobs:[{dir:[.05,.95,-.3],col:[.95,.62,.3],size:40}]}}},k={lobby:`lobby-night`,corridor:`corridor-night`,room942:`room-dusk`,room944:`room-dusk`,bathroom:`bathroom`,rooftop:`rooftop-rain`},A=`lobby-night`,te=`
varying vec3 vDir;
void main () {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,j=`
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
}`,ne=class{constructor(t){this.renderer=t,this.pmrem=new y(t),this.pmrem.compileCubemapShader(),this.cache=new Map,this.mat=new f({side:1,depthWrite:!1,fog:!1,vertexShader:te,fragmentShader:j,uniforms:{uZenith:{value:new r},uHorizon:{value:new r},uGround:{value:new r},uGlow:{value:new r},uGlowPow:{value:3},uGlowHeight:{value:.5},uStars:{value:0},uSeed:{value:0},uSunDir:{value:new r(0,1,0)},uSunCol:{value:new r},uSunSharp:{value:400},uBlobDir:{value:[new r(0,1,0),new r(0,1,0),new r(0,1,0),new r(0,1,0)]},uBlobCol:{value:[new r,new r,new r,new r]},uBlobSize:{value:[8,8,8,8]},uBlobCount:{value:0}}}),this.skyScene=new p,this.sky=new e(new g(60,48,32),this.mat),this.sky.frustumCulled=!1,this.skyScene.add(this.sky)}_apply(e){let t=this.mat.uniforms;t.uZenith.value.fromArray(e.zenith),t.uHorizon.value.fromArray(e.horizon),t.uGround.value.fromArray(e.ground),t.uGlow.value.fromArray(e.glow),t.uGlowPow.value=e.glowPow,t.uGlowHeight.value=e.glowHeight,t.uStars.value=e.stars||0,t.uSeed.value=e.seed||0,e.sun?(t.uSunDir.value.fromArray(e.sun.dir).normalize(),t.uSunCol.value.fromArray(e.sun.col),t.uSunSharp.value=e.sun.sharp):(t.uSunCol.value.set(0,0,0),t.uSunSharp.value=400);let n=e.blobs||[];t.uBlobCount.value=Math.min(n.length,4);for(let e=0;e<4;e++){let r=n[e];r&&(t.uBlobDir.value[e].fromArray(r.dir).normalize(),t.uBlobCol.value[e].fromArray(r.col),t.uBlobSize.value[e]=r.size)}}bake(e,t,n=256){let r=this.cache.get(e);if(r)return r.texture;this._apply(t);let i=this.pmrem.fromScene(this.skyScene,.015,.1,200,{size:n});return i.texture.name=`atmo.env.${e}`,this.cache.set(e,i),i.texture}dispose(){for(let e of this.cache.values())e.dispose();this.cache.clear(),this.pmrem.dispose(),this.sky.geometry.dispose(),this.mat.dispose()}};function M(e){return new i([[0,0],[.03,.005],[.038,.022],[.031,.044],[.021,.058],[.028,.076],[.032,.096],[.026,.114],[.012,.126],[0,.13]].map(t=>new o(t[0]*e,t[1]*e)),20)}function N(e,t){let n=[[e*1.9,0],[e,t*.1],[e*.82,t*.5],[e,t*.9],[e*1.6,t]];return new i(n.map(e=>new o(e[0],e[1])),12)}function P(e,t){let n=.0016,r=[],a=0;for(let i of[1,.93,.86]){let s=e*i;r.push(new o(s,a),new o(s,a+t*.28-n)),a+=t*.28,r.push(new o(s-n,a),new o(s-e*.07+n,a))}return r.push(new o(e*.79,a+t*.16)),new i(r,30)}function F(e,t){let n=[];for(let r=0;r<=12;r++){let i=r/12*t;n.push(new o(Math.sin(i)*e,Math.cos(i)*e*.78))}return n.push(new o(Math.sin(t)*e*.97,Math.cos(t)*e*.78-.012)),new i(n,28)}var re=[[-.082,0],[.082,0],[.082,-.052],[.074,-.062],[.058,-.066],[.058,-.056],[.07,-.052],[.07,-.006],[-.07,-.006],[-.07,-.052],[-.058,-.056],[-.058,-.066],[-.074,-.062],[-.082,-.052]],ie=[[-.066,-.004],[-.062,-.044],[-.03,-.056],[.03,-.056],[.062,-.044],[.066,-.004],[.06,-.004],[.056,-.042],[.028,-.051],[-.028,-.051],[-.056,-.042],[-.06,-.004]];function I(e,t,n){let r=Math.sin(e[0]*127.1+e[1]*311.7+e[2]*74.7+t*45.3+n*19.1)*43758.5453;return r-Math.floor(r)}var L=`
varying vec3 vN; varying vec3 vV;
void main () {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalMatrix * normal;
  vV = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`,ae=`
varying vec3 vN; varying vec3 vV;
uniform vec3 uCore, uSkin;
uniform float uGlow;
void main () {
  float ndv = abs(dot(normalize(vN), normalize(vV)));
  // 유리 두께: 정면은 얇아 속이 비치고(코어), 스치는 각은 두꺼워 탁하다(스킨)
  vec3 c = mix(uSkin, uCore, pow(ndv, 1.25));
  gl_FragColor = vec4(c * uGlow, 1.0);
}`,oe=`
varying vec3 vN; varying vec3 vV;
uniform vec3 uCore, uRim;
uniform float uGlow;
void main () {
  float ndv = abs(dot(normalize(vN), normalize(vV)));
  // 지수 0.55 — 코어를 좁게 잡으면 실루엣 안쪽까지 순백이 유지돼 롤오프가 안 보인다
  vec3 c = mix(uRim, uCore, pow(ndv, 0.55));
  gl_FragColor = vec4(c * uGlow, 1.0);
}`,se=`
varying vec3 vW; varying vec3 vApex; varying vec3 vAxis; varying vec3 vUp;
void main () {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vW = wp.xyz;
  // 셸에는 스케일이 없다(holder 는 position+lookAt 뿐) — 축·길이가 월드에서 그대로 보존된다
  vApex = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vAxis = normalize((modelMatrix * vec4(0.0, 0.0, 1.0, 0.0)).xyz);
  vUp = normalize((modelMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`,ce=`
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
}`;function le(e,t){return new f({vertexShader:L,fragmentShader:ae,fog:!1,uniforms:{uCore:{value:new r().fromArray(e)},uSkin:{value:new r().fromArray(t)},uGlow:{value:1}}})}function R(e,t){return new f({vertexShader:L,fragmentShader:oe,fog:!1,uniforms:{uCore:{value:new r().fromArray(e)},uRim:{value:new r().fromArray(t)},uGlow:{value:1}}})}function z(e,t,n,i){return new f({defines:{SHAFT_STEPS:32},vertexShader:se,fragmentShader:ce,transparent:!0,depthWrite:!1,depthTest:!1,blending:2,side:1,fog:!1,uniforms:{uColor:{value:new r().fromArray(e)},uIntensity:{value:t},uLen:{value:n},uCosOuter:{value:i},uGain:{value:17},uFall:{value:1.85},uMote:{value:.9},uNoiseScale:{value:1/.3},uFlowScale:{value:1/.16},uMoteScale:{value:1/.24},uEdgeWarp:{value:.036},uFogK:{value:.042},uTime:{value:0},uWind:{value:new r(.05,.02,.03)},uSlatFreq:{value:0},uSlatPhase:{value:0},uSlatDepth:{value:0},uSceneDepth:{value:null},uResolution:{value:new o(1280,720)},uSoft:{value:0},uSoftFade:{value:.26},uShadowMap:{value:null},uShadowMat:{value:new s},uShadowOn:{value:0},uShadowBias:{value:-.0012}}})}function B(t,n,r,i){let a=new d(i*1.32,r,32,1,!1);a.translate(0,-r*.5,0),a.rotateX(-Math.PI*.5);let o=r/Math.sqrt(r*r+i*i),s=new e(a,z(t,n,r,o));return s.frustumCulled=!1,s.renderOrder=8,s.castShadow=!1,s.receiveShadow=!1,s.userData.noPrepass=!0,s}function V(t,n,r){let i=new c,a=[],o=[],s=()=>{let e=R([(n[0]*.55+.45)*r,(n[1]*.55+.45)*r,(n[2]*.55+.45)*r],[n[0]*r*.46,n[1]*r*.28,n[2]*r*.14]);return a.push(e),e},l=(e,t=1)=>{let i=e*t,a=le([n[0]*r*e,n[1]*r*e,n[2]*r*e],[n[0]*r*i*.22,n[1]*r*i*.24,n[2]*r*i*.3]);return o.push(a),a},d=(t,n,r=0,a=0,o=0)=>{let s=new e(t,n);return s.position.set(r,a,o),s.castShadow=!1,s.receiveShadow=!1,i.add(s),s};if(t===`sconce`){let e=I(n,r,1),t=I(n,r,2),i=I(n,r,3),a=.126+e*.022,o=Math.PI*(.58+t*.09);d(F(a,o),l(.55,.35+i*.65)).rotation.x=Math.PI,d(P(Math.sin(o)*a*1.02,.034),C(`brass.tarnished`),0,Math.cos(o)*a*-.78,0),d(M(.55),s(),0,-.05,0),d(N(.016,.1),C(`brass.tarnished`),0,.02,0)}else if(t===`chandelier`){let e=C(`brass.tarnished`);d(new _(.4,.016,8,48),e).rotation.x=Math.PI*.5,d(new _(.24,.012,8,40),e,0,.18,0).rotation.x=Math.PI*.5,d(N(.02,.42),e,0,.16,0);for(let e=0;e<8;e++){let t=e/8*Math.PI*2,n=e%2?.24:.4,r=e%2?.2:.02;d(M(.62),s(),Math.cos(t)*n,r,Math.sin(t)*n),d(F(.052,Math.PI*.5),l(.42),Math.cos(t)*n,r-.012,Math.sin(t)*n)}}else if(t===`desk`)d(F(.115,Math.PI*.6),l(.48)).rotation.x=Math.PI,d(M(.44),s(),0,-.04,0);else if(t===`ceiling`)if(n[2]>n[0]*.35){let e=I(n,r,4),t=C(`bakelite.black`);d(x(re,[[-.3,0,0],[.3,0,0]],{up:[0,1,0]}),t);for(let e of[-1,1])d(S(.01,.062,.16,.0025,1),t,e*.295,-.033,0),d(S(.016,.034,.026,.004,1),C(`brass.tarnished`),e*.282,-.03,0);d(x(ie,[[-.289,0,0],[.289,0,0]],{up:[0,1,0]}),l(.22,.55+e*.45)),d(new h(.019,.51,6,16),s(),0,-.049,0).rotation.z=Math.PI*.5;for(let e of[-.17,.17])d(S(.07,.006,.07,.002,1),C(`steel.galvanized`),e,.004,0)}else d(new g(.15,24,16),l(.62)),d(M(.5),s(),0,-.02,0);else if(t===`neon`){let e=new _(.34,.02,10,44,Math.PI*1.45);d(e,s()).rotation.z=Math.PI*.28,d(new h(.02,.42,6,14),s(),.3,-.26,0).rotation.z=.35}else if(t===`bare-bulb`)d(M(1),s()),d(N(.006,.46),C(`bakelite.black`),0,.125,0);else if(t===`elevator`)d(new u(.2,32),l(.5)).rotation.x=Math.PI*.5,d(P(.212,.026),C(`brass.polished`),0,-.006,0);else return null;return i.userData.emissive=a,i.userData.shades=o,i}function H(e,t,n,r){if(e){for(let t of e.userData.emissive)t.uniforms.uGlow.value=r;for(let t of e.userData.shades)t.uniforms.uGlow.value=r}}var U=.035,ue=.055,W={sconce:{type:`spot`,kelvin:2700,lumens:420,radius:5.2,angle:1.15,penumbra:.78,flick:`incandescent`,shaft:.18,shadow:!0,dir:[0,-.55,.4],prio:1,hot:2.6,fill:.014,up:.8,upAngle:1.3,upRadius:3.6},chandelier:{type:`point`,kelvin:2550,lumens:2400,radius:12,flick:`incandescent`,shaft:0,shadow:!1,prio:1.5,hot:2.8},desk:{type:`spot`,kelvin:2700,lumens:560,radius:4.2,angle:.98,penumbra:.55,flick:`incandescent`,shaft:.14,shadow:!0,dir:[0,-1,0],prio:1.1,hot:2.4},ceiling:{type:`spot`,kelvin:4500,lumens:2200,radius:8.5,angle:1.32,penumbra:.62,flick:`fluorescent`,shaft:.15,shadow:!0,dir:[0,-1,0],prio:1.2,hot:3.2,up:.17,upAngle:1.36,upRadius:4.6,upY:-.32,spd:[.93,1.053,1.012]},neon:{type:`point`,kelvin:6200,lumens:460,radius:5.5,flick:`neon`,shaft:0,shadow:!1,prio:.85,hot:5},moon:{type:`dir`,kelvin:8e3,lux:15,shadow:!0,flick:`none`,dir:[.42,-.6,-.68],prio:4,hot:0},street:{type:`spot`,kelvin:2050,lumens:12e3,radius:30,angle:.9,penumbra:.42,flick:`sodium`,shaft:.5,shadow:!0,dir:[0,-1,0],prio:1.8,hot:0},"bare-bulb":{type:`point`,kelvin:2400,lumens:280,radius:4.2,flick:`voltage`,shaft:0,shadow:!1,prio:.9,hot:4},elevator:{type:`spot`,kelvin:3200,lumens:780,radius:4.8,angle:1.24,penumbra:.86,flick:`hum`,shaft:.22,shadow:!0,dir:[0,-1,0],prio:1.05,hot:2.8}},G=[.2126,.7152,.0722];function de(e,t){if(!t)return e;let n=[e[0]*t[0],e[1]*t[1],e[2]*t[2]],r=G[0]*e[0]+G[1]*e[1]+G[2]*e[2],i=G[0]*n[0]+G[1]*n[1]+G[2]*n[2],a=i>1e-6?r/i:1;return[n[0]*a,n[1]*a,n[2]*a]}var K=e=>{let t=Math.sin(e*127.1+311.7)*43758.5453;return t-Math.floor(t)};function fe(e,t,n,r){if(!r||e===`none`)return 1;let i=n*6.2831;if(e===`incandescent`)return 1+r*(.55*Math.sin(t*.63+i)+.3*Math.sin(t*1.87+i*2.1)+.15*Math.sin(t*4.31+i*3.7));if(e===`voltage`){let e=.5*Math.sin(t*.9+i)+.5*Math.sin(t*2.7+i*1.7),a=K(Math.floor(t*2.3+n*31))<.09?-1.9:0;return b(1+r*(e+a*(.5+.5*Math.sin(t*19+i))),.05,1.6)}if(e===`fluorescent`){let e=.5+.5*Math.sin(t*45.9+i),a=Math.floor(t*9+n*53),o=K(a),s=o<.055?.18+.55*K(a+7):1,c=o>.985?.62:1;return b((1-r*.55*e)*s*c,.03,1.3)}if(e===`neon`){let e=.5+.5*Math.sin(t*81.7+i),a=K(Math.floor(t*1.7+n*17))<.05?.1:1;return b((1-r*.4*e)*a,.02,1.2)}return e===`sodium`?1+r*.35*Math.sin(t*.31+i):e===`hum`?1+r*(.6*Math.sin(t*7.3+i)+.4*Math.sin(t*2.1+i*3)):1}function pe(e,t,n){return e.type===`dir`?t:e.type===`spot`?t/(2*Math.PI*(1-Math.cos(n))):t/(4*Math.PI)}var q={e:null,baker:null,field:null,rain:null,pool:[],queue:[],mood:A,rig:null,frame:0,depth:null,res:new o(1280,720),atmo:null,probe:null,seed:0,top:[],groundY:0};function J(){return O[q.mood]||O[`lobby-night`]}function me(){return q.mood}function Y(e={}){let n=e.sky||[.03,.03,.035],r=e.ground||[.012,.01,.009];return q.rig||(q.rig={hemi:new t(16777215,16777215,1)},q.rig.hemi.name=`atmo.hemi`,q.rig.hemi.position.set(0,6,0),q.e&&q.e.scene.add(q.rig.hemi)),q.rig.hemi.color.setRGB(n[0],n[1],n[2]),q.rig.hemi.groundColor.setRGB(r[0],r[1],r[2]),q.rig.hemi.intensity=e.intensity??.5,q.rig}function X(e){let t=q.e.scene;t.add(e.light),e.light.target&&t.add(e.light.target),e.fixture&&t.add(e.fixture),e.holder&&t.add(e.holder),e.fill&&t.add(e.fill),e.up&&(t.add(e.up),t.add(e.up.target));let n=q.e.quality;if(e.wantShadow){let t=e.type===`dir`?n.shadowMap:Math.min(n.shadowMap,1024);e.light.shadow.mapSize.set(t,t)}e.up&&e.up.shadow.mapSize.set(n.shadowMap,n.shadowMap)}function Z(e,t={}){let n=W[e]||W.sconce,i=t.pos||[0,2.4,0],o=t.kelvin??n.kelvin,s=de(ee(o),t.spd??n.spd),c=t.angle??n.angle??1,u=t.lumens??t.lux??n.lumens??n.lux??500,d=t.radius??n.radius??6,f=pe(n,u,c)*U,p=q.seed=(q.seed+.6180339887)%1,h;n.type===`dir`?(h=new a(16777215,f),h.shadow.camera.left=-(t.extent??24),h.shadow.camera.right=t.extent??24,h.shadow.camera.top=t.extent??24,h.shadow.camera.bottom=-(t.extent??24),h.shadow.camera.near=.5,h.shadow.camera.far=120):n.type===`spot`?(h=new v(16777215,f,d,c,t.penumbra??n.penumbra??.6,2),h.shadow.camera.near=.08,h.shadow.camera.far=d*1.25):h=new m(16777215,f,d,2),h.color.setRGB(s[0],s[1],s[2]),h.position.set(i[0],i[1],i[2]),h.name=t.name||`atmo.${e}`;let g=(t.castShadow??n.shadow)&&n.type!==`point`;h.castShadow=!1,g&&(h.shadow.bias=-9e-4,h.shadow.normalBias=.013,h.shadow.radius=2,h.shadow.blurSamples=8,h.shadow.autoUpdate=!1);let _=new r;if(t.target)_.fromArray(t.target);else{let e=new r().fromArray(t.dir||n.dir||[0,-1,0]);e.lengthSq()<1e-6&&e.set(0,-1,0),_.copy(h.position).add(e.normalize().multiplyScalar(Math.max(d*.5,1)))}h.target&&h.target.position.copy(_);let y=t.hot??n.hot??3,x=t.fixture===!1||y<=0?null:V(e,s,y);x&&(x.position.set(i[0],i[1],i[2]),t.fixtureRot&&x.rotation.set(t.fixtureRot[0],t.fixtureRot[1],t.fixtureRot[2]),x.name=`${h.name}.body`);let S=null,C=t.fill??n.fill??0;x&&C>0&&(S=new m(16777215,u/(4*Math.PI)*U*C,t.fillRadius??.26,2),S.color.setRGB(s[0],s[1],s[2]),S.position.set(i[0],i[1]+(t.fillY??-.05),i[2]),S.castShadow=!1,S.name=`${h.name}.fill`);let w=null,T=t.up??n.up??0;if(T>0&&n.type!==`dir`){let e=Math.min(t.upAngle??n.upAngle??1.3,1.5),r=t.upRadius??n.upRadius??Math.max(d*.4,2.5);w=new v(16777215,f*T,r,e,t.upPenumbra??.94,2),w.color.setRGB(s[0],s[1],s[2]),w.position.set(i[0],i[1]+(t.upY??n.upY??.04),i[2]),w.target.position.set(i[0],i[1]+2,i[2]),w.name=`${h.name}.up`,w.castShadow=!1,w.shadow.camera.near=.05,w.shadow.camera.far=r*1.2,w.shadow.bias=-2e-4,w.shadow.normalBias=.004,w.shadow.radius=.6,w.shadow.blurSamples=8,w.shadow.autoUpdate=!1}let E=null,D=null,O=(t.shaft??n.shaft??0)*ue*b(Math.sqrt(f/25),.45,1.15);if(O>0&&n.type===`spot`){let e=Math.min(t.shaftLen??d*.42,7),n=Math.min(t.shaftAngle??c*.4,.42);if(D=B(s,O,e,Math.tan(n)*e*.98),E=new l,E.position.copy(h.position),E.lookAt(_),E.add(D),t.slats){let e=D.material.uniforms;e.uSlatFreq.value=t.slats.count??28,e.uSlatPhase.value=t.slats.phase??0,e.uSlatDepth.value=t.slats.depth??.85}}let k={kind:e,light:h,fixture:x,holder:E,shaft:D,fill:S,up:w,wantShadow:g,type:n.type,col:s,hot:y,radius:d,prio:n.prio??1,seed:p,baseI:f,fillBase:S?S.intensity:0,upBase:w?w.intensity:0,shape:t.flickerShape||n.flick,amt:t.flicker??(n.flick===`none`?0:.05),shaftBase:O,k:-1,packet:null};return q.pool.push(k),q.e?X(k):q.queue.push(k),{light:h,helperMesh:x,shaft:D,target:h.target||null,dispose:()=>Q(k)}}function Q(e){let t=q.pool.indexOf(e);t>=0&&q.pool.splice(t,1),q.top=q.top.filter(t=>t!==e);for(let t of[e.light,e.light.target,e.fixture,e.holder,e.fill,e.up,e.up?.target])t?.parent?.remove(t);e.light.shadow?.dispose?.(),e.light.dispose?.(),e.fill?.dispose?.(),e.up?.shadow?.dispose?.(),e.up?.dispose?.(),e.shaft?.geometry.dispose(),e.shaft?.material.dispose(),e.fixture?.traverse(e=>{e.geometry?.dispose(),e.material?.dispose()})}function he(e){let t=q.atmo||={};t.density=e.fog.density,t.heightFalloff=e.fog.heightFalloff,t.color=e.fog.color.slice(),t.scattering=e.fog.scattering,t.anisotropy=e.fog.anisotropy,t.windDir=e.fog.windDir.slice(),t.baseHeight=e.fog.baseHeight??0,t.intensity=e.look.volumetricIntensity,t.mood=q.mood,t.sunDir=e.ibl.sun?e.ibl.sun.dir.slice():[0,1,0],t.sunColor=e.ibl.sun?e.ibl.sun.col.slice():[0,0,0],window.__ATMO__=t}function ge(e){let t=q.e?.get(`pipeline`)?.effects?.volumetric;if(!t||!t.params)return;let n=e.fog,r=t.params;r.extinct=n.density*(n.extinctK??2.4),r.scatter=r.extinct*b(n.albedo??.72,.02,.95),r.g=n.anisotropy,r.ambient=n.ambient??.42,r.fogY=q.groundY+(n.baseHeight??0),r.fogFall=Math.max(n.heightFalloff,.02),r.nScale=n.noiseScale??.085,r.spark=n.spark??3.2,r.sparkScale=n.sparkScale??1.35,r.maxDist=n.maxDist??58,t.fogColor?.setRGB(n.color[0],n.color[1],n.color[2]);let i=t.mMarch?.uniforms;if(!i)return;let a={uExtinct:r.extinct,uScatter:r.scatter,uG:r.g,uAmbient:r.ambient,uFogY:r.fogY,uFogFall:r.fogFall,uNScale:r.nScale,uSpark:r.spark,uSparkScale:r.sparkScale,uMaxDist:r.maxDist};for(let e in a)i[e]&&(i[e].value=a[e])}function $(e){q.mood=O[e]?e:A;let t=J();if(he(t),!q.e)return q.mood;let r=q.e,i=t.fog.color;(!r.scene.fog||!r.scene.fog.isFogExp2)&&(r.scene.fog=new n(0,t.fog.density)),r.scene.fog.color.setRGB(i[0],i[1],i[2]),r.scene.fog.density=t.fog.density;let a=r.look;a.exposure=t.exposure,a.fogDensity=t.fog.density,a.fogColor=t.fog.color.slice();for(let e of[`lift`,`gamma`,`gain`,`saturation`,`contrast`,`halation`,`vignette`,`grainAmount`,`chromatic`,`volumetricIntensity`])t.look[e]!==void 0&&(a[e]=Array.isArray(t.look[e])?t.look[e].slice():t.look[e]);r.renderer.toneMappingExposure=t.exposure;let o=q.baker.bake(q.mood,t.ibl,r.quality.texRes>=2048?256:128);r.scene.environment=o,r.scene.environmentIntensity=t.envIntensity,r.scene.background=t.background?o:null,r.scene.backgroundIntensity=.9,r.scene.backgroundBlurriness=.02,Y(t.hemi),q.field?.applyMood(t),q.rain?.applyMood(t,q.groundY),ge(t);for(let e of q.pool)e.shaft&&e.shaft.material.uniforms.uWind.value.fromArray(t.fog.windDir).multiplyScalar(2.5);return q.mood}function _e(){let e=q.e,t=e.camera,n=e.quality.maxLights??16,r=e.quality.name===`cinematic`?4:e.quality.name===`high`?3:2,i=e.quality.name===`cinematic`?2:1;for(let e of q.pool){if(e.type===`dir`){e.score=1e9,e.dist=0;continue}e.dist=e.light.position.distanceTo(t.position),e.score=e.prio*(e.radius+2)/(e.dist+1)}let a=e.quality.name===`cinematic`?4:e.quality.name===`high`?2:1,o=q.pool.slice().sort((e,t)=>t.score-e.score),s=q.pool.filter(e=>e.up).sort((e,t)=>t.upBase/(t.dist+3)-e.upBase/(e.dist+3)),c=0,l=0,u=0;for(let e of o){let t=e.type===`dir`?1/0:e.radius*1.15+1.5,a=c<n&&e.dist<t;a&&(c+=1+ +!!e.fill+ +!!e.up),e.light.visible!==a&&(e.light.visible=a),e.holder&&(e.holder.visible=a),e.fill&&(e.fill.visible=a),e.up&&(e.up.visible=a),a&&e.wantShadow&&l<r?(e.light.castShadow||(e.light.castShadow=!0,e.light.shadow.needsUpdate=!0),e.light.shadow.autoUpdate=l<i,!e.light.shadow.autoUpdate&&q.frame%90==0&&(e.light.shadow.needsUpdate=!0),l++):e.light.castShadow&&(e.light.castShadow=!1)}for(let e of s)e.up.visible&&e.upBase>1e-4&&u<a?(e.up.castShadow||(e.up.castShadow=!0,e.up.shadow.needsUpdate=!0),u++):e.up.castShadow&&(e.up.castShadow=!1);q.top=o.filter(e=>e.light.visible&&e.type!==`dir`).slice(0,4)}function ve(e){let t=e.packet||={pos:e.light.position,dir:new r(0,-1,0),cos:-1,range:e.type===`dir`?0:e.radius,col:new r(e.col[0],e.col[1],e.col[2]),power:0};return e.light.isSpotLight&&(t.dir.copy(e.light.target.position).sub(e.light.position).normalize(),t.cos=Math.cos(e.light.angle)),t.power=e.light.intensity,t}function ye(){let e=q.e.get(`pipeline`);return(e?.ctx||e?.context)?.targets?.normal?.texture||null}var be={name:`atmosphere`,order:65,async init(e){q.e=e,q.baker=new ne(e.renderer),q.field=new w(e.quality),e.scene.add(q.field.group),q.rain=new E(e.quality),e.scene.add(q.rain.group),q.rig&&e.scene.add(q.rig.hemi);for(let e of q.queue)X(e);q.queue.length=0,e.bus.on(`room:changed`,({room:e})=>{let t=k[e];t&&t!==q.mood&&$(t)}),e.bus.on(`interrogation:start`,()=>$(`interrogation`)),e.bus.on(`qa:state`,t=>{t&&(t.scene===`atmo-probe`?(q.probe||=T(e,Z),q.probe.visible=!0,q.groundY=D,q.probe.userData.setRig(O[t.mood]?t.mood:A)):q.probe&&(q.probe.visible=!1,q.probe.userData.setRig(null),q.groundY=0),$(t.mood||q.mood))}),$(q.mood),e.renderer.getDrawingBufferSize(q.res)},update(e,t){let n=q.e;if(!n)return;let r=n.time;q.frame++;let i=J().shaftScale;for(let e of q.pool){if(e.light.visible){let t=fe(e.shape,r,e.seed,e.amt);Math.abs(t-e.k)>.002&&(e.light.intensity=e.baseI*t,e.fill&&(e.fill.intensity=e.fillBase*t),e.up&&(e.up.intensity=e.upBase*t),H(e.fixture,e.col,e.hot,b(t,.02,2)),e.shaft&&(e.shaft.material.uniforms.uIntensity.value=e.shaftBase*i*t),e.k=t)}e.shaft&&(e.shaft.material.uniforms.uTime.value=r)}q.frame%12==1&&(_e(),q.depth=ye(),n.renderer.getDrawingBufferSize(q.res));let a=q.top.map(ve),o=n.camera.fov*Math.PI/180,s=q.res.y/(2*Math.tan(o*.5));q.field.update(r,n.camera,a,q.depth,q.res,s,n.size?.dpr??2),q.rain.update(r,n.camera,a,q.depth,q.res,s);for(let e of q.pool){if(!e.shaft)continue;let t=e.shaft.material.uniforms;t.uSceneDepth.value=q.depth,t.uSoft.value=+!!q.depth,t.uResolution.value.copy(q.res);let n=e.light.castShadow?e.light.shadow?.map?.texture:null;t.uShadowOn.value=+!!n,n&&(t.uShadowMap.value=n,t.uShadowMat.value.copy(e.light.shadow.matrix),t.uShadowBias.value=-Math.abs(e.light.shadow.bias??0)-9e-4)}q.atmo&&(q.atmo.time=r)},resize(e,t){q.e&&q.e.renderer.getDrawingBufferSize(q.res)},dispose(){q.baker?.dispose(),q.field?.dispose(),q.rain?.dispose(),q.pool.length=0}};export{$ as a,Z as i,be as n,me as r,Y as t};