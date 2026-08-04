// 절차 IBL. HDR 파일 없이 셰이더로 그린 하늘/광해/실내 반사를 PMREM으로 굽는다.
// 무드마다 하나씩 구워 캐시한다 — 굽기는 setMood 시점에만 일어나고 프레임 비용은 0이다.

import * as THREE from 'three'

const VERT = `
varying vec3 vDir;
void main () {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

const FRAG = `
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
}`

export class IblBaker {
  constructor (renderer) {
    this.renderer = renderer
    this.pmrem = new THREE.PMREMGenerator(renderer)
    this.pmrem.compileCubemapShader()
    this.cache = new Map()

    this.mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uZenith: { value: new THREE.Vector3() },
        uHorizon: { value: new THREE.Vector3() },
        uGround: { value: new THREE.Vector3() },
        uGlow: { value: new THREE.Vector3() },
        uGlowPow: { value: 3.0 },
        uGlowHeight: { value: 0.5 },
        uStars: { value: 0 },
        uSeed: { value: 0 },
        uSunDir: { value: new THREE.Vector3(0, 1, 0) },
        uSunCol: { value: new THREE.Vector3() },
        uSunSharp: { value: 400 },
        uBlobDir: { value: [new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 1, 0)] },
        uBlobCol: { value: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] },
        uBlobSize: { value: [8, 8, 8, 8] },
        uBlobCount: { value: 0 }
      }
    })

    this.skyScene = new THREE.Scene()
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(60, 48, 32), this.mat)
    this.sky.frustumCulled = false
    this.skyScene.add(this.sky)
  }

  _apply (p) {
    const u = this.mat.uniforms
    u.uZenith.value.fromArray(p.zenith)
    u.uHorizon.value.fromArray(p.horizon)
    u.uGround.value.fromArray(p.ground)
    u.uGlow.value.fromArray(p.glow)
    u.uGlowPow.value = p.glowPow
    u.uGlowHeight.value = p.glowHeight
    u.uStars.value = p.stars || 0
    u.uSeed.value = p.seed || 0
    if (p.sun) {
      u.uSunDir.value.fromArray(p.sun.dir).normalize()
      u.uSunCol.value.fromArray(p.sun.col)
      u.uSunSharp.value = p.sun.sharp
    } else {
      u.uSunCol.value.set(0, 0, 0)
      u.uSunSharp.value = 400
    }
    const blobs = p.blobs || []
    u.uBlobCount.value = Math.min(blobs.length, 4)
    for (let i = 0; i < 4; i++) {
      const b = blobs[i]
      if (!b) continue
      u.uBlobDir.value[i].fromArray(b.dir).normalize()
      u.uBlobCol.value[i].fromArray(b.col)
      u.uBlobSize.value[i] = b.size
    }
  }

  // 무드 키로 캐시. 반환값은 PMREM 텍스처(CubeUVReflectionMapping)
  bake (key, preset, size = 256) {
    const hit = this.cache.get(key)
    if (hit) return hit.texture
    this._apply(preset)
    const rt = this.pmrem.fromScene(this.skyScene, 0.015, 0.1, 200, { size })
    rt.texture.name = `atmo.env.${key}`
    this.cache.set(key, rt)
    return rt.texture
  }

  dispose () {
    for (const rt of this.cache.values()) rt.dispose()
    this.cache.clear()
    this.pmrem.dispose()
    this.sky.geometry.dispose()
    this.mat.dispose()
  }
}
