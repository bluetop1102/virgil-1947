import * as THREE from 'three'
import { clamp, damp, smoothstep } from '../core/util.js'

// 시선 — 유리 눈이 생긴 뒤에 남는 질문 하나에 답한다: **그 유리알이 누구를 보고 있는가.**
// 칠한 눈은 어디를 봐도 같지만 박아 넣은 눈은 방향이 있고, 방향이 고정이면 그 순간 다시
// 소품이 된다. 표정을 못 짓는 인형의 연기는 그래서 전부 시선에 실린다 —
// 듣는다 = 본다, 감춘다 = 피한다. perf.js 500줄 계약으로 분리했다(ARCH §11).

const GAZE_YAW = 0.46              // 눈알 좌우 한계 ≈26°. 넘기면 흰자만 남아 인형이 아니라 유령이다
const GAZE_PITCH = 0.26
// 목이 눈을 따라가되 아주 조금만 따라간다. 100% 면 사람 연기가 되어 마리오네트 아트
// 디렉션이 깨지고, 0% 면 목은 굳은 채 눈만 굴러 인형이 홀린 것처럼 보인다.
const NECK_FOLLOW = 0.11           // 눈이 간 각의 11% (최대 ≈2.9°)
const AMBIENT_GAZE = 0.30          // 배경 인형은 약하게 — 셋이 동시에 정면을 보면 소름이 아니라 코미디다
const LOOK_T = 1.7                 // 증거 제시 후 서류철을 내려다보는 시간

const _v = new THREE.Vector3()

const ease = (t) => smoothstep(clamp(t, 0, 1))
const pulse = (t, rate = 1) => Math.sin(t * Math.PI * 2 * rate)

// 눈에서 표적으로 가는 방향을 머리 로컬 각으로 잰다. 눈 그룹의 로컬 +z 가 시선축이라
// 이 두 각이 그대로 그룹의 회전이 된다. 참조하는 머리 월드행렬은 지난 프레임 것이지만
// 목 추종이 11% 뿐이라 되먹임이 한두 프레임에 수렴한다.
function aimAt (eye, target) {
  _v.copy(target)
  eye.parent.worldToLocal(_v).sub(eye.position)
  return [Math.atan2(_v.x, _v.z), -Math.atan2(_v.y, Math.hypot(_v.x, _v.z))]
}

// 진술 상태가 시선에 얹는 편차. 텔의 진폭은 이미 자세(perf.deitchPose)가 갖고 있으므로
// 여기서는 **자세가 못 하는 것**만 한다 — 고개보다 먼저 도망가고 먼저 돌아오는 눈.
function stateOffset (state, t, phase) {
  if (state === 'lying') {
    const away = ease(t / 0.34) * (1 - ease((t - 2.0) / 1.15))
    return [-0.66 * away, 0.22 * away]
  }
  if (state === 'anxious') {
    const beat = pulse(t + phase, 0.55)
    return [0.08 * beat, 0.17 + 0.09 * beat]   // 숙박부를 자꾸 내려다본다
  }
  if (state === 'breaking') return [0, 0.30]
  return [0, 0]
}

/**
 * 눈알을 표적으로 돌리고, 목이 받을 몫을 자세 층으로 돌려준다.
 * looks 는 npc → 증거 제시 시각 맵이고, 다 쓴 항목은 여기서 지운다.
 * 반환값은 mix() 가 삼키는 관절 오프셋이거나 null.
 */
export function gazeFor (track, rig, camera, dt, time, looks, ambient) {
  const left = rig.joints?.leftEye
  const right = rig.joints?.rightEye
  if (!left || !right || !camera) return null
  const [aimY, aimP] = aimAt(left, camera.position)
  let [offY, offP] = stateOffset(track.state, Math.max(0, time - track.startedAt), track.phase)
  const look = looks.get(track.npc)
  if (look != null) {
    const age = time - look
    if (age >= LOOK_T) looks.delete(track.npc)
    else if (age >= 0) {
      const w = ease(age / 0.28) * (1 - ease((age - (LOOK_T - 0.6)) / 0.6))
      offY += 0.10 * w
      offP += 0.36 * w
    }
  }
  const k = ambient ? AMBIENT_GAZE : 1
  // 반환 오프셋은 트랙마다 한 번만 지어 두고 값만 갈아 끼운다. mix() 가 값을 복사해 가므로
  // 재사용이 안전하고, 인물 수 × 프레임만큼의 할당이 사라진다(S-L 프레임 예산 — 신규 할당 0).
  const g = track.gaze || (track.gaze = { yaw: 0, pitch: 0, out: { head: [0, 0, 0] } })
  g.yaw = damp(g.yaw, clamp((aimY + offY) * k, -GAZE_YAW, GAZE_YAW), 9, dt)
  g.pitch = damp(g.pitch, clamp((aimP + offP) * k, -GAZE_PITCH, GAZE_PITCH), 9, dt)
  left.rotation.set(g.pitch, g.yaw, 0)
  right.rotation.set(g.pitch, g.yaw, 0)
  g.out.head[0] = g.pitch * NECK_FOLLOW
  g.out.head[1] = g.yaw * NECK_FOLLOW
  return g.out
}
