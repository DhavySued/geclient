/**
 * FiscalRecordsContext
 *
 * Gerencia duas tabelas do Supabase:
 *
 *   fiscal_month_records  — registro mensal por empresa
 *     (client_id, month) → { status, checks, pending_taxes, note, updated_at }
 *
 *   fiscal_status_history — audit log automático (via trigger no DB)
 *     (client_id, month, from_status, to_status, changed_at)
 *
 * Cada mês é um registro independente — sem sobrescrita entre competências.
 */
import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAudit } from './AuditContext'
import { useAuth } from './AuthContext'

const FiscalRecordsContext = createContext(null)

export function FiscalRecordsProvider({ children }) {
  // records: { [clientId]: { [month]: { id, status, checks, pendingTaxes, note, updatedAt } } }
  const [records, setRecords] = useState({})

  // history: { [clientId]: StatusHistoryEntry[] } — carregado sob demanda via getStatusHistory()
  const [history, setHistory] = useState({})

  const [loading, setLoading] = useState(true)
  const { logAudit } = useAudit()
  const { currentUser } = useAuth()

  // ── Carga inicial ──────────────────────────────────────────────────────────
  const fetchRecords = useCallback(async () => {
    const { data, error } = await supabase
      .from('fiscal_month_records')
      .select('*')
      .order('month', { ascending: false })
    if (error) { console.error('FiscalRecords fetch error:', error); setLoading(false); return }

    const map = {}
    for (const row of data) {
      if (!map[row.client_id]) map[row.client_id] = {}
      map[row.client_id][row.month] = rowToRecord(row)
    }
    setRecords(map)
    setLoading(false)
  }, [])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  // ── Realtime — fiscal_month_records ───────────────────────────────────────
  useEffect(() => {
    const ch = supabase
      .channel('fiscal-month-records-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fiscal_month_records' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const { client_id, month } = payload.old
          setRecords(prev => {
            const byClient = { ...(prev[client_id] ?? {}) }
            delete byClient[month]
            return { ...prev, [client_id]: byClient }
          })
          return
        }
        const row = payload.new
        setRecords(prev => ({
          ...prev,
          [row.client_id]: {
            ...(prev[row.client_id] ?? {}),
            [row.month]: rowToRecord(row),
          },
        }))
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  // ── Realtime — fiscal_status_history ─────────────────────────────────────
  // Atualiza o cache de histórico em tempo real quando o trigger do DB dispara
  useEffect(() => {
    const ch = supabase
      .channel('fiscal-status-history-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'fiscal_status_history' }, (payload) => {
        const row = payload.new
        setHistory(prev => {
          const existing = prev[row.client_id]
          if (!existing) return prev   // se não estava carregado, ignora — será buscado sob demanda
          return {
            ...prev,
            [row.client_id]: [histRowToEntry(row), ...existing],
          }
        })
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  // ── Helpers de conversão ───────────────────────────────────────────────────
  function rowToRecord(row) {
    return {
      id:           row.id,
      status:       row.status,
      checks:       row.checks ?? {},
      pendingTaxes: row.pending_taxes ?? [],
      note:         row.note ?? '',
      updatedAt:    row.updated_at ?? null,
    }
  }

  function histRowToEntry(row) {
    return {
      id:            row.id,
      month:         row.month,
      fromStatus:    row.from_status ?? null,
      toStatus:      row.to_status,
      changedAt:     row.changed_at,
      changedByName: row.changed_by_name ?? null,
    }
  }

  // ── API pública ────────────────────────────────────────────────────────────

  /** Retorna o registro de um cliente para um mês específico, ou null */
  function getRecord(clientId, month) {
    return records[clientId]?.[month] ?? null
  }

  /**
   * Retorna todos os registros mensais de um cliente (snapshot de cada mês),
   * ordenados do mais recente ao mais antigo.
   */
  function getClientHistory(clientId) {
    const byMonth = records[clientId] ?? {}
    return Object.entries(byMonth)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => b.month.localeCompare(a.month))
  }

  /**
   * Retorna o log de mudanças de status de um cliente (audit trail).
   * Busca no banco na primeira chamada; subsequentes usam cache.
   *
   * Cada entrada: { id, month, fromStatus, toStatus, changedAt }
   */
  const getStatusHistory = useCallback(async (clientId) => {
    if (history[clientId]) return history[clientId]

    const { data, error } = await supabase
      .from('fiscal_status_history')
      .select('*')
      .eq('client_id', clientId)
      .order('changed_at', { ascending: false })
      .limit(200)

    if (error) { console.error('StatusHistory fetch error:', error); return [] }

    const entries = data.map(histRowToEntry)
    setHistory(prev => ({ ...prev, [clientId]: entries }))
    return entries
  }, [history])

  /**
   * Cria ou atualiza o registro de (clientId, month).
   * O trigger no banco registra automaticamente a mudança em fiscal_status_history.
   */
  const upsertRecord = useCallback(async (clientId, month, updates, clientName) => {
    const existing = records[clientId]?.[month]

    const newStatus = updates.status ?? existing?.status ?? 'sem_consulta'
    const statusChanged = updates.status && updates.status !== existing?.status

    const payload = {
      client_id:     clientId,
      month,
      status:        newStatus,
      checks:        updates.checks       ?? existing?.checks       ?? {},
      pending_taxes: updates.pendingTaxes ?? existing?.pendingTaxes ?? [],
      note:          updates.note         ?? existing?.note         ?? '',
    }

    // Optimistic update
    setRecords(prev => ({
      ...prev,
      [clientId]: {
        ...(prev[clientId] ?? {}),
        [month]: {
          id:           existing?.id,
          status:       payload.status,
          checks:       payload.checks,
          pendingTaxes: payload.pending_taxes,
          note:         payload.note,
          updatedAt:    new Date().toISOString(),
        },
      },
    }))

    const { error } = await supabase
      .from('fiscal_month_records')
      .upsert(payload, { onConflict: 'client_id,month' })

    if (error) {
      console.error('FiscalRecords upsert error:', error)
      // Reverte o optimistic update
      setRecords(prev => ({
        ...prev,
        [clientId]: {
          ...(prev[clientId] ?? {}),
          [month]: existing ?? undefined,
        },
      }))
      return
    }

    // Registra a mudança de status manualmente (com o nome do usuário)
    if (statusChanged) {
      const histEntry = {
        client_id:       clientId,
        month,
        from_status:     existing?.status ?? null,
        to_status:       newStatus,
        changed_by_name: currentUser?.name ?? null,
      }
      const { data: histRows, error: histErr } = await supabase
        .from('fiscal_status_history')
        .insert(histEntry)
        .select()

      if (!histErr && histRows?.length) {
        // Atualiza o cache de histórico se já estava carregado
        setHistory(prev => {
          const existing = prev[clientId]
          if (!existing) return prev
          return {
            ...prev,
            [clientId]: [histRowToEntry(histRows[0]), ...existing],
          }
        })
      }
    }

    logAudit({
      action: existing ? 'update' : 'create',
      menu: 'fiscal',
      entity: 'fiscal_record',
      entityId: clientId,
      entityName: clientName ? `${clientName} — ${month}` : `${clientId} — ${month}`,
      changes: { month, ...(updates.status && { status: updates.status }), ...(updates.note !== undefined && { note: updates.note }) },
    })
  }, [records, logAudit, currentUser])

  return (
    <FiscalRecordsContext.Provider value={{
      records,
      loading,
      getRecord,
      getClientHistory,
      getStatusHistory,
      upsertRecord,
    }}>
      {children}
    </FiscalRecordsContext.Provider>
  )
}

export function useFiscalRecords() {
  const ctx = useContext(FiscalRecordsContext)
  if (!ctx) throw new Error('useFiscalRecords must be inside FiscalRecordsProvider')
  return ctx
}
