import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const ParcelamentoContext = createContext(null)

function rowToRecord(row) {
  return {
    id:             row.id,
    mei:            row.mei            ?? false,
    simples:        row.simples        ?? false,
    receitaFederal: row.receita_federal ?? false,
    pgfn:           row.pgfn           ?? false,
    sefaz:          row.sefaz          ?? false,
    status:         row.status         ?? 'pendente',
  }
}

export function ParcelamentoProvider({ children }) {
  const [records, setRecords] = useState({})
  const [loading, setLoading] = useState(true)

  const fetchRecords = useCallback(async () => {
    const { data, error } = await supabase.from('parcelamento_records').select('*')
    if (error) { console.error('ParcelamentoRecords fetch error:', error); setLoading(false); return }
    const map = {}
    for (const row of data) {
      if (!map[row.client_id]) map[row.client_id] = {}
      map[row.client_id][row.year_month] = rowToRecord(row)
    }
    setRecords(map)
    setLoading(false)
  }, [])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  useEffect(() => {
    const ch = supabase
      .channel('parcelamento-records-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parcelamento_records' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const { client_id, year_month } = payload.old
          setRecords(prev => {
            const byClient = { ...(prev[client_id] ?? {}) }
            delete byClient[year_month]
            return { ...prev, [client_id]: byClient }
          })
          return
        }
        const row = payload.new
        setRecords(prev => ({
          ...prev,
          [row.client_id]: {
            ...(prev[row.client_id] ?? {}),
            [row.year_month]: rowToRecord(row),
          },
        }))
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  function getRecord(clientId, yearMonth) {
    return records[clientId]?.[yearMonth] ?? null
  }

  const upsertRecord = useCallback(async (clientId, yearMonth, updates) => {
    const existing = records[clientId]?.[yearMonth]

    const optimistic = {
      id:             existing?.id,
      mei:            existing?.mei            ?? false,
      simples:        existing?.simples        ?? false,
      receitaFederal: existing?.receitaFederal ?? false,
      pgfn:           existing?.pgfn           ?? false,
      sefaz:          existing?.sefaz          ?? false,
      status:         existing?.status         ?? 'pendente',
      ...updates,
    }

    setRecords(prev => ({
      ...prev,
      [clientId]: { ...(prev[clientId] ?? {}), [yearMonth]: optimistic },
    }))

    const payload = {
      client_id:       clientId,
      year_month:      yearMonth,
      mei:             optimistic.mei,
      simples:         optimistic.simples,
      receita_federal: optimistic.receitaFederal,
      pgfn:            optimistic.pgfn,
      sefaz:           optimistic.sefaz,
      status:          optimistic.status,
    }

    const { error } = await supabase
      .from('parcelamento_records')
      .upsert(payload, { onConflict: 'client_id,year_month' })

    if (error) {
      console.error('ParcelamentoRecords upsert error:', error)
      setRecords(prev => ({
        ...prev,
        [clientId]: { ...(prev[clientId] ?? {}), [yearMonth]: existing ?? undefined },
      }))
      return { error }
    }
    return { error: null }
  }, [records])

  return (
    <ParcelamentoContext.Provider value={{ records, loading, getRecord, upsertRecord }}>
      {children}
    </ParcelamentoContext.Provider>
  )
}

export function useParcelamento() {
  const ctx = useContext(ParcelamentoContext)
  if (!ctx) throw new Error('useParcelamento must be inside ParcelamentoProvider')
  return ctx
}
