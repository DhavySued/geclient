/**
 * getApplicableItems — retorna os itens fiscais aplicáveis a uma empresa.
 *
 * Fontes (todas vêm do banco via contextos):
 *   fiscalItems    : item[] — tabela fiscal_items completa
 *   regimeItemIds  : { [regime]: string[] } — de regime_fiscal_items
 *   conditionItemIds: { employees: string[], pro_labore: string[] } — de condition_fiscal_items
 *
 * Regras sempre automáticas (tipo de atividade):
 *   Sit. Federal   → sempre
 *   Sit. Municipal → Serviço ou Misto
 *   Sit. Estadual  → Comércio ou Misto
 */
export function getApplicableItems(client, fiscalItems = [], regimeItemIds = {}, conditionItemIds = {}) {
  const regime = client?.regime ?? ''
  const tipo   = client?.tipo   ?? ''
  const byId   = id => fiscalItems.find(i => i.id === id)

  const result = []
  const seen   = new Set()

  function add(item) {
    if (item && !seen.has(item.id)) { seen.add(item.id); result.push(item) }
  }

  // 1. Condições de folha
  if (client?.hasEmployees) {
    (conditionItemIds.employees  ?? []).forEach(id => add(byId(id)))
  }
  if (client?.hasProLabore) {
    (conditionItemIds.pro_labore ?? []).forEach(id => add(byId(id)))
  }

  // 2. Regime tributário
  ;(regimeItemIds[regime] ?? []).forEach(id => add(byId(id)))

  // 3. Certidões — sempre automáticas pelo tipo de atividade
  add(byId('federal'))
  if (['Serviço', 'Misto'].includes(tipo))  add(byId('municipal'))
  if (['Comércio', 'Misto'].includes(tipo)) add(byId('estadual'))

  return result.filter(Boolean)
}

/**
 * calcFiscalScore — score ponderado 0-100.
 * Pesos vêm embutidos nos itens (campo weight do banco).
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
