import { useState } from 'react'
import { UserPlus, Pencil, Trash2, Check, X, Users, Mail, Briefcase } from 'lucide-react'
import { useUsers, getInitials } from '../context/UsersContext'

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

// ── Inline user form ──────────────────────────────────────────────────────────

function UserForm({ initial = {}, onSave, onCancel, title }) {
  const [name,  setName]  = useState(initial.name  || '')
  const [email, setEmail] = useState(initial.email || '')
  const [role,  setRole]  = useState(initial.role  || 'Contador')
  const [color, setColor] = useState(initial.color || COLOR_OPTIONS[0])

  function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    onSave({ name: name.trim(), email: email.trim(), role, color })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-gray-800/80 rounded-2xl p-5 border border-amber-500/30 space-y-4"
    >
      <p className="text-sm font-semibold text-gray-200">{title}</p>

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
          <label className="block text-xs text-gray-500 mb-1.5">
            Nome completo *
          </label>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ex: João da Silva"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs text-gray-500 mb-1.5">Cargo</label>
          <select
            value={role}
            onChange={e => setRole(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-400 focus:outline-none focus:border-amber-500/50"
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
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-gray-900 text-sm font-semibold transition-all"
        >
          <Check size={14} /> Salvar
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-gray-200 text-sm transition-all"
        >
          <X size={14} /> Cancelar
        </button>
      </div>
    </form>
  )
}

// ── User Row ──────────────────────────────────────────────────────────────────

function UserRow({ user, onEdit, onDelete }) {
  return (
    <div className="group flex items-center gap-4 p-4 bg-gray-800/60 rounded-xl border border-gray-700/50 hover:border-gray-600 transition-all">
      <UserAvatar name={user.name} color={user.color} size={44} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-100">{user.name}</p>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          <span className="text-xs text-amber-400/80 font-medium">{user.role}</span>
          {user.email && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Mail size={10} />
              <span>{user.email}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(user)}
          className="p-2 rounded-lg text-gray-500 hover:text-amber-400 hover:bg-gray-700 transition-all"
          title="Editar"
        >
          <Pencil size={15} />
        </button>
        <button
          onClick={() => onDelete(user.id)}
          className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-gray-700 transition-all"
          title="Excluir"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const { users, addUser, updateUser, deleteUser } = useUsers()
  const [showForm, setShowForm]   = useState(false)
  const [editingUser, setEditing] = useState(null)

  function handleAdd(data) {
    addUser(data)
    setShowForm(false)
  }

  function handleUpdate(data) {
    updateUser(editingUser.id, data)
    setEditing(null)
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
            <Users size={20} className="text-amber-400" />
            <h1 className="text-xl font-bold text-white">Usuários</h1>
          </div>
          <p className="text-sm text-gray-500">
            Cadastre os membros da equipe para atribuir tarefas e responsabilidades.
          </p>
        </div>
        {!showForm && !editingUser && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-900 text-sm font-semibold transition-all flex-shrink-0"
          >
            <UserPlus size={16} />
            Novo usuário
          </button>
        )}
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="mb-6">
          <UserForm
            title="Novo usuário"
            onSave={handleAdd}
            onCancel={() => setShowForm(false)}
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
              <UserForm
                key={user.id}
                title="Editar usuário"
                initial={user}
                onSave={handleUpdate}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <UserRow
                key={user.id}
                user={user}
                onEdit={setEditing}
                onDelete={handleDelete}
              />
            )
          ))
        )}
      </div>
    </div>
  )
}
