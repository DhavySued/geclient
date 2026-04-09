import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const UsersContext = createContext(null)

function userFromDb(row) {
  return {
    id:        row.id,
    createdAt: row.created_at,
    name:      row.name,
    email:     row.email ?? '',
    role:      row.role  ?? 'Contador',
    color:     row.color ?? '#f59e0b',
  }
}

export function UsersProvider({ children }) {
  const [users, setUsers] = useState([])

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
    const { data: rows, error } = await supabase
      .from('users')
      .insert({
        name:  data.name,
        email: data.email  || '',
        role:  data.role   || 'Contador',
        color: data.color  || '#f59e0b',
      })
      .select()
    if (error) throw new Error(error.message)
    const created = userFromDb(rows[0])
    setUsers(prev => [...prev, created])
    return created
  }, [])

  const updateUser = useCallback(async (id, updates) => {
    const dbUpdates = {}
    if ('name'  in updates) dbUpdates.name  = updates.name
    if ('email' in updates) dbUpdates.email = updates.email
    if ('role'  in updates) dbUpdates.role  = updates.role
    if ('color' in updates) dbUpdates.color = updates.color
    const { error } = await supabase.from('users').update(dbUpdates).eq('id', id)
    if (error) throw new Error(error.message)
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u))
  }, [])

  const deleteUser = useCallback(async (id) => {
    const { error } = await supabase.from('users').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setUsers(prev => prev.filter(u => u.id !== id))
  }, [])

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
