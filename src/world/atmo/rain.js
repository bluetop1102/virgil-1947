// 비. 네 요소를 한 덩어리로 켠다 — 폭우가 씬을 "젖게" 만들지 못하면 파티클만 얹힌 것으로 읽힌다.
//   1) 스트릭   낙하속도 x 셔터시간으로 늘어난 빗줄기. 두께를 픽셀 단위로 고정한다(1~2px)
//   2) 임팩트   바닥 리플 데칼 + 튀어오르는 물방울
//   3) 렌즈     카메라 전면 물방울 판(광학 오염)
//   4) 습식     표면 러프니스 -0.4 / 반사 +0.6 (wetify)
//
// 두께를 월드 반지름으로 주면 원경 빗줄기가 서브픽셀로 사라져 "2~3가닥"이 된다.
// 그래서 뷰스페이스에서 폭을 픽셀로 역산한다: wWorld = px * viewZ / pixScale.

import * as THREE from 'three'
import { rng, clamp } from '../../core/util.js'
import { LIGHT_PARS, SOFT_PARS, WRAP, commonUniforms, tune } from './particles.js'

// ── 스트릭 ───────────────────────────────────────────────────────────────
function streaks (count, box, seed, o = {}) {
  const r = rng(seed)
  const pos = new Float32Array(count * 4 * 3)
  const cor = new Float32Array(count * 4 * 2)
  const sd = new Float32Array(count * 4 * 3)
  const idx = new Uint32Array(count * 6)
  const C = [[-1, 0], [1, 0], [1, 1], [-1, 1]]
  for (let i = 0; i < count; i++) {
    const x = (r() - 0.5) * box[0], y = (r() - 0.5) * box[1], z = (r() - 0.5) * box[2]
    const s0 = r(), s1 = r(), s2 = r()
    for (let k = 0; k < 4; k++) {
      const v = i * 4 + k
      pos[v * 3] = x; pos[v * 3 + 1] = y; pos[v * 3 + 2] = z
      cor[v * 2] = C[k][0]; cor[v * 2 + 1] = C[k][1]
      sd[v * 3] = s0; sd[v * 3 + 1] = s1; sd[v * 3 + 2] = s2
    }
    const b = i * 4
    idx.set([b, b + 1, b + 2, b, b + 2, b + 3], i * 6)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('aCorner', new THREE.BufferAttribute(cor, 2))
  g.setAttribute('aSeed', new THREE.BufferAttribute(sd, 3))
  g.setIndex(new THREE.BufferAttribute(idx, 1))

  const u = commonUniforms(box)
  u.uSpeed = { value: o.speed ?? 16 }
  u.uShutter = { value: o.shutter ?? 0.048 }
  u.uPxWidth = { value: o.px ?? 1.5 }
  u.uHead = { value: o.head ?? 0.30 }
  u.uSoftFade.value = 0.35
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    uniforms: u,
    vertexShader: `
      attribute vec2 aCorner; attribute vec3 aSeed;
      uniform float uTime, uSpeed, uShutter, uPxWidth, uPix;
      uniform vec3 uBox, uCam, uWind;
      varying vec3 vLit; varying float vAlong; varying float vSide; varying float vZ;
      ${LIGHT_PARS}
      ${WRAP}
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
      }`,
    fragmentShader: `
      uniform float uOpacity, uHead; uniform vec3 uTint;
      varying vec3 vLit; varying float vAlong; varying float vSide; varying float vZ;
      ${SOFT_PARS}
      void main () {
        float across = smoothstep(1.0, 0.15, abs(vSide));
        float a = across * mix(uHead, 1.0, vAlong) * uOpacity * softFade(vZ);
        gl_FragColor = vec4(uTint * (0.7 + vLit * 1.8), a);
      }`
  })
  return tune(new THREE.Mesh(g, m))
}

