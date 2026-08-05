// factcheck — docs/design/case-graph.json 검증기 (MASTER-PLAN §4)
//
// F1 반박 커버리지  모든 거짓 STATEMENT에 도달 가능한 refutes 경로 존재
// F2 타임라인 일관성 동일 시각·동일 인물의 위치 모순 0 · 증거 원산지 셀 결박 100%
// F3 도달성        3링크 각각 수집 가능 경로 성립 + 최악 소각 경로에서도 엔딩 도달
// F4 고아 노드      어떤 엣지에도 연결되지 않은 FACT/EVIDENCE 0 · LORE 인과 침투 0
// R1~R3 회귀       MASTER-PLAN §3.3 개연성 결함 3건의 수정이 데이터에 남아 있는가
//
// 사용: node tools/factcheck.mjs [--json]   실패 시 exit 1

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const g = JSON.parse(readFileSync(join(root, 'docs/design/case-graph.json'), 'utf8'))

const facts = new Map(g.facts.map(f => [f.id, f]))
const evidence = new Map(g.evidence.map(e => [e.id, e]))
const statements = new Map(g.statements.map(s => [s.id, s]))
const loreIds = new Set(g.lore.map(l => l.id))
const results = []
const check = (id, pass, detail) => results.push({ id, pass, detail })

// ── S0 참조 무결성 (실패 시 이후 검증 신뢰 불가) ──────────────────────────────
{
  const errs = []
  const tp = new Set(g.timepoints)
  for (const f of g.facts) {
    if (f.kind === 'event' && !tp.has(f.t)) errs.push(`${f.id}: 미등록 시점 ${f.t}`)
    if (f.actor && !g.actors.includes(f.actor)) errs.push(`${f.id}: 미등록 인물 ${f.actor}`)
    if (f.place && !g.places.includes(f.place)) errs.push(`${f.id}: 미등록 장소 ${f.place}`)
  }
  for (const e of g.evidence) {
    if (!facts.has(e.origin)) errs.push(`${e.id}: origin ${e.origin} 미해결`)
    for (const s of e.supports) if (!facts.has(s)) errs.push(`${e.id}: supports ${s} 미해결`)
    for (const r of e.refutes) if (!statements.has(r)) errs.push(`${e.id}: refutes ${r} 미해결`)
    if (![1, 2, 3].includes(e.act)) errs.push(`${e.id}: act ${e.act}`)
  }
  for (const s of g.statements) {
    if (s.truth === false) {
      if (!s.hides?.length) errs.push(`${s.id}: 거짓 진술에 hides 없음`)
      if (!s.refutedBy?.length) errs.push(`${s.id}: 거짓 진술에 refutedBy 없음`)
    }
    for (const h of s.hides ?? []) if (!facts.has(h)) errs.push(`${s.id}: hides ${h} 미해결`)
    for (const r of s.refutedBy ?? []) if (!evidence.has(r)) errs.push(`${s.id}: refutedBy ${r} 미해결`)
  }
  for (const l of g.links) {
    for (const r of l.requires) if (!evidence.has(r)) errs.push(`${l.id}: requires ${r} 미해결`)
    for (const p of l.proves) if (!facts.has(p)) errs.push(`${l.id}: proves ${p} 미해결`)
  }
  check('S0', errs.length === 0, errs.length ? errs : '참조 전건 해결')
}

// ── 획득 가능성 고정점 (burned = 소각된 진술 집합) ────────────────────────────
function solve (burned) {
  const have = new Set()
  const flags = new Set()
  const stmtLive = s => !burned.has(s.id) && (!s.requiresFlag || flags.has(s.requiresFlag))
  const outcomeOk = (s, outcome, effect) => {
    if (outcome === 'truth' || outcome === 'doubt') return true
    if (outcome === 'lieCorrect') {
      if (effect?.requiresEvidence) return have.has(effect.requiresEvidence)
      return (s.refutedBy ?? []).some(e => have.has(e))
    }
    return false // onLieWrong 등 소각 경로는 최선 경로에 없다
  }
  let changed = true
  while (changed) {
    changed = false
    for (const e of g.evidence) {
      if (have.has(e.id)) continue
      const ok = e.obtain.some(p => {
        if (p.via === 'search' || p.via === 'observe') return true
        if (p.via === 'spawn') return flags.has(p.flag)
        if (p.via === 'grant') {
          const s = statements.get(p.statement)
          return s && stmtLive(s) && p.outcomes.some(o => outcomeOk(s, o, s.unlocks?.[o]))
        }
        return false
      })
      if (ok) { have.add(e.id); changed = true }
    }
    for (const s of g.statements) {
      if (!stmtLive(s)) continue
      for (const [outcome, effect] of Object.entries(s.unlocks ?? {})) {
        if (outcome === 'onLieWrong') continue
        if (!outcomeOk(s, outcome, effect)) continue
        for (const f of effect.flags ?? []) if (!flags.has(f)) { flags.add(f); changed = true }
      }
    }
  }
  return { have, flags }
}
const best = solve(new Set())
const worst = solve(new Set(g.statements.filter(s => s.burnable).map(s => s.id)))

// ── F1 반박 커버리지 ─────────────────────────────────────────────────────────
{
  const fails = []
  for (const s of g.statements) {
    if (s.truth !== false) continue
    const limit = s.reAct ?? s.act
    const ok = (s.refutedBy ?? []).some(id => best.have.has(id) && evidence.get(id).act <= limit)
    if (!ok) fails.push(`${s.id}: act ${limit} 이내 도달 가능한 반박 증거 없음`)
  }
  check('F1', fails.length === 0, fails.length ? fails : `거짓 진술 ${g.statements.filter(s => !s.truth).length}건 전부 반박 경로 성립`)
}

