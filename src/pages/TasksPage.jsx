import { useState } from 'react'
import { CheckSquare, Flag, Search, Plus, X, List, LayoutGrid, Repeat, Clock, CheckCircle2 } from 'lucide-react'
import DatePicker from '../components/DatePicker'
import { useTasks } from '../context/TasksContext'
import { useClients } from '../context/ClientsContext'
import { useUsers } from '../context/UsersContext'
import RichTextEditor from '../components/RichTextEditor'
import TaskItem, { isOverdue, TemplateCard } from '../components/TaskItem'
import TaskKanbanView from '../components/TaskKanbanView'

export default function TasksPage({ onOpenClient }) {
  const { tasks, addTask, updateTask, deleteTask } = useTasks()
  const { clients } = useClients()
  const { users }   = useUsers()

  const [filterStatus,   setFilterStatus]   = useState('todas')
  const [filterPriority, setFilterPriority] = useState('todas')
  const [search,         setSearch]         = useState('')
  const [showForm,       setShowForm]       = useState(false)
  const [viewMode,       setViewMode]       = useState('list')   // 'list' | 'kanban'
  const [groupBy,        setGroupBy]        = useState('priority') // 'priority' | 'status'

  // Add form state
  const [title,    setTitle]    = useState('')
  const [desc,     setDesc]     = useState('')
  const [dueDate,  setDueDate]  = useState('')
  const [time,     setTime]     = useState('')
  const [priority, setPriority] = useState('media')
  const [clientId,      setClientId]      = useState('')
  const [assigned,      setAssigned]      = useState('')
  const [repeatMonthly, setRepeatMonthly] = useState(false)

  function handleAdd(e) {
    e.preventDefault()
    if (!title.trim()) return
    const isRecurring = repeatMonthly && !!dueDate
    addTask({
      title:           title.trim(),
      description:     desc,
      dueDate:         isRecurring ? null : (dueDate || null),
      time:            time || null,
      priority,
      clientId:        clientId || null,
      assignedTo:      assigned || null,
      repeatMonthly:   isRecurring,
      repeatDay:       isRecurring ? parseInt(dueDate.split('-')[2]) : undefined,
      lastSpawnedMonth: isRecurring ? null : undefined,
    })
    setTitle(''); setDesc(''); setDueDate(''); setTime(''); setPriority('media')
    setClientId(''); setAssigned(''); setRepeatMonthly(false)
    setShowForm(false)
  }

  function handleToggle(task) {
    updateTask(task.id, { status: task.status === 'concluida' ? 'pendente' : 'concluida' })
  }

  // Build lookup maps
  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]))

  // Separate templates from regular tasks
  const regularTasks  = tasks.filter(t => !t.repeatMonthly)
  const templateTasks = tasks.filter(t => t.repeatMonthly)

  // Filter regular tasks
  let filtered = [...regularTasks]
  if (filterStatus === 'pendente')  filtered = filtered.filter(t => t.status !== 'concluida')
  if (filterStatus === 'concluida') filtered = filtered.filter(t => t.status === 'concluida')
  if (filterPriority !== 'todas')   filtered = filtered.filter(t => t.priority === filterPriority)
  if (search.trim()) {
    const q = search.toLowerCase()
    filtered = filtered.filter(t =>
      t.title.toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q) ||
      (clientMap[t.clientId]?.name || '').toLowerCase().includes(q)
    )
  }

  // Filter templates by search
  const filteredTemplates = search.trim()
    ? templateTasks.filter(t => t.title.toLowerCase().includes(search.toLowerCase()))
    : templateTasks

  const totalPending = regularTasks.filter(t => t.status !== 'concluida').length
  const totalDone    = regularTasks.filter(t => t.status === 'concluida').length
  const totalOverdue = regularTasks.filter(t => isOverdue(t.dueDate, t.status)).length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CheckSquare size={20} className="text-amber-400" />
            <h1 className="text-xl font-bold text-white">Tarefas</h1>
          </div>
          <p className="text-sm text-gray-500">Gerencie todas as tarefas da equipe.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex gap-1 bg-gray-800 rounded-lg p-1 border border-gray-700">
            <button
              onClick={() => setViewMode('list')}
              title="Visualização em lista"
              className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-amber-500/20 text-amber-300' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <List size={15} />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              title="Visualização Kanban"
              className={`p-1.5 rounded transition-all ${viewMode === 'kanban' ? 'bg-amber-500/20 text-amber-300' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <LayoutGrid size={15} />
            </button>
          </div>

          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-900 text-sm font-semibold transition-all flex-shrink-0"
          >
            <Plus size={16} />
            Nova tarefa
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={14} className="text-gray-500" />
            <span className="text-xs text-gray-500">Pendentes</span>
          </div>
          <p className="text-2xl font-bold text-gray-200">{totalPending}</p>
        </div>
        <div className="bg-emerald-950/30 rounded-xl p-4 border border-emerald-500/20">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span className="text-xs text-gray-500">Concluídas</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{totalDone}</p>
        </div>
        <div className={`rounded-xl p-4 border ${totalOverdue > 0 ? 'bg-red-950/30 border-red-500/20' : 'bg-gray-800 border-gray-700'}`}>
          <div className="flex items-center gap-2 mb-1">
            <Flag size={14} className={totalOverdue > 0 ? 'text-red-400' : 'text-gray-500'} />
            <span className="text-xs text-gray-500">Vencidas</span>
          </div>
          <p className={`text-2xl font-bold ${totalOverdue > 0 ? 'text-red-400' : 'text-gray-600'}`}>{totalOverdue}</p>
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-gray-800/80 rounded-xl p-5 border border-amber-500/30 mb-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-300">Nova tarefa</p>
            <button type="button" onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-300">
              <X size={16} />
            </button>
          </div>
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Título *"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
          />
          <RichTextEditor value={desc} onChange={setDesc} placeholder="Descrição com formatação (opcional)" minHeight={80} />
          <div className="grid grid-cols-2 gap-2">
            <DatePicker
              value={dueDate}
              onChange={setDueDate}
              placeholder="Selecionar data"
            />
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-400 focus:outline-none focus:border-amber-500/50"
            />
            <select
              value={priority}
              onChange={e => setPriority(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-400 focus:outline-none focus:border-amber-500/50"
            >
              <option value="nenhuma">Sem prioridade</option>
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
            </select>
            {users.length > 0 && (
              <select
                value={assigned}
                onChange={e => setAssigned(e.target.value)}
                className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-400 focus:outline-none focus:border-amber-500/50"
              >
                <option value="">Responsável (opcional)</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            )}
            <select
              value={clientId}
              onChange={e => setClientId(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-400 focus:outline-none focus:border-amber-500/50"
            >
              <option value="">Cliente (opcional)</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {/* Repeat monthly toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              onClick={() => setRepeatMonthly(v => !v)}
              className={`w-8 h-4 rounded-full transition-colors flex-shrink-0 relative ${repeatMonthly ? 'bg-purple-500' : 'bg-gray-700'}`}
            >
              <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${repeatMonthly ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            <div className="flex items-center gap-1.5">
              <Repeat size={12} className={repeatMonthly ? 'text-purple-400' : 'text-gray-600'} />
              <span className={`text-xs ${repeatMonthly ? 'text-purple-300' : 'text-gray-600'}`}>
                {repeatMonthly
                  ? dueDate
                    ? `Repete todo mês no dia ${parseInt(dueDate.split('-')[2])}`
                    : 'Repetir todo mês · selecione uma data acima'
                  : 'Repetir todo mês'}
              </span>
            </div>
          </label>

          <div className="flex gap-2">
            <button type="submit" className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-gray-900 text-sm font-semibold transition-all">
              Adicionar tarefa
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-gray-200 text-sm transition-all">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Filters — always visible, apply to both views */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar tarefa ou cliente…"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-3 py-2 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
          />
        </div>
        {/* Status filter only useful in list mode or kanban-by-priority */}
        {(viewMode === 'list' || groupBy === 'priority') && (
          <div className="flex gap-1 bg-gray-800 rounded-lg p-1 border border-gray-700">
            {['todas','pendente','concluida'].map(f => (
              <button key={f} onClick={() => setFilterStatus(f)}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${filterStatus === f ? 'bg-amber-500/20 text-amber-300' : 'text-gray-500 hover:text-gray-300'}`}>
                {f === 'todas' ? 'Todas' : f === 'pendente' ? 'Pendente' : 'Concluída'}
              </button>
            ))}
          </div>
        )}
        {/* Priority filter only useful in list mode or kanban-by-status */}
        {(viewMode === 'list' || groupBy === 'status') && (
          <div className="flex gap-1 bg-gray-800 rounded-lg p-1 border border-gray-700">
            {['todas','alta','media','baixa','nenhuma'].map(f => (
              <button key={f} onClick={() => setFilterPriority(f)}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${filterPriority === f ? 'bg-amber-500/20 text-amber-300' : 'text-gray-500 hover:text-gray-300'}`}>
                {f === 'todas' ? 'Todas' : f === 'alta' ? 'Alta' : f === 'media' ? 'Média' : f === 'baixa' ? 'Baixa' : 'Nenhuma'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List view */}
      {viewMode === 'list' && (
        <div className="flex-1 overflow-y-auto scrollbar-thin space-y-2 pb-4">
          {filtered.length === 0 && filteredTemplates.length === 0 ? (
            <div className="text-center py-16 text-gray-600">
              <CheckSquare size={32} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">Nenhuma tarefa encontrada.</p>
            </div>
          ) : (
            <>
              {filtered.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  users={users}
                  clients={clients}
                  onToggle={handleToggle}
                  onUpdate={updateTask}
                  onDelete={deleteTask}
                  onOpenClient={onOpenClient}
                />
              ))}

              {filteredTemplates.length > 0 && (
                <div className={filtered.length > 0 ? 'mt-4 pt-4 border-t border-gray-800' : ''}>
                  <div className="flex items-center gap-2 mb-2">
                    <Repeat size={12} className="text-purple-400" />
                    <span className="text-xs font-medium text-gray-600">Tarefas Recorrentes</span>
                  </div>
                  <div className="space-y-2">
                    {filteredTemplates.map(task => (
                      <TemplateCard
                        key={task.id}
                        task={task}
                        users={users}
                        clients={clients}
                        onUpdate={updateTask}
                        onDelete={deleteTask}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Kanban view */}
      {viewMode === 'kanban' && (
        <div className="flex-1 overflow-hidden">
          <TaskKanbanView
            tasks={filtered}
            users={users}
            clients={clients}
            groupBy={groupBy}
            onGroupByChange={setGroupBy}
            onToggle={handleToggle}
            onUpdate={updateTask}
            onDelete={deleteTask}
            onOpenClient={onOpenClient}
          />
        </div>
      )}
    </div>
  )
}