// ── 바닥 임팩트: 확산 리플 데칼 ──────────────────────────────────────────
function ripples (count, box, seed) {
  const r = rng(seed)
  const pos = new Float32Array(count * 4 * 3)
  const cen = new Float32Array(count * 4 * 2)
  const sd = new Float32Array(count * 4 * 2)
  const idx = new Uint32Array(count * 6)
  const C = [[-1, -1], [1, -1], [1, 1], [-1, 1]]
  for (let i = 0; i < count; i++) {
    const cx = (r() - 0.5) * box[0], cz = (r() - 0.5) * box[2]
    const s0 = r(), s1 = 0.55 + r() * 1.15
    for (let k = 0; k < 4; k++) {
      const v = i * 4 + k
      pos[v * 3] = C[k][0]; pos[v * 3 + 1] = 0; pos[v * 3 + 2] = C[k][1]
      cen[v * 2] = cx; cen[v * 2 + 1] = cz
      sd[v * 2] = s0; sd[v * 2 + 1] = s1
    }
    const b = i * 4
    idx.set([b, b + 1, b + 2, b, b + 2, b + 3], i * 6)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('aCenter', new THREE.BufferAttribute(cen, 2))
  g.setAttribute('aSeed', new THREE.BufferAttribute(sd, 2))
  g.setIndex(new THREE.BufferAttribute(idx, 1))
  const u = commonUniforms(box)
  u.uMaxR = { value: 0.30 }
  u.uGroundY = { value: 0 }
  u.uSoftFade.value = 0.25
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    uniforms: u,
    vertexShader: `
      attribute vec2 aCenter; attribute vec2 aSeed;
      uniform float uTime, uMaxR, uGroundY;
      uniform vec3 uBox, uCam;
      varying vec2 vUv; varying float vLife; varying vec3 vLit; varying float vZ;
      ${LIGHT_PARS}
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
      }`,
    fragmentShader: `
      uniform float uOpacity; uniform vec3 uTint;
      varying vec2 vUv; varying float vLife; varying vec3 vLit; varying float vZ;
      ${SOFT_PARS}
      void main () {
        float r = length(vUv);
        // 두 겹 링 — 바깥 파면이 앞서고 안쪽이 뒤따른다
        float ring = smoothstep(0.55, 0.88, r) * smoothstep(1.02, 0.90, r);
        float ring2 = smoothstep(0.20, 0.44, r) * smoothstep(0.62, 0.48, r) * 0.55;
        float crown = smoothstep(0.34, 0.0, r) * (1.0 - smoothstep(0.0, 0.22, vLife));
        float a = (ring + ring2 + crown * 0.9) * pow(1.0 - vLife, 1.5) * uOpacity * softFade(vZ);
        gl_FragColor = vec4(uTint * (0.9 + vLit * 1.4), a);
      }`
  })
  return tune(new THREE.Mesh(g, m))
}

// ── 바닥 임팩트: 튀어오르는 물방울 ───────────────────────────────────────
function spray (count, box, seed) {
  const r = rng(seed)
  const p = new Float32Array(count * 3)
  const sd = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    p[i * 3] = (r() - 0.5) * box[0]
    p[i * 3 + 1] = 0
    p[i * 3 + 2] = (r() - 0.5) * box[2]
    sd[i * 3] = r(); sd[i * 3 + 1] = r(); sd[i * 3 + 2] = r()
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(p, 3))
  g.setAttribute('aSeed', new THREE.BufferAttribute(sd, 3))
  const u = commonUniforms(box)
  u.uGroundY = { value: 0 }
  u.uSize = { value: 0.010 }
  u.uSoftFade.value = 0.2
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    uniforms: u,
    vertexShader: `
      attribute vec3 aSeed;
      uniform float uTime, uGroundY, uSize, uPix;
      uniform vec3 uBox, uCam;
      varying vec3 vLit; varying float vLife; varying float vZ;
      ${LIGHT_PARS}
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
      }`,
    fragmentShader: `
      uniform float uOpacity; uniform vec3 uTint;
      varying vec3 vLit; varying float vLife; varying float vZ;
      ${SOFT_PARS}
      void main () {
        float r = length(gl_PointCoord - 0.5) * 2.0;
        float a = smoothstep(1.0, 0.1, r) * (1.0 - vLife) * uOpacity * softFade(vZ);
        gl_FragColor = vec4(uTint * (0.8 + vLit * 1.6), a);
      }`
  })
  return tune(new THREE.Points(g, m))
}

// ── 렌즈 물방울 ─────────────────────────────────────────────────────────
// 카메라 전면 0.3m에 붙는 판. 광학 오염이므로 깊이 테스트를 끄고 가장 마지막에 그린다.
function lensLayer () {
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false, fog: false,
    blending: THREE.NormalBlending,
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uTint: { value: new THREE.Vector3(0.55, 0.62, 0.78) },
      uAspect: { value: 1.78 }
    },
    vertexShader: `
      varying vec2 vUv;
      void main () {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
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
      }`
  })
  const o = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m)
  o.frustumCulled = false
  o.castShadow = false
  o.receiveShadow = false
  o.renderOrder = 40
  o.name = 'atmo.rain.lens'
  return o
}

// 젖은 표면. 라이브러리 재질은 공유 캐시라 절대 건드리지 않고 복제본만 적신다.
export function wetify (m, amt = 1) {
  const w = m.clone()
  w.roughness = clamp((m.roughness ?? 1) - 0.4 * amt, 0.03, 1)
  w.envMapIntensity = (m.envMapIntensity ?? 1) * (1 + 0.6 * amt)
  w.clearcoat = Math.max(m.clearcoat ?? 0, 0.9 * amt)
  w.clearcoatRoughness = clamp(0.05 + (1 - amt) * 0.3, 0.03, 0.5)
  w.color.multiplyScalar(1 - 0.30 * amt)
  w.name = `${m.name || 'mat'}.wet`
  return w
}

