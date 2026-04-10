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
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition-all"
          >
            <Upload size={15} />
            Importar CSV
          </button>
          <button
            onClick={() => setEditingClient(null)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-gray-900 transition-all"
          >
            <Plus size={15} />
            Nova Empresa
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, CNPJ ou responsável..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        <div className="flex items-center gap-2">
          {[
            { value: 'all', label: 'Todos', icon: null },
            { value: 'Premium', label: 'Premium', icon: Crown },
            { value: 'Gold', label: 'Gold', icon: Star },
            { value: 'Standard', label: 'Standard', icon: CircleDot },
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setLevelFilter(value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                levelFilter === value
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
              }`}
            >
              {Icon && <Icon size={11} />}
              {label}
            </button>
          ))}
        </div>

        <span className="ml-auto text-xs text-gray-600">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto scrollbar-thin rounded-xl border border-gray-800">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-900 border-b border-gray-800">
              {[
                { key: 'name', label: 'Empresa' },
                { key: 'cnpj', label: 'CNPJ' },
                { key: 'level', label: 'Nível' },
                { key: 'regime', label: 'Regime' },
                { key: 'tipo', label: 'Tipo' },
                { key: 'responsible', label: 'Responsável' },
                { key: 'fiscalStatus', label: 'Situação Fiscal' },
              ].map(col => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className="text-left text-xs font-semibold text-gray-500 px-4 py-3 cursor-pointer hover:text-gray-300 select-none whitespace-nowrap"
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    <SortIcon col={col.key} />
                  </span>
                </th>
              ))}
              <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-600 text-sm">
                  Nenhuma empresa encontrada.
                </td>
              </tr>
            )}
            {filtered.map(client => {
              const fiscal = FISCAL_LABELS[client.fiscalStatus] || FISCAL_LABELS.regular
              return (
                <tr
                  key={client.id}
                  className="border-b border-gray-800/60 hover:bg-gray-800/40 transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-100 truncate max-w-[200px]" title={client.name}>
                      {client.name}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{client.cnpj}</td>
                  <td className="px-4 py-3">
                    <LevelBadge level={client.level} />
                  </td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">{client.regime}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs">
                    <span className={`inline-block px-2 py-0.5 rounded-full border font-medium ${
                      client.tipo === 'Comércio' ? 'bg-blue-500/10 border-blue-500/30 text-blue-300' :
                      client.tipo === 'Misto'    ? 'bg-purple-500/10 border-purple-500/30 text-purple-300' :
                                                   'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    }`}>
                      {client.tipo ?? 'Serviço'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{client.responsible}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full border font-medium ${fiscal.cls}`}>
                      {fiscal.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingClient(client)}
                        className="text-gray-500 hover:text-amber-400 transition-colors"
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => confirmDelete(client)}
                        className="text-gray-500 hover:text-red-400 transition-colors"
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
          <div className="absolute inset-0 bg-black/60" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-base font-semibold text-white mb-2">Excluir empresa?</h3>
            <p className="text-sm text-gray-400 mb-5">
              <span className="font-medium text-gray-200">{deleteConfirm.name}</span> será removida permanentemente.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-100 hover:bg-gray-800 border border-gray-700 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={doDelete}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-500 text-white transition-all"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {importToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-emerald-900/90 border border-emerald-500/40 text-emerald-300 text-sm px-4 py-3 rounded-xl shadow-lg">
          <span>{importToast}</span>
        </div>
      )}
    </div>
  )
}
