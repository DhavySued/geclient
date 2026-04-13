import { createContext, useContext, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const AuditContext = createContext(null)

/**
 * AuditProvider
 *
 * Expõe logAudit() para registrar qualquer ação de criação,
 * edição ou exclusão na tabela audit_logs do Supabase.
 *
 * Deve estar dentro de AuthProvider para ter acesso ao usuário logado.
 */
export function AuditProvider({ children }) {
  const { currentUser } = useAuth()

  /**
   * Registra uma ação de auditoria (fire-and-forget — não bloqueia a UI).
   *
   * @param {object} params
   * @param {'create'|'update'|'delete'|'import'} params.action
   * @param {string}  params.menu       — módulo: 'cadastro' | 'fiscal' | 'cx' | 'tarefas' | 'usuarios'
   * @param {string}  params.entity     — tipo: 'client' | 'task' | 'user' | 'fiscal_record'
   * @param {string}  [params.entityId]   — id do registro afetado
   * @param {string}  [params.entityName] — nome legível do registro afetado
   * @param {object}  [params.changes]    — detalhes da mudança
   */
  const logAudit = useCallback(({ action, menu, entity, entityId, entityName, changes }) => {
    if (!currentUser) return
    supabase.from('audit_logs').insert({
      user_id:     currentUser.id,
      user_name:   currentUser.name ?? '',
      action,
      menu,
      entity,
      entity_id:   entityId   ?? null,
      entity_name: entityName ?? null,
      changes:     changes    ?? null,
    }).then(({ error }) => {
      if (error) console.warn('[Audit] Erro ao registrar:', error.message)
    })
  }, [currentUser])

  return (
    <AuditContext.Provider value={{ logAudit }}>
      {children}
    </AuditContext.Provider>
  )
}

export function useAudit() {
  const ctx = useContext(AuditContext)
  if (!ctx) throw new Error('useAudit must be inside AuditProvider')
  return ctx
}
