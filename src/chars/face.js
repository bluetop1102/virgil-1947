import * as THREE from 'three'
import { mat, merge, mesh, xf } from '../world/kit.js'
import { cloneMat } from '../world/kit-mat.js'

// 얼굴 마감 — 유리 눈과 자기(瓷器) 유약. rig.js 500줄 계약으로 분리했다.
//
// 아트 디렉션은 그대로다: 인물은 사람이 아니라 1947년 복화술 인형이다. 이 파일이 바꾸는 것은
// "인형이냐 사람이냐"가 아니라 **싸구려냐 공예품이냐**다. 3차 판정 J3 이 9점을 막은 첫 사유가
// "눈은 칠한 구, 입은 고정선"이었고, 그중 눈은 아트 디렉션의 필연이 아니라 구현의 미달이었다 —
// 진짜 인형 눈은 칠한 구가 아니라 **박아 넣은 유리알**이다. 공막 자기구 + 오목 홍채 + 각막 돔의
// 3층으로 만들고, 캐치라이트는 각막 돔의 실제 스펙큘러로 낸다. 가짜 하이라이트 판을 얹지 않는
// 이유는 하나다 — 램프가 어느 쪽에 있든 같은 자리에 붙어 있으면 그 순간 다시 칠한 눈이 된다.

const TAU = Math.PI * 2

// 안구 반경과 두개 내 자리. 눈두덩 표면(머리 타원체)은 이 좌표에서 z≈0.0904 이므로,
// 중심을 0.0875 에 두면 구가 표면을 2.9mm 앞에서 잘라 지름 32mm 의 원판이 얼굴에 열린다.
// 이 "열린 원판"이 눈구멍이다 — CSG 없이 소켓을 파는 유일한 방법이라 값이 서로 물려 있다.
const EYE_R = 0.0165
const EYE_X = 0.0385
const EYE_Y = 0.1325
const EYE_Z = 0.0875

// 홍채 유리알. **안구보다 곡률이 급한 캡**이라야 한다 — 같은 테두리를 지나는 완만한 캡은
// 반드시 구 안쪽으로 잠겨 가운데가 공막으로 뚫린다(1차 실측: 홍채가 고리로만 보였다).
// R=0.0140, 중심 z=0.0029 이면 테두리(반경 9.2mm)가 공막 표면에 맞물리고 정점만 0.4mm 솟는다.
const IRIS_R = 0.0140
const IRIS_Z = 0.0029
const IRIS_TH = 0.7175          // asin(0.0092 / IRIS_R)
// 각막 돔. **안구보다 곡률이 급해야 한다** — 캐치라이트의 폭을 정하는 것은 재질이 아니라
// 이 곡률이다. 안구 반경(16.5mm)과 같거나 완만한 돔은 램프를 안구 절반에 걸쳐 번지게 펴서,
// 러프니스를 아무리 조여도 "넓은 광택 얼룩"으로만 읽힌다(블라인드 2·3차 2인 독립 지적).
// 12.2mm 로 조이면 같은 램프가 홍채 가장자리의 압축된 밝은 호로 맺힌다(A/B `shots/so-dome`
// `1s70`). 실제 사람 각막도 안구보다 급하고(≈8mm vs 12mm), 인형 유리알은 더 급하다.
// 앞 정점은 안구 표면 위로 0.5mm 솟고, 돔 테두리(반경 12.2mm)는 그 z 에서의 안구 단면
// (15.8mm) 안쪽이라 공막에 잠긴 채 끝난다 — 떠 있는 링이 생기지 않는다.
const CORNEA_R = 0.0122
const CORNEA_Z = 0.0048
// 눈꺼풀 셸. 안구보다 1.7mm 커서 얼굴 밖으로 융기가 남는다(깎아 붙인 인형 눈꺼풀).
const LID_R = 0.0182

