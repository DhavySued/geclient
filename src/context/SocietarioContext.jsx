import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAudit } from './AuditContext'
import { useAuth } from './AuthContext'

const SocietarioContext = createContext(null)

const COLUMN_LABELS = {
  ordem_servico: 'Ordem de Serviço',
  iniciado:      'Iniciado',
  finalizado:    'Finalizado',
}

function makeEntry(currentUser, action, extra = {}) {
  return {
    id:       crypto.randomUUID(),
    at:       new Date().toISOString(),
    userId:   currentUser?.id   ?? null,
    userName: currentUser?.name ?? 'Desconhecido',
    action,
    ...extra,
  }
}

function rowToCard(row) {
  return {
    id:             row.id,
    title:          row.title,
    clientId:       row.client_id ?? null,
    observations:   row.observations ?? [],
    responsibleIds: row.responsible_ids ?? [],
    columnId:       row.column_id,
    position:       row.position,
    createdAt:      row.created_at,
    updatedAt:      row.updated_at ?? row.created_at,
    cardHistory:    row.card_history ?? [],
    alert:          row.alert ?? false,
  }
}

export function SocietarioProvider({ children }) {
  const [cards, setCards]     = useState([])
  const [loading, setLoading] = useState(true)
  const { logAudit }    = useAudit()
  const { currentUser } = useAuth()

  const fetchCards = useCallback(async () => {
    const { data, error } = await supabase
      .from('societario_cards')
      .select('*')
      .order('position', { ascending: true })
    if (error) { console.error('Societario fetch error:', error); setLoading(false); return }
    setCards(data.map(rowToCard))
    setLoading(false)
  }, [])

  useEffect(() => { fetchCards() }, [fetchCards])

  useEffect(() => {
    const ch = supabase
      .channel('societario-cards-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'societario_cards' }, fetchCards)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchCards])

  const addCard = useCallback(async ({ title, clientId, observations, responsibleIds, columnId, alert }) => {
    const maxPos = cards
      .filter(c => c.columnId === columnId)
      .reduce((m, c) => Math.max(m, c.position), -1)

    const initialHistory = [makeEntry(currentUser, 'criado', {
      toColumn:      columnId,
      toColumnLabel: COLUMN_LABELS[columnId] ?? columnId,
    })]

    const { data, error } = await supabase
      .from('societario_cards')
      .insert({
        title,
        client_id:       clientId || null,
        observations:    observations ?? [],
        responsible_ids: responsibleIds ?? [],
        column_id:       columnId,
        position:        maxPos + 1,
        alert:           alert ?? false,
        card_history:    initialHistory,
      })
      .select()
      .single()
    if (error) return { error }

    setCards(prev => [...prev, rowToCard(data)])
    logAudit({
      action:     'create',
      menu:       'controle-societario',
      entity:     'societario_card',
      entityId:   data.id,
      entityName: title,
      changes:    { coluna: COLUMN_LABELS[columnId] ?? columnId },
    })
    return { error: null }
  }, [cards, currentUser, logAudit])

  const updateCard = useCallback(async (id, updates) => {
    const payload = {}
    if ('title'          in updates) payload.title           = updates.title
    if ('clientId'       in updates) payload.client_id       = updates.clientId || null
    if ('observations'   in updates) payload.observations    = updates.observations ?? []
    if ('responsibleIds' in updates) payload.responsible_ids = updates.responsibleIds ?? []
    if ('columnId'       in updates) payload.column_id       = updates.columnId
    if ('position'       in updates) payload.position        = updates.position
    if ('alert'          in updates) payload.alert           = updates.alert

    const card = cards.find(c => c.id === id)
    const historyEntry = makeEntry(currentUser, 'atualizado', {
      toColumn:      card?.columnId,
      toColumnLabel: COLUMN_LABELS[card?.columnId] ?? card?.columnId,
    })
    const newHistory = [...(card?.cardHistory ?? []), historyEntry]
    payload.card_history = newHistory

    const { error } = await supabase.from('societario_cards').update(payload).eq('id', id)
    if (error) return { error }

    setCards(prev => prev.map(c => c.id === id ? { ...c, ...updates, cardHistory: newHistory } : c))
    logAudit({
      action:     'update',
      menu:       'controle-societario',
      entity:     'societario_card',
      entityId:   id,
      entityName: updates.title ?? card?.title ?? id,
      changes:    Object.keys(payload).reduce((acc, k) => ({ ...acc, [k]: payload[k] }), {}),
    })
    return { error: null }
  }, [cards, currentUser, logAudit])

  const deleteCard = useCallback(async (id) => {
    const card = cards.find(c => c.id === id)
    const { error } = await supabase.from('societario_cards').delete().eq('id', id)
    if (error) return { error }

    setCards(prev => prev.filter(c => c.id !== id))
    logAudit({
      action:     'delete',
      menu:       'controle-societario',
      entity:     'societario_card',
      entityId:   id,
      entityName: card?.title ?? id,
      changes:    { coluna: COLUMN_LABELS[card?.columnId] ?? card?.columnId },
    })
    return { error: null }
  }, [cards, logAudit])

  const moveCard = useCallback(async (cardId, destColumnId, destIndex) => {
    // Pre-compute fora do updater para evitar duplicação no StrictMode
    const entryId = crypto.randomUUID()
    const entryAt = new Date().toISOString()

    setCards(prev => {
      const card = prev.find(c => c.id === cardId)
      if (!card) return prev

      const isColumnChange = card.columnId !== destColumnId
      const newHistory = isColumnChange
        ? [...(card.cardHistory ?? []), {
            id:              entryId,
            at:              entryAt,
            userId:          currentUser?.id   ?? null,
            userName:        currentUser?.name ?? 'Desconhecido',
            action:          'movido',
            fromColumn:      card.columnId,
            fromColumnLabel: COLUMN_LABELS[card.columnId] ?? card.columnId,
            toColumn:        destColumnId,
            toColumnLabel:   COLUMN_LABELS[destColumnId] ?? destColumnId,
          }]
        : card.cardHistory ?? []

      const without  = prev.filter(c => c.id !== cardId)
      const destList = without
        .filter(c => c.columnId === destColumnId)
        .sort((a, b) => a.position - b.position)
      destList.splice(destIndex, 0, { ...card, columnId: destColumnId, cardHistory: newHistory })

      const updates = destList.map((c, i) => ({ ...c, position: i }))
      const rest    = without.filter(c => c.columnId !== destColumnId)

      Promise.all(
        updates.map(c => {
          const p = { column_id: c.columnId, position: c.position }
          if (c.id === cardId && isColumnChange) p.card_history = newHistory
          return supabase.from('societario_cards').update(p).eq('id', c.id)
        })
      ).catch(err => console.error('Societario move error:', err))

      if (isColumnChange) {
        logAudit({
          action:     'update',
          menu:       'controle-societario',
          entity:     'societario_card',
          entityId:   cardId,
          entityName: card.title,
          changes:    {
            de:   COLUMN_LABELS[card.columnId]  ?? card.columnId,
            para: COLUMN_LABELS[destColumnId]   ?? destColumnId,
          },
        })
      }

      return [...rest, ...updates].sort((a, b) => a.position - b.position)
    })
  }, [currentUser, logAudit])

  return (
    <SocietarioContext.Provider value={{ cards, loading, addCard, updateCard, deleteCard, moveCard }}>
      {children}
    </SocietarioContext.Provider>
  )
}

export function useSocietario() {
  const ctx = useContext(SocietarioContext)
  if (!ctx) throw new Error('useSocietario must be inside SocietarioProvider')
  return ctx
}
