import { useState, useRef, useEffect, useMemo } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { Scale, Plus, X, Pencil, Trash2, Loader2, Building2, AlertTriangle, Users, ChevronDown, CalendarDays, BellRing, Clock } from 'lucide-react'
import { useSocietario } from '../context/SocietarioContext'
import { useClients } from '../context/ClientsContext'
import { useUsers } from '../context/UsersContext'
import ClientSelect from '../components/ClientSelect'

const COLUMNS = [
  { id: 'ordem_servico', label: 'Ordem de Serviço', accent: { border: 'rgba(243,146,0,0.55)',   bg: 'rgba(243,146,0,0.07)',   pill: 'rgba(243,146,0,0.12)',   text: '#c97700' } },
  { id: 'iniciado',      label: 'Iniciado',          accent: { border: 'rgba(59,130,246,0.55)', bg: 'rgba(59,130,246,0.05)', pill: 'rgba(59,130,246,0.12)', text: '#2563EB' } },
  { id: 'finalizado',    label: 'Finalizado',        accent: { border: 'rgba(16,185,129,0.55)', bg: 'rgba(16,185,129,0.05)', pill: 'rgba(16,185,129,0.12)', text: '#059669' } },
]

const EMPTY_FORM = { title: '', clientId: '', observations: [], responsibleIds: [], alert: false }

function today() { return new Date().toISOString().split('T')[0] }

function formatDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function getInitials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')
}

/* ── Seletor de responsáveis ── */
function UserSelect({ users, value = [], onChange }) {
  const [open, setOpen]   = useState(false)
  const [search, setSearch] = useState('')
  const rootRef  = useRef(null)
  const inputRef = useRef(null)

  const filtered = users.filter(u => !search || u.name.toLowerCase().includes(search.toLowerCase()))

  function toggle(id) {
    onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id])
  }

  useEffect(() => {
    if (!open) return
    function onOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('click', onOutside, true)
    return () => document.removeEventListener('click', onOutside, true)
  }, [open])

  const selected = users.filter(u => value.includes(u.id))

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setTimeout(() => inputRef.current?.focus(), 0) }}
        className="w-full flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-left transition-colors focus:outline-none hover:border-gray-300"
      >
        <Users size={13} className="flex-shrink-0 text-gray-400" />
        {selected.length === 0 ? (
          <span className="flex-1 text-gray-400">Responsáveis (opcional)</span>
        ) : (
          <div className="flex flex-wrap gap-1 flex-1">
            {selected.map(u => (
              <span key={u.id} className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: u.color + '22', color: u.color }}>
                {u.name.split(' ')[0]}
                <button type="button" onClick={e => { e.stopPropagation(); toggle(u.id) }} className="opacity-60 hover:opacity-100"><X size={10} /></button>
              </span>
            ))}
          </div>
        )}
        <ChevronDown size={13} className={`flex-shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
            <input ref={inputRef} value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar usuário..." className="flex-1 text-sm text-gray-800 placeholder-gray-400 focus:outline-none bg-transparent" />
          </div>
          <div className="max-h-48 overflow-y-auto scrollbar-thin">
            {filtered.length === 0 && <p className="px-3 py-3 text-xs text-gray-400 text-center">Nenhum usuário encontrado</p>}
            {filtered.map(u => {
              const checked = value.includes(u.id)
              return (
                <button key={u.id} type="button" onClick={e => { e.stopPropagation(); toggle(u.id) }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-gray-50">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ background: u.color }}>{getInitials(u.name)}</div>
                  <span className={`flex-1 text-left ${checked ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{u.name}</span>
                  {checked && <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: u.color }}><span className="text-white text-[10px] font-bold">✓</span></div>}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Modal ── */
