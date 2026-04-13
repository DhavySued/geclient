import { Settings, Calendar, BarChart3, Scale, Users, Briefcase, Store, Plus, Pencil, Trash2, Check, X, Loader2, Lock, Columns } from 'lucide-react'
import { useState } from 'react'
import { useSettings } from '../context/SettingsContext'
import { useFiscalItemsCtx } from '../context/FiscalItemsContext'
import { useFiscalConfig, REGIMES, TIPOS } from '../context/FiscalConfigContext'
import { usePermissions } from '../hooks/usePermissions'

// ── Toggle ─────────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, label, description, disabled = false }) {
  const [hovered, setHovered] = useState(false)
  return (
    <label className={`flex items-start gap-4 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} group`}>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => !disabled && onChange(!checked)}
        onMouseEnter={() => !disabled && setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        disabled={disabled}
        className="relative flex-shrink-0 mt-0.5 w-11 h-6 rounded-full transition-all duration-200 focus:outline-none"
        style={{
          backgroundColor: checked
            ? (disabled ? '#c4870a' : '#f39200')
            : hovered ? '#9ca3af' : '#d1d5db',
          boxShadow: checked && !disabled ? '0 0 0 3px rgba(243,146,0,0.18)' : 'none',
        }}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`} />
      </button>
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
    </label>
  )
}

// ── Item picker genérico ───────────────────────────────────────────────────────

function ItemPicker({ items, selectedIds, onToggle, disabled = false }) {
  if (!items.length) return <p className="text-xs text-gray-400 italic">Nenhum item cadastrado.</p>
  return (
    <div className={`flex flex-wrap gap-2 ${disabled ? 'pointer-events-none opacity-50' : ''}`}>
      {items.map(item => {
        const active = selectedIds.includes(item.id)
        return (
          <button
            key={item.id}
            onClick={() => !disabled && onToggle(item.id)}
            disabled={disabled}
            className="px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all duration-150"
            style={active ? {
              backgroundColor: '#f39200',
              borderColor: '#f39200',
              color: '#ffffff',
              boxShadow: disabled ? 'none' : '0 1px 4px rgba(243,146,0,0.35)',
            } : {
              backgroundColor: '#ffffff',
              borderColor: '#d1d5db',
              color: '#4b5563',
            }}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Allocation card (reutilizável) ─────────────────────────────────────────────

function AllocationCard({ icon: Icon, iconColor, title, badgeColor, items, selectedIds, onToggle, disabled = false }) {
  const count = selectedIds.length
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 bg-white border-b border-gray-200">
        {Icon && <Icon size={14} className={iconColor} />}
        <h4 className="text-sm font-semibold text-gray-800 flex-1">{title}</h4>
        <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 border ${
          count > 0 ? badgeColor : 'bg-gray-100 text-gray-400 border-gray-200'
        }`}>
          {count > 0 ? `${count} selecionado${count !== 1 ? 's' : ''}` : 'nenhum'}
        </span>
      </div>
      <div className="px-4 py-3">
        {items.length === 0
          ? <p className="text-xs text-gray-400 italic">Nenhum item fiscal cadastrado.</p>
          : <ItemPicker items={items} selectedIds={selectedIds} onToggle={onToggle} disabled={disabled} />
        }
      </div>
    </div>
  )
}

// ── Fiscal Item Row (CRUD) ─────────────────────────────────────────────────────

