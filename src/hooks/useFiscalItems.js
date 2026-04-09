import { DEFAULT_REGIME_ITEMS } from '../context/SettingsContext'
import { PROFILE_BASED_IDS } from '../context/FiscalItemsContext'

/**
 * Retorna os itens aplicáveis ao perfil da empresa.
 * - regimeItems: mapa regime → [ids] (de SettingsContext)
 * - fiscalItems: lista completa de itens do banco (de FiscalItemsContext)
 */
export function getApplicableItems(client, regimeItems, fiscalItems = []) {
  const regime = client?.regime ?? ''
  const tipo   = client?.tipo   ?? ''
  const byId   = id => fiscalItems.find(i => i.id === id)
  const result = []

  // Itens derivados do perfil da empresa
  if (client?.hasEmployees) { result.push(byId('inss')); result.push(byId('fgts')) }
  if (client?.hasProLabore)   result.push(byId('inss_pl'))

  // Itens configurados por regime
  const configMap = regimeItems ?? DEFAULT_REGIME_ITEMS
  const ids = configMap[regime] ?? []
  ids.forEach(id => result.push(byId(id)))

  // Certidões (sempre presentes, condicionadas ao tipo de atividade)
  result.push(byId('federal'))
  if (['Serviço', 'Misto'].includes(tipo))  result.push(byId('municipal'))
  if (['Comércio', 'Misto'].includes(tipo)) result.push(byId('estadual'))

  return result.filter(Boolean)
}

/**
 * Score fiscal ponderado: peso dos itens OK / peso total × 100
 * Os pesos vêm embutidos nos próprios itens (campo weight do banco).
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

export { PROFILE_BASED_IDS }
