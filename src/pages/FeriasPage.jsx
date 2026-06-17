import { useState, useMemo } from 'react'
import { Umbrella, Search, X, Building2, CalendarDays } from 'lucide-react'
import { useClients } from '../context/ClientsContext'
import { useFeriasRecords } from '../context/FeriasRecordsContext'
import FeriasModal from '../components/FeriasModal'

function formatCnpj(cnpj = '') {
  const d = cnpj.replace(/\D/g, '')
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  return cnpj
}

function fmtDate(iso) {
  if (!iso) return null
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

const REGIME_LABELS = {
  MEI:                  'MEI',
  'Simples Nacional':   'Simples Nacional',
  'Lucro Presumido':    'Lucro Presumido',
  'Lucro Real':         'Lucro Real',
  'Lucro Arbitrado':    'Lucro Arbitrado',
}

const REGIME_STYLES = {
  MEI:                  { bg: '#F0FDF4', border: '#86efac', color: '#16a34a' },
  'Simples Nacional':   { bg: '#EFF6FF', border: '#93c5fd', color: '#1d4ed8' },
  'Lucro Presumido':    { bg: '#FFF7ED', border: '#fdba74', color: '#c2410c' },
  'Lucro Real':         { bg: '#FDF4FF', border: '#d8b4fe', color: '#7c3aed' },
  'Lucro Arbitrado':    { bg: '#FFF1F2', border: '#fca5a5', color: '#dc2626' },
}

function RegimeBadge({ regime }) {
  const st = REGIME_STYLES[regime] ?? { bg: '#F1F5F9', border: '#cbd5e1', color: '#475569' }
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap"
      style={{ background: st.bg, borderColor: st.border, color: st.color }}
    >
      {REGIME_LABELS[regime] ?? regime ?? '—'}
    </span>
  )
}

