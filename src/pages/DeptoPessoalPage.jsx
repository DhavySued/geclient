import { useState, useMemo, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Users, Search, CheckCircle2, X, AlertTriangle, ListFilter, Settings2 } from 'lucide-react'
import { useClients } from '../context/ClientsContext'
import { useDpRecords } from '../context/DpRecordsContext'
import { useSettings } from '../context/SettingsContext'
import DpBatchModal from '../components/DpBatchModal'

const DP_SERVICES = [
  { key: 'adiantamentoFolha', label: 'Adiant. Folha', filterable: true },
  { key: 'folha',             label: 'Folha',          filterable: true },
  { key: 'proLabore',         label: 'Pró-Labore',     filterable: true },
  { key: 'envioFolha',        label: 'Esocial',        requiresFolha: true, filterable: true },
  { key: 'inss',              label: 'INSS',            requiresFolhaOrProLabore: true, filterable: true },
  { key: 'fgts',              label: 'FGTS',            requiresFolha: true,           filterable: true },
  { key: 'autonomoSal',       label: 'Aut./SAL',        filterable: true },
  { key: 'det',               label: 'DET',             requiresFolha: true, filterable: true },
]

function isConfigured(svc, service) {
  if (service.key === 'envioFolha') return !!svc.envioFolha || !!svc.semMovimentacao
  if (service.requiresFolhaOrProLabore) return svc.folha === true || svc.proLabore === true
  if (service.requiresFolha) return svc.folha === true
  return !!svc[service.key]
}

function getServicesForMonth(client, yearMonth) {
  const history = client.dpServicesHistory ?? []
  if (history.length === 0) return client.dpServices ?? {}
  // Pega a entrada mais recente cujo mês seja <= o mês visualizado
  const sorted = [...history].sort((a, b) => a.yearMonth.localeCompare(b.yearMonth))
  let best = null
  for (const entry of sorted) {
    if (entry.yearMonth <= yearMonth) best = entry
  }
  return best?.services ?? (client.dpServices ?? {})
}

function toYearMonth(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function formatYearMonth(ym) {
  const [year, month] = ym.split('-')
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  return `${months[parseInt(month, 10) - 1]} ${year}`
}

function addMonths(ym, delta) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return toYearMonth(d)
}

