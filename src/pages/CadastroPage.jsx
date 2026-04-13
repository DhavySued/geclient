import { useState, useMemo } from 'react'
import {
  Building2, Plus, Upload, Search, Pencil, Trash2,
  Crown, Star, CircleDot, ChevronUp, ChevronDown,
  RotateCcw, X, CheckSquare, CheckCircle2, AlertCircle, PowerOff, Power,
} from 'lucide-react'
import { useClients } from '../context/ClientsContext'
import { useFiscalRecords } from '../context/FiscalRecordsContext'
import { useFiscalItemsCtx } from '../context/FiscalItemsContext'
import { useFiscalConfig } from '../context/FiscalConfigContext'
import { calcFiscalScore, getApplicableItems } from '../hooks/useFiscalItems'
import CompanyModal from '../components/CompanyModal'
import ImportModal from '../components/ImportModal'
import LevelBadge from '../components/LevelBadge'
import { usePermissions } from '../hooks/usePermissions'

const FISCAL_LABELS = {
  sem_consulta:       { label: 'Sem Consulta',          cls: 'text-gray-500 bg-gray-100 border-gray-200' },
  com_pendencia:      { label: 'Com Pendência',          cls: 'text-red-600 bg-red-50 border-red-200' },
  comunicado_cliente: { label: 'Comunicado ao Cliente',  cls: 'text-blue-600 bg-blue-50 border-blue-200' },
  em_regularizacao:   { label: 'Em Regularização',       cls: 'text-purple-600 bg-purple-50 border-purple-200' },
  resolvido:          { label: 'Resolvido',              cls: 'text-teal-700 bg-teal-50 border-teal-200' },
  sem_pendencia:      { label: 'Sem Pendência',          cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
}

export default function CadastroPage() {
  const { clients, inactiveClients, addClient, updateClient, deleteClient, deleteMany, importClients } = useClients()
  const { can }     = usePermissions()
  const canCreate   = can('cadastro', 'create')
  const canEdit     = can('cadastro', 'edit')
  const canDelete   = can('cadastro', 'delete')
  const { getRecord, getClientHistory, upsertRecord } = useFiscalRecords()
  const { fiscalItems }                               = useFiscalItemsCtx()
  const { regimeItems, conditionItems, tipoItems }    = useFiscalConfig()

  const [search, setSearch]           = useState('')
  const [levelFilter, setLevelFilter] = useState('all')
  const [sortKey, setSortKey]   = useState('name')
  const [sortDirs, setSortDirs] = useState({ name: 'asc', cnpj: 'asc', level: 'asc', regime: 'asc', tipo: 'asc', fiscalStatus: 'asc' })
  const [editingClient, setEditingClient] = useState(undefined)
  const [showImport, setShowImport]   = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [showInactive, setShowInactive]   = useState(false)

  // ── Seleção em lote ──────────────────────────────────────────────────────
  const [selected, setSelected]             = useState(new Set())
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false)
  const [batchDeleting, setBatchDeleting]   = useState(false)

  // ── Desfazer importação ──────────────────────────────────────────────────
  const [lastImportBatch, setLastImportBatch] = useState([]) // clientes criados no último import
  const [importToast, setImportToast]         = useState('')  // '' | 'success' | 'undone'
  const [undoing, setUndoing]                 = useState(false)

  // ── Tabela filtrada ──────────────────────────────────────────────────────
  // ── Contadores para os cards de resumo ──────────────────────────────────
  const summaryStats = useMemo(() => {
    let regular = 0, irregular = 0
    for (const client of clients) {
      const status = getClientHistory(client.id)[0]?.status ?? client.fiscalStatus ?? 'sem_consulta'
      if (status === 'sem_pendencia') regular++
      else if (status === 'com_pendencia' || status === 'comunicado_cliente' || status === 'em_regularizacao') irregular++
    }
    return { total: clients.length, regular, irregular }
  }, [clients, getClientHistory])

  const filtered = useMemo(() => {
    let list = showInactive ? inactiveClients : clients
    if (levelFilter !== 'all') list = list.filter(c => c.level === levelFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.cnpj.includes(q)
      )
    }
    const dir = sortDirs[sortKey] ?? 'asc'
    return [...list].sort((a, b) => {
      const va = String(a[sortKey] || '').toLowerCase()
      const vb = String(b[sortKey] || '').toLowerCase()
      return dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    })
  }, [clients, inactiveClients, showInactive, search, levelFilter, sortKey, sortDirs])

  const allFilteredSelected = filtered.length > 0 && filtered.every(c => selected.has(c.id))
  const someSelected        = selected.size > 0

  // ── Handlers ─────────────────────────────────────────────────────────────

  function toggleSort(key) {
    setSortKey(key)
    setSortDirs(prev => ({ ...prev, [key]: prev[key] === 'asc' ? 'desc' : 'asc' }))
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(c => c.id)))
    }
  }

  async function handleSave(data) {
    try {
      const now          = new Date()
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

      if (editingClient?.id) {
        await updateClient(editingClient.id, data)

        // Recalcula status fiscal do mês atual — 100% → sem_pendencia, caso contrário → com_pendencia
        try {
          const updatedClient = { id: editingClient.id, ...editingClient, ...data }
          const record        = getRecord(editingClient.id, currentMonth)
          const applicable    = getApplicableItems(updatedClient, fiscalItems, regimeItems, conditionItems, tipoItems)
          if (applicable.length > 0) {
            const score      = calcFiscalScore(record?.checks ?? {}, applicable)
            const newStatus  = score === 100 ? 'sem_pendencia' : 'com_pendencia'
            if (record?.status !== newStatus) {
              await upsertRecord(editingClient.id, currentMonth, {
                status:       newStatus,
                checks:       record?.checks ?? {},
                pendingTaxes: record?.pendingTaxes ?? [],
                note:         record?.note ?? '',
              })
              await updateClient(editingClient.id, { fiscalStatus: newStatus })
            }
          }
        } catch (scoreErr) {
          console.warn('[handleSave] score check skipped:', scoreErr)
        }
      } else {
        const created = await addClient(data)

        // Nova empresa: começa em sem_pendencia (100%) ou com_pendencia (<100%)
        try {
          const applicable = getApplicableItems(
            { ...data, id: created.id },
            fiscalItems, regimeItems, conditionItems, tipoItems
          )
          const newStatus = applicable.length > 0 ? 'com_pendencia' : 'com_pendencia'
          await upsertRecord(created.id, currentMonth, {
            status: newStatus, checks: {}, pendingTaxes: [], note: '',
          })
          await updateClient(created.id, { fiscalStatus: newStatus })
        } catch (scoreErr) {
          console.warn('[handleSave] new client status skipped:', scoreErr)
        }
      }
      setEditingClient(undefined)
    } catch (err) {
      alert('Erro ao salvar: ' + err.message)
    }
  }

  function handleImport(rows) {
    return importClients(rows)
  }

  function handleImportClose(result) {
    setShowImport(false)
    if (Array.isArray(result) && result.length > 0) {
      setLastImportBatch(result)
      setImportToast('success')
    }
  }

  async function handleUndoImport() {
    setUndoing(true)
    try {
      await deleteMany(lastImportBatch.map(c => c.id))
      setLastImportBatch([])
      setImportToast('undone')
      setTimeout(() => setImportToast(''), 3500)
    } catch (err) {
      alert('Erro ao desfazer importação: ' + err.message)
    } finally {
      setUndoing(false)
    }
  }

  function dismissImportToast() {
    setImportToast('')
    setLastImportBatch([])
  }

  function confirmDelete(client) {
    setDeleteConfirm(client)
  }

  async function doDelete() {
    if (!deleteConfirm) return
    try {
      await deleteClient(deleteConfirm.id)
      setSelected(prev => { const n = new Set(prev); n.delete(deleteConfirm.id); return n })
      setDeleteConfirm(null)
    } catch (err) {
      alert('Erro ao excluir: ' + err.message)
    }
  }

  async function doBatchDelete() {
    setBatchDeleting(true)
    try {
      await deleteMany([...selected])
      setSelected(new Set())
      setBatchDeleteConfirm(false)
    } catch (err) {
      alert('Erro ao excluir: ' + err.message)
    } finally {
      setBatchDeleting(false)
    }
  }

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <ChevronUp size={12} className="text-gray-600" />
    return (sortDirs[col] ?? 'asc') === 'asc'
      ? <ChevronUp size={12} className="text-brand-400" />
      : <ChevronDown size={12} className="text-brand-400" />
  }

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Building2 size={20} className="text-brand-400" />
            <h1 className="text-xl font-bold text-gray-900">Cadastro de Empresas</h1>
          </div>
          <p className="text-sm text-gray-500">
            {clients.length} empresa{clients.length !== 1 ? 's' : ''} cadastrada{clients.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowInactive(v => !v); setSelected(new Set()) }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all duration-150 btn-secondary"
            style={showInactive ? { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#DC2626' } : {}}
          >
            {showInactive ? <Power size={13} /> : <PowerOff size={13} />}
            {showInactive ? 'Ver ativas' : `Desativadas${inactiveClients.length > 0 ? ` (${inactiveClients.length})` : ''}`}
          </button>
          {canCreate && !showInactive && (
            <button onClick={() => setShowImport(true)} className="btn-secondary">
              <Upload size={14} />
              Importar CSV
            </button>
          )}
          {canCreate && !showInactive && (
            <button onClick={() => setEditingClient(null)} className="btn-primary">
              <Plus size={15} />
              Nova Empresa
            </button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="flex items-center gap-4 px-5 py-4 rounded-2xl"
          style={{ background: '#F8F9FB', border: '1px solid rgba(0,0,0,0.08)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(243,146,0,0.12)', border: '1px solid rgba(243,146,0,0.25)' }}>
            <Building2 size={18} style={{ color: '#C9A84C' }} />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#9CA3AF' }}>Total</p>
            <p className="text-2xl font-bold leading-none mt-0.5" style={{ color: '#111827' }}>{summaryStats.total}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 px-5 py-4 rounded-2xl"
          style={{ background: '#F0FDF4', border: '1px solid rgba(16,185,129,0.20)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}>
            <CheckCircle2 size={18} style={{ color: '#059669' }} />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#6EE7B7' }}>Regulares</p>
            <p className="text-2xl font-bold leading-none mt-0.5" style={{ color: '#059669' }}>{summaryStats.regular}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 px-5 py-4 rounded-2xl"
          style={{ background: '#FFF5F5', border: '1px solid rgba(239,68,68,0.20)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.22)' }}>
            <AlertCircle size={18} style={{ color: '#DC2626' }} />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#FCA5A5' }}>Irregulares</p>
            <p className="text-2xl font-bold leading-none mt-0.5" style={{ color: '#DC2626' }}>{summaryStats.irregular}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou CNPJ..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl text-[13px] focus:outline-none transition-colors"
            style={{
              background: 'rgba(0,0,0,0.04)',
              border: '1px solid rgba(0,0,0,0.08)',
              color: '#111827',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(243,146,0,0.45)'}
            onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.08)'}
          />
        </div>

        <div className="flex items-center gap-1.5">
          {[
            { value: 'all',      label: 'Todos',    icon: null },
            { value: 'Premium',  label: 'Premium',  icon: Crown },
            { value: 'Gold',     label: 'Gold',     icon: Star },
            { value: 'Standard', label: 'Standard', icon: CircleDot },
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setLevelFilter(value)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150"
              style={levelFilter === value ? {
                background: 'rgba(243,146,0,0.14)',
                border: '1px solid rgba(243,146,0,0.30)',
                color: '#f39200',
              } : {
                background: 'rgba(0,0,0,0.03)',
                border: '1px solid rgba(0,0,0,0.08)',
                color: '#6B7280',
              }}
            >
              {Icon && <Icon size={11} />}
              {label}
            </button>
          ))}
        </div>

        <span className="ml-auto text-[11px]" style={{ color: '#9CA3AF' }}>
          {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto scrollbar-thin rounded-2xl" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
        <table className="w-full min-w-[960px]">
          <thead className="sticky top-0 z-10">
            <tr style={{ background: '#F8F9FB', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
              {/* Checkbox select-all */}
              <th className="pl-5 pr-2 py-3.5 w-10">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={toggleSelectAll}
                  className="accent-brand-400 cursor-pointer w-4 h-4"
                  title={allFilteredSelected ? 'Desmarcar todos' : 'Selecionar todos'}
                />
              </th>
              {[
                { key: 'name',         label: 'Empresa' },
                { key: 'cnpj',         label: 'CNPJ' },
                { key: 'level',        label: 'Nível' },
                { key: 'regime',       label: 'Regime' },
                { key: 'tipo',         label: 'Tipo' },
                { key: 'fiscalStatus', label: 'Situação Fiscal' },
              ].map(col => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className="text-left px-5 py-3.5 cursor-pointer select-none whitespace-nowrap"
                >
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-widest uppercase transition-colors"
                    style={{ color: sortKey === col.key ? '#C9A84C' : '#9CA3AF' }}>
                    {col.label}
                    <SortIcon col={col.key} />
                  </span>
                </th>
              ))}
              <th className="px-5 py-3.5 text-[11px] font-semibold tracking-widest uppercase text-left"
                  style={{ color: '#9CA3AF' }}>
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                      style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)' }}>
                      <Search size={20} style={{ color: '#9CA3AF' }} />
                    </div>
                    <p className="text-[13px] font-medium" style={{ color: '#9CA3AF' }}>
                      Nenhuma empresa encontrada
                    </p>
                    <p className="text-[12px]" style={{ color: '#9CA3AF' }}>
                      Tente ajustar os filtros ou cadastre uma nova empresa
                    </p>
                  </div>
                </td>
              </tr>
            )}
            {filtered.map((client, i) => {
              // Usa o status do registro mensal mais recente (mais confiável que client.fiscalStatus)
              const recentStatus = getClientHistory(client.id)[0]?.status ?? client.fiscalStatus ?? 'sem_consulta'
              const fiscal       = FISCAL_LABELS[recentStatus] ?? { label: recentStatus, cls: 'text-gray-500 bg-gray-100 border-gray-200' }
              const isSelected   = selected.has(client.id)
              return (
                <tr
                  key={client.id}
                  className="group transition-colors duration-100"
                  style={{
                    borderBottom: i < filtered.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                    background: isSelected ? 'rgba(243,146,0,0.06)' : 'transparent',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(0,0,0,0.025)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = isSelected ? 'rgba(243,146,0,0.06)' : 'transparent' }}
                >
                  {/* Checkbox */}
                  <td className="pl-5 pr-2 py-4 w-10">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(client.id)}
                      className="accent-brand-400 cursor-pointer w-4 h-4"
                    />
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-[13px] font-semibold truncate max-w-[200px]"
                       style={{ color: '#111827' }} title={client.name}>
                      {client.name}
                    </p>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className="text-[12px] font-mono" style={{ color: '#6B7280' }}>
                      {client.cnpj}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <LevelBadge level={client.level} />
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className="text-[12px]" style={{ color: '#6B7280' }}>
                      {client.regime}
                    </span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg"
                      style={client.tipo === 'Comércio'
                        ? { background: 'rgba(59,130,246,0.08)', color: '#2563EB', border: '1px solid rgba(59,130,246,0.20)' }
                        : client.tipo === 'Misto'
                        ? { background: 'rgba(168,85,247,0.08)', color: '#7C3AED', border: '1px solid rgba(168,85,247,0.20)' }
                        : { background: 'rgba(16,185,129,0.08)', color: '#059669', border: '1px solid rgba(16,185,129,0.20)' }
                      }>
                      {client.tipo ?? 'Serviço'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border ${fiscal.cls}`}>
                      {fiscal.label}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {showInactive ? (
                        canEdit && (
                          <button
                            onClick={() => updateClient(client.id, { active: true })}
                            className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all"
                            style={{ background: 'rgba(16,185,129,0.10)', color: '#059669', border: '1px solid rgba(16,185,129,0.25)' }}
                            title="Reativar empresa"
                          >
                            <Power size={11} />
                            Reativar
                          </button>
                        )
                      ) : (
                        <>
                          {canEdit && (
                            <button
                              onClick={() => setEditingClient(client)}
                              className="transition-colors duration-150"
                              style={{ color: '#9CA3AF' }}
                              onMouseEnter={e => e.currentTarget.style.color = '#C9A84C'}
                              onMouseLeave={e => e.currentTarget.style.color = '#9CA3AF'}
                              title="Editar"
                            >
                              <Pencil size={14} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => confirmDelete(client)}
                              className="transition-colors duration-150"
                              style={{ color: '#9CA3AF' }}
                              onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                              onMouseLeave={e => e.currentTarget.style.color = '#9CA3AF'}
                              title="Excluir"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Barra de seleção em lote ── */}
      {someSelected && canDelete && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 px-5 py-3 rounded-2xl shadow-2xl"
          style={{
            background: '#1F2937',
            border: '1px solid rgba(255,255,255,0.10)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
          }}>
          <div className="flex items-center gap-2">
            <CheckSquare size={15} className="text-brand-400" />
            <span className="text-[13px] font-semibold text-white">
              {selected.size} empresa{selected.size !== 1 ? 's' : ''} selecionada{selected.size !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="w-px h-5 bg-white/15" />
          <button
            onClick={() => setSelected(new Set())}
            className="text-[12px] text-gray-400 hover:text-white transition-colors"
          >
            Limpar seleção
          </button>
          <button
            onClick={() => setBatchDeleteConfirm(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[12px] font-semibold transition-all"
            style={{ background: '#DC2626', color: '#fff', border: '1px solid #B91C1C' }}
          >
            <Trash2 size={13} />
            Excluir selecionadas
          </button>
        </div>
      )}

      {/* ── Modals ── */}
      {editingClient !== undefined && (
        <CompanyModal
          client={editingClient}
          onSave={handleSave}
          onClose={() => setEditingClient(undefined)}
        />
      )}

      {showImport && (
        <ImportModal onImport={handleImport} onClose={handleImportClose} />
      )}

      {/* Confirm excluir individual */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            style={{ background: '#F8F9FB', border: '1px solid rgba(0,0,0,0.10)' }}>
            <h3 className="text-[15px] font-semibold mb-2" style={{ color: '#111827' }}>Excluir empresa?</h3>
            <p className="text-[13px] mb-5" style={{ color: '#6B7280' }}>
              <span className="font-medium" style={{ color: '#111827' }}>{deleteConfirm.name}</span>{' '}
              será removida permanentemente.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary text-[13px]">
                Cancelar
              </button>
              <button
                onClick={doDelete}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all"
                style={{ background: '#DC2626', border: '1px solid #B91C1C', color: '#fff' }}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm excluir em lote */}
      {batchDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setBatchDeleteConfirm(false)} />
          <div className="relative rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            style={{ background: '#F8F9FB', border: '1px solid rgba(0,0,0,0.10)' }}>
            <h3 className="text-[15px] font-semibold mb-2" style={{ color: '#111827' }}>
              Excluir {selected.size} empresa{selected.size !== 1 ? 's' : ''}?
            </h3>
            <p className="text-[13px] mb-5" style={{ color: '#6B7280' }}>
              Esta ação não pode ser desfeita. Todos os dados das empresas selecionadas serão removidos permanentemente.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setBatchDeleteConfirm(false)} className="btn-secondary text-[13px]">
                Cancelar
              </button>
              <button
                onClick={doBatchDelete}
                disabled={batchDeleting}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-60"
                style={{ background: '#DC2626', border: '1px solid #B91C1C', color: '#fff' }}
              >
                {batchDeleting ? 'Excluindo…' : `Excluir ${selected.size} empresa${selected.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast de importação (com Desfazer) ── */}
      {importToast === 'success' && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl"
          style={{
            background: '#ffffff',
            border: '1px solid #D1FAE5',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          }}>
          <span className="text-[13px] font-medium text-emerald-700">
            {lastImportBatch.length} empresa{lastImportBatch.length !== 1 ? 's' : ''} importada{lastImportBatch.length !== 1 ? 's' : ''} com sucesso
          </span>
          <div className="w-px h-5 bg-gray-200" />
          <button
            onClick={handleUndoImport}
            disabled={undoing}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
          >
            <RotateCcw size={13} />
            {undoing ? 'Desfazendo…' : 'Desfazer'}
          </button>
          <button
            onClick={dismissImportToast}
            className="text-gray-400 hover:text-gray-600 transition-colors ml-1"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {importToast === 'undone' && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl"
          style={{
            background: '#ffffff',
            border: '1px solid rgba(0,0,0,0.10)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
          }}>
          <span className="text-[13px] font-medium text-gray-600">Importação cancelada.</span>
        </div>
      )}
    </div>
  )
}
