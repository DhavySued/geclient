import { useState, useMemo } from 'react'
import { Building2, Plus, Upload, Search, Pencil, Trash2, Crown, Star, CircleDot, ChevronUp, ChevronDown } from 'lucide-react'
import { useClients } from '../context/ClientsContext'
import CompanyModal from '../components/CompanyModal'
import ImportModal from '../components/ImportModal'
import LevelBadge from '../components/LevelBadge'

const FISCAL_LABELS = {
  sem_consulta:       { label: 'Sem Consulta',          cls: 'text-gray-400 bg-gray-500/10 border-gray-500/30' },
  com_pendencia:      { label: 'Com Pendência',          cls: 'text-red-400 bg-red-500/10 border-red-500/30' },
  comunicado_cliente: { label: 'Comunicado ao Cliente',  cls: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  em_regularizacao:   { label: 'Em Regularização',       cls: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
  resolvido:          { label: 'Resolvido',              cls: 'text-teal-400 bg-teal-500/10 border-teal-500/30' },
  sem_pendencia:      { label: 'Sem Pendência',          cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
}


export default function CadastroPage() {
  const { clients, addClient, updateClient, deleteClient, importClients } = useClients()
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState('all')
  const [sortKey, setSortKey] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
  const [editingClient, setEditingClient] = useState(undefined) // undefined = closed, null = new
  const [showImport, setShowImport] = useState(false)
  const [importToast, setImportToast] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const filtered = useMemo(() => {
    let list = clients
    if (levelFilter !== 'all') list = list.filter(c => c.level === levelFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.cnpj.includes(q) ||
        (c.responsible || '').toLowerCase().includes(q)
      )
    }
    list = [...list].sort((a, b) => {
      const va = String(a[sortKey] || '').toLowerCase()
      const vb = String(b[sortKey] || '').toLowerCase()
      if (sortKey === 'monthlyRevenue') {
        return sortDir === 'asc' ? Number(a[sortKey]) - Number(b[sortKey]) : Number(b[sortKey]) - Number(a[sortKey])
      }
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    })
    return list
  }, [clients, search, levelFilter, sortKey, sortDir])

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  async function handleSave(data) {
    try {
      if (editingClient?.id) {
        await updateClient(editingClient.id, data)
      } else {
        await addClient(data)
      }
      setEditingClient(undefined)
    } catch (err) {
      alert('Erro ao salvar: ' + err.message)
    }
  }

  function handleImport(rows) {
    return importClients(rows)
  }

  function handleImportClose(count) {
    setShowImport(false)
    if (count > 0) {
      setImportToast(`${count} empresa${count !== 1 ? 's' : ''} importada${count !== 1 ? 's' : ''} com sucesso!`)
      setTimeout(() => setImportToast(''), 4000)
    }
  }

  function confirmDelete(client) {
    setDeleteConfirm(client)
  }

  function doDelete() {
    if (deleteConfirm) { deleteClient(deleteConfirm.id); setDeleteConfirm(null) }
  }

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <ChevronUp size={12} className="text-gray-600" />
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="text-amber-400" />
      : <ChevronDown size={12} className="text-amber-400" />
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Building2 size={20} className="text-amber-400" />
            <h1 className="text-xl font-bold text-white">Cadastro de Empresas</h1>
          </div>
          <p className="text-sm text-gray-500">
            {clients.length} empresa{clients.length !== 1 ? 's' : ''} cadastrada{clients.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowImport(true)} className="btn-secondary">
            <Upload size={14} />
            Importar CSV
          </button>
          <button onClick={() => setEditingClient(null)} className="btn-primary">
            <Plus size={15} />
            Nova Empresa
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.28)' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, CNPJ ou responsável..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl text-[13px] focus:outline-none transition-colors"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#F1F1F3',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(245,158,11,0.45)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
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
                background: 'rgba(245,158,11,0.14)',
                border: '1px solid rgba(245,158,11,0.30)',
                color: '#FCD34D',
              } : {
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                color: 'rgba(255,255,255,0.38)',
              }}
            >
              {Icon && <Icon size={11} />}
              {label}
            </button>
          ))}
        </div>

        <span className="ml-auto text-[11px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
          {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto scrollbar-thin rounded-2xl" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
        <table className="w-full min-w-[900px]">
          <thead className="sticky top-0 z-10">
            <tr style={{ background: '#0D0E14', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {[
                { key: 'name',         label: 'Empresa' },
                { key: 'cnpj',         label: 'CNPJ' },
                { key: 'level',        label: 'Nível' },
                { key: 'regime',       label: 'Regime' },
                { key: 'tipo',         label: 'Tipo' },
                { key: 'responsible',  label: 'Responsável' },
                { key: 'fiscalStatus', label: 'Situação Fiscal' },
              ].map(col => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className="text-left px-5 py-3.5 cursor-pointer select-none whitespace-nowrap"
                >
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-widest uppercase transition-colors"
                    style={{ color: sortKey === col.key ? '#C9A84C' : 'rgba(255,255,255,0.35)' }}>
                    {col.label}
                    <SortIcon col={col.key} />
                  </span>
                </th>
              ))}
              <th className="px-5 py-3.5 text-[11px] font-semibold tracking-widest uppercase text-left"
                  style={{ color: 'rgba(255,255,255,0.35)' }}>
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <Search size={20} style={{ color: 'rgba(255,255,255,0.20)' }} />
                    </div>
                    <p className="text-[13px] font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      Nenhuma empresa encontrada
                    </p>
                    <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.20)' }}>
                      Tente ajustar os filtros ou cadastre uma nova empresa
                    </p>
                  </div>
                </td>
              </tr>
            )}
            {filtered.map((client, i) => {
              const fiscal = FISCAL_LABELS[client.fiscalStatus] || FISCAL_LABELS.sem_consulta
              return (
                <tr
                  key={client.id}
                  className="group transition-colors duration-100"
                  style={{
                    borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    background: 'transparent',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td className="px-5 py-4">
                    <p className="text-[13px] font-semibold truncate max-w-[200px]"
                       style={{ color: '#F1F1F3' }} title={client.name}>
                      {client.name}
                    </p>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className="text-[12px] font-mono" style={{ color: 'rgba(255,255,255,0.45)' }}>
                      {client.cnpj}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <LevelBadge level={client.level} />
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                      {client.regime}
                    </span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg"
                      style={client.tipo === 'Comércio'
                        ? { background: 'rgba(59,130,246,0.12)', color: '#93C5FD', border: '1px solid rgba(59,130,246,0.25)' }
                        : client.tipo === 'Misto'
                        ? { background: 'rgba(168,85,247,0.12)', color: '#C4B5FD', border: '1px solid rgba(168,85,247,0.25)' }
                        : { background: 'rgba(16,185,129,0.12)', color: '#6EE7B7', border: '1px solid rgba(16,185,129,0.25)' }
                      }>
                      {client.tipo ?? 'Serviço'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                      {client.responsible || '—'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border ${fiscal.cls}`}>
                      {fiscal.label}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setEditingClient(client)}
                        className="transition-colors duration-150"
                        style={{ color: 'rgba(255,255,255,0.25)' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#C9A84C'}
                        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => confirmDelete(client)}
                        className="transition-colors duration-150"
                        style={{ color: 'rgba(255,255,255,0.25)' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modals */}
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

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            style={{ background: '#0D0E14', border: '1px solid rgba(255,255,255,0.10)' }}>
            <h3 className="text-[15px] font-semibold mb-2" style={{ color: '#F1F1F3' }}>Excluir empresa?</h3>
            <p className="text-[13px] mb-5" style={{ color: 'rgba(255,255,255,0.45)' }}>
              <span className="font-medium" style={{ color: '#F1F1F3' }}>{deleteConfirm.name}</span>{' '}
              será removida permanentemente.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="btn-secondary text-[13px]"
              >
                Cancelar
              </button>
              <button
                onClick={doDelete}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all"
                style={{ background: 'rgba(239,68,68,0.85)', border: '1px solid rgba(239,68,68,0.40)' }}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {importToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-[13px] font-medium"
          style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0.08) 100%)',
            border: '1px solid rgba(16,185,129,0.30)',
            color: '#6EE7B7',
          }}>
          <span>{importToast}</span>
        </div>
      )}
    </div>
  )
}
