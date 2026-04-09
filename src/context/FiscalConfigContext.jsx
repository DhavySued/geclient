/**
 * FiscalConfigContext
 *
 * Gerencia as tabelas de vínculo no Supabase:
 *   regime_fiscal_items    → imposto por regime tributário
 *   condition_fiscal_items → imposto por condição de folha (employees / pro_labore)
 *   tipo_fiscal_items      → imposto por tipo de atividade (Serviço / Comércio / Misto)
 */
import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export const REGIMES = ['MEI', 'Simples Nacional', 'Lucro Presumido', 'Lucro Real']
export const TIPOS   = ['Serviço', 'Comércio', 'Misto']

const EMPTY = {
  regimeItems:    { MEI: [], 'Simples Nacional': [], 'Lucro Presumido': [], 'Lucro Real': [] },
  conditionItems: { employees: [], pro_labore: [] },
  tipoItems:      { 'Serviço': [], 'Comércio': [], 'Misto': [] },
}

const FiscalConfigContext = createContext(null)

export function FiscalConfigProvider({ children }) {
  const [regimeItems,    setRegimeItems]    = useState(EMPTY.regimeItems)
  const [conditionItems, setConditionItems] = useState(EMPTY.conditionItems)
  const [tipoItems,      setTipoItems]      = useState(EMPTY.tipoItems)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  // ── Fetch all three tables ────────────────────────────────────────────────

  const fetchConfig = useCallback(async () => {
    const [regRes, condRes, tipoRes] = await Promise.all([
      supabase.from('regime_fiscal_items').select('regime, fiscal_item_id'),
      supabase.from('condition_fiscal_items').select('condition, fiscal_item_id'),
      supabase.from('tipo_fiscal_items').select('tipo, fiscal_item_id'),
    ])

    const anyError = regRes.error || condRes.error || tipoRes.error
    if (anyError) { setError(anyError.message); setLoading(false); return }

    const ri = { ...EMPTY.regimeItems }
    for (const row of regRes.data) {
      if (!ri[row.regime]) ri[row.regime] = []
      if (!ri[row.regime].includes(row.fiscal_item_id)) ri[row.regime].push(row.fiscal_item_id)
    }
    setRegimeItems(ri)

    const ci = { employees: [], pro_labore: [] }
    for (const row of condRes.data) {
      if (!ci[row.condition]) ci[row.condition] = []
      if (!ci[row.condition].includes(row.fiscal_item_id)) ci[row.condition].push(row.fiscal_item_id)
    }
    setConditionItems(ci)

    const ti = { 'Serviço': [], 'Comércio': [], 'Misto': [] }
    for (const row of tipoRes.data) {
      if (!ti[row.tipo]) ti[row.tipo] = []
      if (!ti[row.tipo].includes(row.fiscal_item_id)) ti[row.tipo].push(row.fiscal_item_id)
    }
    setTipoItems(ti)

    setError(null)
    setLoading(false)
  }, [])

  useEffect(() => { fetchConfig() }, [fetchConfig])

  useEffect(() => {
    const channels = [
      supabase.channel('rfi').on('postgres_changes', { event: '*', schema: 'public', table: 'regime_fiscal_items' },    fetchConfig).subscribe(),
      supabase.channel('cfi').on('postgres_changes', { event: '*', schema: 'public', table: 'condition_fiscal_items' }, fetchConfig).subscribe(),
      supabase.channel('tfi').on('postgres_changes', { event: '*', schema: 'public', table: 'tipo_fiscal_items' },      fetchConfig).subscribe(),
    ]
    return () => channels.forEach(ch => supabase.removeChannel(ch))
  }, [fetchConfig])

  // ── Generic toggle helper ─────────────────────────────────────────────────

  function makeToggle(table, keyCol, setState) {
    return async (keyVal, itemId) => {
      setState(prev => {
        const cur = prev[keyVal] ?? []
        const active = cur.includes(itemId)
        return { ...prev, [keyVal]: active ? cur.filter(id => id !== itemId) : [...cur, itemId] }
      })
      const active = (await supabase.from(table).select('fiscal_item_id').eq(keyCol, keyVal).eq('fiscal_item_id', itemId)).data?.length > 0
      // re-read actual state to decide insert/delete
      const { error: err } = active
        ? await supabase.from(table).delete().eq(keyCol, keyVal).eq('fiscal_item_id', itemId)
        : await supabase.from(table).insert({ [keyCol]: keyVal, fiscal_item_id: itemId })
      if (err) { fetchConfig(); console.error(err) }
    }
  }

  const toggleRegimeItem    = useCallback(makeToggle('regime_fiscal_items',    'regime',    setRegimeItems),    [fetchConfig])
  const toggleConditionItem = useCallback(makeToggle('condition_fiscal_items', 'condition', setConditionItems), [fetchConfig])
  const toggleTipoItem      = useCallback(makeToggle('tipo_fiscal_items',      'tipo',      setTipoItems),      [fetchConfig])

  return (
    <FiscalConfigContext.Provider value={{
      regimeItems, conditionItems, tipoItems,
      toggleRegimeItem, toggleConditionItem, toggleTipoItem,
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
