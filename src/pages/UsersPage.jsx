import { useState } from 'react'
import { UserPlus, Pencil, Trash2, Check, X, Users, Mail, Eye, EyeOff, KeyRound, AtSign, Shield, ShieldCheck, ShieldAlert } from 'lucide-react'
import { useUsers, getInitials } from '../context/UsersContext'
import { usePermissions, MODULES, DEFAULT_PERMISSIONS } from '../hooks/usePermissions'

const ROLES = [
  'Contador',
  'Assistente Contábil',
  'Analista Fiscal',
  'Gerente',
  'Sócio',
  'Estagiário',
  'Outro',
]

const COLOR_OPTIONS = [
  '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6',
  '#f43f5e', '#06b6d4', '#84cc16', '#f97316',
  '#ec4899', '#64748b',
]

const ALL_ACTIONS   = ['view', 'create', 'edit', 'delete']
const ACTION_LABELS = { view: 'Ver', create: 'Criar', edit: 'Editar', delete: 'Excluir' }

// ── Helpers ───────────────────────────────────────────────────────────────────
function UserAvatar({ name, color, size = 40 }) {
  return (
    <div
      style={{ backgroundColor: color, width: size, height: size, fontSize: size * 0.36 }}
      className="rounded-full flex items-center justify-center font-bold text-gray-900 flex-shrink-0 select-none"
    >
      {getInitials(name || '?')}
    </div>
  )
}

function permSummary(permissions) {
  if (!permissions) return { label: 'Acesso total', restricted: 0, icon: 'full' }
  let restricted = 0
  for (const mod of MODULES) {
    for (const action of mod.actions) {
      if (permissions[mod.id]?.[action] === false) restricted++
    }
  }
  if (restricted === 0) return { label: 'Acesso total', restricted: 0, icon: 'full' }
  return { label: `${restricted} restrição${restricted !== 1 ? 'ões' : ''}`, restricted, icon: 'partial' }
}

