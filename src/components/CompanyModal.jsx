import { useState, useEffect } from 'react'
import { X, Building2 } from 'lucide-react'

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

const EMPTY = {
  name: '', cnpj: '', level: 'Standard', regime: 'Simples Nacional', tipo: 'Serviço',
  hasEmployees: false, hasProLabore: false,
  active: true,
  cxStatus: 'cliente_novo', notes: '',
}

function applyCnpjMask(value) {
  const d = value.replace(/\D/g, '').slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export default function CompanyModal({ client, onSave, onClose }) {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (client) {
      setForm({
        name: client.name || '',
        cnpj: client.cnpj || '',
        level: client.level || 'Standard',
        regime: client.regime || 'Simples Nacional',
        tipo: client.tipo || 'Serviço',
        hasEmployees: client.hasEmployees ?? false,
        hasProLabore: client.hasProLabore ?? false,
        active: client.active ?? true,
        cxStatus: client.cxStatus || 'cliente_novo',
        notes: client.notes || '',
      })
    } else {
      setForm(EMPTY)
    }
    setErrors({})
  }, [client])

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }))
  }

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
    if (Object.keys(errs).length) { setErrors(errs); return }
    onSave({ ...form })
  }

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

        {/* Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto scrollbar-thin flex-1">
          <div className="px-6 py-5 grid grid-cols-2 gap-4">

            {/* Name */}
            <div className="col-span-2">
              <Label text="Razão Social *" />
              <Input
                value={form.name}
                onChange={v => set('name', v)}
                placeholder="Ex: Tech Solutions Brasil Ltda"
                error={errors.name}
              />
            </div>

            {/* CNPJ */}
            <div>
              <Label text="CNPJ / CPF *" />
              <Input
                value={form.cnpj}
                onChange={v => set('cnpj', applyCnpjMask(v))}
                placeholder="00.000.000/0001-00"
                error={errors.cnpj}
              />
            </div>

            {/* Level */}
            <div>
              <Label text="Nível" />
              <Select value={form.level} onChange={v => set('level', v)}>
                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </Select>
            </div>

            {/* Regime */}
            <div>
              <Label text="Regime Tributário" />
              <Select value={form.regime} onChange={v => set('regime', v)}>
                {REGIMES.map(r => <option key={r} value={r}>{r}</option>)}
              </Select>
            </div>

            {/* Tipo */}
            <div>
              <Label text="Tipo de Atividade" />
              <Select value={form.tipo} onChange={v => set('tipo', v)}>
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
            </div>

            {/* Funcionários + Pró-labore */}
            <div className="col-span-2 grid grid-cols-2 gap-3">
              <Toggle
                label="Tem funcionários (CLT)"
                checked={form.hasEmployees}
                onChange={v => set('hasEmployees', v)}
              />
              <Toggle
                label="Tem pró-labore"
                checked={form.hasProLabore}
                onChange={v => set('hasProLabore', v)}
              />
            </div>

            {/* Status da empresa */}
            <div className="col-span-2">
              <Toggle
                label="Empresa ativa"
                checked={form.active}
                onChange={v => set('active', v)}
                danger={!form.active}
              />
              {!form.active && (
                <p className="text-xs text-red-400 mt-1.5">
                  Empresa desativada — não aparecerá em nenhum módulo do sistema.
                </p>
              )}
            </div>

            {/* CX Status */}
            <div className="col-span-2">
              <Label text="Status CX" />
              <Select value={form.cxStatus} onChange={v => set('cxStatus', v)}>
                {CX_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
            </div>

            {/* Notes */}
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

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-900 hover:bg-gray-100 border border-gray-200 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-brand-500 hover:bg-brand-400 text-gray-900 transition-all"
            >
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
  const trackColor = checked
    ? (danger ? 'bg-red-500' : 'bg-brand-500')
    : 'bg-gray-600'
  return (
    <label className={`flex items-center gap-3 p-3 bg-gray-100 border rounded-lg cursor-pointer hover:border-gray-300 transition-colors select-none ${danger && !checked ? 'border-red-300' : 'border-gray-200'}`}>
      <div
        onClick={() => onChange(!checked)}
        className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 relative ${trackColor}`}
      >
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
