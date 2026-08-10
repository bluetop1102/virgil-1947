// [NARRATIVE] 분권 — 판정 점수표. interrogation.js 500줄 계약으로 분리했다(2026-08-10).
// STORY 4-2 점수표. 이 함수가 사양이다. 데이터도 UI도 판정에 관여하지 않는다.
export function judge (truth, choice, evidenceId, correct = []) {
  if (truth) {
    if (choice === 'TRUTH') return { delta: 1, burn: false, correct: true, beat: 'trust' }
    if (choice === 'DOUBT') return { delta: -1, burn: false, correct: false, beat: 'defend' }
    return { delta: -2, burn: true, correct: false, beat: 'burn' }
  }
  if (choice === 'TRUTH') return { delta: 0, burn: false, correct: false, beat: 'pass' }
  if (choice === 'DOUBT') return { delta: 0.5, burn: false, correct: false, beat: 'shaken' }
  const ok = evidenceId != null && correct.indexOf(evidenceId) >= 0
  return ok
    ? { delta: 2, burn: false, correct: true, beat: 'break' }
    : { delta: -2, burn: true, correct: false, beat: 'burn' }
}

// 배터리와 디버그가 쓰는 이론상 최대 점수. 종료 등급은 상태식으로만 정한다.
export function maxScore (data) {
  return (data.statements || []).reduce((s, st) => s + (st.truth ? 1 : 2), 0)
}