// ── Matriz de permissões ──────────────────────────────────────────────────────
function PermissionsMatrix({ value, onChange }) {
  function isChecked(modId, action) {
    if (!value) return true
    return value[modId]?.[action] !== false
  }

  function toggle(modId, action) {
    const base = value ?? DEFAULT_PERMISSIONS
    const modPerms = { ...(base[modId] ?? {}) }
    modPerms[action] = !isChecked(modId, action)
    onChange({ ...base, [modId]: modPerms })
  }

  function allChecked() {
    return MODULES.every(m => m.actions.every(a => isChecked(m.id, a)))
  }

  function toggleAll() {
    const checked = !allChecked()
    const next = Object.fromEntries(
      MODULES.map(m => [m.id, Object.fromEntries(m.actions.map(a => [a, checked]))])
    )
    onChange(next)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
          <Shield size={12} className="text-brand-400" /> Permissões de acesso
        </p>
        <button
          type="button"
          onClick={toggleAll}
          className="text-[10px] text-brand-400 hover:text-brand-500 font-medium transition-colors"
        >
          {allChecked() ? 'Desmarcar tudo' : 'Marcar tudo'}
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-3 py-2 text-gray-500 font-semibold">Módulo</th>
              {ALL_ACTIONS.map(a => (
                <th key={a} className="text-center px-2 py-2 text-gray-500 font-semibold w-16">
                  {ACTION_LABELS[a]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULES.map((mod, i) => {
              const rowAllowed = mod.actions.every(a => isChecked(mod.id, a))
              return (
                <tr
                  key={mod.id}
                  className={`border-b border-gray-100 last:border-0 transition-colors ${
                    rowAllowed ? (i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40') : 'bg-red-50/30'
                  }`}
                >
                  <td className={`px-3 py-2.5 font-medium ${rowAllowed ? 'text-gray-700' : 'text-red-700/70'}`}>
                    {mod.label}
                  </td>
                  {ALL_ACTIONS.map(action => (
                    <td key={action} className="text-center px-2 py-2.5">
                      {mod.actions.includes(action) ? (
                        <label className="inline-flex items-center justify-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked(mod.id, action)}
                            onChange={() => toggle(mod.id, action)}
                            style={{ accentColor: '#f39200' }}
                            className="w-3.5 h-3.5 rounded cursor-pointer"
                          />
                        </label>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-gray-400">
        "Ver" controla o acesso ao módulo. As demais permissões controlam ações dentro dele.
      </p>
    </div>
  )
}

// ── Formulário ────────────────────────────────────────────────────────────────
function UserForm({ initial = {}, onSave, onCancel, title, saving = false }) {
  const [name,         setName]         = useState(initial.name  || '')
  const [email,        setEmail]        = useState(initial.email || '')
  const [role,         setRole]         = useState(initial.role  || 'Contador')
  const [color,        setColor]        = useState(initial.color || COLOR_OPTIONS[0])
  const [login,        setLogin]        = useState(initial.login || '')
  const [password,     setPassword]     = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [permissions,  setPermissions]  = useState(initial.permissions ?? null)
  const [showPerms,    setShowPerms]    = useState(false)
  const isEditing = Boolean(initial.id)

  function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    if (!isEditing && (!login.trim() || !password)) return
    onSave({
      name:        name.trim(),
      email:       email.trim(),
      role,
      color,
      login:       login.trim().toLowerCase(),
      password:    password || undefined,
      permissions,
    })
  }

  const summary = permSummary(permissions)

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-gray-100/80 rounded-2xl p-5 border border-brand-500/30 space-y-4"
    >
      <p className="text-sm font-semibold text-gray-700">{title}</p>

      {/* Avatar preview */}
      <div className="flex items-center gap-4">
        <UserAvatar name={name} color={color} size={48} />
        <div className="flex flex-wrap gap-1.5">
          {COLOR_OPTIONS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              style={{ backgroundColor: c }}
              className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${
                color === c ? 'border-white' : 'border-transparent'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Fields */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs text-gray-500 mb-1.5">Nome completo *</label>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ex: João da Silva"
            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-500/50"
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs text-gray-500 mb-1.5">Cargo</label>
          <select
            value={role}
            onChange={e => setRole(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-400 focus:outline-none focus:border-brand-500/50"
          >
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1.5">E-mail</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="joao@escritorio.com.br"
            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-500/50"
          />
        </div>

        {/* Seção de acesso */}
        <div className="col-span-2 pt-1">
          <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
            <KeyRound size={12} /> Acesso ao sistema
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">
                Login {!isEditing && <span className="text-red-400">*</span>}
              </label>
              <div className="relative">
                <AtSign size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={login}
                  onChange={e => setLogin(e.target.value)}
                  placeholder="joao.silva"
                  autoCapitalize="none"
                  className="w-full pl-8 pr-3 bg-white border border-gray-200 rounded-lg py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-500/50"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">
                {isEditing ? 'Nova senha (opcional)' : <>Senha <span className="text-red-400">*</span></>}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={isEditing ? 'Deixe vazio para manter' : '••••••••'}
                  className="w-full pr-8 pl-3 bg-white border border-gray-200 rounded-lg py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-500/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Seção de permissões */}
        <div className="col-span-2 pt-1">
          <button
            type="button"
            onClick={() => setShowPerms(v => !v)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-gray-200 bg-white hover:border-gray-300 transition-all"
          >
            <div className="flex items-center gap-2">
              {summary.icon === 'full'
                ? <ShieldCheck size={14} className="text-emerald-500" />
                : <ShieldAlert size={14} className="text-amber-500" />
              }
              <span className="text-xs font-semibold text-gray-600">Permissões</span>
              <span className={`text-[10px] px-2 py-px rounded-full font-semibold ${
                summary.icon === 'full'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {summary.label}
              </span>
            </div>
            <span className="text-[10px] text-gray-400">{showPerms ? 'Fechar ▲' : 'Configurar ▼'}</span>
          </button>

          {showPerms && (
            <div className="mt-2 p-3 bg-white border border-gray-200 rounded-xl">
              <PermissionsMatrix
                value={permissions}
                onChange={setPermissions}
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-brand-500 hover:bg-brand-400 disabled:opacity-60 disabled:cursor-not-allowed text-gray-900 text-sm font-semibold transition-all"
        >
          <Check size={14} /> {saving ? 'Salvando…' : 'Salvar'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-700 disabled:opacity-50 text-sm transition-all"
        >
          <X size={14} /> Cancelar
        </button>
      </div>
    </form>
  )
}

// ── User Row ──────────────────────────────────────────────────────────────────
function UserRow({ user, onEdit, onDelete, canEdit = true, canDelete = true }) {
  const summary = permSummary(user.permissions)

  return (
    <div className="group flex items-center gap-4 p-4 bg-gray-100/60 rounded-xl border border-gray-200/50 hover:border-gray-300 transition-all">
      <UserAvatar name={user.name} color={user.color} size={44} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">{user.name}</p>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          <span className="text-xs text-brand-400/80 font-medium">{user.role}</span>
          {user.login && (
            <span className="text-xs text-gray-400 font-mono">@{user.login}</span>
          )}
          {user.email && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Mail size={10} />
              <span>{user.email}</span>
            </div>
          )}
          <div className={`flex items-center gap-1 text-[10px] font-semibold px-1.5 py-px rounded-full ${
            summary.icon === 'full'
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-amber-100 text-amber-700'
          }`}>
            {summary.icon === 'full'
              ? <ShieldCheck size={9} />
              : <ShieldAlert size={9} />
            }
            {summary.label}
          </div>
        </div>
      </div>

      {(canEdit || canDelete) && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {canEdit && (
            <button
              onClick={() => onEdit(user)}
              className="p-2 rounded-lg text-gray-500 hover:text-brand-400 hover:bg-gray-700 transition-all"
              title="Editar"
            >
              <Pencil size={15} />
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => onDelete(user.id)}
              className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-gray-700 transition-all"
              title="Excluir"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const { users, addUser, updateUser, deleteUser } = useUsers()
  const { can }   = usePermissions()
  const canCreate = can('users', 'create')
  const canEdit   = can('users', 'edit')
  const canDelete = can('users', 'delete')
  const [showForm, setShowForm]   = useState(false)
  const [editingUser, setEditing] = useState(null)
  const [saveError, setSaveError] = useState(null)
  const [saving, setSaving]       = useState(false)

  async function handleAdd(data) {
    setSaveError(null)
    setSaving(true)
    try {
      await addUser(data)
      setShowForm(false)
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate(data) {
    setSaveError(null)
    setSaving(true)
    try {
      await updateUser(editingUser.id, data)
      setEditing(null)
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function handleDelete(id) {
    if (window.confirm('Remover este usuário?')) deleteUser(id)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users size={20} className="text-brand-400" />
            <h1 className="text-xl font-bold text-gray-900">Usuários</h1>
          </div>
          <p className="text-sm text-gray-500">
            Cadastre os membros da equipe e configure as permissões de acesso.
          </p>
        </div>
        {canCreate && !showForm && !editingUser && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-gray-900 text-sm font-semibold transition-all flex-shrink-0"
          >
            <UserPlus size={16} />
            Novo usuário
          </button>
        )}
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="mb-6">
          {saveError && (
            <div className="mb-3 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
              Erro ao salvar: {saveError}
            </div>
          )}
          <UserForm
            title="Novo usuário"
            saving={saving}
            onSave={handleAdd}
            onCancel={() => { setShowForm(false); setSaveError(null) }}
          />
        </div>
      )}

      {/* User list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin space-y-3 pb-4">
        {users.length === 0 && !showForm ? (
          <div className="text-center py-20 text-gray-600">
            <Users size={36} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">Nenhum usuário cadastrado.</p>
            <p className="text-xs mt-1">Clique em "Novo usuário" para começar.</p>
          </div>
        ) : (
          users.map(user => (
            editingUser?.id === user.id ? (
              <div key={user.id}>
              {saveError && (
                <div className="mb-3 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                  Erro ao salvar: {saveError}
                </div>
              )}
              <UserForm
                title="Editar usuário"
                initial={user}
                saving={saving}
                onSave={handleUpdate}
                onCancel={() => { setEditing(null); setSaveError(null) }}
              />
              </div>
            ) : (
              <UserRow
                key={user.id}
                user={user}
                onEdit={(u) => { setEditing(u); setSaveError(null) }}
                onDelete={handleDelete}
                canEdit={canEdit}
                canDelete={canDelete}
              />
            )
          ))
        )}
      </div>
    </div>
  )
}