export class RainField {
  constructor (quality) {
    const s = Math.max(quality?.particles ?? 1, 0.05)
    this.group = new THREE.Group()
    this.group.name = 'atmo.rain'
    this.sys = {
      far: streaks(Math.round(15000 * s), [15, 11, 15], 613, { px: 1.4, speed: 17, shutter: 0.046 }),
      near: streaks(Math.round(1100 * s), [3.4, 3.2, 3.4], 811, { px: 4.0, speed: 17, shutter: 0.062, head: 0.12 }),
      ripple: ripples(Math.round(700 * s), [20, 1, 20], 449),
      spray: spray(Math.round(1600 * s), [16, 1, 16], 523)
    }
    for (const k of Object.keys(this.sys)) this.group.add(this.sys[k])
    this.lens = lensLayer()
    this.group.add(this.lens)
    this.base = { far: 0.62, near: 0.34, ripple: 0.75, spray: 0.60 }
    this.fwd = new THREE.Vector3()
  }

  applyMood (mood, groundY = 0) {
    const p = mood.particles
    const wRain = p.rain ?? 0
    const wSplash = p.splash ?? 0
    const w = { far: wRain, near: wRain, ripple: wSplash, spray: wSplash }
    for (const k of Object.keys(this.sys)) {
      const o = this.sys[k]
      o.visible = w[k] > 0.001
      o.material.uniforms.uOpacity.value = this.base[k] * w[k]
      o.material.uniforms.uWind.value.fromArray(mood.fog.windDir).multiplyScalar(1)
      const amb = mood.hemi.sky
      o.material.uniforms.uAmbient.value.set(amb[0] * 2.2, amb[1] * 2.2, amb[2] * 2.2)
    }
    // 빗줄기는 안개색이 아니라 하늘/광해가 실은 은빛이다 — 안개색을 쓰면 배경에 묻힌다
    const sky = mood.ibl.zenith
    const tint = new THREE.Vector3(
      0.42 + sky[0] * 6, 0.50 + sky[1] * 6, 0.66 + sky[2] * 6
    )
    this.sys.far.material.uniforms.uTint.value.copy(tint)
    this.sys.near.material.uniforms.uTint.value.copy(tint).multiplyScalar(0.85)
    this.sys.ripple.material.uniforms.uTint.value.copy(tint).multiplyScalar(0.60)
    this.sys.spray.material.uniforms.uTint.value.copy(tint).multiplyScalar(0.75)
    this.lens.material.uniforms.uTint.value.copy(tint)
    this.lens.material.uniforms.uOpacity.value = (p.lens ?? wRain) * 0.85
    this.lens.visible = this.lens.material.uniforms.uOpacity.value > 0.001
    this.setGround(groundY)
  }

  setGround (y) {
    this.sys.ripple.material.uniforms.uGroundY.value = y
    this.sys.spray.material.uniforms.uGroundY.value = y
  }

  update (time, cam, lights, depth, res, pixScale) {
    for (const k of Object.keys(this.sys)) {
      const u = this.sys[k].material.uniforms
      u.uTime.value = time
      u.uCam.value.copy(cam.position)
      u.uPix.value = pixScale
      u.uSceneDepth.value = depth
      u.uSoft.value = depth ? 1 : 0
      u.uResolution.value.copy(res)
      for (let i = 0; i < 4; i++) {
        const l = lights[i]
        if (!l) { u.uLC.value[i].set(0, 0, 0, 0); continue }
        u.uLP.value[i].set(l.pos.x, l.pos.y, l.pos.z, l.range)
        u.uLC.value[i].set(l.col.x, l.col.y, l.col.z, l.power)
        u.uLD.value[i].set(l.dir.x, l.dir.y, l.dir.z, l.cos)
      }
    }
    if (!this.lens.visible) return
    const d = 0.30
    this.fwd.set(0, 0, -1).applyQuaternion(cam.quaternion)
    this.lens.position.copy(cam.position).addScaledVector(this.fwd, d)
    this.lens.quaternion.copy(cam.quaternion)
    const h = 2 * d * Math.tan(cam.fov * Math.PI / 360) * 1.08
    this.lens.scale.set(h * cam.aspect, h, 1)
    this.lens.material.uniforms.uTime.value = time
    this.lens.material.uniforms.uAspect.value = cam.aspect
  }

  dispose () {
    for (const k of Object.keys(this.sys)) {
      this.sys[k].geometry.dispose()
      this.sys[k].material.dispose()
    }
    this.lens.geometry.dispose()
    this.lens.material.dispose()
  }
}
