// 볼류메트릭 레이마치 프래그먼트 빌더. 광원 개수·그림자 슬롯 수마다 셰이더를 새로 굽기 때문에
// 문자열 조립이 길어져 volumetric.js 가 500줄을 넘었다(계약 §11). 패스 본체와 커널을 갈라 둔다.
// VERT / DEPTH_HEAD 는 같은 패스의 업샘플·저해상 깊이 셰이더도 함께 쓰므로 여기서 내보낸다.

export const VERT = `
varying vec2 vUv;
void main () {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

export const DEPTH_HEAD = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uDepth;
uniform mat4 uInvProj;
vec3 vposAt (vec2 uv, float z) {
  vec4 c = uInvProj * vec4(uv * 2.0 - 1.0, z * 2.0 - 1.0, 1.0);
  return c.xyz / c.w;
}`

export function marchShader (lights, nShadow) {
  const n = lights.length
  let head = DEPTH_HEAD + `
uniform sampler2D uNoise;
uniform sampler3D uN3;
uniform mat4 uInvView;
uniform vec3 uCamPos, uFogColor;
uniform float uTime, uFrame, uHasNoise, uMaxDist, uDensity, uScatter, uExtinct;
uniform float uG, uAmbient, uFogY, uFogFall, uNScale, uSpark, uSparkScale, uFar, uBeam, uRim;
uniform float uSrcR2, uWisp, uWispScale, uBeamWarp, uEdgeSoft;
uniform vec2 uNearFade;
const float PI = 3.14159265359;
`
  if (n > 0) {
    head += `
uniform vec3 uLPos[${n}];
uniform vec3 uLDir[${n}];
uniform vec3 uLCol[${n}];
uniform vec4 uLParam[${n}];
uniform vec4 uLParam2[${n}];
`
  }
  if (nShadow > 0) {
    head += `
uniform sampler2D uShadow[${nShadow}];
uniform mat4 uShadowMat[${nShadow}];
float vsm (sampler2D map, vec4 sc, float bias, float inten) {
  vec3 c = sc.xyz / sc.w;
  if (c.x < 0.0 || c.x > 1.0 || c.y < 0.0 || c.y > 1.0 || c.z < 0.0 || c.z > 1.0) return 1.0;
  float z = c.z + bias;
  vec2 m = texture2D(map, c.xy).rg;
  float hard = step(z, m.x);
  if (hard >= 1.0) return 1.0;
  float v = max(m.y * m.y, 1e-7);
  float dd = z - m.x;
  float p = clamp((v / (v + dd * dd) - 0.3) / 0.65, 0.0, 1.0);
  return mix(1.0, max(hard, p), inten);
}
`
  }

  head += `
float blue (float o) {
  vec2 fc = gl_FragCoord.xy + o * 23.0;
  float nz = uHasNoise > 0.5
    ? texture2D(uNoise, fract(fc / 64.0)).x
    : fract(52.9829189 * fract(dot(fc, vec2(0.06711056, 0.00583715))));
  return fract(nz + uFrame * 0.61803399);
}
float hg (float ct) {
  float g2 = uG * uG;
  return (1.0 - g2) / (4.0 * PI * pow(max(1.0 + g2 - 2.0 * uG * ct, 1e-4), 1.5));
}
// 고도 폴오프 × 2옥타브 이류 노이즈. 안개가 균일하면 D8 실격이다.
float fogDensity (vec3 wp) {
  float h = exp(-max(wp.y - uFogY, 0.0) * uFogFall);
  vec3 d1 = vec3(uTime * 0.013, uTime * 0.021, uTime * -0.009);
  vec3 d2 = vec3(uTime * -0.028, uTime * 0.006, uTime * 0.017);
  float a = texture(uN3, wp * uNScale + d1).r;
  float b = texture(uN3, wp * uNScale * 2.7 + d2).r;
  return uDensity * h * clamp(0.30 + 1.45 * (a * 0.68 + b * 0.32), 0.0, 2.2);
}
// 광축 안의 밀도 얼룩. fogDensity 에 얼룩을 넣는 방식은 소광과 산란에 동시에 걸려 적분에서
// 상쇄된다 — uNScale 을 0.10 → 1.60 으로 16배 흔들어도 인스캐터 델타의 sd/mean 이 0.58 →
// 0.58 로 불변이었다(실측). 눈에 보이는 얼룩은 "총 밀도"가 아니라 "빛을 받는 입자량"의
// 변주이므로 산란 항에만 건다. 광축 밖은 lit≈0 이라 이 항이 베일을 늘리지 않는다.
// 3옥타브. 2옥타브(1.8m / 0.78m)만으로는 광축을 가로지르는 1~2m 경로에 얼룩이 한두 개라
// 스캔라인 프로파일이 매끈한 종형으로 나온다 — 밀도차가 아니라 그라디언트로 읽힌다.
// 0.32m 옥타브를 얹어야 빔 폭(약 0.5~1m) 안에 서너 번의 결이 실린다.
float wisp (vec3 wp) {
  vec3 d1 = vec3(uTime * -0.011, uTime * 0.017, uTime * 0.008);
  vec3 d2 = vec3(uTime * 0.022, uTime * -0.007, uTime * -0.013);
  vec3 d3 = vec3(uTime * -0.031, uTime * 0.026, uTime * 0.019);
  float a = texture(uN3, wp * uWispScale + d1).r;
  float b = texture(uN3, wp * uWispScale * 2.3 + d2).r;
  float c = texture(uN3, wp * uWispScale * 5.6 + d3).r;
  return max(1.0 + uWisp * (a * 0.50 + b * 0.30 + c * 0.20 - 0.5) * 2.0, 0.0);
}
// 셰이드 개구의 요철. **월드 좌표 노이즈로는 원뿔 경계를 못 흔든다** — 경계를 스치는 시선은
// 경계면과 거의 나란히 2~4m 를 걷기 때문에 그 경로가 얼룩 여러 개를 지나고, 적분이 섭동을
// 평균내 화면 경계는 다시 매끈한 직선이 된다. 실측으로 확인했다: 특징 1.07m/0.42m 도,
// 5.3m 저주파도, 진폭을 ±0.3 까지 올려도 반치점 직선 피팅 잔차가 줄지 않았다.
//
// 광원에서 나가는 **방위각**의 함수로 바꾸면 한 광선 위에서 상수라 적분이 평균내지 못한다.
// 원뿔 단면 자체가 찌그러진 닫힌 곡선이 되므로 그 투영에는 직선이 존재할 수 없다.
// 물리적으로도 이쪽이 맞다 — 빔 경계의 요철은 공기가 아니라 셰이드 개구가 만든다.
float aperture (vec2 pol, float seed) {
  vec2 u = normalize(pol + vec2(1e-6));
  return texture(uN3, vec3(u * 0.07 + 0.5, seed)).r - 0.5;
}
`

  // 축 직교 프레임은 uLDir 만의 함수라 마치 루프 안에서 매번 만들 이유가 없다. 스텝 수(최대 64)
  // × 광원 수만큼 cross/normalize 를 아끼려고 main 진입부에서 한 번만 만든다.
  let frames = ''
  for (let i = 0; i < n; i++) {
    if (lights[i].type !== 1) continue
    frames += `  vec3 T1_${i} = normalize(cross(uLDir[${i}], abs(uLDir[${i}].y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
  vec3 T2_${i} = cross(uLDir[${i}], T1_${i});\n`
  }

  let body = ''
  for (let i = 0; i < n; i++) {
    const L = lights[i]
    const s = L.shadowIdx
    body += `\n  {\n`
    if (L.type === 0) {
      body += `    vec3 L = uLDir[${i}];\n    float att = 1.0;\n`
    } else {
      body += `    vec3 dv = uLPos[${i}] - wp;
    float dist = length(dv);
    vec3 L = dv / max(dist, 1e-4);
    // 점광원 1/d²을 그대로 쓰면 기구 바로 옆 샘플의 att가 100배까지 튀어, 화면 밖에 있는
    // 근거리 벽등 하나가 프레임 가장자리를 통째로 들어올린다(실측: 좌측 4열 +133%).
    // 실제 기구는 반경 uSrcR 의 유백유리 사발이라 표면 안쪽에서 조도가 포화한다 — 그 유한
    // 크기를 거리에 더해 근접 특이점만 없앤다. 먼 거리에서는 sqrt(d²+r²)≈d 라 광축은 그대로다.
    float dS = sqrt(dist * dist + uSrcR2);
    float att = 1.0 / max(pow(dS, uLParam[${i}].z), 0.01);
    float rng4 = uLParam[${i}].y;
    if (rng4 > 0.0) { float q = clamp(1.0 - pow(dist / rng4, 4.0), 0.0, 1.0); att *= q * q; }\n`
      if (L.type === 1) {
        // 스팟 콘은 표면 조명용 톱햇이라 공기에 그대로 쓰면 광축이 안 생긴다. 세실의 벽등은
        // 반각 68°(=137° 원뿔)라 폭 2.8m 복도에서는 "원뿔"이 복도보다 커져 화면 전체를
        // 균일하게 덮는다(G2 6점 = 균일 안개 오버레이). 실제 기구는 셰이드 때문에 축상이
        // 가장 밝고 림으로 갈수록 급감하는 배광(IES)을 가지므로, 콘 게이트에 코사인멱
        // 배광을 곱해 광축 코어만 남긴다. 표면 조명은 three가 따로 계산하므로 영향 없다.
        // 콘 림을 uRim 으로 좁힌다. three 의 penumbra 0.8 은 표면 조명용이라 outer→inner 램프가
        // 30° 넘게 벌어지고, 공기에 그대로 쓰면 경계 없는 그라디언트가 된다 — 광축이 아니라 베일이다.
        // uRim=1 이면 기존 동작과 동일하고, 낮출수록 원뿔에 눈에 보이는 모서리가 생긴다.
        // 배광 등고선을 각도 영역에서 흔든다. pow(ct, uBeam) 은 exp(-uBeam·θ²/2) 와 같은
        // 곡선이지만 θ 를 직접 쥘 수 있어야 등고선을 밀 수 있다 — 세기에 곱하던 예전 섭동은
        // 지수 70 을 이기지 못했다(진폭 ±15% ⇒ 각도로 ±0.5°, 화면 3px. 실측 프로파일에서
        // 오른쪽 경계가 여전히 10px 절벽이었다). 고정 원뿔의 투영은 언제나 직선이므로,
        // 직선을 없애려면 등고선 자체가 공간에서 구부러져야 한다.
        //
        // 섭동 진폭을 광원 거리로 키운다. 개구부 바로 아래는 조리개가 좁아 경계가 서고,
        // 멀어질수록 반그림자가 넓어진다 — 항 하나가 (a) 직선 파괴와 (b) 거리 기반 경계
        // 소프트닝을 동시에 낸다. 대칭 섭동이라 인스캐터 총량은 유지된다.
        body += `    float ct${i} = max(dot(L, uLDir[${i}]), 0.0);
    float ci${i} = mix(uLParam[${i}].w, uLParam2[${i}].x, uRim);
    float th${i} = acos(clamp(ct${i}, -1.0, 1.0));
    float ap${i} = aperture(vec2(dot(-L, T1_${i}), dot(-L, T2_${i})), ${(i * 0.37 + 0.13).toFixed(3)});
    th${i} *= 1.0 + ap${i} * uBeamWarp * mix(0.42, 1.0, clamp(dist * uEdgeSoft, 0.0, 1.0));
    float bp${i} = exp(-0.5 * uBeam * th${i} * th${i});
    att *= smoothstep(uLParam[${i}].w, ci${i}, cos(th${i})) * bp${i};\n`
      }
    }
    if (s >= 0) {
      body += `    if (att > 0.0001) att *= vsm(uShadow[${s}], uShadowMat[${s}] * vec4(wp, 1.0), uLParam2[${i}].z, uLParam2[${i}].w);\n`
    }
    body += `    lit += uLCol[${i}] * att * hg(dot(L, rdW));\n  }\n`
  }

  return head + `
void main () {
  float raw = texture2D(uDepth, vUv).x;
  vec3 Pv = vposAt(vUv, raw);
  vec3 rdV = normalize(vposAt(vUv, 1.0));
  vec3 rdW = normalize((uInvView * vec4(rdV, 0.0)).xyz);
  float sceneT = raw >= 0.999999 ? uMaxDist : length(Pv);
  float endT = min(sceneT, uMaxDist);
  float startT = 0.06;
  if (endT <= startT) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }

${frames}
  float jit = blue(0.0);
  vec3 accum = vec3(0.0);
  float trans = 1.0;
  float tPrev = startT;
  float span = endT - startT;

  for (int i = 1; i <= STEPS; i++) {
    float fi = float(i) / float(STEPS);
    float tNext = startT + span * (fi * fi * 0.62 + fi * 0.38);
    float dt = tNext - tPrev;
    float tS = tPrev + dt * jit;
    vec3 wp = uCamPos + rdW * tS;
    tPrev = tNext;

    // 안개 시작 거리. 렌즈 앞 1~3m 를 완전히 비워야 두 가지가 동시에 성립한다 —
    // (1) 근경에 우윳빛 베일이 안 생기고, (2) 그 몫만큼 소광을 올려도 되므로 복도 끝이
    // 인스캐터로 들뜨는 대신 투과율이 죽어 어둠으로 소멸한다. 균일 안개로는 둘을 같이 못 얻는다.
    float dens = fogDensity(wp) * smoothstep(uNearFade.x, uNearFade.y, tS);
    if (dens < 0.0025) continue;
    float sigE = dens * uExtinct;
    // 산란만 거리로 페이드한다(소광은 유지). 볼류메트릭이 복도 전장을 적분하면 시선이 모든
    // 벽등 콘을 관통해 원경이 균일하게 들뜬다 — 실측으로 복도 끝이 근경 벽의 69%까지 올라갔다.
    // 대기 원근은 scene.fog(FogExp2)가 어두운 안개색으로 담당하고, 볼류메트릭은 uMaxDist 안쪽의
    // 광축만 만든다. 소광을 같이 죽이면 깊이 단서가 끊기므로 sigS 에만 건다.
    float sigS = dens * uScatter * smoothstep(uMaxDist, uMaxDist * 0.55, tS);

    // 먼지 반짝임. 예전엔 sigS 를 통째로 키워 앰비언트 항까지 들어올렸고, 그래서 빛이 전혀 닿지
    // 않는 구석에도 같은 밀도로 알갱이가 떴다(오버레이로 읽히는 원인). 이제 광원 기여분에만 곱한다.
    float sp = texture(uN3, wp * uSparkScale + vec3(uTime * 0.02, uTime * -0.045, uTime * 0.011)).r;
    float spark = pow(smoothstep(0.68, 1.0, sp), 4.0) * uSpark;

    // 밀도 얼룩을 광원 루프보다 먼저 뽑는다 — 산란 세기와 빔 경계가 같은 난수를 공유해야
    // 얼룩과 실루엣이 따로 놀지 않는다.
    float wq = wisp(wp);

    vec3 lit = vec3(0.0);
${body}
    vec3 inScatter = uFogColor * uAmbient + lit * wq * (1.0 + spark);
    float et = exp(-sigE * dt);
    accum += trans * inScatter * sigS * (1.0 - et) / max(sigE, 1e-5);
    trans *= et;
    if (trans < 0.004) break;
  }
  gl_FragColor = vec4(accum, trans);
}`
}
