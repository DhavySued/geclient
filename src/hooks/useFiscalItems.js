/**
 * getApplicableItems — retorna os itens fiscais aplicáveis a uma empresa.
 *
 * Ordem de aplicação (deduplicado por Set):
 *   1. Condições de folha (hasEmployees / hasProLabore)
 *   2. Regime tributário
 *   3. Tipo de atividade (Serviço / Comércio / Misto)
 *
 * Todas as origens vêm do banco via FiscalConfigContext.
 */
export function getApplicableItems(
  client,
  fiscalItems    = [],
  regimeItemIds  = {},
  conditionItemIds = {},
  tipoItemIds    = {},
) {
  const regime = client?.regime ?? ''
  const tipo   = client?.tipo   ?? ''
  const byId   = id => fiscalItems.find(i => i.id === id)

  const result = []
  const seen   = new Set()

  function add(item) {
    if (item && !seen.has(item.id)) { seen.add(item.id); result.push(item) }
  }

  // 1. Condições de folha
  if (client?.hasEmployees) (conditionItemIds.employees  ?? []).forEach(id => add(byId(id)))
  if (client?.hasProLabore) (conditionItemIds.pro_labore ?? []).forEach(id => add(byId(id)))

  // 2. Regime tributário
  ;(regimeItemIds[regime] ?? []).forEach(id => add(byId(id)))

  // 3. Tipo de atividade
  ;(tipoItemIds[tipo] ?? []).forEach(id => add(byId(id)))

  return result.filter(Boolean)
}

/**
 * calcFiscalScore — score ponderado 0–100.
 * Pesos vêm do campo weight de cada item (banco de dados).
 */
export function calcFiscalScore(checks, applicableItems) {
  if (!applicableItems?.length) return null
  const totalWeight = applicableItems.reduce((s, i) => s + (i.weight ?? 10), 0)
  if (totalWeight === 0) return null
  const okWeight = applicableItems
    .filter(i => checks?.[i.id] === 'ok')
    .reduce((s, i) => s + (i.weight ?? 10), 0)
  return Math.round((okWeight / totalWeight) * 100)
}
