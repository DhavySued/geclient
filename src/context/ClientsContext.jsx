import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase, fromDb, toDb } from '../lib/supabase'

const ClientsContext = createContext(null)

export function ClientsProvider({ children }) {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchClients = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })
    if (err) { setError(err.message); setLoading(false); return }
    setClients(data.map(fromDb))
    setLoading(false)
  }, [])

  useEffect(() => { fetchClients() }, [fetchClients])

  // ── Real-time subscription ───────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('clients-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => {
        fetchClients()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchClients])

  // ── Add ──────────────────────────────────────────────────────────────────
  async function addClient(data) {
    const payload = toDb({
      fiscalStatus:  'sem_consulta',
      fiscalHistory: [],
      hasEmployees:  false,
      hasProLabore:  false,
      cxStatus:      'cliente_novo',
      scoreFiscal:   0,
      scoreCx:       0,
      lastInteraction: new Date().toISOString().slice(0, 10),
      pendingTaxes:  [],
      notes:         '',
      ...data,
    })
    const { data: rows, error: err } = await supabase
      .from('clients')
      .insert(payload)
      .select()
    if (err) throw new Error(err.message)
    const created = fromDb(rows[0])
    setClients(prev => [created, ...prev])
    return created
  }

  // ── Update ───────────────────────────────────────────────────────────────
  async function updateClient(id, updates) {
    // Build only the db columns that changed
    const dbUpdates = {}
    const map = {
      name: 'name', cnpj: 'cnpj', level: 'level', regime: 'regime', tipo: 'tipo',
      fiscalStatus: 'fiscal_status', fiscalHistory: 'fiscal_history',
      hasEmployees: 'has_employees', hasProLabore: 'has_pro_labore',
      cxStatus: 'cx_status', scoreFiscal: 'score_fiscal', scoreCx: 'score_cx',
      pendingTaxes: 'pending_taxes',
      lastInteraction: 'last_interaction',
      responsible: 'responsible', notes: 'notes', monthlyRevenue: 'monthly_revenue',
    }
    for (const [camel, snake] of Object.entries(map)) {
      if (camel in updates) dbUpdates[snake] = updates[camel]
    }
    const { error: err } = await supabase
      .from('clients')
      .update(dbUpdates)
      .eq('id', id)
    if (err) throw new Error(err.message)
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
  }

  // ── Delete ───────────────────────────────────────────────────────────────
  async function deleteClient(id) {
    const { error: err } = await supabase.from('clients').delete().eq('id', id)
    if (err) throw new Error(err.message)
    setClients(prev => prev.filter(c => c.id !== id))
  }

  // ── Batch Import ─────────────────────────────────────────────────────────
  async function importClients(rows) {
    const valid = rows
      .map(row => ({
        name:            row.nome || row.name || '',
        cnpj:            row.cnpj || '',
        level:           normalizeLevel(row.nivel || row.level || 'Standard'),
        regime:          row.regime || 'Simples Nacional',
        fiscal_status:   'sem_consulta',
        fiscal_history:  [],
        cx_status:       'cliente_novo',
        score_fiscal:    0,
        score_cx:        0,
        last_interaction: new Date().toISOString().slice(0, 10),
        pending_taxes:   [],
        responsible:     row.responsavel || row.responsible || '',
        notes:           row.observacoes || row.notes || '',
        monthly_revenue: Number(row.faturamento_mensal || row.monthlyRevenue || 0),
      }))
      .filter(r => r.name && r.cnpj)

    if (!valid.length) return 0

    const { data, error: err } = await supabase
      .from('clients')
      .insert(valid)
      .select()
    if (err) throw new Error(err.message)
    setClients(prev => [...data.map(fromDb), ...prev])
    return data.length
  }

  return (
    <ClientsContext.Provider value={{
      clients, loading, error,
      addClient, updateClient, deleteClient, importClients, refetch: fetchClients,
    }}>
      {children}
    </ClientsContext.Provider>
  )
}

export function useClients() {
  const ctx = useContext(ClientsContext)
  if (!ctx) throw new Error('useClients must be inside ClientsProvider')
  return ctx
}

function normalizeLevel(val) {
  const v = String(val).toLowerCase()
  if (v === 'premium') return 'Premium'
  if (v === 'gold') return 'Gold'
  return 'Standard'
}
