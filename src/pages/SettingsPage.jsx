import { Settings, Calendar, BarChart3, Scale, Users, Briefcase, Plus, Pencil, Trash2, Check, X, Loader2, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { useSettings } from '../context/SettingsContext'
import { useFiscalItemsCtx, PROFILE_BASED_IDS } from '../context/FiscalItemsContext'
import { useFiscalConfig, REGIMES, TIPO_BASED_IDS } from '../context/FiscalConfigContext'

// IDs que não aparecem nos seletores de alocação (gerenciados automaticamente pelo sistema)
const AUTO_IDS = new Set([...TIPO_BASED_IDS])

// ── Toggle ─────────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="flex items-start gap-4 cursor-pointer group">
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative flex-shrink-0 mt-0.5 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
          checked ? 'bg-amber-500' : 'bg-gray-700 group-hover:bg-gray-600'
        }`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`} />
      </button>
      <div>
        <p className="text-sm font-medium text-gray-200">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
    </label>
  )
}

// ── Item picker genérico ───────────────────────────────────────────────────────

function ItemPicker({ items, selectedIds, onToggle }) {
  const available = items.filter(i => !AUTO_IDS.has(i.id))
  if (available.length === 0) {
    return <p className="text-xs text-gray-600 italic">Nenhum item disponível.</p>
  }
  return (
    <div className="flex flex-wrap gap-2">
      {available.map(item => {
        const active = selectedIds.includes(item.id)
        return (
          <button
            key={item.id}
            onClick={() => onToggle(item.id)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all duration-150 ${
              active
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'bg-gray-700/50 border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300'
            }`}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Fiscal Item Row (CRUD) ─────────────────────────────────────────────────────

function FiscalItemRow({ item, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [label,   setLabel]   = useState(item.label)
  const [weight,  setWeight]  = useState(String(item.weight))
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  async function handleSave() {
    const w = parseInt(weight, 10)
    if (!label.trim())            { setError('Nome obrigatório'); return }
    if (isNaN(w) || w < 1 || w > 100) { setError('Peso 1–100'); return }
    setSaving(true)
    try {
      await onUpdate(item.id, { label: label.trim(), weight: w })
      setEditing(false); setError('')
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  function handleCancel() { setLabel(item.label); setWeight(String(item.weight)); setEditing(false); setError('') }

  if (editing) {
    return (
      <div className="flex items-center gap-2 p-3 bg-gray-800 border border-amber-500/40 rounded-xl">
        <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Nome"
          className="flex-1 min-w-0 bg-gray-900 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-amber-500/60" />
        <input type="number" min={1} max={100} value={weight} onChange={e => setWeight(e.target.value)}
          className="w-14 text-center bg-gray-900 border border-gray-600 rounded-lg px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-amber-500/60" />
        <span className="text-xs text-gray-500 flex-shrink-0">pts</span>
        {error && <span className="text-xs text-red-400">{error}</span>}
        <button onClick={handleSave} disabled={saving} className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
        </button>
        <button onClick={handleCancel} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 transition-colors">
          <X size={14} />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-xl group">
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-gray-200">{item.label}</span>
        {TIPO_BASED_IDS.has(item.id) && (
          <span className="ml-2 text-[10px] text-gray-600 border border-gray-700 rounded px-1">automático</span>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="text-sm font-bold text-amber-400">{item.weight}</span>
        <span className="text-xs text-gray-600">pts</span>
      </div>
      <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg text-gray-500 hover:text-amber-400 hover:bg-amber-500/10 transition-all" title="Editar">
          <Pencil size={13} />
        </button>
        <button onClick={() => onDelete(item.id)} className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Excluir">
          <Trash2 size={13} />
        </button>
      </div>
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
    if (!label.trim())            { setError('Nome obrigatório'); return }
    if (isNaN(w) || w < 1 || w > 100) { setError('Peso 1–100'); return }
    setSaving(true)
    try { await onAdd({ label: label.trim(), weight: w }); setLabel(''); setWeight('10'); setError(''); setOpen(false) }
    catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl border border-dashed border-gray-700 text-sm text-gray-500 hover:border-amber-500/40 hover:text-amber-400 transition-all">
        <Plus size={15} /> Adicionar item fiscal
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3 bg-gray-800 border border-amber-500/30 rounded-xl">
      <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Nome (ex: IRRF)" autoFocus
        className="flex-1 min-w-0 bg-gray-900 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-amber-500/60" />
      <input type="number" min={1} max={100} value={weight} onChange={e => setWeight(e.target.value)}
        className="w-14 text-center bg-gray-900 border border-gray-600 rounded-lg px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-amber-500/60" />
      <span className="text-xs text-gray-500 flex-shrink-0">pts</span>
      {error && <span className="text-xs text-red-400">{error}</span>}
      <button type="submit" disabled={saving}
        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-gray-900 text-xs font-bold transition-colors flex items-center gap-1">
        {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Salvar
      </button>
      <button type="button" onClick={() => { setOpen(false); setError('') }} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300">
        <X size={14} />
      </button>
    </form>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { settings, update } = useSettings()
  const {
    fiscalItems, loading: itemsLoading, error: itemsError,
    addFiscalItem, updateFiscalItem, deleteFiscalItem,
  } = useFiscalItemsCtx()
  const {
    regimeItems, conditionItems,
    toggleRegimeItem, toggleConditionItem,
    loading: configLoading, error: configError,
  } = useFiscalConfig()

  const totalWeight = fiscalItems.reduce((s, i) => s + i.weight, 0)
  const isLoading   = itemsLoading || configLoading
  const anyError    = itemsError || configError

  async function handleDeleteItem(id) {
    if (!confirm('Excluir este item fiscal? Ele será removido de todas as alocações.')) return
    try { await deleteFiscalItem(id) } catch (e) { alert(e.message) }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
          <Settings size={20} className="text-amber-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Configurações</h1>
          <p className="text-sm text-gray-500">Personalize o comportamento do sistema</p>
        </div>
      </div>

      {anyError && (
        <div className="text-xs text-red-400 bg-red-950/30 border border-red-500/20 rounded-xl p-3">
          Erro ao carregar configurações: {anyError}
        </div>
      )}

      {/* ── Calendário ─────────────────────────────────────────────────────── */}
      <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-amber-400" />
          <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Calendário</h2>
        </div>
        <Toggle
          checked={settings.showUndatedInCalendar}
          onChange={val => update({ showUndatedInCalendar: val })}
          label="Exibir atividades sem data no painel lateral"
          description="Mostra no calendário as tarefas que não possuem data de vencimento definida."
        />
      </section>

      {/* ── Itens Fiscais (CRUD) ────────────────────────────────────────────── */}
      <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale size={16} className="text-amber-400" />
            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Itens Fiscais</h2>
          </div>
          {!isLoading && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">Total:</span>
              <span className="text-xs font-bold text-amber-400">{totalWeight} pts</span>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-500">
          Cadastre os impostos e encargos monitorados. O peso de cada item define sua influência no Score Fiscal.
          Itens marcados como <span className="text-gray-400 font-medium">automático</span> são sempre exibidos pelo tipo de atividade da empresa.
        </p>

        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-amber-400" /></div>
        ) : (
          <div className="space-y-2">
            {fiscalItems.map(item => (
              <FiscalItemRow key={item.id} item={item} onUpdate={updateFiscalItem} onDelete={handleDeleteItem} />
            ))}
            <AddItemForm onAdd={addFiscalItem} />
          </div>
        )}
      </section>

      {/* ── Alocação por Regime Tributário ──────────────────────────────────── */}
      <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2">
          <BarChart3 size={16} className="text-amber-400" />
          <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Alocação por Regime Tributário</h2>
        </div>
        <p className="text-xs text-gray-500">
          Defina quais impostos são monitorados para cada regime. Certidões negativas são sempre exibidas automaticamente pelo tipo de atividade.
        </p>

        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin text-amber-400" /></div>
        ) : (
          <div className="grid gap-3">
            {REGIMES.map(regime => (
              <div key={regime} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-gray-200 mb-3">{regime}</h4>
                <ItemPicker
                  items={fiscalItems}
                  selectedIds={regimeItems[regime] ?? []}
                  onToggle={id => toggleRegimeItem(regime, id)}
                />
                {(regimeItems[regime] ?? []).length === 0 && (
                  <p className="text-xs text-gray-600 mt-2 italic">Nenhum imposto selecionado.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Alocação por Condição de Folha ──────────────────────────────────── */}
      <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-amber-400" />
          <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Alocação por Condição de Folha</h2>
        </div>
        <p className="text-xs text-gray-500">
          Defina quais encargos são monitorados quando a empresa possui empregados CLT ou pró-labore.
          Esses encargos são somados automaticamente aos impostos do regime tributário.
        </p>

        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin text-amber-400" /></div>
        ) : (
          <div className="grid gap-3">
            {/* Empregados */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users size={14} className="text-blue-400" />
                <h4 className="text-sm font-semibold text-gray-200">Tem Empregados (CLT)</h4>
                {(conditionItems.employees ?? []).length > 0 && (
                  <span className="ml-auto text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full px-1.5 py-0.5">
                    {conditionItems.employees.length}
                  </span>
                )}
              </div>
              <ItemPicker
                items={fiscalItems}
                selectedIds={conditionItems.employees ?? []}
                onToggle={id => toggleConditionItem('employees', id)}
              />
              {(conditionItems.employees ?? []).length === 0 && (
                <p className="text-xs text-gray-600 mt-2 italic">Nenhum encargo selecionado.</p>
              )}
            </div>

            {/* Pró-labore */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Briefcase size={14} className="text-purple-400" />
                <h4 className="text-sm font-semibold text-gray-200">Tem Pró-Labore</h4>
                {(conditionItems.pro_labore ?? []).length > 0 && (
                  <span className="ml-auto text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full px-1.5 py-0.5">
                    {conditionItems.pro_labore.length}
                  </span>
                )}
              </div>
              <ItemPicker
                items={fiscalItems}
                selectedIds={conditionItems.pro_labore ?? []}
                onToggle={id => toggleConditionItem('pro_labore', id)}
              />
              {(conditionItems.pro_labore ?? []).length === 0 && (
                <p className="text-xs text-gray-600 mt-2 italic">Nenhum encargo selecionado.</p>
              )}
            </div>
          </div>
        )}
      </section>

    </div>
  )
}
