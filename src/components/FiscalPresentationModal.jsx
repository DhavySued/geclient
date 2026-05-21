import { useState, useMemo } from 'react'
import { X, Search, Monitor, CheckCircle2, XCircle } from 'lucide-react'
import { useClients } from '../context/ClientsContext'
import { useFiscalRecords } from '../context/FiscalRecordsContext'
import { useFiscalItemsCtx } from '../context/FiscalItemsContext'
import { useFiscalConfig } from '../context/FiscalConfigContext'
import { getApplicableItems, calcFiscalScore } from '../hooks/useFiscalItems'

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const MONTHS_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const STATUS_CFG = {
  sem_consulta:       { label: 'Sem Consulta',        color: '#6B7280', bg: 'rgba(107,114,128,0.10)' },
  com_pendencia:      { label: 'Com Pendência',        color: '#EF4444', bg: 'rgba(239,68,68,0.10)' },
  comunicado_cliente: { label: 'Comunicado ao Cliente', color: '#3B82F6', bg: 'rgba(59,130,246,0.10)' },
  em_regularizacao:   { label: 'Em Regularização',    color: '#A855F7', bg: 'rgba(168,85,247,0.10)' },
  resolvido:          { label: 'Resolvido',             color: '#14B8A6', bg: 'rgba(20,184,166,0.10)' },
  sem_pendencia:      { label: 'Sem Pendência',        color: '#10B981', bg: 'rgba(16,185,129,0.10)' },
}
const DEFAULT_STATUS_CFG = { label: '—', color: '#9CA3AF', bg: 'rgba(156,163,175,0.08)' }

function scoreColor(s) {
  if (s === null) return '#D1D5DB'
  if (s >= 80) return '#10B981'
  if (s >= 55) return '#f39200'
  if (s >= 30) return '#F97316'
  return '#EF4444'
}