function CardModal({ initial, columnId, onSave, onClose, saving, saveError, clients, users }) {
  const [form, setForm] = useState(initial ?? EMPTY_FORM)
  const [errors, setErrors] = useState({})

  function set(k, v) { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: '' })) }

  // Observações ordenadas por data desc
  const sortedObs = [...(form.observations ?? [])].sort((a, b) => b.date.localeCompare(a.date))

  function addObservation() {
    const newObs = { id: crypto.randomUUID(), date: today(), text: '' }
    set('observations', [newObs, ...(form.observations ?? [])])
  }

  function updateObs(id, field, value) {
    setForm(prev => ({
      ...prev,
      observations: prev.observations.map(o => o.id === id ? { ...o, [field]: value } : o),
    }))
  }

  function removeObs(id) {
    set('observations', form.observations.filter(o => o.id !== id))
  }

  function submit(e) {
    e.preventDefault()
    if (!form.title.trim()) { setErrors({ title: 'Campo obrigatório' }); return }
    onSave({ ...form, title: form.title.trim() })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={saving ? undefined : onClose} />
      <div className="relative w-full bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col" style={{ maxWidth: 750, height: 750 }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-sm font-semibold text-gray-900">{initial ? 'Editar card' : 'Novo card'}</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => set('alert', !form.alert)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
              style={form.alert
                ? { background: 'linear-gradient(135deg,#dc2626,#b91c1c)', color: '#fff', borderColor: '#b91c1c', boxShadow: '0 0 12px rgba(220,38,38,0.5)' }
                : { background: '#fff', color: '#9ca3af', borderColor: '#e5e7eb' }
              }
            >
              <BellRing size={13} className={form.alert ? 'animate-bounce' : ''} />
              {form.alert ? 'Alerta ativo' : 'Ativar alerta'}
            </button>
            {!saving && (
              <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors"><X size={16} /></button>
            )}
          </div>
        </div>

        <form onSubmit={submit} className="flex flex-col flex-1 min-h-0">

          {/* Campos superiores */}
          <div className="px-5 pt-4 pb-3 flex flex-col gap-3 flex-shrink-0">
            {/* Título */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Título *</label>
              <input
                autoFocus
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="Ex: Alteração de contrato social"
                className={`w-full text-sm border rounded-lg px-3 py-2 outline-none transition-colors ${errors.title ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-brand-400'}`}
              />
              {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
            </div>

            {/* Empresa + Responsáveis lado a lado */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 flex items-center gap-1.5"><Building2 size={11} /> Empresa</label>
                <ClientSelect clients={clients} value={form.clientId} onChange={id => set('clientId', id)} placeholder="Selecionar empresa (opcional)" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 flex items-center gap-1.5"><Users size={11} /> Responsáveis</label>
                <UserSelect users={users} value={form.responsibleIds} onChange={ids => set('responsibleIds', ids)} />
              </div>
            </div>
          </div>

          {/* Seção de observações — ocupa o espaço restante */}
          <div className="flex flex-col flex-1 min-h-0 px-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                <CalendarDays size={11} /> Observações
              </label>
              <button
                type="button"
                onClick={addObservation}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-500 hover:text-brand-600 hover:border-brand-300 hover:bg-orange-50 transition-all"
              >
                <Plus size={11} /> Nova observação
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin flex flex-col gap-3 pr-1">
              {sortedObs.length === 0 && (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-xs text-gray-400 text-center py-8">Nenhuma observação · clique em "Nova observação" para adicionar</p>
                </div>
              )}
              {sortedObs.map(obs => (
                <div key={obs.id} className="flex flex-col gap-1.5 p-3 border border-gray-200 rounded-xl bg-gray-50">
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={obs.date}
                      onChange={e => updateObs(obs.id, 'date', e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-brand-400 bg-white transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => updateObs(obs.id, 'date', today())}
                      className="text-xs px-2 py-1 rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-brand-600 hover:border-brand-300 transition-all"
                    >
                      Hoje
                    </button>
                    <button
                      type="button"
                      onClick={() => removeObs(obs.id)}
                      className="ml-auto text-gray-300 hover:text-red-400 transition-colors"
                    >
                      <X size={13} />
                    </button>
                  </div>
                  <textarea
                    value={obs.text}
                    onChange={e => updateObs(obs.id, 'text', e.target.value)}
                    placeholder="Descreva a observação..."
                    rows={3}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-brand-400 bg-white transition-colors resize-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-gray-100 flex-shrink-0 flex flex-col gap-2">
            {saveError && (
              <div className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                <AlertTriangle size={13} className="flex-shrink-0 mt-0.5 text-red-500" />
                <span className="font-mono break-all">{saveError}</span>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-100 border border-gray-200 transition-all disabled:opacity-50">Cancelar</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-brand-500 hover:bg-brand-400 text-gray-900 transition-all disabled:opacity-60">
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                Salvar
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Card do Kanban ── */
function KanbanCard({ card, index, onEdit, onDelete, clients, users }) {
  const empresa      = clients.find(c => c.id === card.clientId)
  const responsibles = users.filter(u => card.responsibleIds?.includes(u.id))
  const [confirmDelete, setConfirmDelete] = useState(false)
  const isAlert = card.alert ?? false
  const isStale = card.columnId !== 'finalizado'
    && !!card.updatedAt
    && (Date.now() - new Date(card.updatedAt).getTime() > 24 * 60 * 60 * 1000)

  // Tema: vermelho sólido quando stale sem alerta manual; alerta leve quando alert
  const S = isStale && !isAlert

  // Observação mais recente
  const lastObs = (card.observations ?? [])
    .filter(o => o.date)
    .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className="rounded-xl border px-3.5 py-3 flex flex-col gap-2 group transition-all cursor-pointer relative overflow-hidden"
          style={{
            ...provided.draggableProps.style,
            background:  S ? '#ef4444' : isAlert ? '#fff5f5' : '#fff',
            borderColor: S ? '#dc2626' : isAlert ? '#dc2626' : '#e5e7eb',
            borderWidth: (S || isAlert) ? 2 : 1,
            boxShadow: snapshot.isDragging
              ? '0 8px 24px rgba(0,0,0,0.18)'
              : S
                ? '0 0 0 3px rgba(239,68,68,0.30), 0 4px 16px rgba(220,38,38,0.35)'
                : isAlert
                  ? '0 0 0 3px rgba(220,38,38,0.15), 0 2px 8px rgba(220,38,38,0.12)'
                  : undefined,
          }}
          onDoubleClick={() => onEdit(card)}
        >
          {/* Badge de alerta manual */}
          {isAlert && (
            <div className="absolute top-0 right-0 flex items-center gap-1 bg-red-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg">
              <BellRing size={9} className="animate-bounce" />
              ALERTA
            </div>
          )}
          {/* Badge +24h — branco sobre vermelho quando stale sem alert; vermelho quando ambos */}
          {isStale && !isAlert && (
            <div className="absolute top-0 right-0 flex items-center gap-1 bg-white text-red-500 text-[9px] font-bold px-2 py-0.5 rounded-bl-lg shadow-sm">
              <Clock size={9} />
              +24H SEM UPDATE
            </div>
          )}
          {isStale && isAlert && (
            <div className="absolute top-0 left-0 flex items-center gap-1 bg-red-400 text-white text-[9px] font-bold px-2 py-0.5 rounded-br-lg">
              <Clock size={9} />
              +24H
            </div>
          )}

          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {empresa
                ? <p className="text-sm font-bold leading-snug truncate" style={{ color: S ? '#fff' : '#111827' }}>{empresa.name}</p>
                : <p className="text-sm font-bold leading-snug"         style={{ color: S ? '#fff' : '#111827' }}>{card.title}</p>
              }
              {empresa && (
                <p className="text-xs mt-0.5 leading-snug" style={{ color: S ? 'rgba(255,255,255,0.75)' : '#9ca3af' }}>{card.title}</p>
              )}
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <button
                onClick={() => onEdit(card)}
                className="p-1 rounded transition-all"
                style={{ color: S ? 'rgba(255,255,255,0.55)' : '#d1d5db' }}
                onMouseEnter={e => { e.currentTarget.style.color = S ? '#fff' : '#374151'; e.currentTarget.style.background = S ? 'rgba(255,255,255,0.15)' : '#f3f4f6' }}
                onMouseLeave={e => { e.currentTarget.style.color = S ? 'rgba(255,255,255,0.55)' : '#d1d5db'; e.currentTarget.style.background = 'transparent' }}
              ><Pencil size={12} /></button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-1 rounded transition-all"
                style={{ color: S ? 'rgba(255,255,255,0.55)' : '#d1d5db' }}
                onMouseEnter={e => { e.currentTarget.style.color = S ? '#fff' : '#ef4444'; e.currentTarget.style.background = S ? 'rgba(255,255,255,0.15)' : '#fef2f2' }}
                onMouseLeave={e => { e.currentTarget.style.color = S ? 'rgba(255,255,255,0.55)' : '#d1d5db'; e.currentTarget.style.background = 'transparent' }}
              ><Trash2 size={12} /></button>
            </div>
          </div>

          {responsibles.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {responsibles.map(u => (
                <span key={u.id} title={u.name} className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0" style={{ background: u.color }}>
                  {getInitials(u.name)}
                </span>
              ))}
              {responsibles.length === 1 && (
                <span className="text-[11px] ml-0.5" style={{ color: S ? 'rgba(255,255,255,0.75)' : '#9ca3af' }}>
                  {responsibles[0].name.split(' ')[0]}
                </span>
              )}
            </div>
          )}

          {(lastObs || isStale) && (
            <div className="flex flex-col gap-0.5 pt-1.5 border-t" style={{ borderColor: S ? 'rgba(255,255,255,0.22)' : (isAlert || isStale) ? 'rgba(252,165,165,0.4)' : '#f3f4f6' }}>
              <div className="flex items-center gap-1.5">
                <CalendarDays size={10} className="flex-shrink-0" style={{ color: S ? 'rgba(255,255,255,0.55)' : isStale ? '#fca5a5' : '#d1d5db' }} />
                {lastObs
                  ? <span className="text-[10px] font-medium" style={{ color: S ? 'rgba(255,255,255,0.85)' : isStale ? '#f87171' : '#9ca3af' }}>
                      Atualizado em {formatDate(lastObs.date)}
                    </span>
                  : <span className="text-[10px] font-medium" style={{ color: S ? 'rgba(255,255,255,0.85)' : '#f87171' }}>
                      Criado em {formatDate(card.createdAt?.split('T')[0])} · sem atualizações
                    </span>
                }
              </div>
              {lastObs?.text && (
                <p className="text-[11px] leading-relaxed line-clamp-2 pl-3.5" style={{ color: S ? 'rgba(255,255,255,0.70)' : '#9ca3af' }}>
                  {lastObs.text}
                </p>
              )}
            </div>
          )}

          {confirmDelete && (
            <div className="flex items-center justify-between pt-1 border-t mt-1" style={{ borderColor: S ? 'rgba(255,255,255,0.22)' : '#fee2e2' }}>
              <span className="text-xs font-medium" style={{ color: S ? '#fff' : '#ef4444' }}>Excluir card?</span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs px-2 py-1 rounded border transition-all"
                  style={S ? { borderColor: 'rgba(255,255,255,0.35)', color: '#fff', background: 'transparent' } : { borderColor: '#e5e7eb', color: '#6b7280' }}
                >Não</button>
                <button
                  onClick={() => onDelete(card.id)}
                  className="text-xs px-2 py-1 rounded border transition-all"
                  style={S ? { borderColor: '#fff', color: '#ef4444', background: '#fff' } : { borderColor: '#fecaca', color: '#dc2626', background: '#fef2f2' }}
                >Sim</button>
              </div>
            </div>
          )}
        </div>
      )}
    </Draggable>
  )
}

/* ── Painel de estatísticas por responsável ── */
function StatsPanel({ cards, users }) {
  const stats = useMemo(() => {
    const byUser = {}
    for (const card of cards) {
      const ids = card.responsibleIds?.length ? card.responsibleIds : ['__none__']
      for (const uid of ids) {
        if (!byUser[uid]) byUser[uid] = { total: 0, ordem_servico: 0, iniciado: 0, finalizado: 0 }
        byUser[uid].total++
        byUser[uid][card.columnId] = (byUser[uid][card.columnId] ?? 0) + 1
      }
    }
    const result = users
      .filter(u => byUser[u.id])
      .map(u => ({ ...u, ...byUser[u.id] }))
      .sort((a, b) => b.total - a.total)
    if (byUser['__none__']) {
      result.push({ id: '__none__', name: 'Sem responsável', color: '#94a3b8', ...byUser['__none__'] })
    }
    return result
  }, [cards, users])

  if (stats.length === 0) return null

  return (
    <div className="flex gap-3 flex-wrap">
      {stats.map(s => (
        <div key={s.id} className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 min-w-[210px] flex-1" style={{ maxWidth: 300 }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0" style={{ background: s.color }}>
            {getInitials(s.name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-800 truncate">{s.name.split(' ')[0]}</span>
              <span className="text-sm font-bold text-gray-900 ml-2 tabular-nums">{s.total}</span>
            </div>
            {/* Barra empilhada */}
            <div className="flex h-2 rounded-full overflow-hidden bg-gray-100 gap-px">
              {COLUMNS.map(col => {
                const count = s[col.id] ?? 0
                if (!count) return null
                return (
                  <div
                    key={col.id}
                    style={{ width: `${Math.round((count / s.total) * 100)}%`, background: col.accent.text }}
                    title={`${col.label}: ${count}`}
                  />
                )
              })}
            </div>
            {/* Legenda numérica */}
            <div className="flex gap-3 mt-1.5">
              {COLUMNS.map(col => {
                const count = s[col.id] ?? 0
                if (!count) return null
                return (
                  <span key={col.id} className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: col.accent.text }}>
                    <span className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: col.accent.text }} />
                    {count}
                  </span>
                )
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Página principal ── */
export default function ControlesSocietarioPage() {
  const { cards, loading, addCard, updateCard, deleteCard, moveCard } = useSocietario()
  const { clients } = useClients()
  const { users }   = useUsers()

  const [modal, setModal]         = useState(null)
  const [saving, setSaving]       = useState(false)
  const [saveError, setSaveError] = useState('')

  function openAdd(columnId) { setModal({ mode: 'add', columnId }); setSaveError('') }
  function openEdit(card)    { setModal({ mode: 'edit', card, columnId: card.columnId }); setSaveError('') }
  function closeModal()      { if (!saving) { setModal(null); setSaveError('') } }

  async function handleSave(form) {
    setSaving(true)
    setSaveError('')
    const result = modal.mode === 'add'
      ? await addCard({ ...form, columnId: modal.columnId })
      : await updateCard(modal.card.id, form)
    setSaving(false)
    if (result?.error) {
      setSaveError(result.error.message ?? result.error.code ?? 'Erro ao salvar — verifique o console')
      return
    }
    setModal(null)
  }

  async function handleDelete(id) { await deleteCard(id) }

  function onDragEnd({ destination, source, draggableId }) {
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return
    moveCard(draggableId, destination.droppableId, destination.index)
  }

  const colCards = (colId) =>
    cards.filter(c => c.columnId === colId).sort((a, b) => a.position - b.position)

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex items-center gap-2">
        <Scale size={20} className="text-brand-400" />
        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">Controle Societário</h1>
          <p className="text-xs text-gray-400">Gestão de ordens de serviço societárias</p>
        </div>
      </div>

      {!loading && cards.length > 0 && (
        <StatsPanel cards={cards} users={users} />
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-brand-400" />
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 items-start flex-1 min-h-0" style={{ minHeight: 'calc(100vh - 180px)' }}>
            {COLUMNS.map(col => {
              const colList = colCards(col.id)
              return (
                <div key={col.id} className="flex flex-col rounded-2xl flex-1 min-w-0" style={{ border: `1.5px solid ${col.accent.border}`, background: col.accent.bg }}>
                  <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: col.accent.border }}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800">{col.label}</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: col.accent.pill, color: col.accent.text }}>{colList.length}</span>
                    </div>
                    <button onClick={() => openAdd(col.id)} className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-white/60 transition-all" title="Adicionar card">
                      <Plus size={15} />
                    </button>
                  </div>
                  <Droppable droppableId={col.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="flex flex-col gap-2 p-3 flex-1 overflow-y-auto scrollbar-thin transition-colors"
                        style={{ minHeight: 80, background: snapshot.isDraggingOver ? 'rgba(255,255,255,0.45)' : undefined, borderRadius: '0 0 14px 14px' }}
                      >
                        {colList.length === 0 && !snapshot.isDraggingOver && (
                          <p className="text-xs text-center text-gray-400 py-6">Nenhum card · clique + para adicionar</p>
                        )}
                        {colList.map((card, index) => (
                          <KanbanCard key={card.id} card={card} index={index} onEdit={openEdit} onDelete={handleDelete} clients={clients} users={users} />
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              )
            })}
          </div>
        </DragDropContext>
      )}

      {modal && (
        <CardModal
          initial={modal.mode === 'edit' ? {
            title:          modal.card.title,
            clientId:       modal.card.clientId ?? '',
            observations:   modal.card.observations ?? [],
            responsibleIds: modal.card.responsibleIds ?? [],
            alert:          modal.card.alert ?? false,
          } : undefined}
          columnId={modal.columnId}
          onSave={handleSave}
          onClose={closeModal}
          saving={saving}
          saveError={saveError}
          clients={clients}
          users={users}
        />
      )}
    </div>
  )
}
