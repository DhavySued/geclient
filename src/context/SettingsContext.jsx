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

export const DEFAULT_REGIME_ITEMS = {
  'MEI':              ['das'],
  'Simples Nacional': ['das'],
  'Lucro Presumido':  ['irpj', 'csll', 'pis', 'cofins'],
  'Lucro Real':       ['irpj', 'csll', 'pis', 'cofins'],
}

const DEFAULTS = {
  showUndatedInCalendar: true,
  regimeItems: DEFAULT_REGIME_ITEMS,
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

  // Toggle a single fiscal item for a regime
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

  return (
    <SettingsContext.Provider value={{ settings, update, toggleRegimeItem }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be inside SettingsProvider')
  return ctx
}
