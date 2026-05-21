import { useState, useEffect, useRef, useMemo } from 'react'
import { DragDropContext } from '@hello-pangea/dnd'
import { UserPlus, Settings2, ArrowDownAZ, History, CheckCircle2, RotateCcw } from 'lucide-react'
import { useOnboardingKanban } from '../hooks/useKanban'
import { useKanbanSettings } from '../hooks/useKanbanSettings'

import { usePermissions } from '../hooks/usePermissions'
import { useDragScroll } from '../hooks/useDragScroll'
import { useClients } from '../context/ClientsContext'
import KanbanColumn, { KanbanColumnHeader } from '../components/KanbanColumn'
import KanbanSettingsModal from '../components/KanbanSettingsModal'
import OnboardingCard from '../components/OnboardingCard'
import FilterBar from '../components/FilterBar'

const DEFAULT_COLUMNS = [
  {
    id: 'sem_inicio',
    label: 'Sem Início',
    bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-500',
    dot: 'bg-slate-400', headerBg: 'bg-slate-50',
    accent: '#64748b',
    description: 'Onboarding ainda não iniciado',
  },
  {
    id: 'em_contato',
    label: 'Em Contato',
    bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-700',
    dot: 'bg-blue-500', headerBg: 'bg-blue-50',
    accent: '#2563eb',
    description: 'Contato inicial realizado',
  },
  {
    id: 'aguardando_docs',
    label: 'Aguard. Documentos',
    bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-700',
    dot: 'bg-amber-500', headerBg: 'bg-amber-50',
    accent: '#d97706',
    description: 'Aguardando envio de documentos',
  },
  {
    id: 'em_configuracao',
    label: 'Em Configuração',
    bg: 'bg-violet-100', border: 'border-violet-300', text: 'text-violet-700',
    dot: 'bg-violet-500', headerBg: 'bg-violet-50',
    accent: '#7c3aed',
    description: 'Configurando sistemas e acessos',
  },
  {
    id: 'concluido',
    label: 'Concluído',
    bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-700',
    dot: 'bg-emerald-500', headerBg: 'bg-emerald-50',
    accent: '#059669',
    description: 'Onboarding finalizado',
  },
]

