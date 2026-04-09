/**
 * FiscalConfigContext
 *
 * Gerencia as tabelas de vínculo no Supabase:
 *   regime_fiscal_items    → qual imposto aplica em cada regime tributário
 *   condition_fiscal_items → qual imposto aplica quando tem_empregado / tem_pro_labore
 *
 * Expõe:
 *   regimeItems    : { [regime]: string[] }          — ids de itens por regime
 *   conditionItems : { employees: string[], pro_labore: string[] }
 *   toggleRegimeItem(regime, itemId)
 *   toggleConditionItem(condition, itemId)
 *   loading / error
 */
import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export const REGIMES = ['MEI', 'Simples Nacional', 'Lucro Presumido', 'Lucro Real']

// IDs dos itens derivados do tipo de atividade (sempre automáticos — não aparecem nas seções de alocação)
export const TIPO_BASED_IDS = new Set(['federal', 'municipal', 'estadual'])

const EMPTY_CONFIG = {
  regimeItems:    { MEI: [], 'Simples Nacional': [], 'Lucro Presumido': [], 'Lucro Real': [] },
  conditionItems: { employees: [], pro_labore: [] },
}

const FiscalConfigContext = createContext(null)

export function FiscalConfigProvider({ children }) {
  const [regimeItems,    setRegimeItems]    = useState(EMPTY_CONFIG.regimeItems)
  const [conditionItems, setConditionItems] = useState(EMPTY_CONFIG.conditionItems)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchConfig = useCallback(async () => {
    const [regRes, condRes] = await Promise.all([
      supabase.from('regime_fiscal_items').select('regime, fiscal_item_id'),
      supabase.from('condition_fiscal_items').select('condition, fiscal_item_id'),
    ])

    if (regRes.error || condRes.error) {
      setError((regRes.error || condRes.error).message)
      setLoading(false)
      return
    }

    // Build regimeItems map
    const ri = { ...EMPTY_CONFIG.regimeItems }
    for (const row of regRes.data) {
      if (!ri[row.regime]) ri[row.regime] = []
      if (!ri[row.regime].includes(row.fiscal_item_id)) ri[row.regime].push(row.fiscal_item_id)
    }
    setRegimeItems(ri)

    // Build conditionItems map
    const ci = { employees: [], pro_labore: [] }
    for (const row of condRes.data) {
      if (!ci[row.condition]) ci[row.condition] = []
      if (!ci[row.condition].includes(row.fiscal_item_id)) ci[row.condition].push(row.fiscal_item_id)
    }
    setConditionItems(ci)

    setError(null)
    setLoading(false)
  }, [])

  useEffect(() => { fetchConfig() }, [fetchConfig])

  // Real-time subscriptions
  useEffect(() => {
    const ch1 = supabase
      .channel('regime-fiscal-items-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'regime_fiscal_items' }, fetchConfig)
      .subscribe()
    const ch2 = supabase
      .channel('condition-fiscal-items-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'condition_fiscal_items' }, fetchConfig)
      .subscribe()
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2) }
  }, [fetchConfig])

  // ── Toggle regime item ─────────────────────────────────────────────────────

  const toggleRegimeItem = useCallback(async (regime, itemId) => {
    const current = regimeItems[regime] ?? []
    const isActive = current.includes(itemId)

    // Optimistic update
    setRegimeItems(prev => ({
      ...prev,
      [regime]: isActive
        ? prev[regime].filter(id => id !== itemId)
        : [...(prev[regime] ?? []), itemId],
    }))

    const { error: err } = isActive
      ? await supabase.from('regime_fiscal_items').delete()
          .eq('regime', regime).eq('fiscal_item_id', itemId)
      : await supabase.from('regime_fiscal_items').insert({ regime, fiscal_item_id: itemId })

    if (err) {
      // Rollback
      setRegimeItems(prev => ({
        ...prev,
        [regime]: isActive
          ? [...(prev[regime] ?? []), itemId]
          : prev[regime].filter(id => id !== itemId),
      }))
      console.error('toggleRegimeItem error:', err)
    }
  }, [regimeItems])

  // ── Toggle condition item ──────────────────────────────────────────────────

  const toggleConditionItem = useCallback(async (condition, itemId) => {
    const current = conditionItems[condition] ?? []
    const isActive = current.includes(itemId)

    // Optimistic update
    setConditionItems(prev => ({
      ...prev,
      [condition]: isActive
        ? prev[condition].filter(id => id !== itemId)
        : [...(prev[condition] ?? []), itemId],
    }))

    const { error: err } = isActive
      ? await supabase.from('condition_fiscal_items').delete()
          .eq('condition', condition).eq('fiscal_item_id', itemId)
      : await supabase.from('condition_fiscal_items').insert({ condition, fiscal_item_id: itemId })

    if (err) {
      setConditionItems(prev => ({
        ...prev,
        [condition]: isActive
          ? [...(prev[condition] ?? []), itemId]
          : prev[condition].filter(id => id !== itemId),
      }))
      console.error('toggleConditionItem error:', err)
    }
  }, [conditionItems])

  return (
    <FiscalConfigContext.Provider value={{
      regimeItems, conditionItems,
      toggleRegimeItem, toggleConditionItem,
      loading, error,
    }}>
      {children}
    </FiscalConfigContext.Provider>
  )
}

export function useFiscalConfig() {
  const ctx = useContext(FiscalConfigContext)
  if (!ctx) throw new Error('useFiscalConfig must be inside FiscalConfigProvider')
  return ctx
}
