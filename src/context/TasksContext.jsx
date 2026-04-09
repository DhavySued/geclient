import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const TasksContext = createContext(null)

// ── Mappers ───────────────────────────────────────────────────────────────────

function taskFromDb(row) {
  return {
    id:                row.id,
    createdAt:         row.created_at,
    title:             row.title,
    description:       row.description ?? '',
    status:            row.status,
    priority:          row.priority,
    dueDate:           row.due_date,
    time:              row.time,
    clientId:          row.client_id,
    assignedTo:        row.assigned_to,
    showInAgenda:      row.show_in_agenda ?? true,
    repeatMonthly:     row.repeat_monthly ?? false,
    repeatDay:         row.repeat_day,
    lastSpawnedMonth:  row.last_spawned_month,
    recurringParentId: row.recurring_parent_id,
  }
}

function taskToDb(t) {
  return {
    title:               t.title,
    description:         t.description         ?? '',
    status:              t.status              ?? 'pendente',
    priority:            t.priority            ?? 'media',
    due_date:            t.dueDate             ?? null,
    time:                t.time                ?? null,
    client_id:           t.clientId            ?? null,
    assigned_to:         t.assignedTo          ?? null,
    show_in_agenda:      t.showInAgenda        !== false,
    repeat_monthly:      t.repeatMonthly       ?? false,
    repeat_day:          t.repeatDay           ?? null,
    last_spawned_month:  t.lastSpawnedMonth    ?? null,
    recurring_parent_id: t.recurringParentId   ?? null,
  }
}

// ── Recurring spawn (runs once per month per template) ────────────────────────

async function maybeSpawnRecurring() {
  const { data: templates, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('repeat_monthly', true)
  if (error || !templates?.length) return

  const now  = new Date()
  const yr   = now.getFullYear()
  const mo   = now.getMonth() + 1
  const currentMonth = `${yr}-${String(mo).padStart(2, '0')}`

  const toSpawn = templates.filter(t => t.last_spawned_month !== currentMonth)
  if (!toSpawn.length) return

  const spawns = toSpawn.map(t => {
    const maxDay = new Date(yr, mo, 0).getDate()
    const day    = Math.min(t.repeat_day || 1, maxDay)
    return {
      title:               t.title,
      description:         t.description || '',
      status:              'pendente',
      priority:            t.priority || 'media',
      due_date:            `${currentMonth}-${String(day).padStart(2, '0')}`,
      time:                t.time || null,
      client_id:           t.client_id || null,
      assigned_to:         t.assigned_to || null,
      show_in_agenda:      t.show_in_agenda !== false,
      repeat_monthly:      false,
      recurring_parent_id: t.id,
    }
  })

  await supabase.from('tasks').insert(spawns)
  await Promise.all(
    toSpawn.map(t =>
      supabase.from('tasks').update({ last_spawned_month: currentMonth }).eq('id', t.id)
    )
  )
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function TasksProvider({ children }) {
  const [tasks,   setTasks]   = useState([])
  const [loading, setLoading] = useState(true)

  const fetchTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) { console.error('tasks fetch error:', error); setLoading(false); return }
    setTasks(data.map(taskFromDb))
    setLoading(false)
  }, [])

  // Initial load: spawn recurring then fetch
  useEffect(() => {
    const init = async () => {
      await maybeSpawnRecurring()
      await fetchTasks()
    }
    init()
  }, [fetchTasks])

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('tasks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchTasks)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchTasks])

  // ── CRUD ────────────────────────────────────────────────────────────────────

  const addTask = useCallback(async (data) => {
    const payload = taskToDb({
      status:        'pendente',
      priority:      'media',
      description:   '',
      showInAgenda:  true,
      repeatMonthly: false,
      ...data,
    })
    const { data: rows, error } = await supabase.from('tasks').insert(payload).select()
    if (error) throw new Error(error.message)
    const created = taskFromDb(rows[0])

    // Se for template recorrente, já gera a tarefa deste mês
    if (created.repeatMonthly) {
      await maybeSpawnRecurring()
      await fetchTasks()
    } else {
      setTasks(prev => [created, ...prev])
    }
    return created
  }, [fetchTasks])

  const updateTask = useCallback(async (id, updates) => {
    const map = {
      title:           'title',
      description:     'description',
      status:          'status',
      priority:        'priority',
      dueDate:         'due_date',
      time:            'time',
      clientId:        'client_id',
      assignedTo:      'assigned_to',
      showInAgenda:    'show_in_agenda',
      repeatMonthly:   'repeat_monthly',
      repeatDay:       'repeat_day',
      lastSpawnedMonth:'last_spawned_month',
    }
    const dbUpdates = {}
    for (const [camel, snake] of Object.entries(map)) {
      if (camel in updates) dbUpdates[snake] = updates[camel]
    }
    const { error } = await supabase.from('tasks').update(dbUpdates).eq('id', id)
    if (error) throw new Error(error.message)
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
  }, [])

  const deleteTask = useCallback(async (id) => {
    // ON DELETE CASCADE cuida dos filhos automaticamente
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setTasks(prev => prev.filter(t => t.id !== id && t.recurringParentId !== id))
  }, [])

  return (
    <TasksContext.Provider value={{ tasks, loading, addTask, updateTask, deleteTask }}>
      {children}
    </TasksContext.Provider>
  )
}

export function useTasks() {
  const ctx = useContext(TasksContext)
  if (!ctx) throw new Error('useTasks must be inside TasksProvider')
  return ctx
}
