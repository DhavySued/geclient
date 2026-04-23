import { useState, useEffect, useRef, useMemo } from 'react'
import { DragDropContext } from '@hello-pangea/dnd'
import { BarChart3, Settings2, ChevronLeft, ChevronRight, AlertTriangle, Search, X, ArrowDownAZ } from 'lucide-react'
import { useFiscalKanban } from '../hooks/useKanban'
import { useKanbanSettings } from '../hooks/useKanbanSettings'
import { useSettings } from '../context/SettingsContext'
import { usePermissions } from '../hooks/usePermissions'
import KanbanColumn, { KanbanColumnHeader } from '../components/KanbanColumn'
import KanbanSettingsModal from '../components/KanbanSettingsModal'
import FiscalCard from '../components/FiscalCard'
import FilterBar from '../components/FilterBar'
import { useFiscalRecords } from '../context/FiscalRecordsContext'
import { useDragScroll } from '../hooks/useDragScroll'
import { calcFiscalScore, getApplicableItems } from '../hooks/useFiscalItems'
import { useFiscalItemsCtx } from '../context/FiscalItemsContext'
import { useFiscalConfig } from '../context/FiscalConfigContext'

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const DEFAULT_COLUMNS = [
  {
    id: 'sem_consulta',
    label: 'Sem Consulta',
    bg: 'bg-gray-500/10', border: 'border-gray-500/30', text: 'text-gray-400',
    dot: 'bg-gray-400', headerBg: 'bg-gray-100',
    accent: '#6b7280',
    description: 'Situação ainda não verificada',
  },
  {
    id: 'com_pendencia',
    label: 'Com Pendência',
    bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400',
    dot: 'bg-red-400', headerBg: 'bg-red-950/40',
    accent: '#ef4444',
    description: 'Pendências identificadas',
  },
  {
    id: 'comunicado_cliente',
    label: 'Comunicado ao Cliente',
    bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400',
    dot: 'bg-blue-400', headerBg: 'bg-blue-950/40',
    accent: '#3b82f6',
    description: 'Cliente notificado sobre as pendências',
  },
  {
    id: 'em_regularizacao',
    label: 'Em Regularização',
    bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400',
    dot: 'bg-purple-400', headerBg: 'bg-purple-950/40',
    accent: '#a855f7',
    description: 'Processo de regularização iniciado',
  },
  {
    id: 'resolvido',
    label: 'Resolvido',
    bg: 'bg-teal-500/10', border: 'border-teal-500/30', text: 'text-teal-400',
    dot: 'bg-teal-400', headerBg: 'bg-teal-950/40',
    accent: '#14b8a6',
    description: 'Pendências resolvidas',
  },
  {
    id: 'sem_pendencia',
    label: 'Sem Pendência',
    bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400',
    dot: 'bg-emerald-400', headerBg: 'bg-emerald-950/40',
    accent: '#10b981',
    description: 'Situação regular · Sem pendências',
  },
]

