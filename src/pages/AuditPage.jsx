import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Search, RefreshCw, ChevronDown, ChevronRight, ClipboardList } from 'lucide-react'

// ── Configurações de exibição ─────────────────────────────────────────────────

const ACTION_CONFIG = {
  create: { label: 'Criou',    bg: 'bg-emerald-900/40', text: 'text-emerald-300', border: 'border-emerald-700/40' },
  update: { label: 'Editou',   bg: 'bg-amber-900/40',   text: 'text-amber-300',   border: 'border-amber-700/40'   },
  delete: { label: 'Excluiu',  bg: 'bg-red-900/40',     text: 'text-red-300',     border: 'border-red-700/40'     },
  import: { label: 'Importou', bg: 'bg-blue-900/40',    text: 'text-blue-300',    border: 'border-blue-700/40'    },
}

const MENU_LABELS = {
  cadastro:       'Empresas',
  fiscal:         'Fiscal',
  cx:             'CX',
  tarefas:        'Tarefas',
  usuarios:       'Usuários',
  configuracoes:  'Configurações',
}

const ENTITY_LABELS = {
  client:        'Empresa',
  task:          'Tarefa',
  user:          'Usuário',
  fiscal_record: 'Registro Fiscal',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function ActionBadge({ action }) {
  const cfg = ACTION_CONFIG[action] ?? { label: action, bg: 'bg-gray-800', text: 'text-gray-300', border: 'border-gray-700' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      {cfg.label}
    </span>
  )
}

function ChangesDetail({ changes }) {
  const [open, setOpen] = useState(false)
  if (!changes) return <span className="text-gray-600 text-xs">—</span>

  // Monta resumo legível
  let summary = null
  if (changes.count !== undefined) {
    summary = `${changes.count} registro(s)`
  } else if (changes.fields?.length) {
    summary = changes.fields.join(', ')
  } else if (changes.name) {
    summary = changes.name
  } else if (changes.status) {
    summary = `status: ${changes.status}`
  }

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200 transition-colors"
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {summary ?? 'ver detalhes'}
      </button>
      {open && (
        <pre className="mt-1.5 text-[11px] text-gray-400 bg-gray-900/60 rounded-lg p-2 overflow-x-auto max-w-xs border border-gray-700/40 leading-relaxed">
          {JSON.stringify(changes, null, 2)}
        </pre>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

const PAGE_SIZE = 50

export default function AuditPage() {
  const [logs,       setLogs]       = useState([])
  const [loading,    setLoading]    = useState(true)
  const [hasMore,    setHasMore]    = useState(false)
  const [page,       setPage]       = useState(0)

  // Filtros
  const [search,     setSearch]     = useState('')
  const [filterMenu, setFilterMenu] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [filterUser, setFilterUser] = useState('')
  const [dateFrom,   setDateFrom]   = useState('')
  const [dateTo,     setDateTo]     = useState('')

  const fetchLogs = useCallback(async (resetPage = true) => {
    setLoading(true)
    const currentPage = resetPage ? 0 : page
    if (resetPage) setPage(0)

    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1)

    if (filterMenu)   query = query.eq('menu', filterMenu)
    if (filterAction) query = query.eq('action', filterAction)
    if (filterUser)   query = query.ilike('user_name', `%${filterUser}%`)
    if (dateFrom)     query = query.gte('created_at', dateFrom)
    if (dateTo)       query = query.lte('created_at', dateTo + 'T23:59:59')
    if (search)       query = query.ilike('entity_name', `%${search}%`)

    const { data, error } = await query
    if (error) { console.error('AuditPage fetch error:', error); setLoading(false); return }

    if (resetPage) {
      setLogs(data)
    } else {
      setLogs(prev => [...prev, ...data])
    }
    setHasMore(data.length === PAGE_SIZE)
    setLoading(false)
  }, [filterMenu, filterAction, filterUser, dateFrom, dateTo, search, page])

  useEffect(() => { fetchLogs(true) }, [filterMenu, filterAction, filterUser, dateFrom, dateTo, search]) // eslint-disable-line react-hooks/exhaustive-deps

  function loadMore() {
    const next = page + 1
    setPage(next)
    fetchLogs(false)
  }

  const uniqueMenus   = Object.keys(MENU_LABELS)
  const uniqueActions = Object.keys(ACTION_CONFIG)

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(243,146,0,0.2), rgba(217,125,0,0.1))', border: '1px solid rgba(243,146,0,0.3)' }}>
            <ClipboardList size={18} style={{ color: '#f39200' }} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">Auditoria</h1>
            <p className="text-xs text-gray-400">Registro de todas as ações realizadas no sistema</p>
          </div>
        </div>
        <button
          onClick={() => fetchLogs(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-300 hover:text-white transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 flex-shrink-0">
        {/* Busca por nome */}
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome..."
            className="pl-7 pr-3 py-1.5 rounded-lg text-xs bg-gray-800/60 border border-gray-700/50 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-brand-500 w-44"
          />
        </div>

        {/* Módulo */}
        <select
          value={filterMenu}
          onChange={e => setFilterMenu(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg text-xs bg-gray-800/60 border border-gray-700/50 text-gray-300 focus:outline-none focus:border-brand-500"
        >
          <option value="">Todos os módulos</option>
          {uniqueMenus.map(m => (
            <option key={m} value={m}>{MENU_LABELS[m]}</option>
          ))}
        </select>

        {/* Ação */}
        <select
          value={filterAction}
          onChange={e => setFilterAction(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg text-xs bg-gray-800/60 border border-gray-700/50 text-gray-300 focus:outline-none focus:border-brand-500"
        >
          <option value="">Todas as ações</option>
          {uniqueActions.map(a => (
            <option key={a} value={a}>{ACTION_CONFIG[a].label}</option>
          ))}
        </select>

        {/* Usuário */}
        <input
          value={filterUser}
          onChange={e => setFilterUser(e.target.value)}
          placeholder="Filtrar por usuário..."
          className="px-2.5 py-1.5 rounded-lg text-xs bg-gray-800/60 border border-gray-700/50 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-brand-500 w-40"
        />

        {/* Data de */}
        <input
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg text-xs bg-gray-800/60 border border-gray-700/50 text-gray-300 focus:outline-none focus:border-brand-500"
        />
        {/* Data até */}
        <input
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg text-xs bg-gray-800/60 border border-gray-700/50 text-gray-300 focus:outline-none focus:border-brand-500"
        />

        {(filterMenu || filterAction || filterUser || dateFrom || dateTo || search) && (
          <button
            onClick={() => { setFilterMenu(''); setFilterAction(''); setFilterUser(''); setDateFrom(''); setDateTo(''); setSearch('') }}
            className="px-2.5 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-200 transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Tabela */}
      <div className="flex-1 overflow-auto rounded-2xl" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap">Data / Hora</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Usuário</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Ação</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Módulo</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Tipo</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Registro</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {loading && logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-500">
                  Carregando...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-500">
                  Nenhum registro encontrado.
                </td>
              </tr>
            ) : logs.map((log, i) => (
              <tr
                key={log.id}
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                }}
                className="hover:bg-white/5 transition-colors"
              >
                <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-400 font-mono">
                  {formatDateTime(log.created_at)}
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-gray-200">{log.user_name || '—'}</span>
                </td>
                <td className="px-4 py-3">
                  <ActionBadge action={log.action} />
                </td>
                <td className="px-4 py-3 text-xs text-gray-300">
                  {MENU_LABELS[log.menu] ?? log.menu}
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  {ENTITY_LABELS[log.entity] ?? log.entity}
                </td>
                <td className="px-4 py-3 text-sm text-gray-200 max-w-[200px] truncate" title={log.entity_name}>
                  {log.entity_name || <span className="text-gray-600">—</span>}
                </td>
                <td className="px-4 py-3">
                  <ChangesDetail changes={log.changes} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {hasMore && (
          <div className="px-4 py-3 flex justify-center" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button
              onClick={loadMore}
              disabled={loading}
              className="px-4 py-1.5 rounded-lg text-xs font-medium text-gray-300 hover:text-white transition-colors disabled:opacity-50"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}
            >
              {loading ? 'Carregando...' : 'Carregar mais'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
