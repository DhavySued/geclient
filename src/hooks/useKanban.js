import { useMemo } from 'react'
import { useClients } from '../context/ClientsContext'

const FISCAL_STATUS_IDS = [
  'sem_consulta', 'com_pendencia', 'comunicado_cliente',
  'em_regularizacao', 'resolvido', 'sem_pendencia',
]

export function useFiscalKanban(levelFilter, selectedMonth) {
  const { clients, updateClient } = useClients()

  const filtered = useMemo(() => {
    if (levelFilter === 'all') return clients
    return clients.filter(c => c.level === levelFilter)
  }, [clients, levelFilter])

  const columns = useMemo(() => {
    function getStatus(client) {
      const entry = (client.fiscalHistory ?? []).find(h => h.month === selectedMonth)
      return entry?.status ?? 'sem_consulta'
    }
    return Object.fromEntries(
      FISCAL_STATUS_IDS.map(id => [
        id,
        { id, label: id, clients: filtered.filter(c => getStatus(c) === id) },
      ])
    )
  }, [filtered, selectedMonth])

  function moveClient(clientId, targetStatus) {
    const client = clients.find(c => c.id === clientId)
    if (!client) return

    const history = client.fiscalHistory ?? []
    const existingIdx = history.findIndex(h => h.month === selectedMonth)
    const existing = existingIdx >= 0 ? history[existingIdx] : null
    const snapshot = {
      month:        selectedMonth,
      status:       targetStatus,
      pendingTaxes: client.pendingTaxes ?? [],
      note:         existing?.note   ?? '',
      checks:       existing?.checks ?? {},
    }
    const updatedHistory = (
      existingIdx >= 0
        ? history.map((h, i) => i === existingIdx ? snapshot : h)
        : [snapshot, ...history]
    ).sort((a, b) => b.month.localeCompare(a.month))

    // fiscalStatus reflete sempre o mês mais recente
    const latestStatus = updatedHistory[0]?.status ?? 'sem_consulta'
    updateClient(clientId, { fiscalHistory: updatedHistory, fiscalStatus: latestStatus })
  }

  return { columns, moveClient }
}

export function useCXKanban(levelFilter) {
  const { clients, updateClient } = useClients()

  const filtered = useMemo(() => {
    if (levelFilter === 'all') return clients
    return clients.filter(c => c.level === levelFilter)
  }, [clients, levelFilter])

  const columns = useMemo(() => ({
    cliente_novo: { id: 'cliente_novo', label: 'Cliente Novo',   clients: filtered.filter(c => c.cxStatus === 'cliente_novo') },
    promotor:     { id: 'promotor',     label: 'Promotor',       clients: filtered.filter(c => c.cxStatus === 'promotor') },
    neutro:       { id: 'neutro',       label: 'Neutro',         clients: filtered.filter(c => c.cxStatus === 'neutro') },
    risco_churn:  { id: 'risco_churn',  label: 'Risco de Churn', clients: filtered.filter(c => c.cxStatus === 'risco_churn') },
    detrator:     { id: 'detrator',     label: 'Detrator',       clients: filtered.filter(c => c.cxStatus === 'detrator') },
  }), [filtered])

  function moveClient(clientId, targetStatus) {
    updateClient(clientId, { cxStatus: targetStatus })
  }

  return { columns, moveClient }
}

