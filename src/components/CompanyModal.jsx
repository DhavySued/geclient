import { useState, useEffect } from 'react'
import { X, Building2, Users, Plus, Trash2, Pencil, Check } from 'lucide-react'

const REGIMES = ['Simples Nacional', 'Lucro Presumido', 'Lucro Real', 'MEI']
const LEVELS  = ['Standard', 'Gold', 'Premium']
const TIPOS   = ['Serviço', 'Comércio', 'Misto']
const CX_STATUSES = [
  { value: 'cliente_novo', label: 'Cliente Novo' },
  { value: 'promotor',    label: 'Promotor' },
  { value: 'neutro',      label: 'Neutro' },
  { value: 'risco_churn', label: 'Risco de Churn' },
  { value: 'detrator',    label: 'Detrator' },
]

const DP_SERVICES = [
  { key: 'adiantamentoFolha', label: 'Adiantamento de Folha' },
  { key: 'folha',             label: 'Folha' },
  { key: 'proLabore',         label: 'Pró-Labore' },
  { key: 'envioFolha',        label: 'Envio de Folha' },
  { key: 'inss',              label: 'INSS' },
  { key: 'fgts',              label: 'FGTS' },
  { key: 'autonomoSal',       label: 'Autônomo / SAL' },
  { key: 'semMovimentacao',   label: 'Sem Movimentação' },
  { key: 'det',               label: 'DET' },
]

const EMPTY_DP = {
  adiantamentoFolha: false,
  folha: false,
  proLabore: false,
  envioFolha: false,
  inss: false,
  fgts: false,
  autonomoSal: false,
  semMovimentacao: false,
  det: false,
}

const EMPTY = {
  name: '', cnpj: '', level: 'Standard', regime: 'Simples Nacional', tipo: 'Serviço',
  hasEmployees: false, hasProLabore: false,
  active: true,
  mapFiscal: true, mapNps: true, mapOnboarding: true,
  cxStatus: 'cliente_novo', notes: '',
  entryDate: '',
  dpServices: { ...EMPTY_DP },
  dpServicesHistory: [],
}

