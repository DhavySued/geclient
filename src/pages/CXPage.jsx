import { useState, useEffect, useRef, useMemo } from 'react'
import { DragDropContext } from '@hello-pangea/dnd'
import { Users, AlertOctagon, Settings2, ArrowDownAZ } from 'lucide-react'
import { useCXKanban } from '../hooks/useKanban'
import { useKanbanSettings } from '../hooks/useKanbanSettings'
import { useSettings } from '../context/SettingsContext'
import { usePermissions } from '../hooks/usePermissions'
import { useDragScroll } from '../hooks/useDragScroll'
import KanbanColumn, { KanbanColumnHeader } from '../components/KanbanColumn'
import KanbanSettingsModal from '../components/KanbanSettingsModal'
import CXCard from '../components/CXCard'
import FilterBar from '../components/FilterBar'

const DEFAULT_COLUMNS = [
  {
    id: 'cliente_novo',
    label: 'Cliente Novo',
    bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600',
    dot: 'bg-amber-400', headerBg: 'bg-amber-50',
    accent: '#f39200',
    description: 'Recém cadastrado · Onboarding',
  },
  {
    id: 'promotor',
    label: 'Promotor (Uau)',
    bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600',
    dot: 'bg-emerald-500', headerBg: 'bg-emerald-50',
    accent: '#10b981',
    description: 'Satisfeito · Feedback positivo',
  },
  {
    id: 'neutro',
    label: 'Neutro (Estável)',
    bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600',
    dot: 'bg-blue-500', headerBg: 'bg-blue-50',
    accent: '#3b82f6',
    description: 'Estável · Sem reclamações',
  },
  {
    id: 'risco_churn',
    label: 'Risco de Churn',
    bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600',
    dot: 'bg-orange-500', headerBg: 'bg-orange-50',
    accent: '#f97316',
    description: 'Desgastado · Erros repetidos',
  },
  {
    id: 'detrator',
    label: 'Detrator (Crítico)',
    bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600',
    dot: 'bg-red-500', headerBg: 'bg-red-50',
    accent: '#ef4444',
    description: 'Crítico · Procurando outro escritório',
  },
]

export default function CXPage({ onOpenClient }) {
  const [levelFilter, setLevelFilter] = useState('all')
  const [sortAlpha, setSortAlpha]     = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const { columns: kanbanColumns, moveClient } = useCXKanban(levelFilter)
  const { columns, updateLabel, reorder } = useKanbanSettings('cx', DEFAULT_COLUMNS)
  const { can } = usePermissions()
  const canEdit = can('cx', 'edit')
  const { onDragScrollStart, onDragScrollEnd } = useDragScroll()

  // ── Ordem local (igual ao FiscalPage) ────────────────────────────────────
  const [localCols, setLocalCols] = useState(null)
  const isDraggingRef = useRef(false)

  useEffect(() => { setLocalCols(null) }, [levelFilter])

  useEffect(() => {
    if (isDraggingRef.current) return
    setLocalCols(prev => {
      const serverIdToCol = {}
      const serverIdSet   = new Set()
      columns.forEach(col => {
        ;(kanbanColumns[col.id]?.clients ?? []).forEach(c => {
          serverIdToCol[c.id] = col.id
          serverIdSet.add(c.id)
        })
      })
      if (prev === null) {
        const init = {}
        columns.forEach(col => {
          init[col.id] = (kanbanColumns[col.id]?.clients ?? []).map(c => c.id)
        })
        return init
      }
      const localIdSet = new Set(columns.flatMap(col => prev[col.id] ?? []))
      const newIds     = [...serverIdSet].filter(id => !localIdSet.has(id))
      const deletedIds = new Set([...localIdSet].filter(id => !serverIdSet.has(id)))
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
  }, [kanbanColumns]) // eslint-disable-line react-hooks/exhaustive-deps

  // clientMap para lookup por ID
  const clientMap = useMemo(() => {
    const m = {}
    columns.forEach(col => {
      ;(kanbanColumns[col.id]?.clients ?? []).forEach(c => { m[c.id] = c })
    })
    return m
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kanbanColumns])

  function getColClients(colId) {
    const ids = localCols?.[colId]
      ?? (kanbanColumns[colId]?.clients ?? []).map(c => c.id)
    const clients = ids.map(id => clientMap[id]).filter(Boolean)
    return sortAlpha
      ? [...clients].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }))
      : clients
  }

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
      const idx = srcList.indexOf(draggableId)
      if (idx === -1) return base
      srcList.splice(idx, 1)
      next[destination.droppableId].splice(destination.index, 0, draggableId)
      return next
    })
    moveClient(draggableId, destination.droppableId)
  }

  const totalVisible = columns.reduce((sum, col) => sum + getColClients(col.id).length, 0)

  const { settings } = useSettings()
  const stickyHeaders = settings.stickyKanbanHeaders

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
    if (destination.droppableId === source.droppableId && destination.index === source.index) return
    applyMove(draggableId, source, destination)
  }

  const premiumAtRisk = columns
    .filter(c => c.id === 'risco_churn' || c.id === 'detrator')
    .flatMap(c => getColClients(c.id))
    .filter(c => c.level === 'Premium').length

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users size={20} className="text-brand-400" />
            <h1 className="text-xl font-bold text-gray-900">Customer Experience</h1>
          </div>
          <p className="text-sm text-gray-500">Health Score e relacionamento com o cliente.</p>
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

      {/* Alert Banner */}
      {premiumAtRisk > 0 && (
        <div className="mb-5 flex items-center gap-3 bg-red-950/50 border border-red-500/30 rounded-xl px-4 py-3">
          <AlertOctagon size={16} className="text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300">
            <span className="font-bold">{premiumAtRisk} cliente{premiumAtRisk > 1 ? 's' : ''} Premium</span> em situação de risco ou detratores. Priorize o atendimento.
          </p>
        </div>
      )}

      {/* Filter Bar + sort */}
      <div className="mb-6 flex items-center gap-3 flex-wrap">
        <FilterBar
          activeLevel={levelFilter}
          onLevelChange={setLevelFilter}
          totalClients={totalVisible}
        />
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

      {/* Kanban Board — scroll area unificada (h + v) */}
      <div className="kanban-scroll-area flex-1 overflow-auto scrollbar-thin min-h-0">
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
                      <CXCard key={client.id} client={client} index={index} onOpen={onOpenClient} isDragDisabled={sortAlpha} />
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
          onClose={() => setShowSettings(false)}
          // CX não suporta colunas customizadas (status é campo direto no client)
        />
      )}
    </div>
  )
}