function toMonthString(year, month) {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

export default function FiscalPage({ onOpenClient }) {
  const now = new Date()
  const [month, setMonth]             = useState(now.getMonth())
  const [year, setYear]               = useState(now.getFullYear())
  const [levelFilter, setLevelFilter]   = useState('all')
  const [regimeFilter, setRegimeFilter] = useState('all')
  const [tipoFilter, setTipoFilter]     = useState('all')
  const [nameSearch, setNameSearch]     = useState('')
  const [sortAlpha, setSortAlpha]       = useState(false)
  const [exclusaoFilter, setExclusaoFilter] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const { can } = usePermissions()
  const canEdit = can('fiscal', 'edit')
  const { onDragScrollStart, onDragScrollEnd } = useDragScroll()
  const { settings } = useSettings()
  const stickyHeaders = settings.stickyKanbanHeaders

  const selectedMonth   = toMonthString(year, month)
  const isCurrentMonth  = selectedMonth === toMonthString(now.getFullYear(), now.getMonth())

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const { columns, updateLabel, reorder, addColumn, removeColumn } = useKanbanSettings('fiscal', DEFAULT_COLUMNS)

  const allStatusIds = useMemo(() => columns.map(c => c.id), [columns])

  const { columns: kanbanColumns, moveClient } = useFiscalKanban(
    levelFilter, selectedMonth, allStatusIds,
    { regimeFilter, tipoFilter, nameSearch }
  )
  const { getRecord, loading: recordsLoading } = useFiscalRecords()
  const { fiscalItems }                        = useFiscalItemsCtx()
  const { regimeItems, conditionItems, tipoItems } = useFiscalConfig()

  // ── clientMap: always-fresh client data keyed by ID ──────────────────────
  // Derived from kanbanColumns so it respects levelFilter automatically.
  const clientMap = useMemo(() => {
    const m = {}
    columns.forEach(col => {
      ;(kanbanColumns[col.id]?.clients ?? []).forEach(c => { m[c.id] = c })
    })
    return m
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kanbanColumns])

  // ── localCols: { colId: clientId[] } | null ──────────────────────────────
  // Stores only IDs so the drag order is decoupled from server data.
  // null = not yet initialised (loading or after month/filter reset).
  const [localCols, setLocalCols] = useState(null)

  // isDraggingRef: prevents the sync effect from running mid-drag, which
  // would cause unwanted re-renders and break the drag animation.
  const isDraggingRef = useRef(false)

  // Reset quando qualquer filtro ou mês muda
  useEffect(() => { setLocalCols(null) }, [selectedMonth, levelFilter, regimeFilter, tipoFilter, nameSearch])

  // ── Sync effect ───────────────────────────────────────────────────────────
  // Fires whenever the server state (kanbanColumns) changes.
  // Rules:
  //   - If recordsLoading    → skip: kanbanColumns ainda não tem os status reais.
  //   - If localCols is null → initialise from server order.
  //   - If a drag is active  → skip entirely (isDraggingRef guard).
  //   - Otherwise            → only add new clients / remove deleted ones.
  //                            NEVER changes the column of an existing card.
  useEffect(() => {
    if (recordsLoading) return        // aguarda records carregarem antes de inicializar
    if (isDraggingRef.current) return

    setLocalCols(prev => {
      // Build server-side ID sets
      const serverIdToCol = {}
      const serverIdSet   = new Set()
      columns.forEach(col => {
        ;(kanbanColumns[col.id]?.clients ?? []).forEach(c => {
          serverIdToCol[c.id] = col.id
          serverIdSet.add(c.id)
        })
      })

      // Initialise on first load (or after reset)
      if (prev === null) {
        const init = {}
        columns.forEach(col => {
          init[col.id] = (kanbanColumns[col.id]?.clients ?? []).map(c => c.id)
        })
        return init
      }

      // Diff local vs server
      const localIdSet = new Set(columns.flatMap(col => prev[col.id] ?? []))
      const newIds     = [...serverIdSet].filter(id => !localIdSet.has(id))
      const deletedIds = new Set([...localIdSet].filter(id => !serverIdSet.has(id)))

      // Nothing to do — return same reference so React skips the re-render
      if (!newIds.length && !deletedIds.size) return prev

      const next = {}
      columns.forEach(col => {
        next[col.id] = (prev[col.id] ?? []).filter(id => !deletedIds.has(id))
      })
      newIds.forEach(id => {
        const col = serverIdToCol[id]
        if (next[col]) next[col].unshift(id)
      })
      return next
    })
  }, [kanbanColumns, recordsLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Score helper ──────────────────────────────────────────────────────────
  function getClientScore(clientId) {
    const client = clientMap[clientId]
    if (!client) return null
    const record     = getRecord(clientId, selectedMonth)
    const applicable = getApplicableItems(client, fiscalItems, regimeItems, conditionItems, tipoItems)
    if (!applicable.length) return null
    return calcFiscalScore(record?.checks ?? {}, applicable)
  }

  // ── Internal move (updates localCols + persists) ──────────────────────────
  function applyMove(draggableId, source, destination) {
    setLocalCols(prev => {
      const base = prev ?? (() => {
        const init = {}
        columns.forEach(col => {
          init[col.id] = (kanbanColumns[col.id]?.clients ?? []).map(c => c.id)
        })
        return init
      })()

      const next = {}
      columns.forEach(col => { next[col.id] = [...(base[col.id] ?? [])] })

      const srcList = next[source.droppableId]
      const idx     = srcList.indexOf(draggableId)
      if (idx === -1) return base

      srcList.splice(idx, 1)
      next[destination.droppableId].splice(destination.index, 0, draggableId)
      return next
    })

    moveClient(draggableId, destination.droppableId).catch(console.error)
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function getColClients(colId) {
    // While localCols is null (first render), fall back to server order
    const ids = localCols?.[colId]
      ?? (kanbanColumns[colId]?.clients ?? []).map(c => c.id)
    let clients = ids.map(id => clientMap[id]).filter(Boolean)
    if (exclusaoFilter) clients = clients.filter(c => c.emExclusaoSimples)
    return sortAlpha
      ? [...clients].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }))
      : clients
  }

  const totalVisible = columns.reduce((sum, col) => sum + getColClients(col.id).length, 0)

  const exclusaoCount = columns
    .flatMap(col => getColClients(col.id))
    .filter(c => c.emExclusaoSimples).length

  // ── Drag handlers ─────────────────────────────────────────────────────────
  function onDragStart() {
    isDraggingRef.current = true
    onDragScrollStart()
  }

  function onDragEnd(result) {
    isDraggingRef.current = false
    onDragScrollEnd()
    if (!canEdit) return

    const { destination, source, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId &&
        destination.index       === source.index) return

    applyMove(draggableId, source, destination)
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={20} className="text-brand-400" />
            <h1 className="text-xl font-bold text-gray-900">Kanban Fiscal</h1>
          </div>
          <p className="text-sm text-gray-500">
            Situação tributária por competência mensal.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Month Selector */}
          <div className="flex items-center gap-1 bg-gray-100 border border-gray-200 rounded-xl px-3 py-2">
            <button onClick={prevMonth} className="text-gray-500 hover:text-gray-700 transition-colors p-0.5">
              <ChevronLeft size={15} />
            </button>
            <span className="text-sm font-semibold text-gray-700 w-36 text-center">
              {MONTHS[month]} de {year}
              {isCurrentMonth && <span className="ml-1.5 text-[10px] text-brand-500 font-normal">• atual</span>}
            </span>
            <button onClick={nextMonth} className="text-gray-500 hover:text-gray-700 transition-colors p-0.5">
              <ChevronRight size={15} />
            </button>
          </div>

          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-all text-sm"
            title="Configurar colunas"
          >
            <Settings2 size={15} />
            <span className="hidden sm:inline">Colunas</span>
          </button>
        </div>
      </div>

      {/* Banner — empresas em exclusão do Simples */}
      {exclusaoCount > 0 && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl border"
          style={{ background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.25)' }}>
          <AlertTriangle size={15} style={{ color: '#EF4444', flexShrink: 0 }} />
          <p className="text-sm font-semibold" style={{ color: '#DC2626' }}>
            {exclusaoCount} empresa{exclusaoCount > 1 ? 's' : ''} em Exclusão do Simples
          </p>
        </div>
      )}

      {/* ── Barra de busca + regime + tipo ───────────────────────────────── */}
      <div className="mb-3 flex flex-wrap gap-2 items-center">

        {/* Busca por nome */}
        <div className="relative">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9CA3AF' }} />
          <input
            type="text"
            value={nameSearch}
            onChange={e => setNameSearch(e.target.value)}
            placeholder="Buscar empresa..."
            className="pl-8 pr-7 py-1.5 rounded-xl text-[12px] focus:outline-none transition-colors"
            style={{
              background: 'rgba(0,0,0,0.04)',
              border: nameSearch ? '1px solid rgba(243,146,0,0.40)' : '1px solid rgba(0,0,0,0.08)',
              color: '#111827',
              width: 180,
            }}
          />
          {nameSearch && (
            <button onClick={() => setNameSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }}>
              <X size={11} />
            </button>
          )}
        </div>

        <div className="w-px h-5 bg-gray-200 flex-shrink-0" />

        {/* Regime */}
        <div className="flex items-center gap-1">
          {[
            { value: 'all',               label: 'Regime' },
            { value: 'MEI',               label: 'MEI' },
            { value: 'Simples Nacional',  label: 'Simples' },
            { value: 'Lucro Presumido',   label: 'Presumido' },
            { value: 'Lucro Real',        label: 'Lucro Real' },
          ].map(r => (
            <button
              key={r.value}
              onClick={() => setRegimeFilter(r.value)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all"
              style={regimeFilter === r.value ? {
                background: 'rgba(168,85,247,0.12)',
                border: '1px solid rgba(168,85,247,0.30)',
                color: '#7C3AED',
              } : {
                background: 'rgba(0,0,0,0.03)',
                border: '1px solid rgba(0,0,0,0.08)',
                color: '#6B7280',
              }}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-gray-200 flex-shrink-0" />

        {/* Tipo */}
        <div className="flex items-center gap-1">
          {[
            { value: 'all',      label: 'Tipo' },
            { value: 'Serviço',  label: 'Serviço' },
            { value: 'Comércio', label: 'Comércio' },
            { value: 'Misto',    label: 'Misto' },
          ].map(t => (
            <button
              key={t.value}
              onClick={() => setTipoFilter(t.value)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all"
              style={tipoFilter === t.value ? {
                background: 'rgba(59,130,246,0.12)',
                border: '1px solid rgba(59,130,246,0.30)',
                color: '#2563EB',
              } : {
                background: 'rgba(0,0,0,0.03)',
                border: '1px solid rgba(0,0,0,0.08)',
                color: '#6B7280',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Filtro exclusão do Simples */}
        <button
          onClick={() => setExclusaoFilter(v => !v)}
          title={exclusaoFilter ? 'Remover filtro de exclusão' : 'Mostrar só empresas em exclusão do Simples/MEI'}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all"
          style={exclusaoFilter ? {
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.40)',
            color: '#DC2626',
          } : {
            background: 'rgba(0,0,0,0.03)',
            border: '1px solid rgba(0,0,0,0.08)',
            color: '#6B7280',
          }}
        >
          <AlertTriangle size={11} />
          Exclusão
        </button>

        {/* Limpar filtros — aparece só quando algum está ativo */}
        {(regimeFilter !== 'all' || tipoFilter !== 'all' || nameSearch || exclusaoFilter) && (
          <button
            onClick={() => { setRegimeFilter('all'); setTipoFilter('all'); setNameSearch(''); setExclusaoFilter(false) }}
            className="ml-1 flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] transition-all"
            style={{ color: '#9CA3AF', border: '1px solid rgba(0,0,0,0.08)' }}
          >
            <X size={10} />
            Limpar
          </button>
        )}

        <div className="w-px h-5 bg-gray-200 flex-shrink-0" />

        {/* Ordenação alfabética */}
        <button
          onClick={() => setSortAlpha(v => !v)}
          title={sortAlpha ? 'Remover ordenação A→Z' : 'Ordenar A→Z'}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all"
          style={sortAlpha ? {
            background: 'rgba(59,130,246,0.12)',
            border: '1px solid rgba(59,130,246,0.30)',
            color: '#2563EB',
          } : {
            background: 'rgba(0,0,0,0.03)',
            border: '1px solid rgba(0,0,0,0.08)',
            color: '#6B7280',
          }}
        >
          <ArrowDownAZ size={12} />
          A→Z
        </button>
      </div>

      {/* ── Filtro por nível ──────────────────────────────────────────────── */}
      <div className="mb-4">
        <FilterBar
          activeLevel={levelFilter}
          onLevelChange={setLevelFilter}
          totalClients={totalVisible}
        />
      </div>

      {/* Kanban Board — scroll area unificada (h + v) */}
      <div className="kanban-scroll-area flex-1 overflow-auto scrollbar-thin min-h-0">
        {/* wrapper min-h-full garante que colunas vazias têm altura suficiente p/ drop */}
        <div className="min-h-full flex flex-col pb-4">
          {stickyHeaders && (
            <div className="sticky top-0 z-20 bg-gray-50 pb-3 flex gap-4">
              {columns.map(col => {
                const colClients = getColClients(col.id)
                return <KanbanColumnHeader key={col.id} column={{ id: col.id, label: col.label, description: col.description, clients: colClients }} />
              })}
            </div>
          )}
          <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <div className="kanban-board flex gap-4 flex-1">
              {columns.map(col => {
                const colClients = getColClients(col.id)
                return (
                  <KanbanColumn
                    key={col.id}
                    showHeader={!stickyHeaders}
                    column={{ id: col.id, label: col.label, description: col.description, clients: colClients }}
                    colorConfig={col}
                  >
                    {colClients.map((client, index) => (
                      <FiscalCard
                        key={client.id}
                        client={client}
                        index={index}
                        record={getRecord(client.id, selectedMonth)}
                        onOpen={c => onOpenClient(c, selectedMonth)}
                        isDragDisabled={sortAlpha}
                      />
                    ))}
                  </KanbanColumn>
                )
              })}
            </div>
          </DragDropContext>
        </div>
      </div>

      {showSettings && (
        <KanbanSettingsModal
          columns={columns}
          onRename={updateLabel}
          onReorder={reorder}
          onAdd={addColumn}
          onRemove={removeColumn}
          onClose={() => setShowSettings(false)}
        />
      )}

    </div>
  )
}
