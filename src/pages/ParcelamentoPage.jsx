import { useState, useMemo, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Search, AlertTriangle, X, Settings2, Receipt, Copy, Check } from 'lucide-react'
import { useClients } from '../context/ClientsContext'
import { useParcelamento } from '../context/ParcelamentoContext'
import ParcelamentoBatchModal from '../components/ParcelamentoBatchModal'

const ORGANS = [
  { key: 'mei',            label: 'MEI' },
  { key: 'simples',        label: 'Simples' },
  { key: 'receitaFederal', label: 'Rec. Federal' },
  { key: 'pgfn',           label: 'PGFN' },
  { key: 'sefaz',          label: 'SEFAZ' },
]

const STATUS_STYLES = {
  pendente:  { bg: '#FFF1F2', border: '#fca5a5', color: '#dc2626' },
  declarado: { bg: '#FEFCE8', border: '#fde047', color: '#ca8a04' },
  enviado:   { bg: '#F5F3FF', border: '#c4b5fd', color: '#7c3aed' },
  fechado:   { bg: '#F0FDF4', border: '#86efac', color: '#16a34a' },
}

function toYearMonth(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function addMonths(ym, delta) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return toYearMonth(d)
}

function formatYearMonth(ym) {
  const [year, month] = ym.split('-')
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  return `${months[parseInt(month, 10) - 1]} ${year}`
}

function getInstallmentNumber(startMonth, yearMonth) {
  const [sy, sm] = startMonth.split('-').map(Number)
  const [cy, cm] = yearMonth.split('-').map(Number)
  return (cy - sy) * 12 + (cm - sm) + 1
}

function getOrgansForMonth(client, yearMonth) {
  const history = client.parcelamentoHistory ?? []
  if (!history.length) return client.parcelamento ?? {}
  const sorted = [...history].sort((a, b) => a.yearMonth.localeCompare(b.yearMonth))
  let best = null
  for (const entry of sorted) {
    if (entry.yearMonth <= yearMonth) best = entry
  }
  return best?.organs ?? (client.parcelamento ?? {})
}

function isOrganActive(client, organKey, yearMonth) {
  return getOrgansForMonth(client, yearMonth)?.[organKey]?.active === true
}

function hasAnyActiveOrgan(client, yearMonth) {
  return ORGANS.some(o => isOrganActive(client, o.key, yearMonth))
}

function getInstallmentLabel(client, organKey, yearMonth) {
  const cfg = getOrgansForMonth(client, yearMonth)?.[organKey]
  if (!cfg?.startMonth || !cfg?.total) return null
  const n = getInstallmentNumber(cfg.startMonth, yearMonth)
  const total = Number(cfg.total)
  if (n < 1 || n > total) return null
  return `${n}/${total}`
}

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')
}

