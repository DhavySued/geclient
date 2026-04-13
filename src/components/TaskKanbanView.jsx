import { useState } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import {
  CheckSquare, Square, Trash2, Calendar, Clock,
  Building2, CalendarDays, Pencil,
} from 'lucide-react'
import { getInitials } from '../context/UsersContext'
import { PRIORITY_STYLE, PRIORITY_LABEL, formatDate, isOverdue, EditForm } from './TaskItem'

// ── Column configs ────────────────────────────────────────────────────────────

const PRIORITY_COLS = [
  { id: 'alta',    label: 'Alta Prioridade',  bg: 'bg-red-500/10',     border: 'border-red-500/30',     text: 'text-red-400',    dot: 'bg-red-400',    headerBg: 'bg-red-950/40' },
  { id: 'media',   label: 'Média Prioridade', bg: 'bg-yellow-500/10',  border: 'border-yellow-500/30',  text: 'text-yellow-400', dot: 'bg-yellow-400', headerBg: 'bg-yellow-950/40' },
  { id: 'baixa',   label: 'Baixa Prioridade', bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    text: 'text-blue-400',   dot: 'bg-blue-400',   headerBg: 'bg-blue-950/40' },
  { id: 'nenhuma', label: 'Sem Prioridade',   bg: 'bg-gray-700/20',    border: 'border-gray-600/40',    text: 'text-gray-400',   dot: 'bg-gray-600',   headerBg: 'bg-gray-100/60' },
]

