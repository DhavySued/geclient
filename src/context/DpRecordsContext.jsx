import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const DpRecordsContext = createContext(null)

function rowToRecord(row) {
  return {
    id:                 row.id,
    adiantamentoFolha:  row.adiantamento_folha ?? false,
    folha:              row.folha ?? false,
    envioFolha:         row.envio_folha ?? false,
    inss:               row.inss ?? false,
    fgts:               row.fgts ?? false,
    proLabore:          row.pro_labore ?? false,
    autonomoSal:        row.autonomo_sal ?? false,
    semMovimentacao:    row.sem_movimentacao ?? false,
    det:                row.det ?? false,
    status:             row.status ?? 'pendente',
  }
}

export function DpRecordsProvider({ children }) {
  const [records, setRecords] = useState({})
  const [loading, setLoading]  = useState(true)

  const fetchRecords = useCallback(async () => {
    const { data, error } = await supabase
      .from('dp_records')
      .select('*')
    if (error) { console.error('DpRecords fetch error:', error); setLoading(false); return }

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
      .channel('dp-records-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dp_records' }, (payload) => {
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
      id:                existing?.id,
      adiantamentoFolha: existing?.adiantamentoFolha ?? false,
      folha:             existing?.folha ?? false,
      envioFolha:        existing?.envioFolha ?? false,
      inss:              existing?.inss ?? false,
      fgts:              existing?.fgts ?? false,
      proLabore:         existing?.proLabore ?? false,
      autonomoSal:       existing?.autonomoSal ?? false,
      semMovimentacao:   existing?.semMovimentacao ?? false,
      det:               existing?.det ?? false,
      status:            existing?.status ?? 'pendente',
      ...updates,
    }

    setRecords(prev => ({
      ...prev,
      [clientId]: { ...(prev[clientId] ?? {}), [yearMonth]: optimistic },
    }))

    const payload = {
      client_id:          clientId,
      year_month:         yearMonth,
      adiantamento_folha: optimistic.adiantamentoFolha,
      folha:              optimistic.folha,
      envio_folha:        optimistic.envioFolha,
      inss:               optimistic.inss,
      fgts:               optimistic.fgts,
      pro_labore:         optimistic.proLabore,
      autonomo_sal:       optimistic.autonomoSal,
      sem_movimentacao:   optimistic.semMovimentacao,
      det:                optimistic.det,
      status:             optimistic.status ?? 'pendente',
    }

    const { error } = await supabase
      .from('dp_records')
      .upsert(payload, { onConflict: 'client_id,year_month' })

    if (error) {
      console.error('DpRecords upsert error:', error)
      setRecords(prev => ({
        ...prev,
        [clientId]: {
          ...(prev[clientId] ?? {}),
          [yearMonth]: existing ?? undefined,
        },
      }))
      return { error }
    }
    return { error: null }
  }, [records])

  return (
    <DpRecordsContext.Provider value={{ records, loading, getRecord, upsertRecord }}>
      {children}
    </DpRecordsContext.Provider>
  )
}

export function useDpRecords() {
  const ctx = useContext(DpRecordsContext)
  if (!ctx) throw new Error('useDpRecords must be inside DpRecordsProvider')
  return ctx
}
