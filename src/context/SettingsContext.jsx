import { createContext, useContext, useState, useCallback } from 'react'

const STORAGE_KEY = 'geclient_settings'

export const REGIMES = ['MEI', 'Simples Nacional', 'Lucro Presumido', 'Lucro Real']

// Itens configuráveis por regime (excluindo INSS/FGTS/certidões que são sempre derivados do perfil)
export const CONFIGURABLE_FISCAL_ITEMS = [
  { id: 'das',    label: 'DAS'    },
  { id: 'irpj',   label: 'IRPJ'   },
  { id: 'csll',   label: 'CSLL'   },
  { id: 'pis',    label: 'PIS'    },
  { id: 'cofins', label: 'COFINS' },
]

// Todos os itens fiscais com seus pesos padrão
export const ALL_FISCAL_ITEMS = [
  { id: 'inss',      label: 'INSS',           defaultWeight: 10 },
  { id: 'inss_pl',   label: 'INSS Pró-Labore', defaultWeight: 10 },
  { id: 'fgts',      label: 'FGTS',           defaultWeight: 10 },
  { id: 'das',       label: 'DAS',            defaultWeight: 15 },
  { id: 'irpj',      label: 'IRPJ',           defaultWeight: 15 },
  { id: 'csll',      label: 'CSLL',           defaultWeight: 10 },
  { id: 'pis',       label: 'PIS',            defaultWeight:  8 },
  { id: 'cofins',    label: 'COFINS',         defaultWeight:  8 },
  { id: 'federal',   label: 'Sit. Federal',   defaultWeight: 15 },
  { id: 'municipal', label: 'Sit. Municipal', defaultWeight: 10 },
  { id: 'estadual',  label: 'Sit. Estadual',  defaultWeight: 10 },
]

export const DEFAULT_ITEM_WEIGHTS = Object.fromEntries(
  ALL_FISCAL_ITEMS.map(i => [i.id, i.defaultWeight])
)

export const DEFAULT_REGIME_ITEMS = {
  'MEI':              ['das'],
  'Simples Nacional': ['das'],
  'Lucro Presumido':  ['irpj', 'csll', 'pis', 'cofins'],
  'Lucro Real':       ['irpj', 'csll', 'pis', 'cofins'],
}

const DEFAULTS = {
  showUndatedInCalendar: true,
  regimeItems:  DEFAULT_REGIME_ITEMS,
  itemWeights:  DEFAULT_ITEM_WEIGHTS,
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    const saved = JSON.parse(raw)
    return {
      ...DEFAULTS,
      ...saved,
      regimeItems: { ...DEFAULTS.regimeItems, ...(saved.regimeItems ?? {}) },
      itemWeights: { ...DEFAULTS.itemWeights,  ...(saved.itemWeights  ?? {}) },
    }
  } catch {
    return DEFAULTS
  }
}

function persist(s) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
}

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(load)

  const update = useCallback((patch) => {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      persist(next)
      return next
    })
  }, [])

  const toggleRegimeItem = useCallback((regime, itemId) => {
    setSettings(prev => {
      const current = prev.regimeItems[regime] ?? []
      const next = current.includes(itemId)
        ? current.filter(id => id !== itemId)
        : [...current, itemId]
      const regimeItems = { ...prev.regimeItems, [regime]: next }
      const updated = { ...prev, regimeItems }
      persist(updated)
      return updated
    })
  }, [])

  const setItemWeight = useCallback((itemId, weight) => {
    setSettings(prev => {
      const itemWeights = { ...prev.itemWeights, [itemId]: weight }
      const updated = { ...prev, itemWeights }
      persist(updated)
      return updated
    })
  }, [])

  return (
    <SettingsContext.Provider value={{ settings, update, toggleRegimeItem, setItemWeight }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be inside SettingsProvider')
  return ctx
}
