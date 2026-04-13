import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)
const STORAGE_KEY = 'geclient_auth_user'

function readStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(readStoredUser)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState(null)
  const channelRef = useRef(null)

  // Busca permissões e dados atualizados do usuário no banco
  const refreshPermissions = useCallback(async (userId) => {
    const { data, error: fetchErr } = await supabase
      .from('users')
      .select('permissions, name, role, color, email, login')
      .eq('id', userId)
      .single()

    if (fetchErr) {
      console.error('[AuthContext] Erro ao buscar permissões:', fetchErr.message)
      return
    }
    if (!data) return

    setCurrentUser(prev => {
      if (!prev || prev.id !== userId) return prev
      const updated = {
        ...prev,
        permissions: data.permissions ?? null,
        name:  data.name  ?? prev.name,
        role:  data.role  ?? prev.role,
        color: data.color ?? prev.color,
        email: data.email ?? prev.email,
        login: data.login ?? prev.login,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  // Ao montar: se há usuário no localStorage, busca permissões frescas imediatamente
  useEffect(() => {
    const stored = readStoredUser()
    if (stored?.id) {
      refreshPermissions(stored.id)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime: quando o registro do usuário logado mudar no banco, atualiza as permissões
  useEffect(() => {
    if (!currentUser?.id) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      return
    }

    // Evita criar canal duplicado para o mesmo usuário
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const channel = supabase
      .channel(`user-watch-${currentUser.id}`)
      .on('postgres_changes', {
        event:  'UPDATE',
        schema: 'public',
        table:  'users',
        filter: `id=eq.${currentUser.id}`,
      }, () => {
        refreshPermissions(currentUser.id)
      })
      .subscribe()

    channelRef.current = channel
    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [currentUser?.id, refreshPermissions])

  const login = useCallback(async (loginStr, password) => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: rpcError } = await supabase.rpc('check_user_login', {
        p_login:    loginStr.trim().toLowerCase(),
        p_password: password,
      })
      if (rpcError) throw new Error(rpcError.message)
      if (!data || data.length === 0) throw new Error('Login ou senha incorretos.')

      let user = data[0]

      // Busca permissões e demais campos — loga erro se a coluna não existir
      const { data: fullUser, error: permError } = await supabase
        .from('users')
        .select('permissions, name, role, color, email, login')
        .eq('id', user.id)
        .single()

      if (permError) {
        console.error('[AuthContext] Não foi possível carregar as permissões:', permError.message,
          '\n→ Execute a migration permissions_column.sql no Supabase.')
      }

      if (fullUser) {
        user = { ...user, ...fullUser, permissions: fullUser.permissions ?? null }
      }

      setCurrentUser(user)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
      return user
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
    setCurrentUser(null)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, loading, error }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
