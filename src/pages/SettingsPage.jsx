import { Settings, Calendar, BarChart3, RotateCcw, Scale } from 'lucide-react'
import {
  useSettings,
  REGIMES,
  CONFIGURABLE_FISCAL_ITEMS,
  DEFAULT_REGIME_ITEMS,
  ALL_FISCAL_ITEMS,
  DEFAULT_ITEM_WEIGHTS,
} from '../context/SettingsContext'

function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="flex items-start gap-4 cursor-pointer group">
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative flex-shrink-0 mt-0.5 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
          checked ? 'bg-amber-500' : 'bg-gray-700 group-hover:bg-gray-600'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
      <div>
        <p className="text-sm font-medium text-gray-200">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
    </label>
  )
}

function RegimeCard({ regime, selectedIds, onToggle, onReset }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-200">{regime}</h4>
        <button
          onClick={onReset}
          title="Restaurar padrão"
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-amber-400 transition-colors"
        >
          <RotateCcw size={11} />
          Padrão
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {CONFIGURABLE_FISCAL_ITEMS.map(item => {
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
      {selectedIds.length === 0 && (
        <p className="text-xs text-gray-600 mt-2 italic">Nenhum imposto selecionado para este regime.</p>
      )}
    </div>
  )
}

function WeightInput({ item, value, onChange, onReset }) {
  const isModified = value !== DEFAULT_ITEM_WEIGHTS[item.id]
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-800 border border-gray-700 rounded-xl">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-200">{item.label}</p>
        {isModified && (
          <p className="text-[10px] text-amber-400">
            Padrão: {DEFAULT_ITEM_WEIGHTS[item.id]}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <input
          type="number"
          min={1}
          max={100}
          value={value}
          onChange={e => {
            const n = parseInt(e.target.value, 10)
            if (!isNaN(n) && n >= 1 && n <= 100) onChange(n)
          }}
          className="w-16 text-center bg-gray-900 border border-gray-600 rounded-lg px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-amber-500/60 transition-colors"
        />
        {isModified && (
          <button
            onClick={onReset}
            title="Restaurar padrão"
            className="text-gray-500 hover:text-amber-400 transition-colors"
          >
            <RotateCcw size={13} />
          </button>
        )}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const { settings, update, toggleRegimeItem, setItemWeight } = useSettings()

  function resetRegime(regime) {
    const regimeItems = { ...settings.regimeItems, [regime]: [...(DEFAULT_REGIME_ITEMS[regime] ?? [])] }
    update({ regimeItems })
  }

  function resetWeight(itemId) {
    setItemWeight(itemId, DEFAULT_ITEM_WEIGHTS[itemId])
  }

  // Total weight for reference
  const totalWeight = ALL_FISCAL_ITEMS.reduce(
    (s, i) => s + (settings.itemWeights[i.id] ?? DEFAULT_ITEM_WEIGHTS[i.id]),
    0
  )

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

      {/* Seção: Calendário */}
      <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Calendar size={16} className="text-amber-400" />
          <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Calendário</h2>
        </div>
        <Toggle
          checked={settings.showUndatedInCalendar}
          onChange={(val) => update({ showUndatedInCalendar: val })}
          label="Exibir atividades sem data no painel lateral"
          description="Mostra no calendário as tarefas que não possuem data de vencimento definida."
        />
      </section>

      {/* Seção: Impostos por Regime */}
      <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 size={16} className="text-amber-400" />
          <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Gestão Fiscal por Regime</h2>
        </div>
        <p className="text-xs text-gray-500 -mt-2">
          Defina quais impostos serão monitorados para cada regime tributário.
          Encargos trabalhistas (INSS, FGTS) e certidões negativas são sempre exibidos conforme o perfil da empresa.
        </p>
        <div className="grid gap-3">
          {REGIMES.map(regime => (
            <RegimeCard
              key={regime}
              regime={regime}
              selectedIds={settings.regimeItems[regime] ?? []}
              onToggle={(itemId) => toggleRegimeItem(regime, itemId)}
              onReset={() => resetRegime(regime)}
            />
          ))}
        </div>
      </section>

      {/* Seção: Pesos dos Itens Fiscais */}
      <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Scale size={16} className="text-amber-400" />
            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Pesos dos Itens Fiscais</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Total:</span>
            <span className="text-xs font-bold text-amber-400">{totalWeight} pts</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 -mt-2">
          O peso de cada item determina sua influência no Score Fiscal (0–100).
          Itens com peso maior impactam mais o resultado quando estão pendentes.
        </p>
        <div className="grid gap-2">
          {ALL_FISCAL_ITEMS.map(item => (
            <WeightInput
              key={item.id}
              item={item}
              value={settings.itemWeights[item.id] ?? DEFAULT_ITEM_WEIGHTS[item.id]}
              onChange={(w) => setItemWeight(item.id, w)}
              onReset={() => resetWeight(item.id)}
            />
          ))}
        </div>
        <button
          onClick={() => update({ itemWeights: { ...DEFAULT_ITEM_WEIGHTS } })}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-amber-400 transition-colors"
        >
          <RotateCcw size={12} />
          Restaurar todos os pesos para o padrão
        </button>
      </section>
    </div>
  )
}