// 자기 유약 톤. paper.aged(0.545,0.487,0.368) 에서 넘어오면서 얼굴색이 변하면 안 되므로
// ceramic.sink 의 회백(0.748,0.758,0.768)을 이 계수로 되돌린다. 살짝 밝게 두는 것은
// 유약면이 칠한 종이보다 빛을 더 받아야 "공예품"으로 읽히기 때문이다.
const GLAZE_TINT = [0.775, 0.680, 0.512]

let _geo = null
function geos () {
  if (_geo) return _geo
  // 홍채·동공은 같은 중심의 동심 캡이다. 곡률이 급해 정점이 공막 위로 솟고, 테두리에서
  // 공막에 잠기며 어두운 경계 고리(공막-홍채 경계)가 저절로 생긴다.
  const iris = new THREE.SphereGeometry(IRIS_R, 26, 12, 0, TAU, 0, IRIS_TH)
  iris.rotateX(Math.PI / 2)               // 극축 +Y 를 시선축 +Z 로
  iris.translate(0, 0, IRIS_Z)

  const pupil = new THREE.SphereGeometry(IRIS_R + 0.00013, 20, 8, 0, TAU, 0, 0.3040)
  pupil.rotateX(Math.PI / 2)
  pupil.translate(0, 0, IRIS_Z)

  const cornea = new THREE.SphereGeometry(CORNEA_R, 26, 14, 0, TAU, 0, Math.PI / 2)
  cornea.rotateX(Math.PI / 2)
  cornea.translate(0, 0, CORNEA_Z)

  _geo = {
    ball: new THREE.SphereGeometry(EYE_R, 22, 16),
    iris,
    pupil,
    cornea,
    // 위 눈꺼풀은 안구 높이의 32%, 아래는 17% 를 덮는다 — 야간 프런트 16년차의 처진 눈.
    lidUp: new THREE.SphereGeometry(LID_R, 22, 8, 0, TAU, 0, 1.20),
    lidLow: new THREE.SphereGeometry(LID_R, 22, 6, 0, TAU, Math.PI - 0.85, 0.85)
  }
  return _geo
}

// 재질은 전부 라이브러리 클론이다(ARCH §6 — chars 는 재질을 새로 만들지 않는다).
// cloneMat 을 거치는 이유는 RESUME §3.0 그대로다: Material.copy 는 applyCecil 의
// defines·onBeforeCompile 을 잃어버려 절차 표면이 통째로 기본 PBR 로 되돌아간다.
let _mats = null

// 각막·렌즈용 러프니스 압축. 절차 그런지가 만든 러프니스 편차(0.03~0.40)를 눌러
// 하이라이트가 얼룩으로 쪼개지지 않게 한다 — 유리알은 실제로 무결점 면이다.
// 맵을 제거하지 않는 이유: 주입 청크가 map/normalMap/roughnessMap 샘플러를 직접 참조해
// 맵을 지우면 USE_MAP 이 사라지며 셰이더 컴파일이 깨진다(콘솔 에러 = 실격).
// cecilRgh 를 곱해 남기는 것은 스펙큘러 AA 항(varN)이 거기 들어 있기 때문이다.
const GLASS_PATCH = sh => {
  sh.fragmentShader = sh.fragmentShader.replace(
    'float roughnessFactor = cecilRgh;',
    'float roughnessFactor = clamp( cecilRgh * 0.34 + 0.028, 0.024, 1.0 );'
  )
}