// ── F2 타임라인 일관성 + 원산지 결박 ─────────────────────────────────────────
{
  const fails = []
  const cell = new Map()
  for (const f of g.facts) {
    if (f.kind !== 'event' || !f.actor || !f.place) continue
    const k = `${f.t}|${f.actor}`
    if (cell.has(k) && cell.get(k).place !== f.place) {
      fails.push(`${cell.get(k).id}·${f.id}: ${f.t}의 ${f.actor}가 ${cell.get(k).place}와 ${f.place}에 동시 존재`)
    } else cell.set(k, f)
  }
  for (const e of g.evidence) {
    const o = facts.get(e.origin)
    if (!o || o.kind !== 'event' || !o.t) fails.push(`${e.id}: 원산지 ${e.origin}가 타임라인 셀이 아님`)
  }
  check('F2', fails.length === 0, fails.length ? fails : `위치 모순 0 · 증거 ${g.evidence.length}종 원산지 셀 결박 100%`)
}

// ── F3 도달성 ────────────────────────────────────────────────────────────────
{
  const fails = []
  for (const l of g.links) {
    const missing = l.requires.filter(r => !best.have.has(r))
    if (missing.length) fails.push(`${l.id}: 최선 경로에서 ${missing.join(',')} 획득 불가`)
  }
  for (const [act, p] of Object.entries(g.progression)) {
    const missW = p.requires.filter(r => !worst.have.has(r))
    if (missW.length) fails.push(`최악 소각 경로에서 ${act} 진입 불가 (${missW.join(',')} 필요)`)
  }
  const worstLinks = g.links.filter(l => l.requires.every(r => worst.have.has(r))).length
  const cold = g.endings.find(e => e.id === 'cold')
  if (!cold || cold.minLinks > worstLinks) fails.push(`최악 경로 성립 링크 ${worstLinks}개로 도달 가능한 엔딩 없음`)
  check('F3', fails.length === 0, fails.length ? fails
    : `3링크 최선 경로 성립 · 최악 소각 경로: 링크 ${worstLinks}개 → 미제 엔딩 도달 (진행 불능 0)`)
}

// ── F4 고아 노드 + LORE 인과 침투 ────────────────────────────────────────────
{
  const fails = []
  const factRef = new Set()
  for (const e of g.evidence) { factRef.add(e.origin); e.supports.forEach(s => factRef.add(s)) }
  for (const s of g.statements) (s.hides ?? []).forEach(h => factRef.add(h))
  for (const l of g.links) l.proves.forEach(p => factRef.add(p))
  for (const f of g.facts) if (!factRef.has(f.id)) fails.push(`FACT ${f.id}: 어떤 엣지에도 연결되지 않음`)
  const evRef = new Set(g.links.flatMap(l => l.requires))
  for (const e of g.evidence) {
    if (!e.supports.length && !e.refutes.length && !evRef.has(e.id)) fails.push(`EVIDENCE ${e.id}: 엣지 없음`)
  }
  const causal = [
    ...g.links.flatMap(l => [...l.requires, ...l.proves]),
    ...g.evidence.flatMap(e => [...e.supports, ...e.refutes, e.origin]),
    ...g.statements.flatMap(s => [...(s.hides ?? []), ...(s.refutedBy ?? [])])
  ]
  for (const id of causal) if (loreIds.has(id)) fails.push(`LORE ${id}: 사건 인과에 침투`)
  check('F4', fails.length === 0, fails.length ? fails : `고아 0 · LORE ${g.lore.length}건 인과 격리 유지`)
}

// ── R1~R3 개연성 결함 회귀 (MASTER-PLAN §3.3) ───────────────────────────────
{
  const fa9 = facts.get('FA9')
  check('R1', !!fa9 && fa9.t === 'A-2days' && fa9.tags.includes('fired-14mo') && fa9.tags.includes('residence-4yr'),
    fa9 ? '프라이스 해고=14개월 전 · 거주 4년 공존' : 'FA9 부재')
  const fa1 = facts.get('FA1')
  const fa1Hidden = g.statements.some(s => (s.hides ?? []).includes('FA1'))
  check('R2', !!fa1 && fa1.tags.includes('motive') && fa1Hidden,
    fa1 ? `도일 동기 정의 + 은폐 진술 결박 ${fa1Hidden ? '성립' : '없음'}` : 'FA1 부재')
  const rk = evidence.get('roofkey'); const fb10 = facts.get('FB10')
  check('R3', rk?.origin === 'FB10' && fb10?.actor === 'doyle' && fb10?.tags.includes('defect-fix-3'),
    'roofkey 원산지=도일의 사후 침입(FB10)')
}

// ── 출력 ─────────────────────────────────────────────────────────────────────
const failed = results.filter(r => !r.pass)
if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ pass: failed.length === 0, results }, null, 2))
} else {
  for (const r of results) {
    console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.id}  ${Array.isArray(r.detail) ? '' : r.detail}`)
    if (Array.isArray(r.detail)) for (const d of r.detail) console.log(`      - ${d}`)
  }
  console.log(failed.length === 0 ? '\n사실 그래프: 전 게이트 통과' : `\n실패 ${failed.length}건`)
}
process.exit(failed.length === 0 ? 0 : 1)
