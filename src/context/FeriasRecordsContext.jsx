import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const FeriasRecordsContext = createContext(null)

function rowToRecord(row) {
  return {
    id:           row.id,
    clientId:     row.client_id,
    date:         row.date,
    done:         row.done ?? false,
    nextForecast: row.next_forecast ?? null,
    observations: row.observations ?? '',
    createdAt:    row.created_at ?? null,
  }
}

export function FeriasRecordsProvider({ children }) {
  const [records, setRecords] = useState({})
  const [loading, setLoading] = useState(true)

  const fetchRecords = useCallback(async () => {
    const { data, error } = await supabase.from('ferias_records').select('*').order('date', { ascending: false })
    if (error) { console.error('FeriasRecords fetch error:', error); setLoading(false); return }
    const map = {}
    for (const row of data) {
      if (!map[row.client_id]) map[row.client_id] = []
      map[row.client_id].push(rowToRecord(row))
    }
    setRecords(map)
    setLoading(false)
  }, [])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  useEffect(() => {
    const ch = supabase
      .channel('ferias-records-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ferias_records' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const { id, client_id } = payload.old
          setRecords(prev => ({
            ...prev,
            [client_id]: (prev[client_id] ?? []).filter(r => r.id !== id),
          }))
          return
        }
        const rec = rowToRecord(payload.new)
        setRecords(prev => {
          const list = prev[rec.clientId] ?? []
          const exists = list.some(r => r.id === rec.id)
          const next = exists ? list.map(r => r.id === rec.id ? rec : r) : [rec, ...list]
          next.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
          return { ...prev, [rec.clientId]: next }
        })
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  function getRecords(clientId) {
    return records[clientId] ?? []
  }

  const addRecord = useCallback(async (clientId, data) => {
    const payload = {
      client_id:    clientId,
      date:         data.date,
      done:         data.done ?? false,
      next_forecast: data.nextForecast || null,
      observations: data.observations ?? '',
    }
    const { data: rows, error } = await supabase.from('ferias_records').insert(payload).select()
    if (error) { console.error('FeriasRecords add error:', error); return { error } }
    const rec = rowToRecord(rows[0])
    setRecords(prev => {
      const list = [rec, ...(prev[clientId] ?? [])]
      list.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
      return { ...prev, [clientId]: list }
    })
    return { error: null, record: rec }
  }, [])

  const updateRecord = useCallback(async (id, clientId, data) => {
    const payload = {
      date:          data.date,
      done:          data.done ?? false,
      next_forecast: data.nextForecast || null,
      observations:  data.observations ?? '',
    }
    const { error } = await supabase.from('ferias_records').update(payload).eq('id', id)
    if (error) { console.error('FeriasRecords update error:', error); return { error } }
    setRecords(prev => {
      const list = (prev[clientId] ?? []).map(r =>
        r.id === id ? { ...r, ...data, nextForecast: data.nextForecast || null } : r
      )
      list.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
      return { ...prev, [clientId]: list }
    })
    return { error: null }
  }, [])

  const deleteRecord = useCallback(async (id, clientId) => {
    const { error } = await supabase.from('ferias_records').delete().eq('id', id)
    if (error) { console.error('FeriasRecords delete error:', error); return { error } }
    setRecords(prev => ({
      ...prev,
      [clientId]: (prev[clientId] ?? []).filter(r => r.id !== id),
    }))
    return { error: null }
  }, [])

  return (
    <FeriasRecordsContext.Provider value={{ records, loading, getRecords, addRecord, updateRecord, deleteRecord }}>
      {children}
    </FeriasRecordsContext.Provider>
  )
}

export function useFeriasRecords() {
  const ctx = useContext(FeriasRecordsContext)
  if (!ctx) throw new Error('useFeriasRecords must be inside FeriasRecordsProvider')
  return ctx
}