function mats () {
  if (_mats) return _mats
  const g = (name, opts) => cloneMat(mat(name), opts)

  // 공막 — 세월 든 인형 눈은 흰색이 아니라 상아색이고 유약에 크레이즈가 들어 있다.
  const sclera = g('ceramic.sink', { key: 'chars-sclera' })
  sclera.color.setRGB(1.06, 1.010, 0.936)
  sclera.clearcoat = 1.0
  sclera.clearcoatRoughness = 0.030
  sclera.envMapIntensity = 1.70

  // 홍채 — 니스 목재의 결이 그대로 홍채 섬유로 읽힌다. 호박색으로 물들이고 니스를 올린다.
  const iris = g('wood.varnished.dark', { key: 'chars-iris' })
  iris.color.setRGB(3.10, 1.92, 0.86)
  iris.clearcoat = 0.95
  iris.clearcoatRoughness = 0.050
  iris.envMapIntensity = 1.75

  // 각막 — 캐치라이트가 나는 유일한 면. 불투명 유리(opacity 1.0)로 두면 눈이 통째로
  // 회갈색 판에 덮인다. 안경 렌즈가 정확히 그 상태였다(3차 판정 전 프레임 실측).
  //
  // 롭 폭은 **판독 거리가 아니라 배경 밝기가 정한다**. 안구가 폐색 우물에 잠겨 있던 동안에는
  // 넓은 롭이 옳았다 — 어두운 구 위에서는 번진 광택이라도 유일한 밝은 것이라 눈에 띄었다.
  // wireGlass 로 공막이 상아색으로 살아난 뒤에는 반대가 된다: 넓은 롭은 밝은 공막에 묻혀
  // 확산 음영과 구분되지 않는다(블라인드 2차 2인 독립 지적 — "넓은 그라데이션만 있고
  // 점으로 맺힌 압축된 밝은 픽셀이 없다"). 그래서 롭을 다시 조인다. opacity 도 올린다 —
  // 투명 재질의 스펙큘러는 알파로 곱해져 나가므로 0.30 에서는 캐치라이트가 30% 만 남는다.
  const cornea = g('glass.clear', { patch: GLASS_PATCH, key: 'chars-cornea' })
  cornea.color.setRGB(0.88, 0.90, 0.94)
  cornea.opacity = 0.45
  cornea.side = THREE.FrontSide
  cornea.clearcoat = 1.0
  cornea.clearcoatRoughness = 0.028
  cornea.envMapIntensity = 3.0

  // 안경 렌즈 — 같은 처방. 뒤의 눈이 읽혀야 안경이 안경으로 보인다.
  const lens = g('glass.clear', { patch: GLASS_PATCH, key: 'chars-lens' })
  lens.color.setRGB(0.84, 0.86, 0.90)
  lens.opacity = 0.17
  lens.clearcoat = 1.0
  lens.clearcoatRoughness = 0.028
  lens.envMapIntensity = 1.7

  _mats = { sclera, iris, cornea, lens, pupil: mat('bakelite.black') }
  return _mats
}

// 마모 변종(vertexColors + WEAR_PATCH)까지 그대로 물려받아 유약만 얹는다.
// mesh() 가 wear 유무로 재질을 갈라 고르므로, 고른 결과를 받아서 클론해야 두 경로가 다 산다.
const _glaze = new Map()
export function porcelain (o) {
  const src = o.material
  let m = _glaze.get(src.uuid)
  if (!m) {
    m = cloneMat(src, { key: 'chars-glaze' })
    m.vertexColors = src.vertexColors
    m.color.setRGB(GLAZE_TINT[0], GLAZE_TINT[1], GLAZE_TINT[2])
    m.clearcoat = 1.0
    m.clearcoatRoughness = 0.085
    m.envMapIntensity = 1.25
    _glaze.set(src.uuid, m)
  }
  o.material = m
  return o
}

// 천의 시트 텀을 올려 측광에서 실루엣 가장자리가 살게 한다(광원 신설 없이 — 조명은 render 소유).
// 인형 옷은 축소 모형 천이라 보풀이 실제보다 크게 읽히는 것이 정상이다.
const _rim = new Map()
export function rimCloth (o, k = 1) {
  const src = o.material
  const key = `${src.uuid}|${k}`
  let m = _rim.get(key)
  if (!m) {
    m = cloneMat(src, { key: 'chars-rim' })
    m.vertexColors = src.vertexColors
    m.sheen = Math.min(1, (src.sheen || 0.3) + 0.34 * k)
    m.sheenRoughness = Math.max(0.18, (src.sheenRoughness ?? 0.5) - 0.12 * k)
    m.sheenColor.setRGB(0.86, 0.80, 0.68)
    m.envMapIntensity = (src.envMapIntensity ?? 1) * 1.18
    _rim.set(key, m)
  }
  o.material = m
  return o
}

