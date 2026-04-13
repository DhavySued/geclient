import { useState, useRef } from 'react'
import { X, Upload, Download, CheckCircle2, AlertTriangle, FileText, Loader2, Trash2 } from 'lucide-react'

const LEVELS      = ['Standard', 'Gold', 'Premium']
const REGIMES     = ['Simples Nacional', 'Lucro Presumido', 'Lucro Real', 'MEI']
const TIPOS       = ['Serviço', 'Comércio', 'Misto']
const CX_STATUSES = ['cliente_novo', 'promotor', 'neutro', 'risco_churn', 'detrator']

const TEMPLATE_HEADERS = 'nome,cnpj,nivel,regime,tipo,responsavel,tem_funcionarios,tem_pro_labore,status_cx,observacoes'
const TEMPLATE_EXAMPLE = [
  'Tech Exemplo Ltda,12.345.678/0001-90,Premium,Lucro Real,Serviço,João Silva,sim,sim,promotor,Cliente estratégico',
  'Loja Modelo ME,98.765.432/0001-11,Standard,Simples Nacional,Comércio,Maria Souza,não,não,cliente_novo,',
  'Escritório ABC,11.222.333/0001-44,Gold,Lucro Presumido,Misto,Ana Lima,sim,não,neutro,Observação opcional',
].join('\n')

const FIELD_NOTES = [
  { col: 'nivel',                             values: 'Standard · Gold · Premium' },
  { col: 'regime',                            values: 'Simples Nacional · Lucro Presumido · Lucro Real · MEI' },
  { col: 'tipo',                              values: 'Serviço · Comércio · Misto' },
  { col: 'tem_funcionarios / tem_pro_labore', values: 'sim · não  (ou  true · false)' },
  { col: 'status_cx',                         values: 'cliente_novo · promotor · neutro · risco_churn · detrator' },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return []
  // Auto-detecta delimitador: Excel BR usa ; enquanto o padrão é ,
  const firstLine = lines[0]
  const delim = firstLine.includes(';') ? ';' : ','

  // Parser que lida com campos entre aspas (Excel exporta "Comércio", "São Paulo", etc.)
  function parseLine(line) {
    const result = []
    let cur = ''
    let inQ = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++ }  // "" → " escapado
        else inQ = !inQ
      } else if (ch === delim && !inQ) {
        result.push(cur.trim())
        cur = ''
      } else {
        cur += ch
      }
    }
    result.push(cur.trim())
    return result
  }

  const headers = parseLine(firstLine).map(h =>
    h.replace(/^\uFEFF/, '')   // remove BOM
      .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_')
  )
  return lines.slice(1).map(line => {
    const values = parseLine(line)
    return headers.reduce((obj, h, i) => { obj[h] = values[i] ?? ''; return obj }, {})
  }).filter(row => Object.values(row).some(v => v))
}

