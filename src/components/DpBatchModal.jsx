import { useState, useMemo } from 'react'
import { X, Search, Check, Loader2, CheckCircle2, Circle } from 'lucide-react'
import { useClients } from '../context/ClientsContext'

const DP_COLS = [
  { key: 'adiantamentoFolha', label: 'Adiant.\nFolha' },
  { key: 'folha',             label: 'Folha' },
  { key: 'proLabore',         label: 'Pró-\nLabore' },
  { key: 'envioFolha',        label: 'Envio\nFolha' },
  { key: 'inss',              label: 'INSS' },
  { key: 'fgts',              label: 'FGTS' },
  { key: 'autonomoSal',       label: 'Aut./\nSAL' },
  { key: 'semMovimentacao',   label: 'Sem\nMov.' },
  { key: 'det',               label: 'DET' },
]

const EMPTY = {
  adiantamentoFolha: false, folha: false, proLabore: false,
  envioFolha: false, inss: false, fgts: false,
  autonomoSal: false, semMovimentacao: false, det: false,
}

function nowYM() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatYM(ym) {
  const [y, m] = ym.split('-')
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  return `${months[parseInt(m,10)-1]} / ${y}`
}

function getServicesForMonth(client, yearMonth) {
  const history = client.dpServicesHistory ?? []
  if (!history.length) return { ...(client.dpServices ?? {}) }
  const sorted = [...history].sort((a, b) => a.yearMonth.localeCompare(b.yearMonth))
  let best = null
  for (const e of sorted) { if (e.yearMonth <= yearMonth) best = e }
  return { ...(best?.services ?? client.dpServices ?? {}) }
}

function applyRules(current, key, value) {
  let s = { ...current, [key]: value }
  if (key === 'semMovimentacao' && value) return { ...EMPTY, semMovimentacao: true }
  if (key !== 'semMovimentacao' && value) s.semMovimentacao = false
  if (key === 'folha') {
    if (value) { s.envioFolha = true; s.inss = true; s.fgts = true; s.det = true }
    else { s.envioFolha = false; s.fgts = false; s.det = false; if (!s.proLabore) s.inss = false }
  }
  if (key === 'proLabore') {
    if (value) { s.inss = true }
    else if (!s.folha) { s.inss = false }
  }
  return s
}

