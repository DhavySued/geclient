import { useState, useMemo } from 'react'
import { FileText, Plus, X, ChevronUp, ChevronDown, Download, Eye, EyeOff } from 'lucide-react'
import { useClients } from '../context/ClientsContext'

const REPORT_TYPES = [
  { id: 'empresa', label: 'Empresa', icon: FileText },
]

const EMPRESA_FIELDS = [
  { key: 'name',            label: 'Nome da Empresa' },
  { key: 'cnpj',            label: 'CNPJ' },
  { key: 'regime',          label: 'Regime Tributário' },
  { key: 'level',           label: 'Nível' },
  { key: 'tipo',            label: 'Porte' },
  { key: 'responsibleName', label: 'Responsável' },
  { key: 'phone',           label: 'Telefone' },
  { key: 'email',           label: 'E-mail' },
  { key: 'city',            label: 'Cidade' },
  { key: 'state',           label: 'Estado' },
  { key: 'hasEmployees',    label: 'Funcionários' },
  { key: 'entryDate',       label: 'Data de Entrada' },
]

function getClientValue(client, key) {
  if (key === 'hasEmployees') return client.hasEmployees ? 'Sim' : 'Não'
  if (key === 'entryDate') {
    if (!client.entryDate) return '—'
    const [y, m, d] = client.entryDate.split('-')
    return `${d}/${m}/${y}`
  }
  return client[key] ?? '—'
}

function exportCsv(fields, rows) {
  const header = fields.map(f => f.label).join(';')
  const body = rows.map(r => fields.map(f => `"${getClientValue(r, f.key)}"`).join(';')).join('\n')
  const blob = new Blob(['﻿' + header + '\n' + body], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'relatorio-empresas.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function RelatoriosPage() {
  const { clients } = useClients()
  const [activeReport, setActiveReport] = useState('empresa')
  const [selectedFields, setSelectedFields] = useState([EMPRESA_FIELDS[0]])
  const [preview, setPreview] = useState(false)

  const availableFields = EMPRESA_FIELDS.filter(f => !selectedFields.some(s => s.key === f.key))

  function addField(field) {
    setSelectedFields(prev => [...prev, field])
  }

  function removeField(key) {
    setSelectedFields(prev => prev.filter(f => f.key !== key))
  }

  function moveField(index, dir) {
    setSelectedFields(prev => {
      const next = [...prev]
      const swap = index + dir
      if (swap < 0 || swap >= next.length) return prev
      ;[next[index], next[swap]] = [next[swap], next[index]]
      return next
    })
  }

  const sortedClients = useMemo(() =>
    [...clients].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
  [clients])

  return (
    <div className="flex flex-col gap-5 w-full">

      {/* Cabeçalho */}
      <div className="flex items-center gap-2">
        <FileText size={20} className="text-brand-400" />
        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">Relatórios</h1>
          <p className="text-xs text-gray-400">Monte e exporte relatórios personalizados</p>
        </div>
      </div>

      <div className="flex gap-5 items-start">

        {/* Coluna esquerda — tipos de relatório */}
        <div className="w-44 flex-shrink-0 bg-white border border-gray-200 rounded-xl shadow-sm p-2 flex flex-col gap-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-2 pt-1 pb-0.5">
            Tipo
          </p>
          {REPORT_TYPES.map(r => {
            const Icon = r.icon
            const active = activeReport === r.id
            return (
              <button
                key={r.id}
                onClick={() => { setActiveReport(r.id); setPreview(false) }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left"
                style={active
                  ? { background: 'rgba(243,146,0,0.10)', color: '#d97d00' }
                  : { color: '#6b7280' }
                }
              >
                <Icon size={14} />
                {r.label}
              </button>
            )
          })}
        </div>

        {/* Área principal — builder */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">

          {/* Dois blocos lado a lado */}
          <div className="grid grid-cols-2 gap-4">

            {/* Bloco 1 — campos disponíveis */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col">
              <div className="px-4 pt-4 pb-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-800">Campos disponíveis</p>
                <p className="text-xs text-gray-400 mt-0.5">Clique para adicionar ao relatório</p>
              </div>
              <div className="p-4 flex flex-wrap gap-2">
                {availableFields.length === 0 ? (
                  <p className="text-xs text-gray-400 w-full text-center py-4">Todos os campos foram adicionados.</p>
                ) : availableFields.map(f => (
                  <button
                    key={f.key}
                    onClick={() => addField(f)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:border-brand-300 hover:bg-orange-50 hover:text-brand-600 text-xs font-medium text-gray-600 transition-all"
                  >
                    <Plus size={11} />
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bloco 2 — campos do relatório */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col">
              <div className="px-4 pt-4 pb-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-800">Campos do relatório</p>
                <p className="text-xs text-gray-400 mt-0.5">Reordene com as setas · clique × para remover</p>
              </div>
              <div className="p-4 flex flex-col gap-2">
                {selectedFields.length === 0 ? (
                  <p className="text-xs text-gray-400 w-full text-center py-4">Nenhum campo selecionado.</p>
                ) : selectedFields.map((f, idx) => (
                  <div
                    key={f.key}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-brand-200 bg-orange-50"
                  >
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => moveField(idx, -1)}
                        disabled={idx === 0}
                        className="text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors leading-none"
                      >
                        <ChevronUp size={12} />
                      </button>
                      <button
                        onClick={() => moveField(idx, 1)}
                        disabled={idx === selectedFields.length - 1}
                        className="text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors leading-none"
                      >
                        <ChevronDown size={12} />
                      </button>
                    </div>
                    <span className="text-[11px] font-semibold text-gray-500 w-5 text-center flex-shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-800 flex-1">{f.label}</span>
                    <button
                      onClick={() => removeField(f.key)}
                      className="text-gray-300 hover:text-red-400 transition-colors ml-auto"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Barra de ações */}
          <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
            <p className="text-xs text-gray-400">
              {selectedFields.length} campo{selectedFields.length !== 1 ? 's' : ''} selecionado{selectedFields.length !== 1 ? 's' : ''} · {sortedClients.length} empresa{sortedClients.length !== 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPreview(p => !p)}
                disabled={selectedFields.length === 0}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-all disabled:opacity-40"
              >
                {preview ? <EyeOff size={14} /> : <Eye size={14} />}
                {preview ? 'Ocultar prévia' : 'Visualizar'}
              </button>
              <button
                onClick={() => exportCsv(selectedFields, sortedClients)}
                disabled={selectedFields.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-brand-500 hover:bg-brand-400 text-gray-900 transition-all disabled:opacity-40"
              >
                <Download size={14} />
                Exportar CSV
              </button>
            </div>
          </div>

          {/* Prévia da tabela */}
          {preview && selectedFields.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-auto" style={{ maxHeight: 420 }}>
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 z-10">
                  <tr style={{ background: '#f9fafb', boxShadow: '0 1px 0 #e5e7eb' }}>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-10">#</th>
                    {selectedFields.map(f => (
                      <th key={f.key} className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        {f.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedClients.map((client, idx) => (
                    <tr key={client.id} style={{ background: idx % 2 === 1 ? '#f9fafb' : '#fff' }}>
                      <td className="px-4 py-2 text-[11px] text-gray-300 font-mono">{idx + 1}</td>
                      {selectedFields.map(f => (
                        <td key={f.key} className="px-4 py-2 text-[13px] text-gray-700 whitespace-nowrap">
                          {getClientValue(client, f.key)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
