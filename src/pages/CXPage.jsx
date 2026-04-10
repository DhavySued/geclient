import { useState } from 'react'
import { DragDropContext } from '@hello-pangea/dnd'
import { Users, AlertOctagon, Settings2 } from 'lucide-react'
import { useCXKanban } from '../hooks/useKanban'
import { useKanbanSettings } from '../hooks/useKanbanSettings'
import KanbanColumn from '../components/KanbanColumn'
import KanbanSettingsModal from '../components/KanbanSettingsModal'
import CXCard from '../components/CXCard'
import FilterBar from '../components/FilterBar'

const DEFAULT_COLUMNS = [
  {
    id: 'cliente_novo',
    label: 'Cliente Novo',
    bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400',
    dot: 'bg-amber-400', headerBg: 'bg-amber-950/40',
    description: 'Recém cadastrado · Onboarding',
  },
  {
    id: 'promotor',
    label: 'Promotor (Uau)',
    bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400',
    dot: 'bg-emerald-400', headerBg: 'bg-emerald-950/40',
    description: 'Satisfeito · Feedback positivo',
  },
  {
    id: 'neutro',
    label: 'Neutro (Estável)',
    bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400',
    dot: 'bg-blue-400', headerBg: 'bg-blue-950/40',
    description: 'Estável · Sem reclamações',
  },
  {
    id: 'risco_churn',
    label: 'Risco de Churn',
    bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400',
    dot: 'bg-orange-400', headerBg: 'bg-orange-950/40',
    description: 'Desgastado · Erros repetidos',
  },
  {
    id: 'detrator',
    label: 'Detrator (Crítico)',
    bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400',
    dot: 'bg-red-500', headerBg: 'bg-red-950/40',
    description: 'Crítico · Procurando outro escritório',
  },
]

export default function CXPage({ onOpenClient }) {
  const [levelFilter, setLevelFilter] = useState('all')
  const [showSettings, setShowSettings] = useState(false)

  const { columns: kanbanColumns, moveClient } = useCXKanban(levelFilter)
  const { columns, updateLabel, reorder } = useKanbanSettings('cx', DEFAULT_COLUMNS)

  const totalVisible = columns.reduce((sum, col) => sum + (kanbanColumns[col.id]?.clients.length ?? 0), 0)

  function onDragEnd(result) {
    const { destination, source, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return
    moveClient(draggableId, destination.droppableId)
  }

  const atRisk = columns
    .filter(c => c.id === 'risco_churn' || c.id === 'detrator')
    .reduce((sum, c) => sum + (kanbanColumns[c.id]?.clients.length ?? 0), 0)

  const premiumAtRisk = columns
    .filter(c => c.id === 'risco_churn' || c.id === 'detrator')
    .flatMap(c => kanbanColumns[c.id]?.clients ?? [])
    .filter(c => c.level === 'Premium').length

  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users size={20} className="text-amber-400" />
            <h1 className="text-xl font-bold text-white">Customer Experience</h1>
          </div>
          <p className="text-sm text-gray-500">Health Score e relacionamento com o cliente.</p>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600 transition-all text-sm"
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

      {/* Stats Row */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {columns.map(col => (
          <div key={col.id} className={`rounded-xl p-3 border ${col.headerBg} ${col.border}`}>
            <p className="text-xs text-gray-500 mb-1 truncate">{col.label}</p>
            <p className={`text-2xl font-bold ${col.text}`}>{kanbanColumns[col.id]?.clients.length ?? 0}</p>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="mb-6">
        <FilterBar
          activeLevel={levelFilter}
          onLevelChange={setLevelFilter}
          totalClients={totalVisible}
        />
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin flex-1">
          {columns.map(col => {
            const kanbanCol = kanbanColumns[col.id] ?? { id: col.id, label: col.label, clients: [] }
            return (
              <KanbanColumn key={col.id} column={{ ...kanbanCol, label: col.label, description: col.description }} colorConfig={col}>
                {kanbanCol.clients.map((client, index) => (
                  <CXCard key={client.id} client={client} index={index} onOpen={onOpenClient} />
                ))}
              </KanbanColumn>
            )
          })}
        </div>
      </DragDropContext>

      {showSettings && (
        <KanbanSettingsModal
          columns={columns}
          onRename={updateLabel}
          onReorder={reorder}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}