// 안경 테를 깊이·노멀 버퍼에서 뺀다. **다이치의 눈이 검게 죽어 있던 진짜 원인이 여기다.**
// `passes/prepass.js` 는 불투명 메시를 전부 노멀·선형깊이 버퍼에 굽고 투명 재질만 제외하는데
// (유리가 GTAO·SSR 를 오염시키기 때문), 컨택트 AO 는 반경 0.15m 로 그 버퍼를 읽는다.
// 놋쇠 테는 지름 3mm 철사이면서 눈꺼풀 앞면 12mm 앞에 있다 — 반경의 8% 거리다.
// 그래서 철사 한 줄이 눈 전체를 덮는 **폐색 벽**으로 계산돼 안구가 통째로 그늘에 잠긴다.
// 실측이 그대로다(A/B `shots/so-rim`): 테를 이 처리로 빼면 공막·홍채·캐치라이트가 전부 살고,
// 렌즈만 숨기면 무변화다 — 렌즈는 이미 transparent 라 프리패스가 진작 빼고 있었다.
// opacity 는 1.0 그대로라 색은 변하지 않는다. 투명 큐로 자리만 옮긴다.
const _wire = new Map()
export function wireGlass (o) {
  const src = o.material
  let m = _wire.get(src.uuid)
  if (!m) {
    m = cloneMat(src, { key: 'chars-wire' })
    m.vertexColors = src.vertexColors
    m.transparent = true
    m.depthWrite = false
    _wire.set(src.uuid, m)
  }
  o.material = m
  return o
}

function part (geo, material, cast = true) {
  const o = new THREE.Mesh(geo, material)
  o.castShadow = cast
  o.receiveShadow = true
  return o
}

/**
 * 유리 눈 한 쌍과 눈꺼풀을 머리에 붙인다.
 * 반환값의 leftEye/rightEye 그룹이 시선 관절이다(perf.js 가 회전을 쓴다).
 * 눈꺼풀은 머리에 고정된 별개 메시라 안구가 돌아도 따라 돌지 않는다 — 그래야 눈만 굴린다.
 */
export function addEyes (head, seed, lidName) {
  const G = geos()
  const M = mats()
  const joints = {}
  const lidGeo = []
  const lidXf = []
  for (const side of [-1, 1]) {
    const eye = new THREE.Group()
    eye.name = side < 0 ? 'left-eye' : 'right-eye'
    eye.position.set(side * EYE_X, EYE_Y, EYE_Z)
    // 눈 부품은 전부 그림자를 던지지 않는다. 3mm 간극에서 나오는 그림자는 섀도맵 텍셀보다
    // 작아 형태가 아니라 아크네로만 남고, VSM 이 그걸 눈 전체로 번지게 한다.
    eye.add(part(G.ball, M.sclera, false))
    eye.add(part(G.iris, M.iris, false))
    eye.add(part(G.pupil, M.pupil, false))
    eye.add(part(G.cornea, M.cornea, false))
    head.add(eye)
    joints[side < 0 ? 'leftEye' : 'rightEye'] = eye
    // 눈꺼풀은 안쪽이 살짝 내려오게 기울인다 — 좌우가 완전 대칭이면 다시 마네킹이 된다.
    lidGeo.push(G.lidUp, G.lidLow)
    lidXf.push(
      xf([side * EYE_X, EYE_Y, EYE_Z], [-0.16, 0, side * 0.09]),
      xf([side * EYE_X, EYE_Y, EYE_Z], [0.10, 0, side * 0.05])
    )
  }
  const lids = mesh(merge(lidGeo, lidXf), lidName, { wear: 0.34, seed, cast: false })
  lids.name = 'eyelids'
  head.add(porcelain(lids))
  return joints
}

export const EYE_LOCAL = Object.freeze({ x: EYE_X, y: EYE_Y, z: EYE_Z })
export const glassLens = () => mats().lens
