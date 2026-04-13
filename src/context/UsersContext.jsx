import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAudit } from './AuditContext'

const UsersContext = createContext(null)

function userFromDb(row) {
  return {
    id:          row.id,
    createdAt:   row.created_at,
    name:        row.name,
    email:       row.email       ?? '',
    role:        row.role        ?? 'Contador',
    color:       row.color       ?? '#f59e0b',
    login:       row.login       ?? '',
    permissions: row.permissions ?? null,  // null = acesso total (padrão)
  }
}

export function UsersProvider({ children }) {
  const [users, setUsers] = useState([])
  const { logAudit } = useAudit()

  const fetchUsers = useCallback(async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) { console.error('users fetch error:', error); return }
    setUsers(data.map(userFromDb))
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  useEffect(() => {
    const channel = supabase
      .channel('users-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, fetchUsers)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchUsers])

  const addUser = useCallback(async (data) => {
    // Insere campos base (sempre existem no banco)
    const { data: rows, error } = await supabase
      .from('users')
      .insert({
        name:  data.name,
        email: data.email  || '',
        role:  data.role   || 'Contador',
        color: data.color  || '#f59e0b',
        login: data.login  || null,
      })
      .select()
    if (error) throw new Error(error.message)
    const created = userFromDb(rows[0])

    if (data.password) {
      await supabase.rpc('set_user_password', { p_user_id: created.id, p_password: data.password })
    }

    // Salva permissions em separado — silencioso se coluna ainda não existir
    if (data.permissions != null) {
      const { error: permErr } = await supabase
        .from('users')
        .update({ permissions: data.permissions })
        .eq('id', created.id)
      if (permErr) console.warn('[addUser] permissions não salvas (rode a migração SQL):', permErr.message)
      else created.permissions = data.permissions
    }

    setUsers(prev => [...prev, created])
    logAudit({
      action: 'create', menu: 'usuarios', entity: 'user',
      entityId: created.id, entityName: created.name,
      changes: { name: created.name, email: created.email, role: created.role },
    })
    return created
  }, [logAudit])

  const updateUser = useCallback(async (id, updates) => {
    // Campos base (sempre existem no banco)
    const dbUpdates = {}
    if ('name'  in updates) dbUpdates.name  = updates.name
    if ('email' in updates) dbUpdates.email = updates.email
    if ('role'  in updates) dbUpdates.role  = updates.role
    if ('color' in updates) dbUpdates.color = updates.color
    if ('login' in updates) dbUpdates.login = updates.login || null

    if (Object.keys(dbUpdates).length > 0) {
      const { error } = await supabase.from('users').update(dbUpdates).eq('id', id)
      if (error) throw new Error(error.message)
    }

    if (updates.password) {
      await supabase.rpc('set_user_password', { p_user_id: id, p_password: updates.password })
    }

    // Salva permissions em separado — silencioso se coluna ainda não existir
    if ('permissions' in updates) {
      const { error: permErr } = await supabase
        .from('users')
        .update({ permissions: updates.permissions ?? null })
        .eq('id', id)
      if (permErr) console.warn('[updateUser] permissions não salvas (rode a migração SQL):', permErr.message)
    }


    const existing = users.find(u => u.id === id)
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u))
    logAudit({
      action: 'update', menu: 'usuarios', entity: 'user',
      entityId: id, entityName: existing?.name,
      changes: { fields: Object.keys(updates).filter(k => k !== 'password'), updates: Object.fromEntries(Object.entries(updates).filter(([k]) => k !== 'password')) },
    })
  }, [users, logAudit])

  const deleteUser = useCallback(async (id) => {
    const target = users.find(u => u.id === id)
    const { error } = await supabase.from('users').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setUsers(prev => prev.filter(u => u.id !== id))
    logAudit({
      action: 'delete', menu: 'usuarios', entity: 'user',
      entityId: id, entityName: target?.name,
      changes: { name: target?.name, email: target?.email, role: target?.role },
    })
  }, [users, logAudit])

  return (
    <UsersContext.Provider value={{ users, addUser, updateUser, deleteUser }}>
      {children}
    </UsersContext.Provider>
  )
}

export function useUsers() {
  const ctx = useContext(UsersContext)
  if (!ctx) throw new Error('useUsers must be inside UsersProvider')
  return ctx
}

export function getInitials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')
}