export default function ParcelamentoPage() {
  const { clients } = useClients()
  const { getRecord, upsertRecord } = useParcelamento()

  const [yearMonth, setYearMonth]   = useState(() => toYearMonth(new Date()))
  const [search, setSearch]         = useState('')
  const [statusFilters, setStatusFilters] = useState(new Set())
  const [saveError, setSaveError]   = useState('')
  const [showBatch, setShowBatch]   = useState(false)
  const [copiedId, setCopiedId]     = useState(null)

  function toggleStatusFilter(key) {
    setStatusFilters(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const filtered = useMemo(() => {
    let list = clients.filter(c => hasAnyActiveOrgan(c, yearMonth))
    const q = search.trim().toLowerCase()
    if (q) list = list.filter(c => c.name.toLowerCase().includes(q) || (c.cnpj ?? '').includes(q))
    if (statusFilters.size > 0) {
      list = list.filter(c => {
        const rec = getRecord(c.id, yearMonth) ?? {}
        return statusFilters.has(rec.status ?? 'pendente')
      })
    }
    return list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }, [clients, search, statusFilters, yearMonth, getRecord])

  const totalConfigured = useMemo(() =>
    filtered.reduce((acc, c) => acc + ORGANS.filter(o => isOrganActive(c, o.key, yearMonth)).length, 0),
  [filtered, yearMonth])

  const totalDone = useMemo(() =>
    filtered.reduce((acc, c) => {
      const rec = getRecord(c.id, yearMonth) ?? {}
      return acc + ORGANS.filter(o => isOrganActive(c, o.key, yearMonth) && rec[o.key]).length
    }, 0),
  [filtered, yearMonth, getRecord])

  const progress = totalConfigured > 0 ? Math.round((totalDone / totalConfigured) * 100) : 0

  const stats = useMemo(() => {
    const counts = { pendente: 0, declarado: 0, enviado: 0, fechado: 0 }
    for (const c of filtered) {
      const activeOrgans = ORGANS.filter(o => isOrganActive(c, o.key, yearMonth))
      if (activeOrgans.length === 0) continue
      const rec = getRecord(c.id, yearMonth) ?? {}
      const status = rec.status ?? 'pendente'
      if (status in counts) counts[status]++
      else counts.pendente++
    }
    return counts
  }, [filtered, yearMonth, getRecord])

  async function toggle(clientId, organKey, current) {
    const newValue = !current
    const client   = clients.find(c => c.id === clientId)
    const activeOrgans = client ? ORGANS.filter(o => isOrganActive(client, o.key, yearMonth)) : []
    const rec = getRecord(clientId, yearMonth) ?? {}
    const updatedRec = { ...rec, [organKey]: newValue }
    const allDone = activeOrgans.length > 0 && activeOrgans.every(o => updatedRec[o.key])

    const updates = { [organKey]: newValue }
    if (allDone && (rec.status ?? 'pendente') !== 'fechado') updates.status = 'fechado'
    else if (!allDone && (rec.status ?? 'pendente') === 'fechado') updates.status = 'pendente'

    const result = await upsertRecord(clientId, yearMonth, updates)
    if (result?.error) {
      setSaveError(`Erro ao salvar: ${result.error.message ?? result.error.code ?? 'verifique o console'}`)
    }
  }

  function copyCnpj(client) {
    const digits = (client.cnpj ?? '').replace(/\D/g, '')
    if (!digits) return
    navigator.clipboard.writeText(digits).then(() => {
      setCopiedId(client.id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  return (
    <div className="flex flex-col gap-4 w-full">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt size={20} className="text-brand-400" />
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">Parcelamento</h1>
            <p className="text-xs text-gray-400">Checklist mensal de parcelamentos tributários</p>
          </div>
        </div>
        <button
          onClick={() => setShowBatch(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border border-gray-200 bg-white hover:border-brand-300 hover:text-brand-600 text-gray-500 shadow-sm transition-all"
        >
          <Settings2 size={14} />
          Atualizar em lote
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
              <Receipt size={16} style={{ color: s.color }} />
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

        {/* Barra de progresso */}
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

      {/* Tabela */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-auto" style={{ maxHeight: 'calc(100vh - 240px)' }}>
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10">
            <tr style={{ background: '#f9fafb', boxShadow: '0 1px 0 #e5e7eb' }}>
              <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-gray-500 border-b border-gray-100 min-w-[160px]">
                Empresa
              </th>
              <th className="pl-3 pr-2 py-2.5 text-[11px] font-semibold text-gray-500 border-b border-gray-100 text-left whitespace-nowrap w-px">
                CNPJ
              </th>
              <th className="px-3 py-2.5 text-[11px] font-semibold text-gray-500 border-b border-gray-100 text-center whitespace-nowrap w-px">
                Status
              </th>
              {ORGANS.map((o, colIdx) => (
                <th
                  key={o.key}
                  className="px-2 py-2.5 border-b border-gray-100 text-center whitespace-nowrap"
                  style={{ background: colIdx % 2 === 1 ? '#f3f4f6' : '#f9fafb' }}
                >
                  <span className="text-[11px] font-semibold text-gray-500">{o.label}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={ORGANS.length + 3} className="text-center py-12 text-gray-400 text-sm">
                  {search || statusFilters.size > 0
                    ? 'Nenhuma empresa encontrada com esses filtros.'
                    : 'Nenhuma empresa com parcelamento configurado.'}
                </td>
              </tr>
            ) : filtered.map((client, idx) => {
              const rec          = getRecord(client.id, yearMonth) ?? {}
              const activeOrgans = ORGANS.filter(o => isOrganActive(client, o.key, yearMonth))
              const done         = activeOrgans.filter(o => rec[o.key]).length
              const allDone      = activeOrgans.length > 0 && done === activeOrgans.length
              const rowZebra     = idx % 2 === 1
              const status       = rec.status ?? 'pendente'
              const st           = STATUS_STYLES[status] ?? STATUS_STYLES.pendente

              return (
                <tr
                  key={client.id}
                  style={{ background: allDone ? '#dcfce7' : rowZebra ? '#f9fafb' : '#fff' }}
                >
                  {/* Empresa */}
                  <td className="px-3 py-2" style={{ background: 'inherit' }}>
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-5 h-5 rounded flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0"
                        style={{ background: allDone ? '#22c55e' : 'linear-gradient(135deg,#f39200,#d97d00)' }}
                      >
                        {initials(client.name)}
                      </div>
                      <p className="text-xs font-medium text-gray-800 truncate max-w-[130px]" title={client.name}>
                        {client.name}
                      </p>
                    </div>
                  </td>

                  {/* CNPJ com botão de copiar */}
                  <td className="pl-3 pr-2 py-2 whitespace-nowrap w-px" style={{ background: 'inherit' }}>
                    <div className="flex items-center gap-1.5 group/cnpj">
                      <span className="text-[11px] font-mono text-gray-400">{client.cnpj ?? '—'}</span>
                      {client.cnpj && (
                        <button
                          onClick={() => copyCnpj(client)}
                          title="Copiar CNPJ (só números)"
                          className="opacity-0 group-hover/cnpj:opacity-100 transition-opacity p-0.5 rounded text-gray-300 hover:text-brand-500"
                        >
                          {copiedId === client.id
                            ? <Check size={11} className="text-green-500" />
                            : <Copy size={11} />
                          }
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-3 py-2 w-px text-center" style={{ background: 'inherit' }}>
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
                  </td>

                  {/* Órgãos */}
                  {ORGANS.map((organ, colIdx) => {
                    const active  = isOrganActive(client, organ.key, yearMonth)
                    const isDone  = active && (rec[organ.key] ?? false)
                    const label   = active ? getInstallmentLabel(client, organ.key, yearMonth) : null
                    const cellBg  = isDone
                      ? 'rgba(34,197,94,0.22)'
                      : active
                        ? 'rgba(239,68,68,0.10)'
                        : 'inherit'

                    if (!active) {
                      return (
                        <td key={organ.key} className="px-2 py-2 text-center" style={{ background: cellBg }}>
                          <span className="text-sm font-bold leading-none" style={{ color: '#e2e8f0' }}>—</span>
                        </td>
                      )
                    }

                    return (
                      <td key={organ.key} className="px-2 py-2 text-center" style={{ background: cellBg }}>
                        <div className="flex flex-col items-center gap-0.5">
                          <button
                            onClick={() => toggle(client.id, organ.key, isDone)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg mx-auto transition-all"
                            title={isDone ? 'Marcar como pendente' : 'Marcar como verificado'}
                          >
                            {isDone ? (
                              <span
                                className="inline-flex items-center justify-center rounded-md"
                                style={{ width: 22, height: 22, background: 'linear-gradient(135deg,#22c55e,#16a34a)', boxShadow: '0 2px 6px rgba(34,197,94,0.45)' }}
                              >
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                  <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center justify-center rounded-md"
                                style={{ width: 22, height: 22, background: 'linear-gradient(135deg,#f87171,#dc2626)', boxShadow: '0 2px 6px rgba(239,68,68,0.40)' }}
                              >
                                <span style={{ width: 9, height: 2, background: '#fff', borderRadius: 1, display: 'block' }} />
                              </span>
                            )}
                          </button>
                          {label && (
                            <span className="text-[9px] font-semibold" style={{ color: isDone ? '#16a34a' : '#dc2626' }}>
                              {label}
                            </span>
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showBatch && (
        <ParcelamentoBatchModal
          initialYearMonth={yearMonth}
          onClose={() => setShowBatch(false)}
        />
      )}
    </div>
  )
}