function getLast3Months() {
  const now = new Date()
  const months = []
  for (let i = 2; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return months
}

function monthLabel(str) {
  const m = parseInt(str.split('-')[1], 10) - 1
  return MONTHS_PT[m]
}

function monthFull(str) {
  const [y, m] = str.split('-')
  return `${MONTHS_FULL[parseInt(m, 10) - 1]} de ${y}`
}

function currentMonthStr() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// ── Score gauge (semicircle, pure SVG) ───────────────────────────────────────
function ScoreGauge({ score }) {
  const pct = score ?? 0
  const color = scoreColor(score)
  const r = 44
  const cx = 56
  const cy = 56
  const total = Math.PI * r          // half-circle arc length
  const dash = (pct / 100) * total

  return (
    <svg width={112} height={74} viewBox="0 0 112 74">
      {/* track */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth={9} strokeLinecap="round"
      />
      {/* fill */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke={color}
        strokeWidth={9}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${total}`}
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      {/* value */}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize={26} fontWeight={700} fill={color}>
        {score !== null ? score : '—'}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize={11} fill="#9CA3AF">
        / 100
      </text>
    </svg>
  )
}

export default function FiscalPresentationModal({ onClose }) {
  const { clients } = useClients()
  const { getClientHistory } = useFiscalRecords()
  const { fiscalItems } = useFiscalItemsCtx()
  const { regimeItems, conditionItems, tipoItems } = useFiscalConfig()

  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [dropOpen, setDropOpen] = useState(false)

  const fiscalClients = useMemo(
    () => clients.filter(c => c.mapFiscal !== false && c.active !== false)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })),
    [clients]
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return fiscalClients.slice(0, 25)
    return fiscalClients.filter(c =>
      c.name.toLowerCase().includes(q) || (c.cnpj ?? '').includes(q)
    ).slice(0, 25)
  }, [fiscalClients, search])

  const client = useMemo(
    () => fiscalClients.find(c => c.id === selectedId) ?? null,
    [fiscalClients, selectedId]
  )

  const applicable = useMemo(
    () => client ? getApplicableItems(client, fiscalItems, regimeItems, conditionItems, tipoItems) : [],
    [client, fiscalItems, regimeItems, conditionItems, tipoItems]
  )

  const last12 = useMemo(() => getLast3Months(), [])
  const curMonth = currentMonthStr()

  const monthData = useMemo(() => {
    if (!client) return []
    const entryMonth = client.entryDate ? client.entryDate.slice(0, 7) : null
    const hist = getClientHistory(client.id)
    const byMonth = {}
    hist.forEach(h => { byMonth[h.month] = h })
    return last12
      .filter(m => !entryMonth || m >= entryMonth)
      .map(m => {
        const rec = byMonth[m] ?? null
        const score = rec ? calcFiscalScore(rec.checks ?? {}, applicable) : null
        return { month: m, rec, score, status: rec?.status ?? null }
      })
  }, [client, getClientHistory, last12, applicable])

  const curData = useMemo(() => monthData.find(d => d.month === curMonth) ?? null, [monthData, curMonth])
  const curScore = curData?.score ?? null
  const curStatus = curData?.status ?? null
  const curRec = curData?.rec ?? null
  const statusCfg = STATUS_CFG[curStatus] ?? DEFAULT_STATUS_CFG

  const checksBreakdown = useMemo(() => {
    if (!curRec) return { ok: [], nok: [], pending: [] }
    const checks = curRec.checks ?? {}
    const ok = [], nok = [], pending = []
    applicable.forEach(item => {
      const v = checks[item.id]
      if (v === 'ok') ok.push(item)
      else if (v === 'pendente') nok.push(item)
      else pending.push(item)
    })
    return { ok, nok, pending }
  }, [curRec, applicable])

  function pickClient(c) {
    setSelectedId(c.id)
    setSearch(c.name)
    setDropOpen(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: '100%', maxWidth: 880, maxHeight: '92vh' }}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
          <div className="flex items-center gap-2">
            <Monitor size={17} style={{ color: '#f39200' }} />
            <span className="text-sm font-semibold text-gray-800">Modo Apresentação</span>
            <span className="text-xs text-gray-400 hidden sm:inline">— visão para envio ao cliente</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
            <X size={16} />
          </button>
        </div>

        {/* ── Company selector ────────────────────────────────────────────── */}
        <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setDropOpen(true) }}
              onFocus={() => setDropOpen(true)}
              onBlur={() => setTimeout(() => setDropOpen(false), 150)}
              autoFocus
              placeholder="Buscar empresa..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm border border-gray-200 focus:outline-none focus:border-orange-300 transition-colors"
            />
            {dropOpen && filtered.length > 0 && (
              <div
                className="absolute z-20 w-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg overflow-y-auto"
                style={{ maxHeight: 240 }}
              >
                {filtered.map(c => (
                  <button
                    key={c.id}
                    onMouseDown={() => pickClient(c)}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.cnpj}</p>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">{c.regime}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Content ─────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {!client ? (
            <div className="flex flex-col items-center justify-center h-52 gap-2" style={{ color: '#D1D5DB' }}>
              <Monitor size={36} />
              <p className="text-sm">Selecione uma empresa para visualizar o relatório</p>
            </div>
          ) : (
            <div className="p-6 space-y-5">

              {/* ── Company header ───────────────────────────────────────── */}
              <div className="pb-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                <h2 className="text-xl font-bold text-gray-900 leading-tight">{client.name}</h2>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                  <span className="text-sm text-gray-500">{client.cnpj}</span>
                  <span className="text-gray-200">|</span>
                  <span className="text-sm text-gray-500">{client.regime}</span>
                  {client.tipo && <>
                    <span className="text-gray-200">|</span>
                    <span className="text-sm text-gray-500">{client.tipo}</span>
                  </>}
                  {client.hasEmployees && <>
                    <span className="text-gray-200">|</span>
                    <span className="text-sm text-gray-500">Com funcionários</span>
                  </>}
                  {client.hasProLabore && <>
                    <span className="text-gray-200">|</span>
                    <span className="text-sm text-gray-500">Pró-labore</span>
                  </>}
                </div>
                {client.emExclusaoSimples && (
                  <div
                    className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                    style={{ background: 'rgba(239,68,68,0.08)', color: '#DC2626', border: '1px solid rgba(239,68,68,0.22)' }}
                  >
                    ⚠ Em processo de Exclusão do Simples
                  </div>
                )}
              </div>

              {/* ── Score + Status ───────────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-4">
                {/* Score gauge */}
                <div
                  className="rounded-2xl p-5 flex flex-col items-center justify-center gap-1"
                  style={{ border: '1px solid rgba(0,0,0,0.08)' }}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 self-start mb-1">
                    Saúde fiscal da empresa — {monthFull(curMonth)}
                  </p>
                  <ScoreGauge score={curScore} />
                  {curScore !== null && (
                    <div className="w-full mt-1">
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.06)' }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${curScore}%`, background: scoreColor(curScore), transition: 'width 0.6s ease' }}
                        />
                      </div>
                    </div>
                  )}
                  {curScore === null && (
                    <p className="text-xs text-gray-400 mt-1">Sem dados para este mês</p>
                  )}
                </div>

                {/* Status atual */}
                <div
                  className="rounded-2xl p-5"
                  style={{ border: '1px solid rgba(0,0,0,0.08)', background: statusCfg.bg }}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
                    Status Atual
                  </p>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: statusCfg.color }} />
                    <p className="text-base font-bold" style={{ color: statusCfg.color }}>
                      {statusCfg.label}
                    </p>
                  </div>
                  {curRec?.note ? (
                    <p className="text-sm text-gray-600 leading-relaxed"
                      style={{ borderLeft: `3px solid ${statusCfg.color}20`, paddingLeft: 10 }}>
                      {curRec.note}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400">Sem observações registradas</p>
                  )}
                </div>
              </div>

              {/* ── Score history chart ──────────────────────────────────── */}
              <div className="rounded-2xl p-5" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
                <p className="text-[15px] font-semibold uppercase tracking-wider text-gray-400 mb-5">
                  Evolução — Últimos 3 Meses
                </p>

                {/* Bars */}
                <div className="flex items-end gap-1.5" style={{ height: 110 }}>
                  {monthData.map(({ month, score, status }) => {
                    const sc = STATUS_CFG[status] ?? DEFAULT_STATUS_CFG
                    const barH = score !== null ? Math.max(Math.round((score / 100) * 80), 3) : 3
                    const color = scoreColor(score)
                    const isCur = month === curMonth

                    return (
                      <div key={month} className="flex-1 flex flex-col items-center gap-0.5" title={`${monthFull(month)}: ${score !== null ? `${score}/100` : 'sem dados'}${status ? ` · ${sc.label}` : ''}`}>
                        {/* score label */}
                        <span className="text-[25px] font-bold leading-none" style={{ color: score !== null ? color : '#E5E7EB' }}>
                          {score !== null ? score : ''}
                        </span>
                        {/* bar wrapper */}
                        <div className="w-full flex flex-col justify-end" style={{ height: 80 }}>
                          <div
                            className="w-full rounded-t"
                            style={{
                              height: barH,
                              background: score !== null ? color : '#F3F4F6',
                              outline: isCur ? `2px solid ${color}` : 'none',
                              outlineOffset: 1,
                            }}
                          />
                        </div>
                        {/* month label */}
                        <span className="text-[16px] leading-none" style={{ color: isCur ? '#374151' : '#9CA3AF', fontWeight: isCur ? 700 : 400 }}>
                          {monthLabel(month)}
                        </span>
                        {/* status dot */}
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: status ? sc.color : 'transparent' }}
                          title={sc.label}
                        />
                      </div>
                    )
                  })}
                </div>

                {/* Status legend */}
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 pt-3" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                  {Object.entries(STATUS_CFG).map(([, cfg]) => (
                    <div key={cfg.label} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.color }} />
                      <span className="text-[14px] text-gray-500">{cfg.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Checklist obrigações ─────────────────────────────────── */}
              {applicable.length > 0 && (
                <div className="rounded-2xl p-5" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-4">
                    Obrigações — {monthFull(curMonth)}
                  </p>
                  <div className="grid grid-cols-2 gap-5">

                    {/* Em dia */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-2.5">
                        <CheckCircle2 size={14} style={{ color: '#10B981' }} />
                        <span className="text-[15px] font-semibold" style={{ color: '#059669' }}>
                          Em dia ({checksBreakdown.ok.length})
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {checksBreakdown.ok.length === 0
                          ? <p className="text-[15px] text-gray-300">—</p>
                          : checksBreakdown.ok.map(item => (
                            <div key={item.id} className="flex items-center gap-1.5">
                              <span className="text-[15px]" style={{ color: '#10B981' }}>✓</span>
                              <span className="text-[15px] text-gray-700">{item.label}</span>
                            </div>
                          ))
                        }
                      </div>
                    </div>

                    {/* Com problema */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-2.5">
                        <XCircle size={14} style={{ color: '#EF4444' }} />
                        <span className="text-[15px] font-semibold" style={{ color: '#DC2626' }}>
                          Com problema ({checksBreakdown.nok.length})
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {checksBreakdown.nok.length === 0
                          ? <p className="text-[15px] text-gray-300">—</p>
                          : checksBreakdown.nok.map(item => (
                            <div key={item.id} className="flex items-center gap-1.5">
                              <span className="text-[15px]" style={{ color: '#EF4444' }}>✗</span>
                              <span className="text-[15px] text-gray-700">{item.label}</span>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  )
}