function applyCnpjMask(value) {
  const d = value.replace(/\D/g, '').slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

function formatYM(ym) {
  if (!ym) return ''
  const [y, m] = ym.split('-')
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  return `${months[parseInt(m, 10) - 1]} ${y}`
}

function activeLabels(services) {
  return DP_SERVICES.filter(s => services?.[s.key]).map(s => s.label)
}

function nowYM() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function CompanyModal({ client, onSave, onClose }) {
  const [form, setForm]           = useState(EMPTY)
  const [errors, setErrors]       = useState({})
  const [activeTab, setActiveTab] = useState('geral')
  const [editingEntry, setEditingEntry] = useState(null) // { yearMonth, services } | null

  useEffect(() => {
    if (client) {
      setForm({
        name:       client.name || '',
        cnpj:       client.cnpj || '',
        level:      client.level || 'Standard',
        regime:     client.regime || 'Simples Nacional',
        tipo:       client.tipo || 'Serviço',
        hasEmployees:  client.hasEmployees ?? false,
        hasProLabore:  client.hasProLabore ?? false,
        active:        client.active ?? true,
        mapFiscal:     client.mapFiscal ?? true,
        mapNps:        client.mapNps ?? true,
        mapOnboarding: client.mapOnboarding ?? false,
        cxStatus:   client.cxStatus || 'cliente_novo',
        notes:      client.notes || '',
        entryDate:  client.entryDate || '',
        dpServices: {
          adiantamentoFolha: client.dpServices?.adiantamentoFolha ?? false,
          folha:             client.dpServices?.folha ?? false,
          proLabore:         client.dpServices?.proLabore ?? false,
          autonomoSal:       client.dpServices?.autonomoSal ?? false,
          semMovimentacao:   client.dpServices?.semMovimentacao ?? false,
        },
        dpServicesHistory: client.dpServicesHistory ?? [],
      })
    } else {
      setForm(EMPTY)
    }
    setErrors({})
    setActiveTab('geral')
    setEditingEntry(null)
  }, [client])

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }))
  }

  function setDp(key, value) {
    setForm(prev => ({ ...prev, dpServices: { ...prev.dpServices, [key]: value } }))
  }

  // ── Regras automáticas de serviços DP ─────────────────────────────────────

  function applyDpRules(current, key, value) {
    let s = { ...current, [key]: value }
    if (key === 'semMovimentacao' && value) {
      return { ...EMPTY_DP, semMovimentacao: true }
    }
    if (key !== 'semMovimentacao' && value) {
      s.semMovimentacao = false
    }
    if (key === 'folha') {
      if (value) {
        s.envioFolha = true
        s.inss = true
        s.fgts = true
        s.det = true
      } else {
        s.envioFolha = false
        s.fgts = false
        s.det = false
        if (!s.proLabore) s.inss = false
      }
    }
    if (key === 'proLabore') {
      if (value) { s.inss = true }
      else if (!s.folha) { s.inss = false }
    }
    return s
  }

  // ── Histórico ──────────────────────────────────────────────────────────────

  function startNewEntry() {
    const history = form.dpServicesHistory ?? []
    const sorted = [...history].sort((a, b) => a.yearMonth.localeCompare(b.yearMonth))
    const lastServices = sorted.length > 0 ? { ...sorted[sorted.length - 1].services } : { ...EMPTY_DP }
    setEditingEntry({ yearMonth: nowYM(), services: lastServices })
  }

  function startEditEntry(entry) {
    setEditingEntry({ ...entry, services: { ...entry.services } })
  }

  function saveEntry() {
    if (!editingEntry?.yearMonth) return
    setForm(prev => {
      const history = (prev.dpServicesHistory ?? []).filter(h => h.yearMonth !== editingEntry.yearMonth)
      return {
        ...prev,
        dpServicesHistory: [...history, { yearMonth: editingEntry.yearMonth, services: editingEntry.services }]
          .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth)),
      }
    })
    setEditingEntry(null)
  }

  function removeEntry(ym) {
    setForm(prev => ({
      ...prev,
      dpServicesHistory: (prev.dpServicesHistory ?? []).filter(h => h.yearMonth !== ym),
    }))
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Campo obrigatório'
    if (!form.cnpj.trim()) e.cnpj = 'Campo obrigatório'
    else if (form.cnpj.replace(/\D/g, '').length < 11) e.cnpj = 'CNPJ/CPF inválido'
    return e
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); setActiveTab('geral'); return }
    onSave({ ...form })
  }

  const tabs = [
    { id: 'geral', label: 'Geral',          icon: Building2 },
    { id: 'dp',    label: 'Depto. Pessoal', icon: Users },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-brand-400" />
            <h2 className="text-base font-semibold text-gray-900">
              {client ? 'Editar Empresa' : 'Nova Empresa'}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6 gap-1">
          {tabs.map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors relative"
                style={{ color: active ? '#f39200' : '#9ca3af' }}
              >
                <Icon size={14} />
                {tab.label}
                {tab.id === 'dp' && (form.dpServicesHistory ?? []).length > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-brand-500/20 text-brand-500 text-[9px] font-bold">
                    {form.dpServicesHistory.length}
                  </span>
                )}
                {active && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t" style={{ background: '#f39200' }} />
                )}
              </button>
            )
          })}
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto scrollbar-thin flex-1">

          {/* Aba Geral */}
          {activeTab === 'geral' && (
            <div className="px-6 py-5 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label text="Razão Social *" />
                <Input value={form.name} onChange={v => set('name', v)} placeholder="Ex: Tech Solutions Brasil Ltda" error={errors.name} />
              </div>
              <div>
                <Label text="CNPJ / CPF *" />
                <Input value={form.cnpj} onChange={v => set('cnpj', applyCnpjMask(v))} placeholder="00.000.000/0001-00" error={errors.cnpj} />
              </div>
              <div>
                <Label text="Nível" />
                <Select value={form.level} onChange={v => set('level', v)}>
                  {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </Select>
              </div>
              <div>
                <Label text="Regime Tributário" />
                <Select value={form.regime} onChange={v => set('regime', v)}>
                  {REGIMES.map(r => <option key={r} value={r}>{r}</option>)}
                </Select>
              </div>
              <div>
                <Label text="Tipo de Atividade" />
                <Select value={form.tipo} onChange={v => set('tipo', v)}>
                  {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                </Select>
              </div>
              <div>
                <Label text="Data de Entrada no Escritório" />
                <input
                  type="date"
                  value={form.entryDate}
                  onChange={e => set('entryDate', e.target.value)}
                  className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-brand-500/60 transition-colors"
                />
                <p className="text-[11px] text-gray-400 mt-1">O Kanban Fiscal só exibirá esta empresa a partir deste mês.</p>
              </div>
              <div className="col-span-2 grid grid-cols-2 gap-3">
                <Toggle label="Tem funcionários (CLT)" checked={form.hasEmployees} onChange={v => set('hasEmployees', v)} />
                <Toggle label="Tem pró-labore" checked={form.hasProLabore} onChange={v => set('hasProLabore', v)} />
              </div>
              <div className="col-span-2">
                <Toggle label="Empresa ativa" checked={form.active} onChange={v => set('active', v)} danger={!form.active} />
                {!form.active && <p className="text-xs text-red-400 mt-1.5">Empresa desativada — não aparecerá em nenhum módulo do sistema.</p>}
              </div>
              <div className="col-span-2">
                <Label text="Mapear nos módulos" />
                <div className="grid grid-cols-3 gap-3">
                  <Toggle label="Gestão Fiscal"  checked={form.mapFiscal}     onChange={v => set('mapFiscal', v)} />
                  <Toggle label="NPS"            checked={form.mapNps}        onChange={v => set('mapNps', v)} />
                  <Toggle label="Onboarding"     checked={form.mapOnboarding} onChange={v => set('mapOnboarding', v)} />
                </div>
              </div>
              <div className="col-span-2">
                <Label text="Status CX" />
                <Select value={form.cxStatus} onChange={v => set('cxStatus', v)}>
                  {CX_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </Select>
              </div>
              <div className="col-span-2">
                <Label text="Observações" />
                <textarea
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  rows={3}
                  placeholder="Notas internas sobre o cliente..."
                  className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-500/60 resize-none scrollbar-thin"
                />
              </div>
            </div>
          )}

          {/* Aba Depto. Pessoal */}
          {activeTab === 'dp' && (
            <div className="px-6 py-5 flex flex-col gap-4">

              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Histórico de Serviços</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Cada entrada vale a partir daquele mês até a próxima. O checklist usa sempre a configuração mais recente anterior ao mês visualizado.
                  </p>
                </div>
                {!editingEntry && (
                  <button
                    type="button"
                    onClick={startNewEntry}
                    className="flex items-center gap-1 text-xs text-brand-500 hover:text-brand-400 font-semibold transition-colors flex-shrink-0 ml-3"
                  >
                    <Plus size={12} /> Novo registro
                  </button>
                )}
              </div>

              {/* Formulário de nova entrada / edição */}
              {editingEntry && (
                <div className="p-4 bg-brand-50 border border-brand-200 rounded-xl flex flex-col gap-3">
                  <div>
                    <Label text="A partir de qual mês?" />
                    <input
                      type="month"
                      value={editingEntry.yearMonth}
                      onChange={e => setEditingEntry(prev => ({ ...prev, yearMonth: e.target.value }))}
                      className="w-48 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-brand-500/60 transition-colors"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {DP_SERVICES.map(svc => {
                      const semMov = editingEntry.services?.semMovimentacao ?? false
                      const disabled = semMov && svc.key !== 'semMovimentacao'
                      return (
                        <label
                          key={svc.key}
                          className={`flex items-center gap-2.5 p-2.5 bg-white border rounded-lg select-none transition-colors ${
                            disabled ? 'opacity-40 cursor-not-allowed border-gray-100' : 'cursor-pointer hover:border-gray-300 border-gray-200'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={editingEntry.services?.[svc.key] ?? false}
                            disabled={disabled}
                            onChange={e => setEditingEntry(prev => ({
                              ...prev,
                              services: applyDpRules(prev.services, svc.key, e.target.checked),
                            }))}
                            className="w-4 h-4 accent-brand-500 flex-shrink-0"
                          />
                          <span className="text-sm text-gray-700">{svc.label}</span>
                        </label>
                      )
                    })}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={saveEntry}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-brand-500 hover:bg-brand-400 text-gray-900 transition-all"
                    >
                      <Check size={14} /> Salvar
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingEntry(null)}
                      className="px-4 py-2 rounded-lg text-sm border border-gray-200 text-gray-500 hover:text-gray-700 transition-all"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Timeline cronológica */}
              {(() => {
                const sorted = [...(form.dpServicesHistory ?? [])].sort((a, b) => a.yearMonth.localeCompare(b.yearMonth))
                if (sorted.length === 0 && !editingEntry) {
                  return (
                    <div className="flex flex-col items-center py-8 gap-2 text-gray-400">
                      <p className="text-sm">Nenhum registro ainda.</p>
                      <p className="text-xs">Clique em "Novo registro" para definir os serviços desta empresa.</p>
                    </div>
                  )
                }
                return (
                  <div className="flex flex-col gap-0">
                    {sorted.map((entry, idx) => {
                      const labels = activeLabels(entry.services)
                      const isLast = idx === sorted.length - 1
                      const nextYM = isLast ? null : sorted[idx + 1].yearMonth
                      const isEditing = editingEntry?.yearMonth === entry.yearMonth
                      return (
                        <div key={entry.yearMonth} className="flex gap-3">
                          {/* Linha do tempo */}
                          <div className="flex flex-col items-center flex-shrink-0 w-5">
                            <div className="w-2.5 h-2.5 rounded-full border-2 mt-3 flex-shrink-0"
                              style={{ borderColor: isLast ? '#f39200' : '#d1d5db', background: isLast ? '#f39200' : '#fff' }} />
                            {!isLast && <div className="w-px flex-1 bg-gray-200 my-1" />}
                          </div>
                          {/* Card */}
                          <div className={`flex-1 mb-2 p-3 rounded-lg border ${isEditing ? 'border-brand-300 bg-brand-50' : 'border-gray-200 bg-gray-50'}`}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-semibold text-gray-800">{formatYM(entry.yearMonth)}</p>
                                  {isLast
                                    ? <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-brand-500/15 text-brand-600">atual</span>
                                    : <span className="text-[10px] text-gray-400">até {formatYM(nextYM)}</span>
                                  }
                                </div>
                                {labels.length > 0 ? (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {labels.map(l => (
                                      <span key={l} className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-600 border border-brand-200">
                                        {l}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-gray-400 mt-1 italic">Sem serviços ativos</p>
                                )}
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => startEditEntry(entry)}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-brand-500 hover:bg-brand-50 transition-colors"
                                  title="Editar"
                                >
                                  <Pencil size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeEntry(entry.yearMonth)}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                  title="Remover"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-900 hover:bg-gray-100 border border-gray-200 transition-all">
              Cancelar
            </button>
            <button type="submit" className="px-5 py-2 rounded-lg text-sm font-semibold bg-brand-500 hover:bg-brand-400 text-gray-900 transition-all">
              {client ? 'Salvar alterações' : 'Cadastrar empresa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Label({ text }) {
  return <label className="block text-xs font-medium text-gray-400 mb-1">{text}</label>
}

function Input({ value, onChange, placeholder, type = 'text', error }) {
  return (
    <>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-gray-100 border rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none transition-colors ${
          error ? 'border-red-500/70 focus:border-red-500' : 'border-gray-200 focus:border-brand-500/60'
        }`}
      />
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </>
  )
}

function Toggle({ label, checked, onChange, danger = false }) {
  const trackColor = checked ? (danger ? 'bg-red-500' : 'bg-brand-500') : 'bg-gray-600'
  return (
    <label className={`flex items-center gap-3 p-3 bg-gray-100 border rounded-lg cursor-pointer hover:border-gray-300 transition-colors select-none ${danger && !checked ? 'border-red-300' : 'border-gray-200'}`}>
      <div onClick={() => onChange(!checked)} className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 relative ${trackColor}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </div>
      <span className={`text-sm ${checked ? 'text-gray-700' : 'text-gray-500'}`}>{label}</span>
    </label>
  )
}

function Select({ value, onChange, children }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-brand-500/60 transition-colors"
    >
      {children}
    </select>
  )
}