export default function DpBatchModal({ onClose }) {
  const { clients, updateClient } = useClients()

  const [yearMonth, setYearMonth] = useState(nowYM)
  const [search, setSearch]       = useState('')
  const [saving, setSaving]       = useState(false)
  const [done, setDone]           = useState(false)

  const sortedClients = useMemo(() =>
    [...clients].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
  [clients])

  // draft: { [clientId]: { key: bool } }
  const [draft, setDraft] = useState(() => {
    const d = {}
    for (const c of clients) d[c.id] = getServicesForMonth(c, nowYM())
    return d
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? sortedClients.filter(c => c.name.toLowerCase().includes(q) || (c.cnpj ?? '').includes(q)) : sortedClients
  }, [sortedClients, search])

  // Quando muda o mês, recarrega o draft com a config daquele mês
  function handleMonthChange(ym) {
    setYearMonth(ym)
    const d = {}
    for (const c of clients) d[c.id] = getServicesForMonth(c, ym)
    setDraft(d)
  }

  function toggle(clientId, key) {
    setDraft(prev => {
      const current = prev[clientId] ?? { ...EMPTY }
      return { ...prev, [clientId]: applyRules(current, key, !(current[key] ?? false)) }
    })
  }

  async function handleSave() {
    setSaving(true)
    for (const client of clients) {
      const services = draft[client.id] ?? { ...EMPTY }
      const history  = (client.dpServicesHistory ?? []).filter(h => h.yearMonth !== yearMonth)
      const newHist  = [...history, { yearMonth, services }].sort((a, b) => a.yearMonth.localeCompare(b.yearMonth))
      await updateClient(client.id, { dpServicesHistory: newHist })
    }
    setSaving(false)
    setDone(true)
    setTimeout(onClose, 800)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={!saving ? onClose : undefined} />
      <div className="relative w-full max-w-5xl bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Configurar serviços em lote</h2>
              <p className="text-xs text-gray-400 mt-0.5">Marque os serviços de cada empresa. Salva tudo de uma vez no histórico.</p>
            </div>
          </div>
          {!saving && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
              <X size={17} />
            </button>
          )}
        </div>

        {/* Mês + busca */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-100 flex-shrink-0 bg-gray-50">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Histórico de:</label>
            <input
              type="month"
              value={yearMonth}
              onChange={e => handleMonthChange(e.target.value)}
              className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-brand-500/60 transition-colors"
            />
            <span className="text-xs text-gray-400">{formatYM(yearMonth)}</span>
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 flex-1 max-w-xs ml-auto">
            <Search size={12} className="text-gray-400 flex-shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar empresa..."
              className="text-sm text-gray-700 placeholder-gray-400 bg-transparent outline-none w-full"
            />
          </div>
        </div>

        {/* Tabela */}
        <div className="flex-1 overflow-auto scrollbar-thin">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider min-w-[200px] sticky left-0 bg-gray-50 z-10">
                  Empresa
                </th>
                {DP_COLS.map(col => (
                  <th key={col.key} className="px-3 py-3 text-center text-[10px] font-semibold text-gray-500 uppercase tracking-wider whitespace-pre-line leading-tight" style={{ minWidth: 58 }}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={DP_COLS.length + 1} className="py-12 text-center text-sm text-gray-400">
                    Nenhuma empresa encontrada.
                  </td>
                </tr>
              ) : filtered.map((client, idx) => {
                const svc    = draft[client.id] ?? { ...EMPTY }
                const semMov = svc.semMovimentacao ?? false
                const zebra  = idx % 2 === 1
                return (
                  <tr key={client.id} style={{ background: zebra ? '#f9fafb' : '#fff' }}>
                    <td className="px-5 py-2.5" style={{ background: 'inherit' }}>
                      <p className="text-[13px] font-medium text-gray-800 truncate max-w-[190px]" title={client.name}>
                        {client.name}
                      </p>
                    </td>
                    {DP_COLS.map(col => {
                      const checked = svc[col.key] ?? false
                      const blocked = semMov && col.key !== 'semMovimentacao'
                      return (
                        <td key={col.key} className="px-2 py-2.5 text-center" style={{ background: 'inherit' }}>
                          <button
                            onClick={() => !blocked && toggle(client.id, col.key)}
                            disabled={blocked}
                            className="group/cell inline-flex items-center justify-center w-8 h-8 mx-auto rounded-lg transition-all"
                            style={blocked ? { opacity: 0.18, cursor: 'default' } : { cursor: 'pointer' }}
                          >
                            {checked ? (
                              <CheckCircle2 size={18} style={{ color: '#22c55e' }} />
                            ) : (
                              <span
                                className="text-sm font-bold leading-none transition-colors"
                                style={{ color: '#cbd5e1' }}
                                onMouseEnter={e => { if (!blocked) e.currentTarget.style.color = '#f39200' }}
                                onMouseLeave={e => { e.currentTarget.style.color = '#cbd5e1' }}
                              >
                                —
                              </span>
                            )}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
          <p className="text-xs text-gray-400">
            {clients.length} empresa{clients.length !== 1 ? 's' : ''} · Salva como histórico de {formatYM(yearMonth)}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-900 hover:bg-gray-100 border border-gray-200 transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || done}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-brand-500 hover:bg-brand-400 text-gray-900 transition-all disabled:opacity-60"
            >
              {done
                ? <><Check size={14} /> Salvo!</>
                : saving
                  ? <><Loader2 size={14} className="animate-spin" /> Salvando...</>
                  : 'Salvar histórico'
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
