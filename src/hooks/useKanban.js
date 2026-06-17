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
  const { records, getRecord, getEffectiveRecord, upsertRecord } = useFiscalRecords()

  const filtered = useMemo(() => {
    let list = clients.filter(c => c.mapFiscal !== false)
    if (levelFilter  !== 'all') list = list.filter(c => c.level  === levelFilter)
    if (regimeFilter !== 'all') list = list.filter(c => c.regime === regimeFilter)
    if (tipoFilter   !== 'all') list = list.filter(c => c.tipo   === tipoFilter)
    if (nameSearch.trim()) {
      const q = nameSearch.trim().toLowerCase()
      list = list.filter(c => c.name.toLowerCase().includes(q))
    }
    // Oculta empresa se o mês selecionado for anterior à data de entrada no escritório
    list = list.filter(c => !c.entryDate || c.entryDate.slice(0, 7) <= selectedMonth)
    return list
  }, [clients, levelFilter, regimeFilter, tipoFilter, nameSearch, selectedMonth])

  const columns = useMemo(() => {
    function getStatus(client) {
      return getEffectiveRecord(client.id, selectedMonth)?.status ?? 'sem_consulta'
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
    const existing = getRecord(clientId, selectedMonth) ?? getEffectiveRecord(clientId, selectedMonth)
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

const DEFAULT_ONBOARDING_STATUS_IDS = [
  'sem_inicio', 'em_contato', 'aguardando_docs', 'em_configuracao', 'concluido',
]

export function useOnboardingKanban(levelFilter, allStatusIds) {
  const statusIds = allStatusIds ?? DEFAULT_ONBOARDING_STATUS_IDS
  const { clients, updateClient } = useClients()

  const filtered = useMemo(() => {
    let list = clients.filter(c => c.mapOnboarding === true && !c.onboardingFinished)
    if (levelFilter !== 'all') list = list.filter(c => c.level === levelFilter)
    return list
  }, [clients, levelFilter])

  const columns = useMemo(() =>
    Object.fromEntries(
      statusIds.map(id => [
        id,
        { id, label: id, clients: filtered.filter(c => (c.onboardingStatus ?? 'sem_inicio') === id) },
      ])
    )
  , [filtered, statusIds]) // eslint-disable-line react-hooks/exhaustive-deps

  function moveClient(clientId, targetStatus) {
    const client = clients.find(c => c.id === clientId)
    const now    = new Date().toISOString()
    const prev   = client?.onboardingHistory ?? []
    const newHistory = [...prev, { stage: targetStatus, enteredAt: now, note: '' }]
    updateClient(clientId, {
      onboardingStatus:      targetStatus,
      onboardingStatusSince: now,
      onboardingHistory:     newHistory,
    })
  }

  return { columns, moveClient }
}

export function useCXKanban(levelFilter) {
  const { clients, updateClient } = useClients()

  // Empresas cadastradas antes desta data seguem a regra antiga (mapNps basta).
  // A partir desta data, exige onboarding concluído para entrar no NPS.
  const NPS_CUTOFF = '2026-05-14'

  const filtered = useMemo(() => {
    let list = clients.filter(c => {
      if (c.mapNps === false) return false
      const isLegacy = !c.createdAt || c.createdAt.slice(0, 10) < NPS_CUTOFF
      return isLegacy || c.onboardingFinished === true
    })
    if (levelFilter !== 'all') list = list.filter(c => c.level === levelFilter)
    return list
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