export default function OnboardingPage({ onOpenClient }) {
  const [levelFilter, setLevelFilter] = useState('all')
  const [sortAlpha, setSortAlpha]     = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showHistory, setShowHistory]   = useState(false)

  const { clients, updateClient } = useClients()
  const { columns, updateLabel, updateDescription, reorder, addColumn, removeColumn } = useKanbanSettings('onboarding', DEFAULT_COLUMNS)
  const allStatusIds = useMemo(() => columns.map(c => c.id), [columns])
  const { columns: kanbanColumns, moveClient } = useOnboardingKanban(levelFilter, allStatusIds)

  const historyClients = useMemo(() =>
    clients
      .filter(c => c.mapOnboarding === true && c.onboardingFinished === true)
      .sort((a, b) => (b.onboardingFinishedAt ?? '').localeCompare(a.onboardingFinishedAt ?? ''))
  , [clients])

  function finalizeOnboarding(clientId) {
    updateClient(clientId, {
      onboardingFinished:   true,
      onboardingFinishedAt: new Date().toISOString(),
    })
  }

  function reactivateOnboarding(clientId) {
    updateClient(clientId, {
      onboardingFinished:   false,
      onboardingFinishedAt: null,
    })
  }
  const { can } = usePermissions()
  const canEdit = can('onboarding', 'edit')
  const { onDragScrollStart, onDragScrollEnd } = useDragScroll()

  const [localCols, setLocalCols] = useState(() => {
    const init = {}
    columns.forEach(col => {
      init[col.id] = (kanbanColumns[col.id]?.clients ?? []).map(c => c.id)
    })
    return init
  })
  const isDraggingRef = useRef(false)
  const filterResetMountedRef = useRef(false)

  useEffect(() => {
    if (!filterResetMountedRef.current) { filterResetMountedRef.current = true; return }
    setLocalCols(null)
  }, [levelFilter])

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

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-[520px]">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <UserPlus size={20} className="text-brand-400" />
            <h1 className="text-xl font-bold text-gray-900">Onboarding</h1>
          </div>
          <p className="text-sm text-gray-500">Acompanhe a integração dos novos clientes.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(v => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-sm"
            style={showHistory ? {
              background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.30)', color: '#4f46e5',
            } : {
              borderColor: '#e5e7eb', color: '#9ca3af',
            }}
          >
            <History size={15} />
            <span className="hidden sm:inline">Histórico</span>
            {historyClients.length > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: showHistory ? 'rgba(99,102,241,0.15)' : 'rgba(0,0,0,0.07)', color: showHistory ? '#4f46e5' : '#6b7280' }}>
                {historyClients.length}
              </span>
            )}
          </button>
          {!showHistory && (
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-all text-sm"
              title="Configurar colunas"
            >
              <Settings2 size={15} />
              <span className="hidden sm:inline">Colunas</span>
            </button>
          )}
        </div>
      </div>

      {showHistory ? (
        <HistoryView clients={historyClients} onReactivate={reactivateOnboarding} onOpen={onOpenClient} />
      ) : (
        <>
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

          <div className="kanban-scroll-area flex-1 overflow-auto scrollbar-thin min-h-0">
            <div className="min-h-full min-w-max flex flex-col pb-4">

              {/* Linha de cabeçalhos — sempre separada para altura uniforme */}
              <div className="sticky top-0 z-20 bg-gray-50 pb-3 flex gap-3 items-stretch">
                {columns.map((col, colIndex) => {
                  const colClients = getColClients(col.id)
                  const isEven = colIndex % 2 === 0
                  return (
                    <div
                      key={col.id}
                      className="flex-shrink-0 rounded-2xl px-2 pt-2 pb-1"
                      style={{
                        background: isEven ? 'rgba(255,255,255,0.92)' : 'rgba(243,244,246,0.80)',
                        border: isEven ? '1px solid rgba(0,0,0,0.07)' : '1px solid rgba(0,0,0,0.05)',
                      }}
                    >
                      <KanbanColumnHeader
                        column={{ id: col.id, label: col.label, description: col.description, clients: colClients, step: colIndex + 1 }}
                        colorConfig={col}
                      />
                    </div>
                  )
                })}
              </div>

              <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
                <div className="kanban-board flex gap-3 flex-1">
                  {columns.map((col, colIndex) => {
                    const colClients = getColClients(col.id)
                    const isEven = colIndex % 2 === 0
                    return (
                      <div
                        key={col.id}
                        className="flex-shrink-0 rounded-2xl p-2"
                        style={{
                          background: isEven ? 'rgba(255,255,255,0.92)' : 'rgba(243,244,246,0.80)',
                          border: isEven ? '1px solid rgba(0,0,0,0.07)' : '1px solid rgba(0,0,0,0.05)',
                        }}
                      >
                        <KanbanColumn
                          showHeader={false}
                          column={{ id: col.id, label: col.label, description: col.description, clients: colClients, step: colIndex + 1 }}
                          colorConfig={col}
                        >
                          {colClients.map((client, index) => (
                            <OnboardingCard
                              key={client.id}
                              client={client}
                              index={index}
                              onOpen={onOpenClient}
                              onFinalize={finalizeOnboarding}
                              isDragDisabled={sortAlpha}
                            />
                          ))}
                        </KanbanColumn>
                      </div>
                    )
                  })}
                </div>
              </DragDropContext>
            </div>
          </div>
        </>
      )}

      {showSettings && (
        <KanbanSettingsModal
          columns={columns}
          onRename={updateLabel}
          onRenameDescription={updateDescription}
          onReorder={reorder}
          onAdd={addColumn}
          onRemove={removeColumn}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}

function HistoryView({ clients, onReactivate, onOpen }) {
  function formatDate(str) {
    if (!str) return '—'
    return new Date(str).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  if (!clients.length) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <CheckCircle2 size={32} className="mx-auto mb-3 text-gray-200" />
          <p className="text-sm font-semibold text-gray-400">Nenhum onboarding finalizado</p>
          <p className="text-xs text-gray-400 mt-1">Os clientes finalizados aparecerão aqui.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto scrollbar-thin">
      <div className="max-w-2xl">
        <p className="text-xs text-gray-400 mb-4">{clients.length} onboarding{clients.length > 1 ? 's' : ''} finalizado{clients.length > 1 ? 's' : ''}</p>
        <div className="flex flex-col gap-2">
          {clients.map(client => (
            <div
              key={client.id}
              className="flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer"
              style={{ background: 'white', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
              onClick={() => onOpen?.(client)}
            >
              <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-gray-900 truncate">{client.name}</p>
                <p className="text-[11px] text-gray-400">{client.regime}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[11px] text-gray-400">Finalizado em</p>
                <p className="text-[12px] font-medium text-gray-600">{formatDate(client.onboardingFinishedAt)}</p>
              </div>
              <button
                onClick={e => { e.stopPropagation(); onReactivate(client.id) }}
                title="Reativar onboarding"
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-all flex-shrink-0"
                style={{ color: '#9ca3af', border: '1px solid rgba(0,0,0,0.08)' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#6366f1'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.30)'; e.currentTarget.style.background = 'rgba(99,102,241,0.06)' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'; e.currentTarget.style.background = 'transparent' }}
              >
                <RotateCcw size={11} />
                Reativar
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
