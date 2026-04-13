import { useMemo } from 'react'
import { useClients } from '../context/ClientsContext'
import { useFiscalRecords } from '../context/FiscalRecordsContext'

const DEFAULT_FISCAL_STATUS_IDS = [
  'sem_consulta', 'com_pendencia', 'comunicado_cliente',
  'em_regularizacao', 'resolvido', 'sem_pendencia',
]

// allStatusIds: lista dinâmica de IDs vindos de useKanbanSettings (inclui colunas customizadas)
// extraFilters: { regimeFilter, tipoFilter, nameSearch }
export function useFiscalKanban(levelFilter, selectedMonth, allStatusIds, extraFilters = {}) {
  const statusIds = allStatusIds ?? DEFAULT_FISCAL_STATUS_IDS
  const { regimeFilter = 'all', tipoFilter = 'all', nameSearch = '' } = extraFilters

  const { clients, updateClient }            = useClients()
  const { records, getRecord, upsertRecord } = useFiscalRecords()

  const filtered = useMemo(() => {
    let list = clients
    if (levelFilter  !== 'all') list = list.filter(c => c.level  === levelFilter)
    if (regimeFilter !== 'all') list = list.filter(c => c.regime === regimeFilter)
    if (tipoFilter   !== 'all') list = list.filter(c => c.tipo   === tipoFilter)
    if (nameSearch.trim()) {
      const q = nameSearch.trim().toLowerCase()
      list = list.filter(c => c.name.toLowerCase().includes(q))
    }
    return list
  }, [clients, levelFilter, regimeFilter, tipoFilter, nameSearch])

  const columns = useMemo(() => {
    function getStatus(client) {
      return getRecord(client.id, selectedMonth)?.status ?? 'sem_consulta'
    }
    return Object.fromEntries(
      statusIds.map(id => [
        id,
        { id, label: id, clients: filtered.filter(c => getStatus(c) === id) },
      ])
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, selectedMonth, records, statusIds])

  async function moveClient(clientId, targetStatus, checksOverride = null) {
    const existing = getRecord(clientId, selectedMonth)
    await upsertRecord(clientId, selectedMonth, {
      status:       targetStatus,
      checks:       checksOverride ?? existing?.checks       ?? {},
      pendingTaxes: existing?.pendingTaxes ?? [],
      note:         existing?.note         ?? '',
    })
    updateClient(clientId, { fiscalStatus: targetStatus })
  }

  async function markAllOk(clientId, allChecked) {
    await moveClient(clientId, 'sem_pendencia', allChecked)
  }

  return { columns, moveClient, markAllOk }
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

