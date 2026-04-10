import { useMemo } from 'react'
import { useClients } from '../context/ClientsContext'
import { useFiscalRecords } from '../context/FiscalRecordsContext'

const FISCAL_STATUS_IDS = [
  'sem_consulta', 'com_pendencia', 'comunicado_cliente',
  'em_regularizacao', 'resolvido', 'sem_pendencia',
]

export function useFiscalKanban(levelFilter, selectedMonth) {
  const { clients, updateClient }        = useClients()
  const { records, getRecord, upsertRecord } = useFiscalRecords()

  const filtered = useMemo(() => {
    if (levelFilter === 'all') return clients
    return clients.filter(c => c.level === levelFilter)
  }, [clients, levelFilter])

  const columns = useMemo(() => {
    function getStatus(client) {
      return getRecord(client.id, selectedMonth)?.status ?? 'sem_consulta'
    }
    return Object.fromEntries(
      FISCAL_STATUS_IDS.map(id => [
        id,
        { id, label: id, clients: filtered.filter(c => getStatus(c) === id) },
      ])
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, selectedMonth, records])

  async function moveClient(clientId, targetStatus) {
    const existing = getRecord(clientId, selectedMonth)
    await upsertRecord(clientId, selectedMonth, {
      status:       targetStatus,
      checks:       existing?.checks       ?? {},
      pendingTaxes: existing?.pendingTaxes ?? [],
      note:         existing?.note         ?? '',
    })
    // fiscalStatus no cliente reflete a coluna atual do kanban
    updateClient(clientId, { fiscalStatus: targetStatus })
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

