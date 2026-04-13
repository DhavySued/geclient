import { useAuth } from '../context/AuthContext'

// ── Definição dos módulos e suas ações disponíveis ────────────────────────────
export const MODULES = [
  { id: 'cadastro', label: 'Empresas',       actions: ['view', 'create', 'edit', 'delete'] },
  { id: 'fiscal',   label: 'Gestão Fiscal',  actions: ['view', 'edit'] },
  { id: 'cx',       label: 'Exp. CX',        actions: ['view', 'edit'] },
  { id: 'tasks',    label: 'Tarefas',        actions: ['view', 'create', 'edit', 'delete'] },
  { id: 'calendar', label: 'Calendário',     actions: ['view', 'edit', 'delete'] },
  { id: 'users',    label: 'Usuários',       actions: ['view', 'create', 'edit', 'delete'] },
  { id: 'settings', label: 'Configurações',  actions: ['view', 'edit'] },
  { id: 'audit',    label: 'Auditoria',      actions: ['view'] },
]

// Permissões padrão: tudo liberado
export const DEFAULT_PERMISSIONS = Object.fromEntries(
  MODULES.map(m => [m.id, Object.fromEntries(m.actions.map(a => [a, true]))])
)

/**
 * usePermissions()
 *
 * Lê as permissões do usuário logado.
 * Quando permissions é null/undefined, tudo é permitido (admin implícito).
 *
 * can('cadastro', 'delete') → boolean
 */
export function usePermissions() {
  const { currentUser } = useAuth()
  const raw = currentUser?.permissions ?? null

  function can(moduleId, action) {
    if (!raw) return true                  // null = admin, acesso total
    const mod = raw[moduleId]
    if (!mod) return false                 // módulo ausente na lista = negado por padrão
    return mod[action] !== false           // false = negado; true/undefined = permite
  }

  return { can, permissions: raw ?? DEFAULT_PERMISSIONS }
}