// Reduz string para comparação: minúsculo + sem acentos + sem espaços extras
function simplify(str) {
  return String(str ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // remove diacríticos (acentos, cedilha, etc.)
}

function parseBool(val) {
  if (val === undefined || val === null || val === '') return false
  return ['true', 'sim', 's', '1', 'yes'].includes(simplify(val))
}

function normalizeLevel(val) {
  const v = simplify(val)
  if (v === 'premium') return 'Premium'
  if (v === 'gold')    return 'Gold'
  return 'Standard'
}

function normalizeRegime(val) {
  if (!val) return 'Simples Nacional'
  const v = simplify(val).replace(/\s+/g, ' ')
  const MAP = {
    'simples nacional': 'Simples Nacional',
    'simples':          'Simples Nacional',
    'lucro presumido':  'Lucro Presumido',
    'presumido':        'Lucro Presumido',
    'lucro real':       'Lucro Real',
    'real':             'Lucro Real',
    'mei':              'MEI',
  }
  return MAP[v] ?? 'Simples Nacional'
}

function normalizeTipo(val) {
  if (!val) return 'Serviço'
  const v = simplify(val)
  if (v.startsWith('comercio') || v.startsWith('comerci')) return 'Comércio'
  if (v === 'misto') return 'Misto'
  return 'Serviço'
}

function normalizeCxStatus(val) {
  if (!val) return 'cliente_novo'
  const v = simplify(val).replace(/\s+/g, '_')
  // Match exato primeiro
  if (CX_STATUSES.includes(v)) return v
  // Aliases comuns (ex: "risco de churn", "cliente novo", "novo")
  if (v.includes('promotor'))                   return 'promotor'
  if (v.includes('neutro'))                     return 'neutro'
  if (v.includes('detrator'))                   return 'detrator'
  if (v.includes('churn') || v.includes('risco')) return 'risco_churn'
  if (v.includes('novo') || v.includes('new'))  return 'cliente_novo'
  return 'cliente_novo'
}

function toEditRow(row) {
  return {
    nome:             row.nome            || row.name        || '',
    cnpj:             row.cnpj            || '',
    nivel:            normalizeLevel(row.nivel  || row.level || 'Standard'),
    regime:           normalizeRegime(row.regime),
    tipo:             normalizeTipo(row.tipo),
    responsavel:      row.responsavel     || row.responsible || '',
    tem_funcionarios: parseBool(row.tem_funcionarios ?? row.has_employees),
    tem_pro_labore:   parseBool(row.tem_pro_labore   ?? row.has_pro_labore),
    status_cx:        normalizeCxStatus(row.status_cx || row.cx_status),
    observacoes:      row.observacoes     || row.notes       || '',
  }
}

function downloadTemplate() {
  const content = `${TEMPLATE_HEADERS}\n${TEMPLATE_EXAMPLE}`
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = 'modelo_importacao_geclient.csv'; a.click()
  URL.revokeObjectURL(url)
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TextCell({ row, field, placeholder, index, onChange }) {
  return (
    <input
      value={row[field]}
      onChange={e => onChange(index, field, e.target.value)}
      placeholder={placeholder}
      className="w-full bg-transparent border-0 outline-none text-xs text-gray-700 placeholder-gray-400
                 focus:bg-gray-100 rounded px-1 py-0.5"
    />
  )
}

function SelectCell({ row, field, options, index, onChange }) {
  return (
    <select
      value={row[field]}
      onChange={e => onChange(index, field, e.target.value)}
      className="bg-transparent border-0 outline-none text-xs text-gray-700 cursor-pointer
                 focus:bg-gray-100 rounded px-1 py-0.5 w-full"
    >
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function CheckCell({ row, field, index, onChange }) {
  return (
    <input
      type="checkbox"
      checked={!!row[field]}
      onChange={e => onChange(index, field, e.target.checked)}
      className="accent-brand-400 cursor-pointer"
    />
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ImportModal({ onImport, onClose }) {
  const [step, setStep]       = useState('upload') // 'upload' | 'review'
  const [editRows, setEditRows] = useState([])
  const [error, setError]     = useState('')
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef()

  function processText(text) {
    try {
      const parsed = parseCSV(text)
      if (!parsed.length) { setError('Nenhuma linha válida encontrada no arquivo.'); return }
      setEditRows(parsed.map(toEditRow))
      setError('')
      setStep('review')
    } catch {
      setError('Erro ao processar o arquivo. Verifique o formato.')
    }
  }

  function handleFile(file) {
    if (!file) return
    if (!file.name.endsWith('.csv')) { setError('Apenas arquivos .csv são aceitos.'); return }

    // Tenta UTF-8 primeiro; se produzir caracteres inválidos (\uFFFD), re-lê como Latin-1
    // (Excel BR salva CSVs em Windows-1252/Latin-1 por padrão)
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target.result
      if (text.includes('\uFFFD')) {
        const r2 = new FileReader()
        r2.onload = e2 => processText(e2.target.result)
        r2.readAsText(file, 'iso-8859-1')
      } else {
        processText(text)
      }
    }
    reader.readAsText(file, 'utf-8')
  }

  function handleDrop(e) {
    e.preventDefault(); setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  function updateRow(index, field, value) {
    setEditRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r))
  }

  function removeRow(index) {
    setEditRows(prev => prev.filter((_, i) => i !== index))
  }

  async function handleConfirm() {
    const valid = editRows.filter(r => r.nome && r.cnpj)
    if (!valid.length) { setError('Nenhuma empresa com nome e CNPJ preenchidos.'); return }
    setLoading(true); setError('')
    try {
      const count = await onImport(editRows)
      onClose(count)
    } catch (err) {
      setError(err.message || 'Erro ao importar.')
      setLoading(false)
    }
  }

  const invalidCount = editRows.filter(r => !r.nome || !r.cnpj).length
  const validCount   = editRows.length - invalidCount

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !loading && onClose(0)} />

      <div className={`relative bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] transition-all
        ${step === 'review' ? 'w-full max-w-6xl' : 'w-full max-w-3xl'}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Upload size={18} className="text-brand-400" />
            <h2 className="text-base font-semibold text-gray-900">
              {step === 'upload'
                ? 'Importar Empresas em Lote'
                : `Revisar Importação — ${editRows.length} empresa${editRows.length !== 1 ? 's' : ''}`}
            </h2>
          </div>
          <button disabled={loading} onClick={() => onClose(0)}
            className="text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-40">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto scrollbar-thin flex-1 px-6 py-5 flex flex-col gap-5">

          {/* ── Step 1: Upload ── */}
          {step === 'upload' && (
            <>
              <div className="flex flex-col gap-3 bg-brand-500/10 border border-brand-500/25 rounded-xl px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <FileText size={16} className="text-brand-400 flex-shrink-0" />
                  <p className="text-sm text-gray-600 flex-1">
                    Baixe o modelo CSV, preencha com os dados das empresas e faça o upload abaixo.
                    Você poderá revisar e editar antes de confirmar.
                  </p>
                  <button onClick={downloadTemplate}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                               bg-brand-500/20 hover:bg-brand-500/30 text-brand-300 border border-brand-500/30
                               transition-all flex-shrink-0">
                    <Download size={12} />
                    Baixar modelo
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-1 pt-1 border-t border-brand-500/15">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-0.5">
                    Valores aceitos por coluna
                  </p>
                  {FIELD_NOTES.map(n => (
                    <div key={n.col} className="flex gap-2 text-[11px]">
                      <span className="text-gray-500 font-mono w-56 flex-shrink-0">{n.col}</span>
                      <span className="text-gray-400">{n.values}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center
                            gap-3 py-14 cursor-pointer transition-all
                            ${dragging
                              ? 'border-brand-500/70 bg-brand-500/10'
                              : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'}`}
              >
                <Upload size={28} className="text-gray-500" />
                <div className="text-center">
                  <p className="text-sm text-gray-600">Arraste o arquivo CSV aqui</p>
                  <p className="text-xs text-gray-500 mt-1">ou clique para selecionar</p>
                </div>
                <input ref={inputRef} type="file" accept=".csv" className="hidden"
                  onChange={e => handleFile(e.target.files[0])} />
              </div>
            </>
          )}

          {/* ── Step 2: Review & Edit ── */}
          {step === 'review' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
                <p className="text-sm text-gray-600">
                  Revise e edite os dados diretamente na tabela antes de confirmar. Campos
                  <span className="text-red-400 font-medium"> * </span>
                  são obrigatórios.
                </p>
                <button
                  onClick={() => { setStep('upload'); setEditRows([]); setError('') }}
                  className="ml-auto text-xs text-gray-500 hover:text-gray-700 underline whitespace-nowrap"
                >
                  Trocar arquivo
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200 scrollbar-thin">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-200">
                      {[
                        '#', 'Nome *', 'CNPJ *', 'Nível', 'Regime', 'Tipo',
                        'Responsável', 'Func.', 'Pró-lab.', 'Status CX',
                        'Obs.', '',
                      ].map(h => (
                        <th key={h}
                          className="text-left text-gray-400 font-medium px-3 py-2.5 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {editRows.map((row, i) => {
                      const rowInvalid = !row.nome || !row.cnpj
                      return (
                        <tr key={i}
                          className={`border-b border-gray-100 hover:bg-gray-50
                            ${rowInvalid ? 'bg-red-50/50' : ''}`}>
                          <td className="px-3 py-1.5 text-gray-400 select-none">{i + 1}</td>

                          <td className={`px-1 py-1 min-w-[140px] ${!row.nome ? 'bg-red-100/60' : ''}`}>
                            <TextCell row={row} field="nome" placeholder="Nome *" index={i} onChange={updateRow} />
                          </td>

                          <td className={`px-1 py-1 min-w-[140px] ${!row.cnpj ? 'bg-red-100/60' : ''}`}>
                            <TextCell row={row} field="cnpj" placeholder="CNPJ *" index={i} onChange={updateRow} />
                          </td>

                          <td className="px-1 py-1 min-w-[100px]">
                            <SelectCell row={row} field="nivel" options={LEVELS} index={i} onChange={updateRow} />
                          </td>

                          <td className="px-1 py-1 min-w-[150px]">
                            <SelectCell row={row} field="regime" options={REGIMES} index={i} onChange={updateRow} />
                          </td>

                          <td className="px-1 py-1 min-w-[90px]">
                            <SelectCell row={row} field="tipo" options={TIPOS} index={i} onChange={updateRow} />
                          </td>

                          <td className="px-1 py-1 min-w-[110px]">
                            <TextCell row={row} field="responsavel" placeholder="—" index={i} onChange={updateRow} />
                          </td>

                          <td className="px-3 py-1 text-center">
                            <CheckCell row={row} field="tem_funcionarios" index={i} onChange={updateRow} />
                          </td>

                          <td className="px-3 py-1 text-center">
                            <CheckCell row={row} field="tem_pro_labore" index={i} onChange={updateRow} />
                          </td>

                          <td className="px-1 py-1 min-w-[120px]">
                            <SelectCell row={row} field="status_cx" options={CX_STATUSES} index={i} onChange={updateRow} />
                          </td>

                          <td className="px-1 py-1 min-w-[120px]">
                            <TextCell row={row} field="observacoes" placeholder="—" index={i} onChange={updateRow} />
                          </td>

                          <td className="px-3 py-1">
                            <button onClick={() => removeRow(i)}
                              className="text-gray-400 hover:text-red-400 transition-colors">
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {invalidCount > 0 && (
                <p className="text-xs text-red-400 flex items-center gap-1.5">
                  <AlertTriangle size={12} />
                  {invalidCount} empresa{invalidCount !== 1 ? 's' : ''} sem nome ou CNPJ — ser{invalidCount !== 1 ? 'ão' : 'á'} ignorada{invalidCount !== 1 ? 's' : ''} na importação.
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10
                            border border-red-500/30 rounded-xl px-4 py-3 flex-shrink-0">
              <AlertTriangle size={14} className="flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-gray-400">
            {step === 'review' && validCount > 0 && (
              <span>
                <span className="text-emerald-500 font-semibold">{validCount}</span> empresa{validCount !== 1 ? 's' : ''} pronta{validCount !== 1 ? 's' : ''} para importar
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              disabled={loading}
              onClick={() => onClose(0)}
              className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-900 hover:bg-gray-100
                         border border-gray-200 transition-all disabled:opacity-40"
            >
              Cancelar
            </button>
            {step === 'review' && (
              <button
                onClick={handleConfirm}
                disabled={loading || validCount === 0}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold
                           bg-brand-500 hover:bg-brand-400 text-gray-900 transition-all
                           disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                Confirmar importação
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
