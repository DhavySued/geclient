import { useState } from 'react'
import {
  CheckSquare, Square, Trash2, Pencil, X, Check,
  Calendar, CalendarDays, Clock, Building2, Repeat,
} from 'lucide-react'
import RichTextEditor from './RichTextEditor'
import DatePicker from './DatePicker'
import { getInitials } from '../context/UsersContext'

export const PRIORITY_STYLE = {
  alta:    'bg-red-500/20 text-red-300 border-red-500/30',
  media:   'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  baixa:   'bg-blue-500/20 text-blue-300 border-blue-500/30',
  nenhuma: 'bg-gray-700/40 text-gray-500 border-gray-600/40',
}
export const PRIORITY_LABEL = { alta: 'Alta', media: 'Média', baixa: 'Baixa', nenhuma: 'Sem prioridade' }

export function formatDate(s) {
  if (!s) return null
  return new Date(s + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export function isOverdue(dueDate, status) {
  if (!dueDate || status === 'concluida') return false
  return new Date(dueDate + 'T23:59:59') < new Date()
}

function UserAvatar({ user, size = 18 }) {
  if (!user) return null
  return (
    <div
      title={user.name}
      style={{ backgroundColor: user.color, width: size, height: size, fontSize: size * 0.4 }}
      className="rounded-full flex items-center justify-center font-bold text-gray-900 flex-shrink-0"
    >
      {getInitials(user.name)}
    </div>
  )
}

// ── Edit Form ─────────────────────────────────────────────────────────────────

function EditForm({ task, users, clients, onSave, onCancel }) {
  const [title,          setTitle]          = useState(task.title)
  const [desc,           setDesc]           = useState(task.description || '')
  const [dueDate,        setDueDate]        = useState(task.repeatMonthly ? '' : (task.dueDate || ''))
  const [time,           setTime]           = useState(task.time || '')
  const [priority,       setPriority]       = useState(task.priority)
  const [assigned,       setAssigned]       = useState(task.assignedTo || '')
  const [clientId,       setClientId]       = useState(task.clientId || '')
  const [inAgenda,       setInAgenda]       = useState(task.showInAgenda !== false)
  const [repeatMonthly,  setRepeatMonthly]  = useState(task.repeatMonthly || false)

  const repeatDay = dueDate ? parseInt(dueDate.split('-')[2]) : (task.repeatDay || null)

  function handleSave(e) {
    e.preventDefault()
    if (!title.trim()) return

    if (repeatMonthly) {
      if (!dueDate && !task.repeatDay) return // precisa de uma data para definir o dia
      onSave({
        title:           title.trim(),
        description:     desc,
        dueDate:         null,
        time:            time || null,
        priority,
        assignedTo:      assigned || null,
        clientId:        clientId || null,
        showInAgenda:    inAgenda,
        repeatMonthly:   true,
        repeatDay:       repeatDay,
        lastSpawnedMonth: task.lastSpawnedMonth ?? null,
      })
    } else {
      onSave({
        title:          title.trim(),
        description:    desc,
        dueDate:        dueDate || null,
        time:           time || null,
        priority,
        assignedTo:     assigned || null,
        clientId:       clientId || null,
        showInAgenda:   inAgenda,
        repeatMonthly:  false,
        repeatDay:      undefined,
      })
    }
  }

  return (
    <form onSubmit={handleSave} className="p-4 rounded-xl border border-amber-500/30 bg-gray-800/90 space-y-3">
      <input
        autoFocus
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Título da tarefa *"
        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
      />

      <RichTextEditor
        value={desc}
        onChange={setDesc}
        placeholder="Descrição (suporta formatação)"
        minHeight={80}
      />

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-[10px] text-gray-500 mb-1">
            {repeatMonthly ? 'Dia de repetição' : 'Data'}
          </label>
          <DatePicker
            value={dueDate}
            onChange={setDueDate}
            placeholder="Selecionar data"
          />
        </div>
        <div>
          <label className="block text-[10px] text-gray-500 mb-1">Horário</label>
          <input
            type="time"
            value={time}
            onChange={e => setTime(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-400 focus:outline-none focus:border-amber-500/50"
          />
        </div>
        <div>
          <label className="block text-[10px] text-gray-500 mb-1">Prioridade</label>
          <select
            value={priority}
            onChange={e => setPriority(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-400 focus:outline-none focus:border-amber-500/50"
          >
            <option value="nenhuma">Sem prioridade</option>
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {users && users.length > 0 && (
          <div>
            <label className="block text-[10px] text-gray-500 mb-1">Responsável</label>
            <select
              value={assigned}
              onChange={e => setAssigned(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-400 focus:outline-none focus:border-amber-500/50"
            >
              <option value="">Sem responsável</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        )}
        {clients && (
          <div>
            <label className="block text-[10px] text-gray-500 mb-1">Cliente</label>
            <select
              value={clientId}
              onChange={e => setClientId(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-400 focus:outline-none focus:border-amber-500/50"
            >
              <option value="">Sem cliente</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Toggles */}
      <div className="space-y-2">
        {/* Agenda toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div
            onClick={() => setInAgenda(v => !v)}
            className={`w-8 h-4 rounded-full transition-colors flex-shrink-0 relative ${inAgenda ? 'bg-amber-500' : 'bg-gray-700'}`}
          >
            <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${inAgenda ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
          <div className="flex items-center gap-1.5">
            <CalendarDays size={12} className={inAgenda ? 'text-amber-400' : 'text-gray-600'} />
            <span className={`text-xs ${inAgenda ? 'text-gray-300' : 'text-gray-600'}`}>
              {inAgenda ? 'Exibir na agenda' : 'Oculto na agenda'}
            </span>
          </div>
        </label>

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
                ? repeatDay
                  ? `Repete todo mês no dia ${repeatDay}`
                  : 'Repetir todo mês · selecione uma data'
                : 'Repetir todo mês'}
            </span>
          </div>
        </label>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-gray-900 text-xs font-semibold transition-all"
        >
          <Check size={13} /> Salvar
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-gray-200 text-xs transition-all"
        >
          <X size={13} /> Cancelar
        </button>
      </div>
    </form>
  )
}

export { EditForm }

// ── Template Card ─────────────────────────────────────────────────────────────

function TemplateCard({ task, users, clients, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false)
  const userMap   = Object.fromEntries(users.map(u => [u.id, u]))
  const clientMap = clients ? Object.fromEntries(clients.map(c => [c.id, c])) : {}
  const assignedUser = userMap[task.assignedTo]
  const linkedClient = clientMap[task.clientId]

  if (editing) {
    return (
      <EditForm
        task={task}
        users={users}
        clients={clients}
        onSave={(updates) => { onUpdate(task.id, { ...updates, lastSpawnedMonth: null }); setEditing(false) }}
        onCancel={() => setEditing(false)}
      />
    )
  }

  return (
    <div className="group flex items-center gap-3 p-3.5 rounded-xl border border-purple-500/20 bg-purple-950/10">
      <Repeat size={14} className="text-purple-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-300 truncate">{task.title}</p>
        <div className="flex items-center gap-2 flex-wrap mt-0.5">
          <span className="text-xs text-purple-400/80">Dia {task.repeatDay} · todo mês</span>
          {assignedUser && (
            <div className="flex items-center gap-1">
              <UserAvatar user={assignedUser} size={14} />
              <span className="text-xs text-gray-600">{assignedUser.name.split(' ')[0]}</span>
            </div>
          )}
          {linkedClient && (
            <span className="text-xs text-gray-600 truncate max-w-[100px]">{linkedClient.name}</span>
          )}
        </div>
      </div>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => setEditing(true)}
          className="p-1 rounded text-gray-600 hover:text-amber-400 transition-colors"
          title="Editar"
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className="p-1 rounded text-gray-600 hover:text-red-400 transition-colors"
          title="Excluir recorrência"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

export { TemplateCard }

// ── Task Item ─────────────────────────────────────────────────────────────────

export default function TaskItem({ task, users = [], clients = null, onToggle, onUpdate, onDelete, onOpenClient }) {
  const [editing, setEditing] = useState(false)

  const userMap   = Object.fromEntries(users.map(u => [u.id, u]))
  const clientMap = clients ? Object.fromEntries(clients.map(c => [c.id, c])) : {}

  const assignedUser = userMap[task.assignedTo]
  const linkedClient = clientMap[task.clientId]
  const isDone       = task.status === 'concluida'
  const overdue      = isOverdue(task.dueDate, task.status)
  const inAgenda     = task.showInAgenda !== false
  const isRecurring  = !!task.recurringParentId

  if (editing) {
    return (
      <EditForm
        task={task}
        users={users}
        clients={clients}
        onSave={(updates) => { onUpdate(task.id, updates); setEditing(false) }}
        onCancel={() => setEditing(false)}
      />
    )
  }

  return (
    <div className={`group flex items-start gap-3 p-3.5 rounded-xl border transition-all ${
      isDone
        ? 'bg-gray-800/25 border-gray-700/25'
        : overdue
        ? 'bg-red-950/20 border-red-500/20'
        : 'bg-gray-800/60 border-gray-700/50 hover:border-gray-600'
    }`}>
      {/* Checkbox */}
      <button
        onClick={() => onToggle(task)}
        className={`mt-0.5 flex-shrink-0 transition-colors ${
          isDone ? 'text-emerald-400' : 'text-gray-600 hover:text-amber-400'
        }`}
      >
        {isDone ? <CheckSquare size={16} /> : <Square size={16} />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium mb-1 ${isDone ? 'line-through text-gray-500' : 'text-gray-200'}`}>
          {task.title}
        </p>

        {task.description && (
          <div
            className="rich-content text-xs text-gray-400 mb-2 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: task.description }}
          />
        )}

        {/* Meta row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PRIORITY_STYLE[task.priority]}`}>
            {PRIORITY_LABEL[task.priority]}
          </span>

          {task.dueDate && (
            <div className={`flex items-center gap-1 text-xs ${overdue ? 'text-red-400 font-medium' : 'text-gray-500'}`}>
              <Calendar size={10} />
              <span>{formatDate(task.dueDate)}</span>
              {task.time ? (
                <>
                  <Clock size={10} className="ml-0.5" />
                  <span>{task.time}</span>
                </>
              ) : (
                <span className="text-gray-600">· dia todo</span>
              )}
              {overdue && <span className="text-red-400 font-medium">· vencida</span>}
            </div>
          )}

          {isRecurring && (
            <div className="flex items-center gap-1 text-xs text-purple-400/70">
              <Repeat size={10} />
              <span>mensal</span>
            </div>
          )}

          {assignedUser && (
            <div className="flex items-center gap-1">
              <UserAvatar user={assignedUser} size={16} />
              <span className="text-xs text-gray-500">{assignedUser.name.split(' ')[0]}</span>
            </div>
          )}

          {linkedClient && onOpenClient && (
            <button
              onClick={() => onOpenClient(linkedClient)}
              className="flex items-center gap-1 text-xs text-gray-600 hover:text-amber-400 transition-colors"
            >
              <Building2 size={10} />
              <span className="truncate max-w-[120px]">{linkedClient.name}</span>
            </button>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => onUpdate(task.id, { showInAgenda: !inAgenda })}
          title={inAgenda ? 'Ocultar da agenda' : 'Exibir na agenda'}
          className={`p-1 rounded transition-colors ${inAgenda ? 'text-amber-400/70 hover:text-amber-300' : 'text-gray-700 hover:text-amber-400'}`}
        >
          <CalendarDays size={13} />
        </button>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          <button
            onClick={() => setEditing(true)}
            className="p-1 rounded text-gray-600 hover:text-amber-400 transition-colors"
            title="Editar"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="p-1 rounded text-gray-600 hover:text-red-400 transition-colors"
            title="Excluir"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}
