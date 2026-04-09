import { useState, useRef } from 'react'
import { X, Upload, Download, CheckCircle2, AlertTriangle, FileText } from 'lucide-react'

const TEMPLATE_HEADERS = 'nome,cnpj,nivel,regime,responsavel,faturamento_mensal,observacoes'
const TEMPLATE_EXAMPLE = [
  'Tech Exemplo Ltda,12.345.678/0001-90,Premium,Lucro Real,João Silva,50000,Cliente estratégico',
  'Loja Modelo ME,98.765.432/0001-11,Standard,Simples Nacional,Maria Souza,8000,',
].join('\n')

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_'))
  return lines.slice(1).map(line => {
    const values = line.split(',')
    return headers.reduce((obj, h, i) => {
      obj[h] = (values[i] || '').trim()
      return obj
    }, {})
  }).filter(row => Object.values(row).some(v => v))
}

function downloadTemplate() {
  const content = `${TEMPLATE_HEADERS}\n${TEMPLATE_EXAMPLE}`
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'modelo_importacao_geclient.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function ImportModal({ onImport, onClose }) {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef()

  function handleFile(file) {
    if (!file) return
    if (!file.name.endsWith('.csv')) {
      setError('Apenas arquivos .csv são aceitos.')
      return
    }
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const parsed = parseCSV(e.target.result)
        if (!parsed.length) { setError('Nenhuma linha válida encontrada no arquivo.'); return }
        setRows(parsed)
        setError('')
      } catch {
        setError('Erro ao processar o arquivo. Verifique o formato.')
      }
    }
    reader.readAsText(file, 'utf-8')
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  function handleConfirm() {
    const count = onImport(rows)
    onClose(count)
  }

  const previewRows = rows?.slice(0, 8)
  const extraCount = rows ? rows.length - 8 : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => onClose(0)} />
      <div className="relative w-full max-w-3xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Upload size={18} className="text-amber-400" />
            <h2 className="text-base font-semibold text-white">Importar Clientes em Lote</h2>
          </div>
          <button onClick={() => onClose(0)} className="text-gray-500 hover:text-gray-200 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto scrollbar-thin flex-1 px-6 py-5 flex flex-col gap-5">

          {/* Template Download */}
          <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3">
            <FileText size={16} className="text-amber-400 flex-shrink-0" />
            <p className="text-sm text-gray-300 flex-1">
              Baixe o modelo CSV, preencha e faça upload abaixo.
            </p>
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-all flex-shrink-0"
            >
              <Download size={12} />
              Baixar modelo
            </button>
          </div>

          {/* Drop Zone */}
          {!rows && (
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 py-12 cursor-pointer transition-all ${
                dragging
                  ? 'border-amber-500/70 bg-amber-500/10'
                  : 'border-gray-700 hover:border-gray-500 hover:bg-gray-800/50'
              }`}
            >
              <Upload size={28} className="text-gray-500" />
              <div className="text-center">
                <p className="text-sm text-gray-300">Arraste o arquivo CSV aqui</p>
                <p className="text-xs text-gray-500 mt-1">ou clique para selecionar</p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={e => handleFile(e.target.files[0])}
              />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
              <AlertTriangle size={14} className="flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Preview Table */}
          {rows && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-400" />
                  <p className="text-sm text-gray-300">
                    <span className="font-semibold text-emerald-400">{rows.length}</span> empresa{rows.length !== 1 ? 's' : ''} pronta{rows.length !== 1 ? 's' : ''} para importar
                  </p>
                </div>
                <button
                  onClick={() => { setRows(null); setError('') }}
                  className="text-xs text-gray-500 hover:text-gray-300 underline"
                >
                  Trocar arquivo
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-700 scrollbar-thin">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-800 border-b border-gray-700">
                      {['Nome', 'CNPJ', 'Nível', 'Regime', 'Responsável', 'Faturamento'].map(h => (
                        <th key={h} className="text-left text-gray-400 font-medium px-3 py-2.5 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => (
                      <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/50">
                        <td className="px-3 py-2 text-gray-200 max-w-[180px] truncate">{row.nome || row.name || '—'}</td>
                        <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{row.cnpj || '—'}</td>
                        <td className="px-3 py-2 text-gray-400">{row.nivel || row.level || 'Standard'}</td>
                        <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{row.regime || 'Simples Nacional'}</td>
                        <td className="px-3 py-2 text-gray-400">{row.responsavel || row.responsible || '—'}</td>
                        <td className="px-3 py-2 text-gray-400">
                          {row.faturamento_mensal
                            ? `R$ ${Number(row.faturamento_mensal).toLocaleString('pt-BR')}`
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {extraCount > 0 && (
                <p className="text-xs text-gray-600 mt-2 text-center">
                  + {extraCount} empresa{extraCount !== 1 ? 's' : ''} não exibida{extraCount !== 1 ? 's' : ''} na prévia
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800 flex justify-end gap-3">
          <button
            onClick={() => onClose(0)}
            className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-100 hover:bg-gray-800 border border-gray-700 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!rows}
            className="px-5 py-2 rounded-lg text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-gray-900 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Confirmar importação
          </button>
        </div>
      </div>
    </div>
  )
}