function FiscalItemRow({ item, onUpdate, onDelete, canEdit = true }) {
  const [editing, setEditing] = useState(false)
  const [label,   setLabel]   = useState(item.label)
  const [weight,  setWeight]  = useState(String(item.weight))
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  async function handleSave() {
    const w = parseInt(weight, 10)
    if (!label.trim())                { setError('Nome obrigatório'); return }
    if (isNaN(w) || w < 1 || w > 100) { setError('Peso 1–100');       return }
    setSaving(true)
    try { await onUpdate(item.id, { label: label.trim(), weight: w }); setEditing(false); setError('') }
    catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  function handleCancel() { setLabel(item.label); setWeight(String(item.weight)); setEditing(false); setError('') }

  if (editing) {
    return (
      <div className="flex items-center gap-2 p-3 bg-gray-100 border border-brand-500/40 rounded-xl">
        <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Nome"
          className="flex-1 min-w-0 bg-white border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-500/60" />
        <input type="number" min={1} max={100} value={weight} onChange={e => setWeight(e.target.value)}
          className="w-14 text-center bg-white border border-gray-600 rounded-lg px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-brand-500/60" />
        <span className="text-xs text-gray-500 flex-shrink-0">pts</span>
        {error && <span className="text-xs text-red-400">{error}</span>}
        <button onClick={handleSave} disabled={saving} className="p-1.5 rounded-lg bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 transition-colors">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
        </button>
        <button onClick={handleCancel} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-600"><X size={14} /></button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-100 border border-gray-200 rounded-xl group">
      <span className="flex-1 text-sm font-medium text-gray-700">{item.label}</span>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="text-sm font-bold text-brand-400">{item.weight}</span>
        <span className="text-xs text-gray-600">pts</span>
      </div>
      {canEdit && (
        <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg text-gray-500 hover:text-brand-400 hover:bg-brand-500/10 transition-all" title="Editar">
            <Pencil size={13} />
          </button>
          <button onClick={() => onDelete(item.id)} className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Excluir">
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  )
}

function AddItemForm({ onAdd }) {
  const [open,   setOpen]   = useState(false)
  const [label,  setLabel]  = useState('')
  const [weight, setWeight] = useState('10')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    const w = parseInt(weight, 10)
    if (!label.trim())                { setError('Nome obrigatório'); return }
    if (isNaN(w) || w < 1 || w > 100) { setError('Peso 1–100');       return }
    setSaving(true)
    try { await onAdd({ label: label.trim(), weight: w }); setLabel(''); setWeight('10'); setError(''); setOpen(false) }
    catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl border border-dashed border-gray-200 text-sm text-gray-500 hover:border-brand-500/40 hover:text-brand-400 transition-all">
        <Plus size={15} /> Adicionar item fiscal
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3 bg-gray-100 border border-brand-500/30 rounded-xl">
      <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Nome (ex: IRRF)" autoFocus
        className="flex-1 min-w-0 bg-white border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-500/60" />
      <input type="number" min={1} max={100} value={weight} onChange={e => setWeight(e.target.value)}
        className="w-14 text-center bg-white border border-gray-600 rounded-lg px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-brand-500/60" />
      <span className="text-xs text-gray-500 flex-shrink-0">pts</span>
      {error && <span className="text-xs text-red-400">{error}</span>}
      <button type="submit" disabled={saving}
        className="px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-400 text-gray-900 text-xs font-bold transition-colors flex items-center gap-1">
        {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Salvar
      </button>
      <button type="button" onClick={() => { setOpen(false); setError('') }} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-600">
        <X size={14} />
      </button>
    </form>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { settings, update } = useSettings()
  const { fiscalItems, loading: itemsLoading, error: itemsError, addFiscalItem, updateFiscalItem, deleteFiscalItem } = useFiscalItemsCtx()
  const {
    regimeItems, conditionItems, tipoItems,
    toggleRegimeItem, toggleConditionItem, toggleTipoItem,
    loading: configLoading, error: configError,
  } = useFiscalConfig()
  const { can }   = usePermissions()
  const canEdit   = can('settings', 'edit')

  const totalWeight = fiscalItems.reduce((s, i) => s + i.weight, 0)
  const isLoading   = itemsLoading || configLoading
  const anyError    = itemsError || configError

  const TIPO_CONFIG = [
    { tipo: 'Serviço',  icon: Briefcase, iconColor: 'text-emerald-400', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    { tipo: 'Comércio', icon: Store,     iconColor: 'text-blue-400',    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30'          },
    { tipo: 'Misto',    icon: BarChart3, iconColor: 'text-purple-400',  badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30'    },
  ]

  async function handleDeleteItem(id) {
    if (!confirm('Excluir este item fiscal? Ele será removido de todas as alocações.')) return
    try { await deleteFiscalItem(id) } catch (e) { alert(e.message) }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center">
          <Settings size={20} className="text-brand-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Configurações</h1>
          <p className="text-sm text-gray-500">Personalize o comportamento do sistema</p>
        </div>
      </div>

      {anyError && (
        <div className="text-xs text-red-400 bg-red-950/30 border border-red-500/20 rounded-xl p-3">
          Erro ao carregar configurações: {anyError}
        </div>
      )}

      {!canEdit && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-amber-300/40 bg-amber-50/60 text-amber-700 text-xs font-medium">
          <Lock size={13} className="flex-shrink-0" />
          Você tem acesso somente leitura. Fale com um administrador para solicitar permissão de edição.
        </div>
      )}

      {/* Calendário */}
      <section className="bg-white border border-gray-100 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-brand-400" />
          <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider">Calendário</h2>
        </div>
        <Toggle
          checked={settings.showUndatedInCalendar}
          onChange={val => update({ showUndatedInCalendar: val })}
          label="Exibir atividades sem data no painel lateral"
          description="Mostra no calendário as tarefas sem data de vencimento definida."
          disabled={!canEdit}
        />
      </section>

      {/* Kanban */}
      <section className="bg-white border border-gray-100 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Columns size={16} className="text-brand-400" />
          <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider">Kanban</h2>
        </div>
        <Toggle
          checked={settings.stickyKanbanHeaders}
          onChange={val => update({ stickyKanbanHeaders: val })}
          label="Travar cabeçalhos das colunas"
          description="Os títulos das colunas ficam visíveis mesmo ao rolar os cards para baixo."
          disabled={!canEdit}
        />
      </section>

      {/* Itens Fiscais */}
      <section className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale size={16} className="text-brand-400" />
            <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider">Itens Fiscais</h2>
          </div>
          {!isLoading && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">Total:</span>
              <span className="text-xs font-bold text-brand-400">{totalWeight} pts</span>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-500">
          Cadastre os impostos e encargos monitorados. O peso de cada item define sua influência no Score Fiscal.
        </p>
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-brand-400" /></div>
        ) : (
          <div className="space-y-2">
            {fiscalItems.map(item => (
              <FiscalItemRow key={item.id} item={item} onUpdate={updateFiscalItem} onDelete={handleDeleteItem} canEdit={canEdit} />
            ))}
            {canEdit && <AddItemForm onAdd={addFiscalItem} />}
          </div>
        )}
      </section>

      {/* Alocação por Regime */}
      <section className="bg-white border border-gray-100 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2">
          <BarChart3 size={16} className="text-brand-400" />
          <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider">Alocação por Regime Tributário</h2>
        </div>
        <p className="text-xs text-gray-500">
          Defina quais impostos são monitorados para cada regime tributário.
        </p>
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin text-brand-400" /></div>
        ) : (
          <div className="grid gap-3">
            {REGIMES.map(regime => (
              <AllocationCard
                key={regime}
                title={regime}
                items={fiscalItems}
                selectedIds={regimeItems[regime] ?? []}
                onToggle={id => toggleRegimeItem(regime, id)}
                badgeColor="bg-brand-500/20 text-brand-300 border-brand-500/30"
                disabled={!canEdit}
              />
            ))}
          </div>
        )}
      </section>

      {/* Alocação por Condição de Folha */}
      <section className="bg-white border border-gray-100 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-brand-400" />
          <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider">Alocação por Condição de Folha</h2>
        </div>
        <p className="text-xs text-gray-500">
          Defina os encargos monitorados quando a empresa possui empregados CLT ou pró-labore.
        </p>
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin text-brand-400" /></div>
        ) : (
          <div className="grid gap-3">
            <AllocationCard
              icon={Users} iconColor="text-blue-400"
              title="Tem Empregados (CLT)"
              badgeColor="bg-blue-500/20 text-blue-300 border-blue-500/30"
              items={fiscalItems}
              selectedIds={conditionItems.employees ?? []}
              onToggle={id => toggleConditionItem('employees', id)}
              disabled={!canEdit}
            />
            <AllocationCard
              icon={Briefcase} iconColor="text-purple-400"
              title="Tem Pró-Labore"
              badgeColor="bg-purple-500/20 text-purple-300 border-purple-500/30"
              items={fiscalItems}
              selectedIds={conditionItems.pro_labore ?? []}
              onToggle={id => toggleConditionItem('pro_labore', id)}
              disabled={!canEdit}
            />
          </div>
        )}
      </section>

      {/* Alocação por Tipo de Atividade */}
      <section className="bg-white border border-gray-100 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Store size={16} className="text-brand-400" />
          <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider">Alocação por Tipo de Atividade</h2>
        </div>
        <p className="text-xs text-gray-500">
          Defina quais itens são monitorados conforme o tipo de atividade da empresa (Serviço, Comércio ou Misto).
        </p>
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin text-brand-400" /></div>
        ) : (
          <div className="grid gap-3">
            {TIPO_CONFIG.map(({ tipo, icon, iconColor, badgeColor }) => (
              <AllocationCard
                key={tipo}
                icon={icon} iconColor={iconColor}
                title={tipo}
                badgeColor={badgeColor}
                items={fiscalItems}
                selectedIds={tipoItems[tipo] ?? []}
                onToggle={id => toggleTipoItem(tipo, id)}
                disabled={!canEdit}
              />
            ))}
          </div>
        )}
      </section>

    </div>
  )
}
