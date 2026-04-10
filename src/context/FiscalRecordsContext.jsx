/**
 * FiscalRecordsContext
 *
 * Gerencia a tabela fiscal_month_records:
 *   (client_id, month) → { status, checks, pending_taxes, note }
 *
 * Cada mês é um registro independente — sem sobrescrita entre competências.
 */
import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const FiscalRecordsContext = createContext(null)

export function FiscalRecordsProvider({ children }) {
  // records: { [clientId]: { [month]: { id, status, checks, pendingTaxes, note } } }
  const [records, setRecords] = useState({})
  const [loading, setLoading] = useState(true)

  const fetchRecords = useCallback(async () => {
    const { data, error } = await supabase
      .from('fiscal_month_records')
      .select('*')
      .order('month', { ascending: false })
    if (error) { console.error('FiscalRecords fetch error:', error); setLoading(false); return }

    const map = {}
    for (const row of data) {
      if (!map[row.client_id]) map[row.client_id] = {}
      map[row.client_id][row.month] = {
        id:           row.id,
        status:       row.status,
        checks:       row.checks ?? {},
        pendingTaxes: row.pending_taxes ?? [],
        note:         row.note ?? '',
        updatedAt:    row.updated_at ?? null,
      }
    }
    setRecords(map)
    setLoading(false)
  }, [])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  // Subscription em tempo real — merge cirúrgico para evitar re-render completo
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
            [row.month]: {
              id:           row.id,
              status:       row.status,
              checks:       row.checks ?? {},
              pendingTaxes: row.pending_taxes ?? [],
              note:         row.note ?? '',
              updatedAt:    row.updated_at ?? null,
            },
          },
        }))
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  /** Retorna o registro de um cliente para um mês específico, ou null */
  function getRecord(clientId, month) {
    return records[clientId]?.[month] ?? null
  }

  /** Retorna todos os registros de um cliente, ordenados do mais recente */
  function getClientHistory(clientId) {
    const byMonth = records[clientId] ?? {}
    return Object.entries(byMonth)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => b.month.localeCompare(a.month))
  }

  /**
   * Cria ou atualiza o registro de (clientId, month).
   * Faz upsert — não sobrescreve outros meses.
   */
  const upsertRecord = useCallback(async (clientId, month, updates) => {
    const existing = records[clientId]?.[month]

    const payload = {
      client_id:    clientId,
      month,
      status:       updates.status       ?? existing?.status       ?? 'sem_consulta',
      checks:       updates.checks       ?? existing?.checks       ?? {},
      pending_taxes: updates.pendingTaxes ?? existing?.pendingTaxes ?? [],
      note:         updates.note         ?? existing?.note         ?? '',
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
      // Reverte o optimistic update restaurando o estado anterior
      setRecords(prev => ({
        ...prev,
        [clientId]: {
          ...(prev[clientId] ?? {}),
          [month]: existing ?? undefined,
        },
      }))
    }
  }, [records])

  return (
    <FiscalRecordsContext.Provider value={{ records, loading, getRecord, getClientHistory, upsertRecord }}>
      {children}
    </FiscalRecordsContext.Provider>
  )
}

export function useFiscalRecords() {
  const ctx = useContext(FiscalRecordsContext)
  if (!ctx) throw new Error('useFiscalRecords must be inside FiscalRecordsProvider')
  return ctx
}
