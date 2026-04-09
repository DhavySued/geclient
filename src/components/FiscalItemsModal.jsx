import { useState } from 'react'
import { X, ChevronUp, ChevronDown, Trash2, Plus } from 'lucide-react'
import { ALL_REGIMES } from '../hooks/useFiscalItems'

const REGIME_LABELS = {
  'Simples Nacional': 'Simples',
  'MEI':              'MEI',
  'Lucro Presumido':  'L. Presumido',
  'Lucro Real':       'L. Real',
}

export default function FiscalItemsModal({ items, onAdd, onRemove, onUpdate, onReorder, onClose }) {
  const [newLabel, setNewLabel] = useState('')

  function handleAddItem(e) {
    e.preventDefault()
    if (!newLabel.trim()) return
    onAdd(newLabel.trim())
    setNewLabel('')
  }

  function toggleRegime(item, regime) {
    if (regime === 'all') {
      onUpdate(item.id, { regimes: ['all'] })
      return
    }
    const current = item.regimes ?? ['all']
    const isAll   = current.includes('all')
    if (isAll) {
      onUpdate(item.id, { regimes: [regime] })
      return
    }
    const has  = current.includes(regime)
    let   next = has ? current.filter(r => r !== regime) : [...current, regime]
    if (next.length === 0 || next.length === ALL_REGIMES.length) next = ['all']
    onUpdate(item.id, { regimes: next })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 flex-shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-white">Itens de Consulta Fiscal</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Configure os itens, pesos e aplicabilidade para o score fiscal.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-200 transition-colors p-1 rounded-lg hover:bg-gray-800"
          >
            <X size={17} />
          </button>
        </div>

        {/* Column headers */}
        <div className="px-5 pt-3 pb-1 flex-shrink-0 flex items-center gap-2 text-[10px] text-gray-600 font-medium uppercase tracking-wide">
          <span className="w-7 flex-shrink-0" />
          <span className="w-4 flex-shrink-0" />
          <span className="flex-1">Item</span>
          <span className="w-14 text-center flex-shrink-0">Peso</span>
          <span className="w-5 flex-shrink-0" />
        </div>

        {/* List */}
        <div className="overflow-y-auto scrollbar-thin flex-1 px-5 py-2 space-y-2">
          {items.map((item, idx) => (
            <ItemRow
              key={item.id}
              item={item}
              idx={idx}
              total={items.length}
              onUpdate={onUpdate}
              onRemove={onRemove}
              onReorder={onReorder}
              onToggleRegime={toggleRegime}
            />
          ))}
        </div>

        {/* Add new item */}
        <div className="px-5 py-4 border-t border-gray-800 flex-shrink-0">
          <form onSubmit={handleAddItem} className="flex gap-2">
            <input
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder="Novo item (ex: ISS, DCTF...)"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
            />
            <button
              type="submit"
              disabled={!newLabel.trim()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-gray-900 text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus size={15} />
              Adicionar
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

function ItemRow({ item, idx, total, onUpdate, onRemove, onReorder, onToggleRegime }) {
  const [editingLabel, setEditingLabel] = useState(false)
  const [labelValue,   setLabelValue]   = useState(item.label)

  function commitLabel() {
    const trimmed = labelValue.trim()
    if (trimmed && trimmed !== item.label) onUpdate(item.id, { label: trimmed })
    else setLabelValue(item.label)
    setEditingLabel(false)
  }

  const regimes = item.regimes ?? ['all']
  const isAll   = regimes.includes('all')

  return (
    <div className={`rounded-xl border transition-all ${
      item.active
        ? 'bg-gray-800/60 border-gray-700/50'
        : 'bg-gray-800/20 border-gray-800 opacity-50'
    }`}>

      {/* Main row */}
      <div className="flex items-center gap-2 p-3">
        {/* Reorder */}
        <div className="flex flex-col gap-0.5 flex-shrink-0 w-7">
          <button
            onClick={() => onReorder(idx, idx - 1)}
            disabled={idx === 0}
            className="p-0.5 rounded text-gray-600 hover:text-gray-300 disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <ChevronUp size={13} />
          </button>
          <button
            onClick={() => onReorder(idx, idx + 1)}
            disabled={idx === total - 1}
            className="p-0.5 rounded text-gray-600 hover:text-gray-300 disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <ChevronDown size={13} />
          </button>
        </div>

        {/* Active toggle */}
        <button
          onClick={() => onUpdate(item.id, { active: !item.active })}
          className={`w-4 h-4 rounded flex-shrink-0 border-2 transition-all ${
            item.active ? 'bg-amber-500 border-amber-500' : 'bg-transparent border-gray-600'
          }`}
          title={item.active ? 'Desativar' : 'Ativar'}
        />

        {/* Label */}
        {editingLabel ? (
          <input
            autoFocus
            value={labelValue}
            onChange={e => setLabelValue(e.target.value)}
            onBlur={commitLabel}
            onKeyDown={e => {
              if (e.key === 'Enter') commitLabel()
              if (e.key === 'Escape') { setLabelValue(item.label); setEditingLabel(false) }
            }}
            className="flex-1 bg-gray-900 border border-amber-500/50 rounded-lg px-2 py-1 text-sm text-gray-100 focus:outline-none"
          />
        ) : (
          <span
            className="flex-1 text-sm text-gray-300 cursor-pointer hover:text-white"
            onClick={() => { setLabelValue(item.label); setEditingLabel(true) }}
          >
            {item.label}
          </span>
        )}

        {/* Weight input */}
        <input
          type="number"
          min={1}
          max={100}
          value={item.weight ?? 10}
          onChange={e => {
            const v = Math.max(1, Math.min(100, Number(e.target.value)))
            if (!isNaN(v)) onUpdate(item.id, { weight: v })
          }}
          className="w-14 flex-shrink-0 bg-gray-900 border border-gray-700 rounded-lg px-2 py-1 text-sm text-center text-amber-300 focus:outline-none focus:border-amber-500/50"
          title="Peso (1–100)"
        />

        {/* Remove */}
        <button
          onClick={() => onRemove(item.id)}
          className="flex-shrink-0 w-5 p-0.5 rounded text-gray-700 hover:text-red-400 transition-colors"
          title="Remover item"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Applicability row */}
      <div className="px-3 pb-2.5 pt-2 flex flex-wrap gap-3 items-center border-t border-gray-700/30">
        {/* Regime chips */}
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[10px] text-gray-600 mr-0.5">Regime:</span>
          <RegimeChip label="Todos" active={isAll} onClick={() => onToggleRegime(item, 'all')} />
          {ALL_REGIMES.map(r => (
            <RegimeChip
              key={r}
              label={REGIME_LABELS[r] ?? r}
              active={!isAll && regimes.includes(r)}
              onClick={() => onToggleRegime(item, r)}
            />
          ))}
        </div>

        {/* Requires checkboxes */}
        <div className="flex items-center gap-4 ml-auto">
          <ApplyCheck
            label="Req. Funcionários"
            checked={item.requiresEmployees ?? false}
            onChange={v => onUpdate(item.id, { requiresEmployees: v })}
          />
          <ApplyCheck
            label="Req. Pró-Labore"
            checked={item.requiresProLabore ?? false}
            onChange={v => onUpdate(item.id, { requiresProLabore: v })}
          />
        </div>
      </div>
    </div>
  )
}

function RegimeChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all ${
        active
          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
          : 'bg-transparent border-gray-700 text-gray-600 hover:border-gray-500 hover:text-gray-400'
      }`}
    >
      {label}
    </button>
  )
}

function ApplyCheck({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-1.5 cursor-pointer select-none group">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`w-3.5 h-3.5 rounded border-2 flex-shrink-0 transition-all ${
          checked
            ? 'bg-amber-500 border-amber-500'
            : 'bg-transparent border-gray-600 group-hover:border-gray-400'
        }`}
      />
      <span className="text-[10px] text-gray-500 group-hover:text-gray-400 transition-colors">
        {label}
      </span>
    </label>
  )
}
