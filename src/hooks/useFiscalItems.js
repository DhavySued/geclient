// Itens fiscais fixos — aplicabilidade derivada do perfil da empresa + configurações
import { DEFAULT_REGIME_ITEMS } from '../context/SettingsContext'

const FISCAL_ITEMS = [
  { id: 'inss',      label: 'INSS',             weight: 10 },
  { id: 'inss_pl',   label: 'INSS Pró-Labore',  weight: 10 },
  { id: 'fgts',      label: 'FGTS',             weight: 10 },
  { id: 'das',       label: 'DAS',              weight: 15 },
  { id: 'irpj',      label: 'IRPJ',             weight: 15 },
  { id: 'csll',      label: 'CSLL',             weight: 10 },
  { id: 'pis',       label: 'PIS',              weight:  8 },
  { id: 'cofins',    label: 'COFINS',           weight:  8 },
  { id: 'federal',   label: 'Sit. Federal',     weight: 15 },
  { id: 'municipal', label: 'Sit. Municipal',   weight: 10 },
  { id: 'estadual',  label: 'Sit. Estadual',    weight: 10 },
]

function byId(id) {
  return FISCAL_ITEMS.find(i => i.id === id)
}

/**
 * Retorna os itens de consulta fiscal aplicáveis ao perfil da empresa.
 *
 * Regras fixas (perfil):
 *  - Tem funcionários (CLT)  → INSS + FGTS
 *  - Tem pró-labore          → INSS Pró-Labore
 *  - Sempre                  → Sit. Federal
 *  - Tipo Serviço ou Misto   → Sit. Municipal
 *  - Tipo Comércio ou Misto  → Sit. Estadual
 *
 * Regras configuráveis (via SettingsContext):
 *  - regimeItems[regime] → lista de IDs dos impostos monitorados
 */
export function getApplicableItems(client, regimeItems) {
  const regime = client?.regime ?? ''
  const tipo   = client?.tipo   ?? ''
  const result = []

  if (client?.hasEmployees)  { result.push(byId('inss'));  result.push(byId('fgts')) }
  if (client?.hasProLabore)    result.push(byId('inss_pl'))

  // Usa configuração persistida; cai para padrão se não informado
  const configMap = regimeItems ?? DEFAULT_REGIME_ITEMS
  const ids = configMap[regime] ?? []
  ids.forEach(id => result.push(byId(id)))

  result.push(byId('federal'))

  if (['Serviço', 'Misto'].includes(tipo))   result.push(byId('municipal'))
  if (['Comércio', 'Misto'].includes(tipo))  result.push(byId('estadual'))

  return result.filter(Boolean)
}

/**
 * Score fiscal ponderado: peso dos itens OK / peso total aplicável × 100
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
