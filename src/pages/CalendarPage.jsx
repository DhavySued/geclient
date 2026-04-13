import { useState, useMemo } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { ChevronLeft, ChevronRight, Calendar, Building2, Flag, AlertTriangle, GripVertical } from 'lucide-react'
import { useTasks } from '../context/TasksContext'
import { useClients } from '../context/ClientsContext'
import { usePermissions } from '../hooks/usePermissions'

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const DAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const WEEKEND_COL = new Set([0, 6])

const PRIORITY_STYLE = {
  alta:    { bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-300',    dot: 'bg-red-400',    label: 'Alta' },
  media:   { bg: 'bg-amber-100',  text: 'text-amber-700',  border: 'border-amber-300',  dot: 'bg-amber-400',  label: 'Média' },
  baixa:   { bg: 'bg-sky-100',    text: 'text-sky-700',    border: 'border-sky-300',    dot: 'bg-sky-400',    label: 'Baixa' },
  nenhuma: { bg: 'bg-gray-100',   text: 'text-gray-500',   border: 'border-gray-300',   dot: 'bg-gray-400',   label: '—' },
}

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
function formatFull(s) {
  if (!s) return ''
  return new Date(s + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
}

// ── Componente reutilizável de card de tarefa ──────────────────────────────────
function TaskCard({ task, clientMap, onToggle, onDelete, onOpenClient, overdueDate, canDelete = true, canEdit = true }) {
  const c      = clientMap[task.clientId]
  const isDone = task.status === 'concluida'
  const pStyle = PRIORITY_STYLE[task.priority] ?? PRIORITY_STYLE.nenhuma

  return (
    <div className={`rounded-xl border transition-all ${
      isDone
        ? 'bg-gray-50 border-gray-200/60'
        : overdueDate
        ? 'bg-red-50 border-red-200'
        : 'bg-white border-gray-200 shadow-sm'
    }`}>
      <div className="flex items-stretch">
        {/* Barra de prioridade lateral */}
        {!isDone && !overdueDate && (
          <div className={`w-1 rounded-l-xl flex-shrink-0 ${pStyle.dot}`} />
        )}
        {overdueDate && (
          <div className="w-1 rounded-l-xl flex-shrink-0 bg-red-400" />
        )}

        <div className="flex-1 px-2.5 py-2 min-w-0">
          {/* Badge vencida */}
          {overdueDate && (
            <div className="flex items-center gap-1 mb-1">
              <AlertTriangle size={9} className="text-red-500 flex-shrink-0" />
              <span className="text-[9px] font-bold text-red-500 uppercase tracking-wide">
                Vencida · {new Date(overdueDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
              </span>
            </div>
          )}

          {/* Título */}
          <p className={`text-xs leading-snug mb-1 ${
            isDone ? 'line-through text-gray-400' : 'text-gray-900 font-semibold'
          }`}>
            {task.title}
          </p>

          {/* Metadata */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[10px] px-1.5 py-px rounded-md border font-semibold ${pStyle.bg} ${pStyle.text} ${pStyle.border}`}>
              {pStyle.label}
            </span>
            {task.time && (
              <span className="text-[10px] text-gray-500 font-medium">{task.time}</span>
            )}
            {c && (
              <button
                onClick={() => onOpenClient?.(c)}
                className="flex items-center gap-0.5 text-[10px] text-gray-500 hover:text-brand-400 transition-colors min-w-0"
              >
                <Building2 size={8} className="flex-shrink-0" />
                <span className="truncate max-w-[80px]">{c.name}</span>
              </button>
            )}
          </div>
        </div>

        {/* Ações */}
        <div className="flex flex-col justify-center gap-0.5 pr-2 flex-shrink-0">
          <button
            onClick={onToggle}
            disabled={!canEdit}
            className={`p-1 rounded text-sm transition-colors ${
              isDone ? 'text-emerald-500 hover:text-gray-400' : 'text-gray-400 hover:text-emerald-500'
            } ${!canEdit ? 'opacity-40 cursor-not-allowed' : ''}`}
            title={isDone ? 'Reabrir' : 'Concluir'}
          >
            ✓
          </button>
          {canDelete && (
            <button
              onClick={onDelete}
              className="p-1 rounded text-sm text-gray-300 hover:text-red-400 transition-colors"
              title="Excluir"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function CalendarPage({ onOpenClient }) {
  const now = new Date()
  const [month, setMonth]           = useState(now.getMonth())
  const [year, setYear]             = useState(now.getFullYear())
  const [selectedDate, setSelectedDate] = useState(
    toDateStr(now.getFullYear(), now.getMonth(), now.getDate())
  )

  const { tasks, addTask, deleteTask, updateTask } = useTasks()
  const { clients } = useClients()
  const { can }     = usePermissions()
  const canEdit     = can('calendar', 'edit')
  const canDelete   = can('calendar', 'delete')
  const clientMap   = Object.fromEntries(clients.map(c => [c.id, c]))

  // Ordem manual do backlog, persistida em localStorage
  const [backlogOrder, setBacklogOrder] = useState(() => {
    try { return JSON.parse(localStorage.getItem('geclient_backlog_order') ?? '[]') }
    catch { return [] }
  })

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  // ── Grid ──────────────────────────────────────────────────────────────────
  const firstDay    = new Date(year, month, 1)
  const lastDate    = new Date(year, month + 1, 0).getDate()
  const startOffset = firstDay.getDay()

  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= lastDate; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  // ── tasksByDate ───────────────────────────────────────────────────────────
  const tasksByDate = {}
  for (const t of tasks) {
    if (t.dueDate && t.showInAgenda !== false) {
      if (!tasksByDate[t.dueDate]) tasksByDate[t.dueDate] = []
      tasksByDate[t.dueDate].push(t)
    }
  }
  for (const date in tasksByDate) {
    tasksByDate[date].sort((a, b) => {
      if (!a.time && !b.time) return 0
      if (!a.time) return 1
      if (!b.time) return -1
      return a.time.localeCompare(b.time)
    })
  }

  const todayStr = toDateStr(now.getFullYear(), now.getMonth(), now.getDate())

  // ── Roll-over: tarefas vencidas aparecem até hoje (exceto sáb/dom) ────────
  function getTasksForDate(dateStr) {
    const regular    = tasksByDate[dateStr] ?? []
    if (dateStr > todayStr) return regular

    // Não repete o alerta de vencida em sábado ou domingo
    const dow = new Date(dateStr + 'T12:00:00').getDay()
    if (dow === 0 || dow === 6) return regular

    const regularIds = new Set(regular.map(t => t.id))
    const overdue    = tasks
      .filter(t =>
        t.dueDate &&
        t.showInAgenda !== false &&
        t.status !== 'concluida' &&
        t.dueDate < dateStr &&
        dateStr <= todayStr
      )
      .filter(t => !regularIds.has(t.id))
      .map(t => ({ ...t, _overdue: true }))
      .sort((a, b) => {
        if (!a.time && !b.time) return 0
        if (!a.time) return 1
        if (!b.time) return -1
        return a.time.localeCompare(b.time)
      })
    return [...regular, ...overdue]
  }

  const selectedTasks = getTasksForDate(selectedDate)

  const noDateTasks = useMemo(() => {
    const raw = tasks.filter(t => !t.dueDate && t.showInAgenda !== false && !t.repeatMonthly)
    if (backlogOrder.length === 0) return raw
    const pos = Object.fromEntries(backlogOrder.map((id, i) => [id, i]))
    return [...raw].sort((a, b) => (pos[a.id] ?? Infinity) - (pos[b.id] ?? Infinity))
  }, [tasks, backlogOrder])

  // ── Drag & drop ───────────────────────────────────────────────────────────
  function handleDragEnd(result) {
    if (!canEdit) return
    const { destination, source, draggableId } = result
    if (!destination) return

    // Reordenar dentro do backlog
    if (source.droppableId === 'backlog' && destination.droppableId === 'backlog') {
      if (destination.index === source.index) return
      const ids = noDateTasks.map(t => t.id)
      ids.splice(source.index, 1)
      ids.splice(destination.index, 0, draggableId)
      setBacklogOrder(ids)
      localStorage.setItem('geclient_backlog_order', JSON.stringify(ids))
      return
    }

    if (destination.droppableId === 'backlog') return  // devolvido ao backlog sem mudança
    // destination.droppableId é uma dateStr ('YYYY-MM-DD')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(destination.droppableId)) return
    updateTask(draggableId, { dueDate: destination.droppableId })
  }

  const CELL_MAX = 3

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-full">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Calendar size={20} className="text-brand-400" />
              <h1 className="text-xl font-bold text-gray-900">Calendário</h1>
            </div>
            <p className="text-sm text-gray-500">Visualize tarefas e compromissos por data.</p>
          </div>
          <div className="flex items-center gap-2 bg-gray-100 border border-gray-200 rounded-xl px-3 py-2">
            <button onClick={prevMonth} className="text-gray-500 hover:text-gray-700 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-gray-700 w-36 text-center">
              {MONTHS[month]} {year}
            </span>
            <button onClick={nextMonth} className="text-gray-500 hover:text-gray-700 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="flex gap-5 flex-1 overflow-hidden min-h-0">

          {/* ── Calendário ─────────────────────────────────────────────────── */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Cabeçalho dias */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAYS_SHORT.map((d, col) => (
                <div key={d} className={`text-center text-xs font-semibold py-2 ${WEEKEND_COL.has(col) ? 'text-gray-600' : 'text-gray-500'}`}>
                  {d}
                </div>
              ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 gap-1 flex-1 overflow-y-auto scrollbar-thin">
              {cells.map((day, i) => {
                const col = i % 7
                const isWeekend = WEEKEND_COL.has(col)
                if (!day) return (
                  <div key={`empty-${i}`} className={`rounded-lg min-h-[72px] ${isWeekend ? 'bg-gray-100/20' : ''}`} />
                )

                const dateStr    = toDateStr(year, month, day)
                const isToday    = dateStr === todayStr
                const isSelected = dateStr === selectedDate
                const dayTasks   = getTasksForDate(dateStr)
                const hasOverdue = dayTasks.some(t => t._overdue)

                return (
                  <Droppable droppableId={dateStr} key={dateStr}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        onClick={() => setSelectedDate(dateStr)}
                        className={`rounded-lg p-2 text-left transition-all min-h-[72px] flex flex-col border cursor-pointer ${
                          snapshot.isDraggingOver
                            ? 'bg-brand-50 border-brand-400/60 shadow-md'
                            : isSelected
                            ? 'bg-brand-50 border-brand-400/60 shadow-sm'
                            : isToday
                            ? 'bg-blue-50 border-blue-400/50'
                            : isWeekend
                            ? 'bg-gray-50 border-gray-200/50 hover:bg-gray-100 hover:border-gray-300'
                            : 'bg-white border-gray-200/60 hover:bg-gray-50 hover:border-gray-300'
                        }`}
                      >
                        {/* Número + indicador vencida */}
                        <div className="flex items-center justify-between mb-1.5 w-full">
                          <span className={`text-xs font-bold ${
                            isSelected ? 'text-brand-600' : isToday ? 'text-blue-600' : isWeekend ? 'text-gray-500' : 'text-gray-600'
                          }`}>
                            {day}
                          </span>
                          {hasOverdue && <AlertTriangle size={9} className="text-red-400 flex-shrink-0" />}
                        </div>

                        {/* Tags de tarefas */}
                        {dayTasks.length > 0 && (
                          <div className="flex flex-col gap-0.5 w-full">
                            {dayTasks.slice(0, CELL_MAX).map(t => (
                              <span
                                key={`${t.id}${t._overdue ? '_ov' : ''}`}
                                className={`flex items-center gap-1 w-full min-w-0 text-[10px] font-medium px-1.5 py-0.5 rounded leading-tight ${
                                  t._overdue
                                    ? 'bg-red-50 text-red-600 border border-red-200'
                                    : t.status === 'concluida'
                                    ? 'bg-emerald-100 text-emerald-700 line-through'
                                    : t.priority === 'alta'   ? 'bg-red-100 text-red-700'
                                    : t.priority === 'media'  ? 'bg-amber-100 text-amber-700'
                                    : t.priority === 'baixa'  ? 'bg-sky-100 text-sky-700'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {t._overdue
                                  ? <AlertTriangle size={8} className="flex-shrink-0" />
                                  : t.time && <span className="opacity-70 flex-shrink-0">{t.time}</span>
                                }
                                <span className="truncate min-w-0">{t.title}</span>
                              </span>
                            ))}
                            {dayTasks.length > CELL_MAX && (
                              <span className="text-[9px] text-gray-400 px-1">
                                +{dayTasks.length - CELL_MAX} mais
                              </span>
                            )}
                          </div>
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                )
              })}
            </div>
          </div>

          {/* ── Sidebar ────────────────────────────────────────────────────── */}
          <div className="w-72 flex-shrink-0 flex flex-col gap-3 min-h-0">

            {/* Data selecionada + tarefas do dia */}
            <div className="flex-shrink-0 flex flex-col gap-2">
              <div className="bg-gray-100 rounded-xl px-3 py-2.5 border border-gray-200">
                <p className="text-[10px] text-gray-500 mb-0.5">Selecionado</p>
                <p className="text-xs font-semibold text-gray-700 capitalize">{formatFull(selectedDate)}</p>
              </div>

              {/* Tarefas do dia selecionado */}
              {selectedTasks.length > 0 && (
                <div
                  className="rounded-xl border border-gray-200 overflow-hidden"
                  style={{ maxHeight: 220 }}
                >
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Tarefas do dia
                    </span>
                    <div className="flex items-center gap-2">
                      {selectedTasks.some(t => t._overdue) && (
                        <span className="flex items-center gap-0.5 text-[9px] font-bold text-red-500">
                          <AlertTriangle size={8} />
                          {selectedTasks.filter(t => t._overdue).length} vencida{selectedTasks.filter(t => t._overdue).length !== 1 ? 's' : ''}
                        </span>
                      )}
                      <span className="text-[10px] font-bold text-gray-400">{selectedTasks.length}</span>
                    </div>
                  </div>
                  <div className="overflow-y-auto scrollbar-thin p-2 space-y-1.5" style={{ maxHeight: 172 }}>
                    {selectedTasks.map(task => (
                      <TaskCard
                        key={`${task.id}${task._overdue ? '_ov' : ''}`}
                        task={task}
                        clientMap={clientMap}
                        overdueDate={task._overdue ? task.dueDate : null}
                        onToggle={() => updateTask(task.id, { status: task.status === 'concluida' ? 'pendente' : 'concluida' })}
                        onDelete={() => deleteTask(task.id)}
                        onOpenClient={onOpenClient}
                        canEdit={canEdit}
                        canDelete={canDelete}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Backlog — Sem Data ──────────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-h-0 rounded-xl border border-brand-500/25 overflow-hidden"
              style={{ background: 'rgba(243,146,0,0.03)' }}>

              {/* Header do backlog */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-brand-500/20 flex-shrink-0"
                style={{ background: 'rgba(243,146,0,0.08)' }}>
                <div className="flex items-center gap-2">
                  <Flag size={12} className="text-brand-400" />
                  <span className="text-[11px] font-bold text-brand-500 uppercase tracking-wider">
                    Backlog — Sem Data
                  </span>
                </div>
                <span className="text-[10px] font-bold bg-brand-500 text-gray-900 rounded-full px-1.5 py-px leading-none">
                  {noDateTasks.length}
                </span>
              </div>

              {noDateTasks.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-[11px] text-brand-400/50 text-center px-4">
                    Nenhuma pendência sem data.<br />Arraste tarefas aqui para removê-las do calendário.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-[10px] text-gray-400 px-3 pt-2 pb-1 flex-shrink-0">
                    Arraste para um dia do calendário para agendar.
                  </p>
                  <Droppable droppableId="backlog">
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-2 space-y-1.5"
                      >
                        {noDateTasks.map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                style={{
                                  ...provided.draggableProps.style,
                                  ...(snapshot.isDropAnimating ? { transitionDuration: '0.001s' } : {}),
                                }}
                              >
                                <div
                                  className={`rounded-xl border transition-all ${
                                    snapshot.isDragging
                                      ? 'shadow-xl border-brand-400/60 bg-white'
                                      : task.status === 'concluida'
                                      ? 'bg-gray-50 border-gray-200/60'
                                      : 'bg-white border-gray-200 shadow-sm hover:border-gray-300'
                                  }`}
                                >
                                  <div className="flex items-stretch">
                                    {/* Grip handle */}
                                    <div
                                      {...provided.dragHandleProps}
                                      className="flex items-center px-1.5 text-gray-300 hover:text-gray-400 cursor-grab active:cursor-grabbing flex-shrink-0"
                                    >
                                      <GripVertical size={12} />
                                    </div>

                                    {/* Barra de prioridade */}
                                    {task.status !== 'concluida' && (
                                      <div className={`w-1 flex-shrink-0 ${
                                        task.priority === 'alta'  ? 'bg-red-400'
                                        : task.priority === 'media' ? 'bg-amber-400'
                                        : task.priority === 'baixa' ? 'bg-sky-400'
                                        : 'bg-gray-300'
                                      }`} />
                                    )}

                                    <div className="flex-1 px-2.5 py-2.5 min-w-0">
                                      <p className={`text-xs leading-snug mb-1.5 ${
                                        task.status === 'concluida' ? 'line-through text-gray-400' : 'text-gray-900 font-semibold'
                                      }`}>
                                        {task.title}
                                      </p>
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        {(() => {
                                          const p = PRIORITY_STYLE[task.priority] ?? PRIORITY_STYLE.nenhuma
                                          return (
                                            <span className={`text-[10px] px-1.5 py-px rounded-md border font-semibold ${p.bg} ${p.text} ${p.border}`}>
                                              {p.label}
                                            </span>
                                          )
                                        })()}
                                        {clientMap[task.clientId] && (
                                          <button
                                            onClick={() => onOpenClient?.(clientMap[task.clientId])}
                                            className="flex items-center gap-0.5 text-[10px] text-gray-500 hover:text-brand-400 transition-colors min-w-0"
                                          >
                                            <Building2 size={8} className="flex-shrink-0" />
                                            <span className="truncate max-w-[80px]">{clientMap[task.clientId].name}</span>
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    {/* Ações */}
                                    <div className="flex flex-col justify-center gap-0.5 pr-2 flex-shrink-0">
                                      <button
                                        onClick={() => canEdit && updateTask(task.id, { status: task.status === 'concluida' ? 'pendente' : 'concluida' })}
                                        disabled={!canEdit}
                                        className={`p-1 rounded text-sm transition-colors ${
                                          task.status === 'concluida' ? 'text-emerald-500 hover:text-gray-400' : 'text-gray-400 hover:text-emerald-500'
                                        } ${!canEdit ? 'opacity-40 cursor-not-allowed' : ''}`}
                                        title={task.status === 'concluida' ? 'Reabrir' : 'Concluir'}
                                      >
                                        ✓
                                      </button>
                                      {canDelete && (
                                        <button
                                          onClick={() => deleteTask(task.id)}
                                          className="p-1 rounded text-sm text-gray-300 hover:text-red-400 transition-colors"
                                          title="Excluir"
                                        >
                                          ✕
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </DragDropContext>
  )
}