const STATUS_COLS = [
  { id: 'pendente',     label: 'Pendente',     bg: 'bg-gray-700/20',    border: 'border-gray-600/40',    text: 'text-gray-400',    dot: 'bg-gray-500',    headerBg: 'bg-gray-100/60' },
  { id: 'em_andamento', label: 'Em Andamento', bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    text: 'text-blue-400',    dot: 'bg-blue-400',    headerBg: 'bg-blue-950/40' },
  { id: 'concluida',    label: 'Concluída',    bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', dot: 'bg-emerald-400', headerBg: 'bg-emerald-950/40' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function stripHtml(html) {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
}

function UserAvatar({ user, size = 18 }) {
  if (!user) return null
  return (
    <div
      title={user.name}
      style={{ backgroundColor: user.color, width: size, height: size, fontSize: size * 0.4 }}
      className="rounded-full flex items-center justify-center font-bold text-gray-900 flex-shrink-0 select-none"
    >
      {getInitials(user.name)}
    </div>
  )
}

// ── Kanban Card ───────────────────────────────────────────────────────────────

function KanbanCard({ task, index, users, clients, groupBy, onToggle, onUpdate, onDelete, onOpenClient }) {
  const [editing, setEditing] = useState(false)

  const userMap   = Object.fromEntries(users.map(u => [u.id, u]))
  const clientMap = clients ? Object.fromEntries(clients.map(c => [c.id, c])) : {}

  const assignedUser = userMap[task.assignedTo]
  const linkedClient = clientMap[task.clientId]
  const isDone       = task.status === 'concluida'
  const overdue      = isOverdue(task.dueDate, task.status)
  const inAgenda     = task.showInAgenda !== false
  const descText     = stripHtml(task.description)

  return (
    <Draggable draggableId={task.id} index={index} isDragDisabled={editing}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...(editing ? {} : provided.dragHandleProps)}
          className={`bg-gray-100 rounded-xl border shadow-md transition-all ${
            editing
              ? 'border-brand-500/40 cursor-default'
              : snapshot.isDragging
              ? 'opacity-90 scale-[1.02] shadow-2xl border-brand-500/50 cursor-grabbing select-none'
              : isDone
              ? 'border-gray-200/40 opacity-60 cursor-grab select-none'
              : overdue
              ? 'border-red-500/30 bg-red-950/20 cursor-grab select-none'
              : 'border-gray-200 hover:border-gray-400 cursor-grab select-none'
          }`}
        >
          {editing ? (
            /* ── Edit mode ── */
            <div className="p-2">
              <EditForm
                task={task}
                users={users}
                clients={clients}
                onSave={(updates) => { onUpdate(task.id, updates); setEditing(false) }}
                onCancel={() => setEditing(false)}
              />
            </div>
          ) : (
            /* ── View mode ── */
            <div className="p-3 group">
              {/* Title + edit button */}
              <div className="flex items-start justify-between gap-1 mb-1.5">
                <p className={`text-sm font-semibold leading-tight flex-1 min-w-0 ${isDone ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                  {task.title}
                </p>
                <button
                  onMouseDown={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); setEditing(true) }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-600 hover:text-brand-400 transition-all flex-shrink-0"
                  title="Editar"
                >
                  <Pencil size={12} />
                </button>
              </div>

              {/* Description snippet */}
              {descText && (
                <p className="text-xs text-gray-500 leading-relaxed mb-2 line-clamp-2">{descText}</p>
              )}

              {/* Badge row */}
              <div className="flex items-center gap-1.5 flex-wrap mb-2">
                {groupBy === 'priority' ? (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${
                    task.status === 'concluida'    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                    task.status === 'em_andamento' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                                                     'bg-gray-700/60 text-gray-400 border-gray-600/40'
                  }`}>
                    {task.status === 'concluida' ? 'Concluída' : task.status === 'em_andamento' ? 'Em andamento' : 'Pendente'}
                  </span>
                ) : (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${PRIORITY_STYLE[task.priority]}`}>
                    {PRIORITY_LABEL[task.priority]}
                  </span>
                )}

                {task.dueDate && (
                  <div className={`flex items-center gap-1 text-[10px] ${overdue ? 'text-red-400 font-semibold' : 'text-gray-500'}`}>
                    <Calendar size={9} />
                    <span>{formatDate(task.dueDate)}</span>
                    {task.time && (
                      <>
                        <Clock size={9} className="ml-0.5" />
                        <span>{task.time}</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-200/50">
                <div className="flex items-center gap-1.5 min-w-0">
                  {assignedUser && (
                    <div className="flex items-center gap-1">
                      <UserAvatar user={assignedUser} size={16} />
                      <span className="text-[10px] text-gray-500 truncate max-w-[70px]">{assignedUser.name.split(' ')[0]}</span>
                    </div>
                  )}
                  {linkedClient && onOpenClient && (
                    <button
                      onMouseDown={e => e.stopPropagation()}
                      onClick={e => { e.stopPropagation(); onOpenClient(linkedClient) }}
                      className="flex items-center gap-1 text-[10px] text-gray-600 hover:text-brand-400 transition-colors truncate max-w-[90px]"
                    >
                      <Building2 size={9} />
                      <span className="truncate">{linkedClient.name}</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onMouseDown={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); onUpdate(task.id, { showInAgenda: !inAgenda }) }}
                    title={inAgenda ? 'Ocultar da agenda' : 'Exibir na agenda'}
                    className={`p-1 rounded transition-colors ${inAgenda ? 'text-brand-400/70 hover:text-brand-300' : 'text-gray-700 hover:text-brand-400'}`}
                  >
                    <CalendarDays size={12} />
                  </button>
                  <button
                    onMouseDown={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); onToggle(task) }}
                    className={`p-1 rounded transition-colors ${isDone ? 'text-emerald-400 hover:text-gray-400' : 'text-gray-600 hover:text-emerald-400'}`}
                    title={isDone ? 'Desmarcar' : 'Concluir'}
                  >
                    {isDone ? <CheckSquare size={13} /> : <Square size={13} />}
                  </button>
                  <button
                    onMouseDown={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); onDelete(task.id) }}
                    className="p-1 rounded text-gray-700 hover:text-red-400 transition-colors"
                    title="Excluir"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Draggable>
  )
}

// ── Main Kanban View ──────────────────────────────────────────────────────────

export default function TaskKanbanView({ tasks, users, clients, groupBy, onGroupByChange, onToggle, onUpdate, onDelete, onOpenClient }) {
  const cols = groupBy === 'priority' ? PRIORITY_COLS : STATUS_COLS

  // Group tasks into columns
  const grouped = {}
  for (const col of cols) grouped[col.id] = []
  for (const t of tasks) {
    const key = groupBy === 'priority' ? t.priority : (t.status || 'pendente')
    if (grouped[key]) grouped[key].push(t)
  }

  function onDragEnd({ destination, source, draggableId }) {
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return
    const field = groupBy === 'priority' ? 'priority' : 'status'
    onUpdate(draggableId, { [field]: destination.droppableId })
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Group-by toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Agrupar por:</span>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 border border-gray-200">
          {[
            { id: 'priority', label: 'Prioridade' },
            { id: 'status',   label: 'Status' },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => onGroupByChange(opt.id)}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                groupBy === opt.id ? 'bg-brand-500/20 text-brand-300' : 'text-gray-500 hover:text-gray-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Kanban board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin flex-1">
          {cols.map(col => {
            const colTasks = grouped[col.id] || []
            return (
              <div key={col.id} className="kanban-column">
                {/* Column header */}
                <div className={`rounded-xl px-4 py-3 ${col.headerBg} border ${col.border}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                      <span className={`text-sm font-semibold ${col.text}`}>{col.label}</span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.bg} ${col.text} border ${col.border}`}>
                      {colTasks.length}
                    </span>
                  </div>
                </div>

                {/* Droppable area */}
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex flex-col gap-2 min-h-[120px] rounded-xl p-2 transition-colors duration-150 ${
                        snapshot.isDraggingOver
                          ? `${col.bg} border-2 ${col.border} border-dashed`
                          : 'border-2 border-transparent'
                      }`}
                    >
                      {colTasks.map((task, idx) => (
                        <KanbanCard
                          key={task.id}
                          task={task}
                          index={idx}
                          users={users}
                          clients={clients}
                          groupBy={groupBy}
                          onToggle={onToggle}
                          onUpdate={onUpdate}
                          onDelete={onDelete}
                          onOpenClient={onOpenClient}
                        />
                      ))}
                      {provided.placeholder}
                      {colTasks.length === 0 && !snapshot.isDraggingOver && (
                        <div className="flex items-center justify-center h-16 rounded-lg border border-dashed border-gray-200">
                          <p className="text-xs text-gray-600">Sem tarefas</p>
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            )
          })}
        </div>
      </DragDropContext>
    </div>
  )
}