export default function DeptoPessoalPage() {
  const { clients } = useClients()
  const { getRecord, upsertRecord } = useDpRecords()
  const { settings } = useSettings()
  const [yearMonth, setYearMonth] = useState(() => settings.defaultYearMonthDp || toYearMonth(new Date()))
  const [search, setSearch]       = useState('')
  const [colFilters, setColFilters]     = useState({})
  // colFilters: { [key]: { feito: bool, pendente: bool } }
  const [openCol, setOpenCol]           = useState(null)
  const [statusFilters, setStatusFilters] = useState(new Set())
  const [hoveredRow, setHoveredRow]     = useState(null)
  const [saveError, setSaveError]       = useState('')
  const [showBatch, setShowBatch]       = useState(false)

  useEffect(() => {
    if (!saveError) return
    const t = setTimeout(() => setSaveError(''), 8000)
    return () => clearTimeout(t)
  }, [saveError])

  function updateColFilter(key, option, checked) {
    setColFilters(prev => ({
      ...prev,
      [key]: { ...(prev[key] ?? { feito: false, pendente: false }), [option]: checked },
    }))
  }

  function clearColFilter(key) {
    setColFilters(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const activeColFilters = Object.entries(colFilters).filter(([, v]) => v.feito || v.pendente)

  function toggleStatusFilter(key) {
    setStatusFilters(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  // Lógica AND — empresa precisa ter TODOS os serviços filtrados
  const filtered = useMemo(() => {
    let list = [...clients]

    // MEI só aparece se tiver Folha ou Pró-Labore configurado
    list = list.filter(c => {
      if (c.regime !== 'MEI') return true
      const svc = getServicesForMonth(c, yearMonth)
      return svc.folha === true || svc.proLabore === true
    })

    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) || (c.cnpj ?? '').includes(q)
      )
    }
    for (const [key, { feito, pendente }] of Object.entries(colFilters)) {
      if (!feito && !pendente) continue // nenhum marcado = sem filtro
      list = list.filter(c => {
        const svc     = getServicesForMonth(c, yearMonth)
        const service = DP_SERVICES.find(s => s.key === key)
        if (!service || !isConfigured(svc, service)) return false
        if (feito && pendente) return true // ambos marcados = tem o serviço configurado
        const rec  = getRecord(c.id, yearMonth) ?? {}
        const done = rec[key] === true
        return feito ? done : !done
      })
    }
    if (statusFilters.size > 0) {
      list = list.filter(c => {
        const rec = getRecord(c.id, yearMonth) ?? {}
        return statusFilters.has(rec.status ?? 'pendente')
      })
    }
    return list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }, [clients, search, colFilters, statusFilters, yearMonth, getRecord])

  const totalConfigured = useMemo(() => {
    return filtered.reduce((acc, c) => {
      const svc = getServicesForMonth(c, yearMonth)
      return acc + DP_SERVICES.filter(s => isConfigured(svc, s)).length
    }, 0)
  }, [filtered, yearMonth])

  const totalDone = useMemo(() => {
    return filtered.reduce((acc, c) => {
      const svc = getServicesForMonth(c, yearMonth)
      const rec = getRecord(c.id, yearMonth) ?? {}
      return acc + DP_SERVICES.filter(s => isConfigured(svc, s) && rec[s.key]).length
    }, 0)
  }, [filtered, yearMonth, getRecord])

  const progress = totalConfigured > 0 ? Math.round((totalDone / totalConfigured) * 100) : 0

  const stats = useMemo(() => {
    const counts = { pendente: 0, declarado: 0, enviado: 0, fechado: 0 }
    for (const c of filtered) {
      const svc = getServicesForMonth(c, yearMonth)
      const configured = DP_SERVICES.filter(s => isConfigured(svc, s))
      if (configured.length === 0) continue
      const rec = getRecord(c.id, yearMonth) ?? {}
      const status = rec.status ?? 'pendente'
      if (status in counts) counts[status]++
      else counts.pendente++
    }
    return counts
  }, [filtered, yearMonth, getRecord])

  async function toggle(clientId, field, current) {
    const newValue = !current
    const client = clients.find(c => c.id === clientId)
    const svc = client ? getServicesForMonth(client, yearMonth) : {}
    const configured = DP_SERVICES.filter(s => isConfigured(svc, s))
    const rec = getRecord(clientId, yearMonth) ?? {}
    const updatedRec = { ...rec, [field]: newValue }
    const allDone = configured.length > 0 && configured.every(s => updatedRec[s.key])

    const updates = { [field]: newValue }

    const result = await upsertRecord(clientId, yearMonth, updates)
    if (result?.error) {
      setSaveError(`Erro ao salvar: ${result.error.message ?? result.error.code ?? 'verifique o console'}`)
    }
  }

  return (
    <div className="flex flex-col gap-4 w-full">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={20} className="text-brand-400" />
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">Departamento Pessoal</h1>
            <p className="text-xs text-gray-400">Checklist mensal de serviços por empresa</p>
          </div>
        </div>
        <button
          onClick={() => setShowBatch(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border border-gray-200 bg-white hover:border-brand-300 hover:text-brand-600 text-gray-500 shadow-sm transition-all"
        >
          <Settings2 size={14} />
          Configurar em lote
        </button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { key: 'pendente',  label: 'Pendente',  bg: '#FFF1F2', border: 'rgba(252,165,165,0.50)', iconBg: 'rgba(239,68,68,0.10)',  iconBorder: 'rgba(239,68,68,0.22)',  color: '#DC2626', labelColor: '#FCA5A5' },
          { key: 'declarado', label: 'Declarado', bg: '#FEFCE8', border: 'rgba(253,224,71,0.50)',  iconBg: 'rgba(234,179,8,0.10)',  iconBorder: 'rgba(234,179,8,0.25)',  color: '#CA8A04', labelColor: '#FDE047' },
          { key: 'enviado',   label: 'Enviado',   bg: '#F5F3FF', border: 'rgba(167,139,250,0.40)', iconBg: 'rgba(124,58,237,0.08)', iconBorder: 'rgba(124,58,237,0.20)', color: '#7C3AED', labelColor: '#C4B5FD' },
          { key: 'fechado',   label: 'Fechado',   bg: '#F0FDF4', border: 'rgba(16,185,129,0.20)',  iconBg: 'rgba(16,185,129,0.12)', iconBorder: 'rgba(16,185,129,0.25)', color: '#059669', labelColor: '#6EE7B7' },
        ].map(s => (
          <div key={s.key} className="flex items-center gap-3 px-4 py-3 rounded-xl border"
            style={{ background: s.bg, borderColor: s.border }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: s.iconBg, border: `1px solid ${s.iconBorder}` }}>
              <CheckCircle2 size={16} style={{ color: s.color }} />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: s.labelColor }}>{s.label}</p>
              <p className="text-2xl font-bold leading-none mt-0.5" style={{ color: s.color }}>{stats[s.key]}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Banner de erro */}
      {saveError && (
        <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertTriangle size={15} className="flex-shrink-0 mt-0.5 text-red-500" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold">Não foi possível salvar</p>
            <p className="text-xs mt-0.5 text-red-600 font-mono break-all">{saveError}</p>
          </div>
          <button onClick={() => setSaveError('')} className="flex-shrink-0 text-red-400 hover:text-red-600">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Controles */}
      <div className="flex flex-wrap items-center gap-3">

        {/* Seletor de mês */}
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
          <button onClick={() => setYearMonth(m => addMonths(m, -1))} className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <ChevronLeft size={15} />
          </button>
          <span className="text-sm font-semibold text-gray-800 w-36 text-center select-none">
            {formatYearMonth(yearMonth)}
          </span>
          <button onClick={() => setYearMonth(m => addMonths(m, 1))} className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <ChevronRight size={15} />
          </button>
        </div>

        {/* Busca */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm flex-1 max-w-xs">
          <Search size={13} className="text-gray-400 flex-shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar empresa..."
            className="text-sm text-gray-700 placeholder-gray-400 bg-transparent outline-none w-full"
          />
        </div>

        {/* Filtros de status */}
        <div className="flex items-center gap-1.5">
          {[
            { key: 'pendente',  label: 'Pendente',  bg: '#FFF1F2', border: '#fca5a5', color: '#dc2626' },
            { key: 'declarado', label: 'Declarado', bg: '#FEFCE8', border: '#fde047', color: '#ca8a04' },
            { key: 'enviado',   label: 'Enviado',   bg: '#F5F3FF', border: '#c4b5fd', color: '#7c3aed' },
            { key: 'fechado',   label: 'Fechado',   bg: '#F0FDF4', border: '#86efac', color: '#16a34a' },
          ].map(s => {
            const active = statusFilters.has(s.key)
            return (
              <button
                key={s.key}
                onClick={() => toggleStatusFilter(s.key)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all"
                style={active
                  ? { background: s.bg, borderColor: s.border, color: s.color }
                  : { background: '#fff', borderColor: '#e5e7eb', color: '#9ca3af' }
                }
              >
                {s.label}
              </button>
            )
          })}
        </div>

        {/* Filtros de coluna ativos — indicador + limpar */}
        {activeColFilters.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs font-medium text-brand-500">
              <ListFilter size={12} />
              {activeColFilters.length} coluna{activeColFilters.length > 1 ? 's' : ''} filtrada{activeColFilters.length > 1 ? 's' : ''}
              <span className="text-gray-400">·</span>
              <span className="text-gray-500">{filtered.length} empresa{filtered.length !== 1 ? 's' : ''}</span>
            </span>
            <button
              onClick={() => setColFilters({})}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 border border-gray-200 transition-all"
            >
              <X size={10} /> Limpar filtros
            </button>
          </div>
        )}

        {/* Progresso */}
        {totalConfigured > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-gray-400">{totalDone}/{totalConfigured}</span>
            <div className="w-28 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{
                width: `${progress}%`,
                background: progress === 100 ? 'linear-gradient(90deg,#22c55e,#16a34a)' : 'linear-gradient(90deg,#f39200,#d97d00)',
              }} />
            </div>
            <span className="text-sm font-bold" style={{ color: progress === 100 ? '#16a34a' : '#f39200' }}>
              {progress}%
            </span>
          </div>
        )}
      </div>

      {/* Overlay para fechar dropdown de filtro */}
      {openCol && <div className="fixed inset-0 z-10" onClick={() => setOpenCol(null)} />}

      {/* Tabela */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10">
              <tr style={{ background: '#f9fafb', boxShadow: '0 1px 0 #e5e7eb' }}>
                {/* Coluna empresa */}
                <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-gray-500 border-b border-gray-100 min-w-[150px]">
                  Empresa
                </th>
                <th className="pl-3 pr-2 py-2.5 text-[11px] font-semibold text-gray-500 border-b border-gray-100 text-left whitespace-nowrap w-px">
                  CNPJ
                </th>
                <th className="px-3 py-2.5 text-[11px] font-semibold text-gray-500 border-b border-gray-100 text-center whitespace-nowrap w-px">
                  Status
                </th>

                {DP_SERVICES.map((s, colIdx) => {
                  const cf       = colFilters[s.key] ?? { feito: false, pendente: false }
                  const hasFilter = cf.feito !== cf.pendente
                  const isOpen   = openCol === s.key
                  const colZebra = colIdx % 2 === 1
                  return (
                    <th
                      key={s.key}
                      className="px-2 py-2.5 border-b border-gray-100 text-center whitespace-nowrap"
                      style={{
                        background: hasFilter ? 'rgba(243,146,0,0.10)' : colZebra ? '#f3f4f6' : '#f9fafb',
                      }}
                    >
                      {s.filterable ? (
                        <div className="relative inline-block">
                          <button
                            onClick={() => setOpenCol(isOpen ? null : s.key)}
                            className="inline-flex items-center gap-1 group"
                          >
                            <span className={`text-[11px] font-semibold transition-colors ${hasFilter ? 'text-brand-500' : 'text-gray-500 group-hover:text-gray-700'}`}>
                              {s.label}
                            </span>
                            <ListFilter
                              size={9}
                              className={`transition-colors flex-shrink-0 ${hasFilter ? 'text-brand-500' : 'text-gray-300 group-hover:text-gray-400'}`}
                            />
                          </button>
                          {isOpen && (
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1.5 min-w-[120px]">
                              {[
                                { key: 'feito',    label: 'Feito',    color: '#16a34a' },
                                { key: 'pendente', label: 'Pendente', color: '#dc2626' },
                              ].map(opt => (
                                <label
                                  key={opt.key}
                                  className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-gray-50 select-none"
                                >
                                  <input
                                    type="checkbox"
                                    checked={cf[opt.key]}
                                    onChange={e => updateColFilter(s.key, opt.key, e.target.checked)}
                                    className="accent-brand-500 w-3.5 h-3.5 cursor-pointer"
                                  />
                                  <span className="text-xs font-medium" style={{ color: opt.color }}>{opt.label}</span>
                                </label>
                              ))}
                              {(cf.feito || cf.pendente) && (
                                <div className="border-t border-gray-100 mt-1 pt-1 px-3">
                                  <button
                                    onClick={() => { clearColFilter(s.key); setOpenCol(null) }}
                                    className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
                                  >
                                    Limpar
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] font-semibold text-gray-500">{s.label}</span>
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={DP_SERVICES.length + 1} className="text-center py-12 text-gray-400 text-sm">
                    {activeColFilters.length > 0
                      ? 'Nenhuma empresa corresponde aos filtros selecionados.'
                      : 'Nenhuma empresa encontrada.'
                    }
                  </td>
                </tr>
              ) : (
                filtered.map((client, idx) => {
                  const svc      = getServicesForMonth(client, yearMonth)
                  const rec      = getRecord(client.id, yearMonth) ?? {}
                  const configured = DP_SERVICES.filter(s => isConfigured(svc, s))
                  const done       = configured.filter(s => rec[s.key]).length
                  const allDone    = configured.length > 0 && done === configured.length
                  const rowZebra   = idx % 2 === 1
                  const isHovered  = hoveredRow === client.id

                  return (
                    <tr
                      key={client.id}
                      onMouseEnter={() => setHoveredRow(client.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                      style={{
                        background: isHovered
                          ? allDone ? '#bbf7d0' : '#eff6ff'
                          : allDone ? '#dcfce7' : rowZebra ? '#f9fafb' : '#fff',
                        transition: 'background 0.1s',
                      }}
                    >
                      <td className="px-3 py-2" style={{ background: 'inherit' }}>
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-5 h-5 rounded flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0"
                            style={{ background: allDone ? '#22c55e' : 'linear-gradient(135deg,#f39200,#d97d00)' }}
                          >
                            {client.name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')}
                          </div>
                          <p className={`text-xs truncate max-w-[130px] transition-all ${isHovered ? 'font-semibold text-gray-900' : 'font-medium text-gray-800'}`} title={client.name}>
                            {client.name}
                          </p>
                        </div>
                      </td>

                      <td className="pl-3 pr-2 py-2 whitespace-nowrap w-px" style={{ background: 'inherit' }}>
                        <span className={`text-[11px] font-mono transition-colors ${isHovered ? 'text-gray-600' : 'text-gray-400'}`}>{client.cnpj ?? '—'}</span>
                      </td>

                      <td className="px-3 py-2 w-px text-center" style={{ background: 'inherit' }}>
                        {(() => {
                          const status = rec.status ?? 'pendente'
                          const STATUS_STYLES = {
                            pendente:  { bg: '#FFF1F2', border: '#fca5a5', color: '#dc2626' },
                            declarado: { bg: '#FEFCE8', border: '#fde047', color: '#ca8a04' },
                            enviado:   { bg: '#F5F3FF', border: '#c4b5fd', color: '#7c3aed' },
                            fechado:   { bg: '#F0FDF4', border: '#86efac', color: '#16a34a' },
                          }
                          const st = STATUS_STYLES[status] ?? STATUS_STYLES.pendente
                          return (
                            <select
                              value={status}
                              onChange={e => {
                                upsertRecord(client.id, yearMonth, { status: e.target.value })
                                  .then(r => { if (r?.error) setSaveError(`Erro: ${r.error.message}`) })
                              }}
                              className="text-[10px] font-semibold rounded-lg px-2 py-1 border outline-none cursor-pointer transition-all appearance-none text-center"
                              style={{ background: st.bg, borderColor: st.border, color: st.color, minWidth: 80 }}
                            >
                              <option value="pendente">Pendente</option>
                              <option value="declarado">Declarado</option>
                              <option value="enviado">Enviado</option>
                              <option value="fechado">Fechado</option>
                            </select>
                          )
                        })()}
                      </td>

                      {DP_SERVICES.map((s, colIdx) => {
                        const conf      = isConfigured(svc, s)
                        const isDone    = conf && (rec[s.key] ?? false)
                        const colZebra  = colIdx % 2 === 1
                        const cellBg    = isDone
                          ? 'rgba(34,197,94,0.22)'
                          : conf
                            ? 'rgba(239,68,68,0.10)'
                            : 'inherit'

                        if (!conf) {
                          return (
                            <td key={s.key} className="px-2 py-2 text-center" style={{ background: cellBg }}>
                              <span className="text-sm font-bold leading-none" style={{ color: '#e2e8f0' }}>—</span>
                            </td>
                          )
                        }

                        return (
                          <td key={s.key} className="px-2 py-2 text-center" style={{ background: cellBg }}>
                            <button
                              onClick={() => toggle(client.id, s.key, isDone)}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg mx-auto transition-all"
                              title={isDone ? 'Marcar como pendente' : 'Marcar como concluído'}
                            >
                              {isDone ? (
                                <span
                                  className="inline-flex items-center justify-center rounded-md transition-all"
                                  style={{ width: 22, height: 22, background: 'linear-gradient(135deg,#22c55e,#16a34a)', boxShadow: '0 2px 6px rgba(34,197,94,0.45)' }}
                                >
                                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                    <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center justify-center rounded-md transition-all"
                                  style={{ width: 22, height: 22, background: 'linear-gradient(135deg,#f87171,#dc2626)', boxShadow: '0 2px 6px rgba(239,68,68,0.40)' }}
                                >
                                  <span style={{ width: 9, height: 2, background: '#fff', borderRadius: 1, display: 'block' }} />
                                </span>
                              )}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
      </div>
      {showBatch && <DpBatchModal onClose={() => setShowBatch(false)} />}
    </div>
  )
}
