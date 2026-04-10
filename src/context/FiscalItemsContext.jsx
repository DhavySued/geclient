import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// IDs cujos itens têm lógica especial derivada do perfil da empresa
// (não aparecem na seção de configuração por regime)
export const PROFILE_BASED_IDS = new Set([
  'inss', 'fgts', 'inss_pl', 'federal', 'municipal', 'estadual',
])

const FiscalItemsContext = createContext(null)

export function FiscalItemsProvider({ children }) {
  const [fiscalItems, setFiscalItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchItems = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('fiscal_items')
      .select('*')
      .order('created_at', { ascending: true })
    if (err) { setError(err.message); setLoading(false); return }
    setFiscalItems(data.map(r => ({ id: r.id, label: r.label, weight: r.weight })))
    setError(null)
    setLoading(false)
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  useEffect(() => {
    const ch = supabase
      .channel('fiscal-items-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fiscal_items' }, fetchItems)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchItems])

  const addFiscalItem = useCallback(async ({ label, weight }) => {
    const { error: err } = await supabase.from('fiscal_items').insert({ label, weight })
    if (err) throw new Error(err.message)
    await fetchItems()
  }, [fetchItems])

  const updateFiscalItem = useCallback(async (id, updates) => {
    const { error: err } = await supabase.from('fiscal_items').update(updates).eq('id', id)
    if (err) throw new Error(err.message)
    // Optimistic update
    setFiscalItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i))
  }, [])

  const deleteFiscalItem = useCallback(async (id) => {
    const { error: err } = await supabase.from('fiscal_items').delete().eq('id', id)
    if (err) throw new Error(err.message)
    setFiscalItems(prev => prev.filter(i => i.id !== id))
  }, [])

  return (
    <FiscalItemsContext.Provider value={{
      fiscalItems, loading, error,
      addFiscalItem, updateFiscalItem, deleteFiscalItem,
    }}>
      {children}
    </FiscalItemsContext.Provider>
  )
}

export function useFiscalItemsCtx() {
  const ctx = useContext(FiscalItemsContext)
  if (!ctx) throw new Error('useFiscalItemsCtx must be inside FiscalItemsProvider')
  return ctx
}
