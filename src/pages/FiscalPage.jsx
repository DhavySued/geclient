import { useState } from 'react'
import { DragDropContext } from '@hello-pangea/dnd'
import { BarChart3, Settings2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useFiscalKanban } from '../hooks/useKanban'
import { useKanbanSettings } from '../hooks/useKanbanSettings'
import KanbanColumn from '../components/KanbanColumn'
import KanbanSettingsModal from '../components/KanbanSettingsModal'
import FiscalCard from '../components/FiscalCard'
import FilterBar from '../components/FilterBar'

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const DEFAULT_COLUMNS = [
  {
    id: 'sem_consulta',
    label: 'Sem Consulta',
    bg: 'bg-gray-500/10', border: 'border-gray-500/30', text: 'text-gray-400',
    dot: 'bg-gray-400', headerBg: 'bg-gray-800/40',
    description: 'Situação ainda não verificada',
  },
  {
    id: 'com_pendencia',
    label: 'Com Pendência',
    bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400',
    dot: 'bg-red-400', headerBg: 'bg-red-950/40',
    description: 'Pendências identificadas',
  },
  {
    id: 'comunicado_cliente',
    label: 'Comunicado ao Cliente',
    bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400',
    dot: 'bg-blue-400', headerBg: 'bg-blue-950/40',
    description: 'Cliente notificado sobre as pendências',
  },
  {
    id: 'em_regularizacao',
    label: 'Em Regularização',
    bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400',
    dot: 'bg-purple-400', headerBg: 'bg-purple-950/40',
    description: 'Processo de regularização iniciado',
  },
  {
    id: 'resolvido',
    label: 'Resolvido',
    bg: 'bg-teal-500/10', border: 'border-teal-500/30', text: 'text-teal-400',
    dot: 'bg-teal-400', headerBg: 'bg-teal-950/40',
    description: 'Pendências resolvidas',
  },
  {
    id: 'sem_pendencia',
    label: 'Sem Pendência',
    bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400',
    dot: 'bg-emerald-400', headerBg: 'bg-emerald-950/40',
    description: 'Situação regular · Sem pendências',
  },
]

function toMonthString(year, month) {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

export default function FiscalPage({ onOpenClient }) {
  const now = new Date()
  const [month, setMonth]           = useState(now.getMonth())
  const [year, setYear]             = useState(now.getFullYear())
  const [levelFilter, setLevelFilter] = useState('all')
  const [showSettings, setShowSettings] = useState(false)

  const selectedMonth = toMonthString(year, month)
  const isCurrentMonth = selectedMonth === toMonthString(now.getFullYear(), now.getMonth())

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const { columns: kanbanColumns, moveClient } = useFiscalKanban(levelFilter, selectedMonth)
  const { columns, updateLabel, reorder }      = useKanbanSettings('fiscal', DEFAULT_COLUMNS)

  const totalVisible = columns.reduce(
    (sum, col) => sum + (kanbanColumns[col.id]?.clients.length ?? 0), 0
  )

  function onDragEnd(result) {
    const { destination, source, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return
    moveClient(draggableId, destination.droppableId)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={20} className="text-amber-400" />
            <h1 className="text-xl font-bold text-white">Kanban Fiscal</h1>
          </div>
          <p className="text-sm text-gray-500">
            Situação tributária por competência mensal.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Month Selector */}
          <div className="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2">
            <button onClick={prevMonth} className="text-gray-500 hover:text-gray-200 transition-colors p-0.5">
              <ChevronLeft size={15} />
            </button>
            <span className="text-sm font-semibold text-gray-200 w-36 text-center">
              {MONTHS[month]} de {year}
              {isCurrentMonth && <span className="ml-1.5 text-[10px] text-amber-500 font-normal">• atual</span>}
            </span>
            <button onClick={nextMonth} className="text-gray-500 hover:text-gray-200 transition-colors p-0.5">
              <ChevronRight size={15} />
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
              <KanbanColumn
                key={col.id}
                column={{ ...kanbanCol, label: col.label, description: col.description }}
                colorConfig={col}
              >
                {kanbanCol.clients.map((client, index) => (
                  <FiscalCard
                    key={client.id}
                    client={client}
                    index={index}
                    onOpen={c => onOpenClient(c, selectedMonth)}
                    selectedMonth={selectedMonth}
                  />
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
