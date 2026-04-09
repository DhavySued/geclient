// Itens fiscais — aplicabilidade e pesos configuráveis via SettingsContext
import { DEFAULT_REGIME_ITEMS, DEFAULT_ITEM_WEIGHTS } from '../context/SettingsContext'

const FISCAL_ITEMS = [
  { id: 'inss',      label: 'INSS'           },
  { id: 'inss_pl',   label: 'INSS Pró-Labore' },
  { id: 'fgts',      label: 'FGTS'           },
  { id: 'das',       label: 'DAS'            },
  { id: 'irpj',      label: 'IRPJ'           },
  { id: 'csll',      label: 'CSLL'           },
  { id: 'pis',       label: 'PIS'            },
  { id: 'cofins',    label: 'COFINS'         },
  { id: 'federal',   label: 'Sit. Federal'   },
  { id: 'municipal', label: 'Sit. Municipal' },
  { id: 'estadual',  label: 'Sit. Estadual'  },
]

function byId(id) {
  return FISCAL_ITEMS.find(i => i.id === id)
}

/**
 * Retorna os itens aplicáveis ao perfil da empresa.
 * - regimeItems: mapa regime → [ids] (de SettingsContext)
 */
export function getApplicableItems(client, regimeItems) {
  const regime = client?.regime ?? ''
  const tipo   = client?.tipo   ?? ''
  const result = []

  if (client?.hasEmployees)  { result.push(byId('inss'));  result.push(byId('fgts')) }
  if (client?.hasProLabore)    result.push(byId('inss_pl'))

  const configMap = regimeItems ?? DEFAULT_REGIME_ITEMS
  const ids = configMap[regime] ?? []
  ids.forEach(id => result.push(byId(id)))

  result.push(byId('federal'))
  if (['Serviço', 'Misto'].includes(tipo))  result.push(byId('municipal'))
  if (['Comércio', 'Misto'].includes(tipo)) result.push(byId('estadual'))

  return result.filter(Boolean)
}

/**
 * Score fiscal ponderado.
 * - itemWeights: mapa id → peso (de SettingsContext); cai para DEFAULT_ITEM_WEIGHTS
 */
export function calcFiscalScore(checks, applicableItems, itemWeights) {
  if (!applicableItems?.length) return null
  const weights = itemWeights ?? DEFAULT_ITEM_WEIGHTS
  const w = (item) => Number(weights[item.id] ?? DEFAULT_ITEM_WEIGHTS[item.id] ?? 10)
  const totalWeight = applicableItems.reduce((s, i) => s + w(i), 0)
  if (totalWeight === 0) return null
  const okWeight = applicableItems
    .filter(i => checks?.[i.id] === 'ok')
    .reduce((s, i) => s + w(i), 0)
  return Math.round((okWeight / totalWeight) * 100)
}
