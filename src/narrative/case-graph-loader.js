// [NARRATIVE] case-graph 관계 데이터의 단일 런타임 접근층.
import graph from '../../docs/design/case-graph.json' with { type: 'json' }

const statements = new Map(graph.statements.map(statement => [statement.id, statement]))
const links = new Map(graph.links.map(link => [link.id, link]))

const unique = values => [...new Set(values || [])]
const localStatementId = id => id.slice(id.indexOf('.') + 1)

function mergeEffect (branch, effect) {
  if (!branch || !effect) return branch
  const merged = { ...branch }
  for (const field of ['grants', 'spawns', 'flags']) {
    if (effect[field]?.length) merged[field] = unique([...(branch[field] || []), ...effect[field]])
  }
  return merged
}

function lieEffect (node, evidence) {
  const effect = node.unlocks?.lieCorrect
  if (!effect?.requiresEvidence || effect.requiresEvidence === evidence) return effect
  return null
}

export function statementRelation (id) {
  const node = statements.get(id)
  if (!node) throw new Error(`case-graph statement not found: ${id}`)
  return node
}

export function hydrateStatement (statement) {
  const graphId = statement.graphId || statement.id
  const node = statementRelation(graphId)
  const hydrated = {
    ...statement,
    id: localStatementId(graphId),
    graphId,
    truth: node.truth,
    correct: node.truth ? 'TRUTH' : 'LIE',
    evidence: [...(node.refutedBy || [])],
    key: node.key === true,
    anxiousTell: node.anxiousTell === true,
    breakingOn: node.breakingOn === true,
    requires: node.requiresFlag ? [node.requiresFlag] : []
  }
  hydrated.onTruth = mergeEffect(statement.onTruth, node.unlocks?.truth)
  hydrated.onDoubt = mergeEffect(statement.onDoubt, node.unlocks?.doubt)
  hydrated.onLieCorrect = mergeEffect(statement.onLieCorrect, lieEffect(node))
  hydrated.onLieWrong = mergeEffect(statement.onLieWrong, node.unlocks?.onLieWrong)
  hydrated.lieVariants = Object.fromEntries(Object.entries(statement.lieVariants || {}).map(([evidence, branch]) => [
    evidence,
    mergeEffect(branch, lieEffect(node, evidence))
  ]))
  hydrated.wrongVariants = Object.fromEntries(Object.entries(statement.wrongVariants || {}).map(([evidence, branch]) => [
    evidence,
    mergeEffect(branch, node.unlocks?.onLieWrong)
  ]))
  return hydrated
}

export function hydrateInterrogations (interrogations = {}) {
  return Object.fromEntries(Object.entries(interrogations).map(([npc, interrogation]) => [
    npc,
    { ...interrogation, statements: (interrogation.statements || []).map(hydrateStatement) }
  ]))
}

export function hydrateLinks (authored = []) {
  return authored.map(link => {
    const node = links.get(link.id)
    if (!node) throw new Error(`case-graph link not found: ${link.id}`)
    return { ...link, needs: [...node.requires] }
  })
}
