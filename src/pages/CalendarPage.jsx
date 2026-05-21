import { useState, useMemo } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { ChevronLeft, ChevronRight, Calendar, Building2, Flag, AlertTriangle, GripVertical, X, CheckCircle2, Circle } from 'lucide-react'
import { useTasks } from '../context/TasksContext'
import { useClients } from '../context/ClientsContext'
import { useUsers } from '../context/UsersContext'
import { usePermissions } from '../hooks/usePermissions'
import ClientSelect from '../components/ClientSelect'

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

// ── Modal de detalhe de tarefa ────────────────────────────────────────────────
function TaskDetailModal({ task, clients, users, clientMap, userMap, onClose, onToggle, onSave, onDelete, canEdit, canDelete }) {
  const [title,    setTitle]    = useState(task.title)
  const [dueDate,  setDueDate]  = useState(task.dueDate  ?? '')
  const [time,     setTime]     = useState(task.time     ?? '')
  const [priority, setPriority] = useState(task.priority ?? 'media')
  const [clientId, setClientId] = useState(task.clientId ?? '')
  const [editDesc, setEditDesc] = useState(false)
  const [desc,     setDesc]     = useState(task.description ?? '')

  const isDone  = task.status === 'concluida'
  const client  = clientMap[clientId]

  const dirty =
    title    !== task.title        ||
    dueDate  !== (task.dueDate  ?? '') ||
    time     !== (task.time     ?? '') ||
    priority !== (task.priority ?? 'media') ||
    clientId !== (task.clientId ?? '') ||
    desc     !== (task.description ?? '')

  function handleSave() {
    onSave(task.id, {
      title:       title.trim() || task.title,
      dueDate:     dueDate  || null,
      time:        time     || null,
      priority,
      clientId:    clientId || null,
      description: desc,
    })
  }

  const PRIO = [
    { id: 'alta',    label: 'Alta',    cls: 'bg-red-100 text-red-700 border-red-300' },
    { id: 'media',   label: 'Média',   cls: 'bg-amber-100 text-amber-700 border-amber-300' },
    { id: 'baixa',   label: 'Baixa',   cls: 'bg-sky-100 text-sky-700 border-sky-300' },
    { id: 'nenhuma', label: 'Nenhuma', cls: 'bg-gray-100 text-gray-500 border-gray-300' },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col" style={{ maxHeight: '90vh' }}>

        {/* Header — título editável */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className={`mt-2.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${PRIORITY_STYLE[priority]?.dot ?? 'bg-gray-400'}`} />
          <div className="flex-1 min-w-0">
            {canEdit ? (
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                className={`w-full text-[15px] font-bold bg-transparent focus:outline-none focus:bg-gray-50 focus:rounded-lg focus:px-2 focus:-mx-2 transition-all ${
                  isDone ? 'line-through text-gray-400' : 'text-gray-900'
                }`}
                placeholder="Título da tarefa"
              />
            ) : (
              <p className={`text-[15px] font-bold ${isDone ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                {task.title}
              </p>
            )}
            {isDone && (
              <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-px rounded-md">
                <CheckCircle2 size={9} /> Concluída
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 space-y-4">

          {/* Data + Hora */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Data de vencimento
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                disabled={!canEdit}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-brand-400/60 transition-colors disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Horário
              </label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                disabled={!canEdit}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-brand-400/60 transition-colors disabled:opacity-50"
              />
            </div>
          </div>

          {/* Prioridade */}
          <div>
            <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Prioridade
            </label>
            <div className="flex rounded-xl border border-gray-200 overflow-hidden">
              {PRIO.map(p => (
                <button
                  key={p.id}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => canEdit && setPriority(p.id)}
                  className={`flex-1 py-2 text-[11px] font-semibold transition-colors border-r last:border-r-0 border-gray-200 ${
                    priority === p.id ? p.cls : 'bg-white text-gray-400 hover:bg-gray-50'
                  } disabled:cursor-default`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Empresa */}
          <div>
            <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Empresa
            </label>
            {canEdit ? (
              <ClientSelect
                clients={clients}
                value={clientId}
                onChange={setClientId}
                placeholder="Sem empresa vinculada"
              />
            ) : client ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-700">
                <Building2 size={13} className="text-gray-400" />
                {client.name}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">Sem empresa vinculada</p>
            )}
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Descrição
            </label>
            {canEdit && editDesc ? (
              <textarea
                autoFocus
                value={desc}
                onChange={e => setDesc(e.target.value)}
                onBlur={() => setEditDesc(false)}
                rows={4}
                className="w-full bg-gray-50 border border-brand-400/40 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none resize-none scrollbar-thin"
                placeholder="Adicione uma descrição..."
              />
            ) : desc ? (
              <div
                className="text-[13px] text-gray-600 leading-relaxed rounded-xl px-3 py-2 bg-gray-50 border border-gray-200 cursor-text min-h-[60px]"
                style={{ wordBreak: 'break-word' }}
                dangerouslySetInnerHTML={{ __html: desc }}
                onClick={() => canEdit && setEditDesc(true)}
                title={canEdit ? 'Clique para editar' : undefined}
              />
            ) : (
              <div
                className={`text-[12px] text-gray-400 italic rounded-xl px-3 py-2 bg-gray-50 border border-dashed border-gray-200 min-h-[48px] flex items-center ${canEdit ? 'cursor-text hover:border-gray-300' : ''}`}
                onClick={() => canEdit && setEditDesc(true)}
              >
                {canEdit ? 'Clique para adicionar uma descrição…' : 'Sem descrição.'}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 flex items-center gap-2 flex-shrink-0">
          {/* Salvar (quando há alterações) */}
          {canEdit && dirty && (
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all flex-1 justify-center"
              style={{ background: 'rgba(243,146,0,0.15)', color: '#c97700', border: '1px solid rgba(243,146,0,0.35)' }}
            >
              <CheckCircle2 size={14} />
              Salvar alterações
            </button>
          )}

          {/* Concluir / Reabrir (quando sem alterações pendentes) */}
          {(!dirty || !canEdit) && (
            <button
              onClick={() => canEdit && onToggle(task)}
              disabled={!canEdit}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all flex-1 justify-center ${
                isDone
                  ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
              } ${!canEdit ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <CheckCircle2 size={14} />
              {isDone ? 'Reabrir' : 'Concluir'}
            </button>
          )}

          {canDelete && (
            <button
              onClick={() => { onDelete(task.id); onClose() }}
              className="p-2 rounded-xl text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
              title="Excluir tarefa"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Modal de tarefas do dia ───────────────────────────────────────────────────
function DayTasksModal({ date, tasks, clients, clientMap, onClose, onToggleTask, onAddTask, onDeleteTask, onUpdateTask, onOpenClient, canEdit, canDelete }) {
  const doneCount = tasks.filter(t => t.status === 'concluida').length

  const [showForm,      setShowForm]      = useState(false)
  const [newTitle,      setNewTitle]      = useState('')
  const [newPrio,       setNewPrio]       = useState('media')
  const [newTime,       setNewTime]       = useState('')
  const [newClient,     setNewClient]     = useState('')
  const [saving,        setSaving]        = useState(false)
  const [editingDateId, setEditingDateId] = useState(null)
  const [editingDate,   setEditingDate]   = useState('')

  function startEditDate(task) {
    setEditingDateId(task.id)
    setEditingDate(task.dueDate ?? '')
  }

  function commitDate(taskId) {
    if (editingDate) onUpdateTask(taskId, { dueDate: editingDate })
    setEditingDateId(null)
    setEditingDate('')
  }

  function cancelDate() {
    setEditingDateId(null)
    setEditingDate('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!newTitle.trim()) return
    setSaving(true)
    try {
      await onAddTask({
        title:    newTitle.trim(),
        priority: newPrio,
        dueDate:  date,
        time:     newTime || null,
        clientId: newClient || null,
      })
      setNewTitle(''); setNewPrio('media'); setNewTime(''); setNewClient('')
      setShowForm(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col" style={{ maxHeight: '85vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-0.5">Tarefas do dia</p>
            <p className="text-[15px] font-bold text-gray-900 capitalize">{formatFull(date)}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-medium text-gray-400">
              <span className="text-emerald-600 font-bold">{doneCount}</span>/{tasks.length} concluída{tasks.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Lista de tarefas */}
        <div className="overflow-y-auto flex-1 p-4 space-y-2 scrollbar-thin">
          {tasks.length === 0 && !showForm && (
            <p className="text-center text-[12px] text-gray-400 py-6">Nenhuma tarefa neste dia.</p>
          )}
          {tasks.map(task => {
            const isDone = task.status === 'concluida'
            const pStyle = PRIORITY_STYLE[task.priority] ?? PRIORITY_STYLE.nenhuma
            const c = clientMap[task.clientId]

            function handleToggle() {
              if (!canEdit) return
              if (task._virtual) {
                onAddTask({
                  title:             task.title,
                  description:       task.description,
                  status:            'concluida',
                  priority:          task.priority,
                  dueDate:           task.dueDate,
                  time:              task.time,
                  clientId:          task.clientId,
                  assignedTo:        task.assignedTo,
                  showInAgenda:      task.showInAgenda,
                  repeatMonthly:     false,
                  recurringParentId: task.id,
                })
              } else {
                onToggleTask(task.id, isDone ? 'pendente' : 'concluida')
              }
            }

            return (
              <div
                key={`${task.id}${task._overdue ? '_ov' : ''}${task._virtual ? '_virt' : ''}`}
                className={`rounded-xl border transition-all ${
                  isDone
                    ? 'bg-gray-50 border-gray-200/60'
                    : task._overdue
                    ? 'bg-red-50 border-red-200'
                    : 'bg-white border-gray-200 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3 px-3 py-3">
                  <button
                    onClick={handleToggle}
                    disabled={!canEdit}
                    className={`flex-shrink-0 transition-colors ${!canEdit ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                    title={isDone ? 'Reabrir' : 'Marcar como concluída'}
                  >
                    {isDone
                      ? <CheckCircle2 size={18} className="text-emerald-500" />
                      : <Circle size={18} className="text-gray-300 hover:text-emerald-400" />
                    }
                  </button>

                  <div className="flex-1 min-w-0">
                    {task._overdue && (
                      <div className="flex items-center gap-1 mb-0.5">
                        <AlertTriangle size={9} className="text-red-500 flex-shrink-0" />
                        <span className="text-[9px] font-bold text-red-500 uppercase tracking-wide">
                          Vencida · {new Date(task.dueDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </span>
                      </div>
                    )}
                    <p className={`text-[13px] leading-snug ${isDone ? 'line-through text-gray-400' : 'text-gray-900 font-semibold'}`}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`text-[10px] px-1.5 py-px rounded-md border font-semibold ${pStyle.bg} ${pStyle.text} ${pStyle.border}`}>
                        {pStyle.label}
                      </span>
                      {task.time && (
                        <span className="text-[10px] text-gray-500 font-medium">{task.time}</span>
                      )}
                      {c && (
                        <button
                          onClick={() => { onOpenClient?.(c); onClose() }}
                          className="flex items-center gap-0.5 text-[10px] text-gray-500 hover:text-brand-400 transition-colors min-w-0"
                        >
                          <Building2 size={8} className="flex-shrink-0" />
                          <span className="truncate max-w-[100px]">{c.name}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-0.5 flex-shrink-0">
                    {/* Editar data — só tarefas reais e não virtuais */}
                    {canEdit && !task._virtual && (
                      editingDateId === task.id ? (
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <input
                            autoFocus
                            type="date"
                            value={editingDate}
                            onChange={e => setEditingDate(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') commitDate(task.id)
                              if (e.key === 'Escape') cancelDate()
                            }}
                            className="text-[11px] border border-brand-400/50 rounded-lg px-1.5 py-1 text-gray-700 focus:outline-none bg-white"
                            style={{ width: 120 }}
                          />
                          <button
                            onMouseDown={e => { e.preventDefault(); commitDate(task.id) }}
                            className="p-1 rounded text-emerald-500 hover:text-emerald-600 transition-colors"
                            title="Confirmar"
                          >
                            <CheckCircle2 size={13} />
                          </button>
                          <button
                            onMouseDown={e => { e.preventDefault(); cancelDate() }}
                            className="p-1 rounded text-gray-300 hover:text-gray-500 transition-colors"
                            title="Cancelar"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={e => { e.stopPropagation(); startEditDate(task) }}
                          className="p-1 rounded text-gray-300 hover:text-brand-400 transition-colors"
                          title="Alterar data de vencimento"
                        >
                          <Calendar size={13} />
                        </button>
                      )
                    )}
                    {canDelete && !task._virtual && (
                      <button
                        onClick={() => onDeleteTask(task.id)}
                        className="p-1 rounded text-gray-300 hover:text-red-400 transition-colors"
                        title="Excluir"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Formulário de nova tarefa */}
        {canEdit && (
          <div className="flex-shrink-0 border-t border-gray-100">
            {!showForm ? (
              <div className="px-5 py-3">
                <button
                  onClick={() => setShowForm(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all border border-dashed border-gray-300 text-gray-400 hover:border-brand-400/60 hover:text-brand-500 hover:bg-brand-50/50"
                >
                  <X size={13} className="rotate-45" />
                  Nova tarefa neste dia
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Nova tarefa</p>

                {/* Título */}
                <input
                  autoFocus
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Título da tarefa..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-400/60 transition-colors"
                />

                <div className="flex gap-2">
                  {/* Prioridade */}
                  <div className="flex rounded-lg border border-gray-200 overflow-hidden flex-shrink-0">
                    {['alta', 'media', 'baixa'].map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setNewPrio(p)}
                        className={`px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                          newPrio === p
                            ? p === 'alta'  ? 'bg-red-100 text-red-700'
                            : p === 'media' ? 'bg-amber-100 text-amber-700'
                            :                 'bg-sky-100 text-sky-700'
                            : 'bg-white text-gray-400 hover:bg-gray-50'
                        }`}
                      >
                        {p === 'alta' ? 'Alta' : p === 'media' ? 'Média' : 'Baixa'}
                      </button>
                    ))}
                  </div>

                  {/* Horário */}
                  <input
                    type="time"
                    value={newTime}
                    onChange={e => setNewTime(e.target.value)}
                    className="flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:border-brand-400/60 transition-colors"
                  />
                </div>

                {/* Empresa */}
                <ClientSelect
                  clients={clients}
                  value={newClient}
                  onChange={setNewClient}
                  placeholder="Sem empresa vinculada"
                />

                {/* Ações */}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); setNewTitle(''); setNewPrio('media'); setNewTime(''); setNewClient('') }}
                    className="flex-1 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!newTitle.trim() || saving}
                    className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
                    style={{ background: 'rgba(243,146,0,0.15)', color: '#c97700', border: '1px solid rgba(243,146,0,0.35)' }}
                  >
                    {saving ? 'Salvando…' : 'Adicionar'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Footer */}
        {!showForm && (
          <div className="px-5 py-3 border-t border-gray-100 flex-shrink-0">
            <button
              onClick={onClose}
              className="w-full py-2 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'rgba(243,146,0,0.12)', color: '#c97700', border: '1px solid rgba(243,146,0,0.28)' }}
            >
              Fechar
            </button>
          </div>
        )}
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

  const [dayModalDate, setDayModalDate] = useState(null)
  const [detailTask,   setDetailTask]   = useState(null)

  const { tasks, addTask, deleteTask, updateTask } = useTasks()
  const { clients } = useClients()
  const { users }   = useUsers()
  const { can }     = usePermissions()
  const canEdit     = can('calendar', 'edit')
  const canDelete   = can('calendar', 'delete')
  const clientMap   = Object.fromEntries(clients.map(c => [c.id, c]))
  const userMap     = Object.fromEntries(users.map(u => [u.id, u]))

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

  // Projeta tarefas recorrentes do mês visualizado que ainda não foram spawnadas
  const viewedMonthKey = `${year}-${String(month + 1).padStart(2, '0')}`
  const templates = tasks.filter(t => t.repeatMonthly)
  for (const tmpl of templates) {
    const maxDay  = new Date(year, month + 1, 0).getDate()
    const day     = Math.min(tmpl.repeatDay || 1, maxDay)
    const dateStr = `${viewedMonthKey}-${String(day).padStart(2, '0')}`
    // Só projeta se ainda não existe uma cópia real spawnada nesse mês
    const alreadySpawned = tasks.some(
      t => t.recurringParentId === tmpl.id && t.dueDate?.startsWith(viewedMonthKey)
    )
    if (!alreadySpawned && tmpl.showInAgenda !== false) {
      if (!tasksByDate[dateStr]) tasksByDate[dateStr] = []
      // Projeta como uma cópia virtual (não modifica o template original)
      tasksByDate[dateStr].push({ ...tmpl, _virtual: true, dueDate: dateStr, repeatMonthly: false })
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
                        onClick={() => {
                          setSelectedDate(dateStr)
                          setDayModalDate(dateStr)
                        }}
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
                        {/* Número + badge pendentes + indicador vencida */}
                        {(() => {
                          const pendingCount = dayTasks.filter(t => t.status !== 'concluida' && !t._overdue).length
                          return (
                            <div className="flex items-center justify-between mb-1.5 w-full">
                              <span className={`text-xs font-bold ${
                                isSelected ? 'text-brand-600' : isToday ? 'text-blue-600' : isWeekend ? 'text-gray-500' : 'text-gray-600'
                              }`}>
                                {day}
                              </span>
                              <div className="flex items-center gap-1">
                                {pendingCount > 0 && (
                                  <span className={`text-[9px] font-bold px-1.5 py-px rounded-full leading-none ${
                                    hasOverdue
                                      ? 'bg-red-100 text-red-600'
                                      : isSelected
                                      ? 'bg-brand-500/20 text-brand-600'
                                      : 'bg-gray-200 text-gray-500'
                                  }`}>
                                    {pendingCount}
                                  </span>
                                )}
                                {hasOverdue && <AlertTriangle size={9} className="text-red-400 flex-shrink-0" />}
                              </div>
                            </div>
                          )
                        })()}

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
                    {selectedTasks.map(task => {
                      const handleToggle = task._virtual
                        // Tarefa virtual: spawna cópia real para esse mês já como concluída
                        ? () => canEdit && addTask({
                            title:             task.title,
                            description:       task.description,
                            status:            'concluida',
                            priority:          task.priority,
                            dueDate:           task.dueDate,
                            time:              task.time,
                            clientId:          task.clientId,
                            assignedTo:        task.assignedTo,
                            showInAgenda:      task.showInAgenda,
                            repeatMonthly:     false,
                            recurringParentId: task.id,
                          })
                        : () => updateTask(task.id, { status: task.status === 'concluida' ? 'pendente' : 'concluida' })

                      return (
                        <TaskCard
                          key={`${task.id}${task._overdue ? '_ov' : ''}${task._virtual ? '_virt' : ''}`}
                          task={task}
                          clientMap={clientMap}
                          overdueDate={task._overdue ? task.dueDate : null}
                          onToggle={handleToggle}
                          onDelete={() => !task._virtual && deleteTask(task.id)}
                          onOpenClient={onOpenClient}
                          canEdit={canEdit}
                          canDelete={canDelete && !task._virtual}
                        />
                      )
                    })}
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

                                    <div
                                      className="flex-1 px-2.5 py-2.5 min-w-0 cursor-pointer"
                                      onClick={e => { if (!snapshot.isDragging) { e.stopPropagation(); setDetailTask(task) } }}
                                    >
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
                                            onClick={e => { e.stopPropagation(); onOpenClient?.(clientMap[task.clientId]) }}
                                            className="flex items-center gap-0.5 text-[10px] text-gray-500 hover:text-brand-400 transition-colors min-w-0"
                                          >
                                            <Building2 size={8} className="flex-shrink-0" />
                                            <span className="truncate max-w-[80px]">{clientMap[task.clientId].name}</span>
                                          </button>
                                        )}
                                        {task.description && (
                                          <span className="text-[10px] text-gray-400 italic">tem descrição</span>
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

      {detailTask && (
        <TaskDetailModal
          task={detailTask}
          clients={clients}
          users={users}
          clientMap={clientMap}
          userMap={userMap}
          onClose={() => setDetailTask(null)}
          onToggle={task => { updateTask(task.id, { status: task.status === 'concluida' ? 'pendente' : 'concluida' }); setDetailTask(null) }}
          onSave={(id, updates) => { updateTask(id, updates); setDetailTask(null) }}
          onDelete={id => { deleteTask(id); setDetailTask(null) }}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      )}

      {dayModalDate && (
        <DayTasksModal
          date={dayModalDate}
          tasks={getTasksForDate(dayModalDate)}
          clients={clients}
          clientMap={clientMap}
          onClose={() => setDayModalDate(null)}
          onToggleTask={(id, status) => updateTask(id, { status })}
          onAddTask={addTask}
          onDeleteTask={deleteTask}
          onUpdateTask={(id, patch) => updateTask(id, patch)}
          onOpenClient={onOpenClient}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      )}
    </DragDropContext>
  )
}
