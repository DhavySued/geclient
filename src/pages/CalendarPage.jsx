import { useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar, Plus, Building2, Flag } from 'lucide-react'
import { useTasks } from '../context/TasksContext'
import { useClients } from '../context/ClientsContext'
import { useSettings } from '../context/SettingsContext'

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const DAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
// col 0 = Sunday, col 6 = Saturday
const WEEKEND_COL = new Set([0, 6])

const PRIORITY_DOT = {
  alta:  'bg-red-400',
  media: 'bg-yellow-400',
  baixa: 'bg-blue-400',
}
const PRIORITY_STYLE = {
  alta:  'bg-red-500/20 text-red-300 border-red-500/30',
  media: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  baixa: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
}
const PRIORITY_LABEL = { alta: 'Alta', media: 'Média', baixa: 'Baixa' }

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function formatFull(s) {
  if (!s) return ''
  return new Date(s + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
}

export default function CalendarPage({ onOpenClient }) {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear]   = useState(now.getFullYear())
  const [selectedDate, setSelectedDate] = useState(toDateStr(now.getFullYear(), now.getMonth(), now.getDate()))

  const { tasks, addTask, deleteTask, updateTask } = useTasks()
  const { clients } = useClients()
  const { settings } = useSettings()
  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]))

  // Quick-add state
  const [quickTitle,    setQuickTitle]    = useState('')
  const [quickTime,     setQuickTime]     = useState('')
  const [quickPriority, setQuickPriority] = useState('media')
  const [quickClient,   setQuickClient]   = useState('')
  const [quickSaving,   setQuickSaving]   = useState(false)
  const [quickError,    setQuickError]    = useState('')

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  // Build calendar grid cells (Sun-start)
  const firstDay = new Date(year, month, 1)
  const lastDate = new Date(year, month + 1, 0).getDate()
  const startOffset = firstDay.getDay() // Sun=0

  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= lastDate; d++) cells.push(d)
  // Pad to full rows
  while (cells.length % 7 !== 0) cells.push(null)

  // Group tasks by date — only those with showInAgenda !== false
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

  const selectedTasks = tasksByDate[selectedDate] || []
  const noDateTasks   = tasks.filter(t => !t.dueDate && t.showInAgenda !== false && !t.repeatMonthly)

  async function handleQuickAdd(e) {
    e.preventDefault()
    if (!quickTitle.trim()) return
    setQuickSaving(true)
    setQuickError('')
    try {
      await addTask({
        title:    quickTitle.trim(),
        dueDate:  selectedDate,
        time:     quickTime || null,
        priority: quickPriority,
        clientId: quickClient || null,
      })
      setQuickTitle('')
      setQuickTime('')
      setQuickPriority('media')
      setQuickClient('')
    } catch (err) {
      setQuickError(err.message || 'Erro ao salvar.')
    } finally {
      setQuickSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={20} className="text-amber-400" />
            <h1 className="text-xl font-bold text-white">Calendário</h1>
          </div>
          <p className="text-sm text-gray-500">Visualize tarefas e compromissos por data.</p>
        </div>

        {/* Month nav */}
        <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2">
          <button onClick={prevMonth} className="text-gray-500 hover:text-gray-200 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-gray-200 w-36 text-center">
            {MONTHS[month]} {year}
          </span>
          <button onClick={nextMonth} className="text-gray-500 hover:text-gray-200 transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="flex gap-5 flex-1 overflow-hidden min-h-0">
        {/* Calendar Grid */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAYS_SHORT.map((d, col) => (
              <div
                key={d}
                className={`text-center text-xs font-semibold py-2 ${
                  WEEKEND_COL.has(col) ? 'text-gray-600' : 'text-gray-500'
                }`}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 gap-1 flex-1 overflow-y-auto scrollbar-thin">
            {cells.map((day, i) => {
              const col       = i % 7
              const isWeekend = WEEKEND_COL.has(col)
              if (!day) return (
                <div
                  key={`empty-${i}`}
                  className={`rounded-lg min-h-[72px] ${isWeekend ? 'bg-gray-800/20' : ''}`}
                />
              )
              const dateStr  = toDateStr(year, month, day)
              const isToday  = dateStr === todayStr
              const isSelected = dateStr === selectedDate
              const dayTasks = tasksByDate[dateStr] || []

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`rounded-lg p-2 text-left transition-all min-h-[72px] flex flex-col border ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500/40'
                      : isToday
                      ? 'bg-blue-500/10 border-blue-500/30'
                      : isWeekend
                      ? 'bg-gray-800/30 border-gray-700/30 hover:bg-gray-700/40 hover:border-gray-600/50'
                      : 'border-gray-700/40 hover:bg-gray-800/60 hover:border-gray-600/60'
                  }`}
                >
                  <span className={`text-xs font-semibold mb-1.5 ${
                    isSelected ? 'text-amber-300' : isToday ? 'text-blue-300' : isWeekend ? 'text-gray-600' : 'text-gray-400'
                  }`}>
                    {day}
                  </span>

                  {/* Task title tags — all shown, sorted by time */}
                  {dayTasks.length > 0 && (
                    <div className="flex flex-col gap-0.5 w-full">
                      {dayTasks.map(t => (
                        <span
                          key={t.id}
                          className={`flex items-center gap-1 w-full min-w-0 text-[10px] font-medium px-1.5 py-0.5 rounded leading-tight ${
                            t.status === 'concluida'
                              ? 'bg-emerald-500/15 text-emerald-400/70 line-through'
                              : t.priority === 'alta'
                              ? 'bg-red-500/20 text-red-300'
                              : t.priority === 'media'
                              ? 'bg-yellow-500/15 text-yellow-300'
                              : t.priority === 'baixa'
                              ? 'bg-blue-500/15 text-blue-300'
                              : 'bg-gray-700/40 text-gray-500'
                          }`}
                        >
                          {t.time && <span className="opacity-70 flex-shrink-0">{t.time}</span>}
                          <span className="truncate min-w-0">{t.title}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Side Panel */}
        <div className="w-64 flex-shrink-0 flex flex-col gap-3 overflow-y-auto scrollbar-thin">

          {/* Selected date header */}
          <div className="bg-gray-800 rounded-xl px-3 py-2.5 border border-gray-700">
            <p className="text-[10px] text-gray-500 mb-0.5">Selecionado</p>
            <p className="text-xs font-semibold text-gray-200 capitalize">{formatFull(selectedDate)}</p>
          </div>

          {/* Quick add form */}
          <div className="bg-gray-800/60 rounded-xl p-3 border border-gray-700">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Adicionar tarefa
            </p>
            <form onSubmit={handleQuickAdd} className="space-y-1.5">
              <input
                value={quickTitle}
                onChange={e => setQuickTitle(e.target.value)}
                placeholder="Título *"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
              />
              <div className="flex gap-1.5">
                <input
                  type="time"
                  value={quickTime}
                  onChange={e => setQuickTime(e.target.value)}
                  className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-400 focus:outline-none focus:border-amber-500/50"
                />
                <select
                  value={quickPriority}
                  onChange={e => setQuickPriority(e.target.value)}
                  className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-400 focus:outline-none focus:border-amber-500/50"
                >
                  <option value="nenhuma">Sem prior.</option>
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                </select>
              </div>
              <select
                value={quickClient}
                onChange={e => setQuickClient(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-400 focus:outline-none focus:border-amber-500/50"
              >
                <option value="">Sem cliente</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {quickError && (
                <p className="text-[10px] text-red-400 bg-red-950/40 border border-red-500/30 rounded px-2 py-1">{quickError}</p>
              )}
              <button
                type="submit"
                disabled={quickSaving}
                className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-gray-900 text-xs font-semibold transition-all"
              >
                <Plus size={12} />
                {quickSaving ? 'Salvando…' : 'Adicionar'}
              </button>
            </form>
          </div>

          {/* Tasks for selected date */}
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 px-1">
              Tarefas do dia ({selectedTasks.length})
            </p>
            {selectedTasks.length === 0 ? (
              <div className="text-center py-4 text-gray-600">
                <p className="text-xs">Nenhuma tarefa neste dia.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {selectedTasks.map(task => {
                  const c = clientMap[task.clientId]
                  const isDone = task.status === 'concluida'
                  return (
                    <div
                      key={task.id}
                      className={`px-2.5 py-2 rounded-lg border transition-all ${
                        isDone ? 'bg-gray-800/30 border-gray-700/30' : 'bg-gray-800/60 border-gray-700/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium truncate ${isDone ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-1 flex-wrap mt-0.5">
                            <span className={`text-[10px] px-1 py-px rounded border font-medium ${PRIORITY_STYLE[task.priority]}`}>
                              {PRIORITY_LABEL[task.priority]}
                            </span>
                            {task.time && (
                              <span className="text-[10px] text-gray-500">{task.time}</span>
                            )}
                            {c && (
                              <button
                                onClick={() => onOpenClient?.(c)}
                                className="flex items-center gap-0.5 text-[10px] text-gray-600 hover:text-amber-400 transition-colors min-w-0"
                              >
                                <Building2 size={8} className="flex-shrink-0" />
                                <span className="truncate max-w-[70px]">{c.name}</span>
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-0.5 flex-shrink-0">
                          <button
                            onClick={() => updateTask(task.id, { status: isDone ? 'pendente' : 'concluida' })}
                            className={`text-xs p-1 rounded transition-colors ${isDone ? 'text-emerald-400 hover:text-gray-400' : 'text-gray-600 hover:text-emerald-400'}`}
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="text-xs p-1 rounded text-gray-700 hover:text-red-400 transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Tasks without date */}
          {settings.showUndatedInCalendar && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2 bg-amber-500/10 border-b border-amber-500/20">
                <div className="flex items-center gap-1.5">
                  <Flag size={11} className="text-amber-400 flex-shrink-0" />
                  <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">Sem data</span>
                </div>
                {noDateTasks.length > 0 && (
                  <span className="text-[10px] font-bold bg-amber-500 text-gray-900 rounded-full px-1.5 py-px leading-none">
                    {noDateTasks.length}
                  </span>
                )}
              </div>

              {/* Body */}
              <div className="px-2.5 py-2">
                {noDateTasks.length === 0 ? (
                  <p className="text-[10px] text-amber-500/50 py-1 text-center">Nenhuma tarefa sem data</p>
                ) : (
                  <div className="space-y-1.5">
                    {noDateTasks.map(task => {
                      const c = clientMap[task.clientId]
                      const isDone = task.status === 'concluida'
                      return (
                        <div
                          key={task.id}
                          className={`px-2.5 py-2 rounded-lg border transition-all ${
                            isDone
                              ? 'bg-gray-800/20 border-gray-700/20'
                              : 'bg-gray-900/60 border-amber-500/15 hover:border-amber-500/30'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-medium truncate ${isDone ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                                {task.title}
                              </p>
                              <div className="flex items-center gap-1 flex-wrap mt-0.5">
                                <span className={`text-[10px] px-1 py-px rounded border font-medium ${PRIORITY_STYLE[task.priority]}`}>
                                  {PRIORITY_LABEL[task.priority]}
                                </span>
                                {c && (
                                  <button
                                    onClick={() => onOpenClient?.(c)}
                                    className="flex items-center gap-0.5 text-[10px] text-gray-500 hover:text-amber-400 transition-colors min-w-0"
                                  >
                                    <Building2 size={8} className="flex-shrink-0" />
                                    <span className="truncate max-w-[70px]">{c.name}</span>
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-0.5 flex-shrink-0">
                              <button
                                onClick={() => updateTask(task.id, { status: isDone ? 'pendente' : 'concluida' })}
                                className={`text-xs p-1 rounded transition-colors ${isDone ? 'text-emerald-400 hover:text-gray-400' : 'text-gray-600 hover:text-emerald-400'}`}
                                title={isDone ? 'Reabrir' : 'Concluir'}
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => deleteTask(task.id)}
                                className="text-xs p-1 rounded text-gray-700 hover:text-red-400 transition-colors"
                                title="Excluir"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
