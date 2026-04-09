import { useState } from 'react'
import { DragDropContext } from '@hello-pangea/dnd'
import { CalendarDays, AlertTriangle, ChevronLeft, ChevronRight, Settings2 } from 'lucide-react'
import { useMonthlyKanban } from '../hooks/useKanban'
import { useKanbanSettings } from '../hooks/useKanbanSettings'
import KanbanColumn from '../components/KanbanColumn'
import KanbanSettingsModal from '../components/KanbanSettingsModal'
import MonthlyCard from '../components/MonthlyCard'
import FilterBar from '../components/FilterBar'

const DEFAULT_COLUMNS = [
  {
    id: 'pendente',
    label: 'Pendente',
    bg: 'bg-gray-700/20', border: 'border-gray-600/40', text: 'text-gray-400',
    dot: 'bg-gray-500', headerBg: 'bg-gray-800/60',
    description: 'Aguardando documentos do cliente',
  },
  {
    id: 'processando',
    label: 'Processando',
    bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400',
    dot: 'bg-blue-400', headerBg: 'bg-blue-950/40',
    description: 'Em processamento pelo escritório',
  },
  {
    id: 'concluido',
    label: 'Concluído',
    bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400',
    dot: 'bg-emerald-400', headerBg: 'bg-emerald-950/40',
    description: 'Mês encerrado com sucesso',
  },
  {
    id: 'atrasado',
    label: 'Atrasado',
    bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400',
    dot: 'bg-red-500', headerBg: 'bg-red-950/40',
    description: 'Fora do prazo — requer atenção',
  },
]

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export default function AcompanhamentoPage({ onOpenClient }) {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())
  const [levelFilter, setLevelFilter] = useState('all')
  const [showSettings, setShowSettings] = useState(false)

  const { columns: kanbanColumns, moveClient } = useMonthlyKanban(levelFilter)
  const { columns, updateLabel, reorder } = useKanbanSettings('monthly', DEFAULT_COLUMNS)

  const totalVisible = columns.reduce((sum, col) => sum + (kanbanColumns[col.id]?.clients.length ?? 0), 0)

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  function onDragEnd(result) {
    const { destination, source, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return
    moveClient(draggableId, destination.droppableId)
  }

  const atrasadoCount  = kanbanColumns.atrasado?.clients.length ?? 0
  const concluidoCount = kanbanColumns.concluido?.clients.length ?? 0
  const conclusionRate = totalVisible > 0 ? Math.round((concluidoCount / totalVisible) * 100) : 0

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays size={20} className="text-amber-400" />
            <h1 className="text-xl font-bold text-white">Acompanhamento Mensal</h1>
          </div>
          <p className="text-sm text-gray-500">
            Controle de obrigações e entregas por competência.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Month Selector */}
          <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2">
            <button onClick={prevMonth} className="text-gray-500 hover:text-gray-200 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-gray-200 w-36 text-center">
              {MONTHS[month]} de {year}
            </span>
            <button onClick={nextMonth} className="text-gray-500 hover:text-gray-200 transition-colors">
              <ChevronRight size={16} />
            </button>
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
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {columns.map(col => (
          <div key={col.id} className={`rounded-xl p-4 border ${col.headerBg} ${col.border}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2 h-2 rounded-full ${col.dot}`} />
              <span className="text-xs text-gray-500 truncate">{col.label}</span>
            </div>
            <p className={`text-2xl font-bold ${col.text}`}>{kanbanColumns[col.id]?.clients.length ?? 0}</p>
            {col.id === 'concluido' && totalVisible > 0 && (
              <p className="text-xs text-gray-600 mt-0.5">{conclusionRate}% do total</p>
            )}
          </div>
        ))}
      </div>

      {/* Alert */}
      {atrasadoCount > 0 && (
        <div className="mb-5 flex items-center gap-3 bg-red-950/50 border border-red-500/30 rounded-xl px-4 py-3">
          <AlertTriangle size={15} className="text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300">
            <span className="font-bold">{atrasadoCount} cliente{atrasadoCount > 1 ? 's' : ''}</span> com entregas em atraso neste mês. Priorize o contato.
          </p>
        </div>
      )}

      {/* Filter */}
      <div className="mb-6">
        <FilterBar
          activeLevel={levelFilter}
          onLevelChange={setLevelFilter}
          totalClients={totalVisible}
        />
      </div>

      {/* Kanban */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin flex-1">
          {columns.map(col => {
            const kanbanCol = kanbanColumns[col.id] ?? { id: col.id, label: col.label, clients: [] }
            return (
              <KanbanColumn key={col.id} column={{ ...kanbanCol, label: col.label, description: col.description }} colorConfig={col}>
                {kanbanCol.clients.map((client, index) => (
                  <MonthlyCard key={client.id} client={client} index={index} onOpen={onOpenClient} />
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

