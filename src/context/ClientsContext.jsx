import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase, fromDb, toDb } from '../lib/supabase'
import { useAudit } from './AuditContext'

const ClientsContext = createContext(null)

export function ClientsProvider({ children }) {
  const [_allClients, setAllClients] = useState([])
  const [loading, setLoading]        = useState(true)
  const [error, setError]            = useState(null)

  const clients         = _allClients.filter(c => c.active !== false)
  const inactiveClients = _allClients.filter(c => c.active === false)
  const { logAudit } = useAudit()

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchClients = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })
    if (err) { setError(err.message); setLoading(false); return }
    setAllClients(data.map(fromDb))
    setLoading(false)
  }, [])

  useEffect(() => { fetchClients() }, [fetchClients])

  // ── Real-time subscription ───────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('clients-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'clients' }, ({ new: row }) => {
        setAllClients(prev => prev.some(c => c.id === row.id) ? prev : [fromDb(row), ...prev])
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'clients' }, ({ old: row }) => {
        setAllClients(prev => prev.filter(c => c.id !== row.id))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  // ── Add ──────────────────────────────────────────────────────────────────
  async function addClient(data) {
    const payload = toDb({
      fiscalStatus:    'sem_consulta',
      hasEmployees:    false,
      hasProLabore:    false,
      cxStatus:        'cliente_novo',
      scoreFiscal:     0,
      scoreCx:         0,
      lastInteraction: new Date().toISOString().slice(0, 10),
      pendingTaxes:    [],
      notes:           '',
      ...data,
    })
    const { data: rows, error: err } = await supabase
      .from('clients')
      .insert(payload)
      .select()
    if (err) throw new Error(err.message)
    const created = fromDb(rows[0])
    setAllClients(prev => [created, ...prev])
    logAudit({
      action: 'create', menu: 'cadastro', entity: 'client',
      entityId: created.id, entityName: created.name,
      changes: { name: created.name, cnpj: created.cnpj, level: created.level, regime: created.regime },
    })
    return created
  }

  // ── Update ───────────────────────────────────────────────────────────────
  async function updateClient(id, updates) {
    // Build only the db columns that changed
    const dbUpdates = {}
    const map = {
      name: 'name', cnpj: 'cnpj', level: 'level', regime: 'regime', tipo: 'tipo',
      fiscalStatus: 'fiscal_status',
      hasEmployees: 'has_employees', hasProLabore: 'has_pro_labore',
      emExclusaoSimples: 'em_exclusao_simples',
      active: 'active',
      cxStatus: 'cx_status', scoreFiscal: 'score_fiscal', scoreCx: 'score_cx',
      pendingTaxes: 'pending_taxes',
      lastInteraction: 'last_interaction',
      notes: 'notes',
    }
    for (const [camel, snake] of Object.entries(map)) {
      if (camel in updates) dbUpdates[snake] = updates[camel]
    }
    // Optimistic update — UI reage imediatamente
    const existing = _allClients.find(c => c.id === id)
    setAllClients(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
    const { error: err } = await supabase
      .from('clients')
      .update(dbUpdates)
      .eq('id', id)
    if (err) {
      // Reverte em caso de erro
      setAllClients(prev => prev.map(c => c.id === id ? (existing ?? c) : c))
      throw new Error(err.message)
    }
    logAudit({
      action: 'update', menu: 'cadastro', entity: 'client',
      entityId: id, entityName: existing?.name,
      changes: { fields: Object.keys(updates), updates },
    })
  }

  // ── Delete ───────────────────────────────────────────────────────────────
  async function deleteClient(id) {
    const target = clients.find(c => c.id === id)
    const { error: err } = await supabase.from('clients').delete().eq('id', id)
    if (err) throw new Error(err.message)
    setAllClients(prev => prev.filter(c => c.id !== id))
    logAudit({
      action: 'delete', menu: 'cadastro', entity: 'client',
      entityId: id, entityName: target?.name,
      changes: { name: target?.name, cnpj: target?.cnpj, regime: target?.regime, level: target?.level },
    })
  }

  // ── Batch Import ─────────────────────────────────────────────────────────
  async function importClients(rows) {
    const valid = rows
      .map(row => ({
        name:             row.nome            || row.name        || '',
        cnpj:             row.cnpj            || '',
        level:            normalizeLevel(row.nivel || row.level  || 'Standard'),
        regime:           row.regime          || 'Simples Nacional',
        tipo:             normalizeTipo(row.tipo),
        has_employees:    parseBoolean(row.tem_funcionarios ?? row.has_employees),
        has_pro_labore:   parseBoolean(row.tem_pro_labore   ?? row.has_pro_labore),
        cx_status:        normalizeCxStatus(row.status_cx   || row.cx_status),
        notes:            row.observacoes     || row.notes       || '',
        // campos internos com defaults
        fiscal_status:    'sem_consulta',
        score_fiscal:     0,
        score_cx:         0,
        last_interaction: new Date().toISOString().slice(0, 10),
        pending_taxes:    [],
      }))
      .filter(r => r.name && r.cnpj)

    if (!valid.length) return []

    const { data, error: err } = await supabase
      .from('clients')
      .insert(valid)
      .select()
    if (err) throw new Error(err.message)
    const created = data.map(fromDb)
    setAllClients(prev => [...created, ...prev])
    logAudit({
      action: 'import', menu: 'cadastro', entity: 'client',
      entityName: `${created.length} empresa(s)`,
      changes: { count: created.length, clients: created.map(c => ({ name: c.name, cnpj: c.cnpj })) },
    })
    return created  // retorna os registros criados (com IDs)
  }

  // ── Delete Many ──────────────────────────────────────────────────────────
  async function deleteMany(ids) {
    if (!ids.length) return
    const { error: err } = await supabase.from('clients').delete().in('id', ids)
    if (err) throw new Error(err.message)
    const targets = _allClients.filter(c => ids.includes(c.id))
    setAllClients(prev => prev.filter(c => !ids.includes(c.id)))
    logAudit({
      action: 'delete', menu: 'cadastro', entity: 'client',
      entityName: `${targets.length} empresa(s)`,
      changes: { count: targets.length, clients: targets.map(c => ({ id: c.id, name: c.name, cnpj: c.cnpj })) },
    })
  }

  return (
    <ClientsContext.Provider value={{
      clients, inactiveClients, loading, error,
      addClient, updateClient, deleteClient, deleteMany, importClients, refetch: fetchClients,
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

function normalizeTipo(val) {
  if (!val) return 'Serviço'
  const v = String(val).trim().toLowerCase()
  if (v === 'comércio' || v === 'comercio') return 'Comércio'
  if (v === 'misto') return 'Misto'
  return 'Serviço'
}

function normalizeCxStatus(val) {
  const VALID = ['cliente_novo', 'promotor', 'neutro', 'risco_churn', 'detrator']
  if (!val) return 'cliente_novo'
  const v = String(val).toLowerCase().trim().replace(/\s+/g, '_')
  return VALID.includes(v) ? v : 'cliente_novo'
}

function parseBoolean(val) {
  if (val === undefined || val === null || val === '') return false
  return ['true', 'sim', 's', '1', 'yes'].includes(String(val).toLowerCase().trim())
}