export default function FeriasPage() {
  const { clients }      = useClients()
  const { getRecords }   = useFeriasRecords()
  const [search, setSearch]         = useState('')
  const [selectedClient, setSelectedClient] = useState(null)
  const [hoveredRow, setHoveredRow] = useState(null)

  const filtered = useMemo(() => {
    const list = clients.filter(c => c.hasEmployees === true)
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter(c =>
      c.name.toLowerCase().includes(q) || (c.cnpj ?? '').includes(q)
    )
  }, [clients, search])

  return (
    <>
      <div className="flex flex-col gap-4 w-full">

        {/* Cabeçalho */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #00236a 0%, #001a52 100%)' }}
            >
              <Umbrella size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-[18px] font-bold text-gray-800 leading-tight">Férias</h1>
              <p className="text-[12px] text-gray-400 mt-0.5">
                Duplo clique na empresa para abrir o histórico
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar empresa ou CNPJ…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-8 py-2 text-[13px] rounded-xl border border-gray-200 bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent w-60"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div
              className="px-3 py-2 rounded-xl text-[12px] font-semibold border"
              style={{ background: '#EFF6FF', borderColor: '#93c5fd', color: '#1d4ed8' }}
            >
              {filtered.length} empresa{filtered.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Building2 size={32} className="mb-3 text-gray-200" />
              <p className="text-sm font-medium">
                {search ? 'Nenhuma empresa encontrada' : 'Nenhuma empresa com empregados cadastrada'}
              </p>
              {search && (
                <button onClick={() => setSearch('')} className="mt-2 text-xs text-brand-500 hover:underline">
                  Limpar busca
                </button>
              )}
            </div>
          ) : (
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400 border-b border-gray-100 w-72">
                    Empresa
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400 border-b border-gray-100 w-44">
                    CNPJ
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400 border-b border-gray-100 w-44">
                    Regime
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400 border-b border-gray-100 w-40">
                    Última atualização
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400 border-b border-gray-100 w-44">
                    Próxima previsão
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((client, idx) => {
                  const recs = getRecords(client.id)
                  const latest = recs[0] ?? null
                  const nextForecast = latest?.nextForecast ?? null

                  const today0 = new Date().setHours(0,0,0,0)
                  const daysUntil = nextForecast
                    ? Math.ceil((new Date(nextForecast + 'T00:00:00') - today0) / 86400000)
                    : null
                  const daysSinceUpdate = latest?.date
                    ? Math.floor((today0 - new Date(latest.date + 'T00:00:00')) / 86400000)
                    : null

                  const isRed    = daysUntil !== null && daysUntil <= 30
                  const isYellow = daysUntil !== null && daysUntil <= 45 && !isRed
                  const isGreen  = !isRed && !isYellow && daysSinceUpdate !== null && daysSinceUpdate <= 30
                  const isBlue   = recs.length === 0
                  const isAlert  = isRed || isYellow

                  const rowBg = isRed    ? '#fee2e2'
                               : isYellow ? '#fef3c7'
                               : isGreen  ? '#dcfce7'
                               : isBlue   ? '#eff6ff'
                               : idx % 2 === 0 ? '#ffffff' : '#fafafa'
                  const borderColor = isRed ? '#f87171' : isYellow ? '#f59e0b' : isGreen ? '#22c55e' : isBlue ? '#93c5fd' : 'transparent'
                  const hoverClass  = isRed ? 'hover:bg-red-100' : isYellow ? 'hover:bg-yellow-200' : isGreen ? 'hover:bg-green-200' : isBlue ? 'hover:bg-blue-100' : 'hover:bg-blue-50'

                  const isHovered = hoveredRow === client.id

                  return (
                    <tr
                      key={client.id}
                      onDoubleClick={() => setSelectedClient(client)}
                      onMouseEnter={() => setHoveredRow(client.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                      style={{
                        background: rowBg,
                        cursor: 'pointer',
                        ...((isAlert || isGreen || isBlue) ? { borderLeft: `3px solid ${borderColor}` } : {}),
                        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
                        boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.10)' : 'none',
                        transition: 'transform 150ms ease, box-shadow 150ms ease, background 100ms ease',
                        zIndex: isHovered ? 1 : 'auto',
                        position: 'relative',
                      }}
                      className="group select-none"
                      title="Duplo clique para abrir histórico"
                    >
                      {(() => {
                        const cellBorder = isRed ? 'border-red-200' : isYellow ? 'border-amber-200' : isGreen ? 'border-green-300' : isBlue ? 'border-blue-200' : 'border-gray-50'
                        const nameColor  = isRed ? '#991b1b' : isYellow ? '#92400e' : isGreen ? '#166534' : isBlue ? '#1e3a5f' : '#1f2937'
                        const cnpjColor  = isRed ? '#b91c1c' : isYellow ? '#a16207' : isGreen ? '#15803d' : isBlue ? '#1d4ed8' : '#6b7280'
                        return (
                          <>
                            <td className={`px-5 py-3 border-b ${cellBorder}`}>
                              <span className={`font-semibold truncate block max-w-[260px] ${isGreen ? 'font-bold' : ''}`} style={{ color: nameColor }}>{client.name}</span>
                            </td>
                            <td className={`px-5 py-3 border-b ${cellBorder}`}>
                              <span className="font-mono text-[12px]" style={{ color: cnpjColor }}>{formatCnpj(client.cnpj)}</span>
                            </td>
                            <td className={`px-5 py-3 border-b ${cellBorder}`}>
                              <RegimeBadge regime={client.regime} />
                            </td>
                            <td className={`px-5 py-3 border-b ${cellBorder}`}>
                              {latest?.date ? (
                                <span className="text-[12px]" style={{ color: isGreen ? '#15803d' : '#6b7280' }}>{fmtDate(latest.date)}</span>
                              ) : (
                                <span className="text-[12px] text-gray-300">—</span>
                              )}
                            </td>
                          </>
                        )
                      })()}
                      <td className={`px-5 py-3 border-b ${isRed ? 'border-red-200' : isYellow ? 'border-amber-200' : isGreen ? 'border-green-200' : isBlue ? 'border-blue-200' : 'border-gray-50'}`}>
                        {nextForecast ? (
                          <span className="flex items-center gap-1.5 text-[12px]" style={{ color: isRed ? '#991b1b' : isYellow ? '#92400e' : '#4b5563' }}>
                            <CalendarDays size={13} style={{ color: isRed ? '#ef4444' : isYellow ? '#d97706' : '#9ca3af' }} />
                            <span className={isAlert ? 'font-bold' : ''}>{fmtDate(nextForecast)}</span>
                            {isAlert && (
                              <span
                                className="ml-1 px-2 py-0.5 rounded-full text-[11px] font-bold border"
                                style={{
                                  background:  isRed ? '#ef4444' : '#f59e0b',
                                  borderColor: isRed ? '#dc2626' : '#d97706',
                                  color: '#ffffff',
                                }}
                              >
                                {daysUntil < 0 ? 'Vencida' : `${daysUntil}d`}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-[12px] text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selectedClient && (
        <FeriasModal
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
        />
      )}
    </>
  )
}
