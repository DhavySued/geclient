import { useState } from 'react'
import { X, ChevronUp, ChevronDown, Pencil, Check, Plus, Trash2, AlertTriangle } from 'lucide-react'

export default function KanbanSettingsModal({ columns, onRename, onReorder, onAdd, onRemove, onClose }) {
  const [editingId, setEditingId]       = useState(null)
  const [editingValue, setEditingValue] = useState('')
  const [newLabel, setNewLabel]         = useState('')
  const [confirmRemove, setConfirmRemove] = useState(null) // col object

  // ── Renomear ───────────────────────────────────────────────────────────────
  function startEdit(col) { setEditingId(col.id); setEditingValue(col.label) }

  function commitEdit() {
    if (editingId && editingValue.trim()) onRename(editingId, editingValue.trim())
    setEditingId(null); setEditingValue('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter')  commitEdit()
    if (e.key === 'Escape') { setEditingId(null); setEditingValue('') }
  }

  // ── Adicionar ──────────────────────────────────────────────────────────────
  function handleAdd() {
    if (!newLabel.trim()) return
    onAdd?.(newLabel.trim())
    setNewLabel('')
  }

  // ── Remover ────────────────────────────────────────────────────────────────
  function handleRemoveConfirmed() {
    if (!confirmRemove) return
    onRemove?.(confirmRemove.id)
    setConfirmRemove(null)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-md flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-sm font-semibold text-gray-900">Configurar Colunas</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={17} />
          </button>
        </div>

        {/* Column list */}
        <div className="px-5 py-4 space-y-2 overflow-y-auto scrollbar-thin flex-1">
          <p className="text-xs text-gray-500 mb-3">
            Use ▲▼ para reordenar. Clique no lápis para renomear.
          </p>

          {columns.map((col, idx) => (
            <div
              key={col.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200/70"
            >
              {/* Up / Down */}
              <div className="flex flex-col gap-0.5 flex-shrink-0">
                <button
                  onClick={() => onReorder(idx, idx - 1)}
                  disabled={idx === 0}
                  className="p-0.5 rounded text-gray-400 hover:text-gray-700 disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  onClick={() => onReorder(idx, idx + 1)}
                  disabled={idx === columns.length - 1}
                  className="p-0.5 rounded text-gray-400 hover:text-gray-700 disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  <ChevronDown size={14} />
                </button>
              </div>

              {/* Color dot */}
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${col.dot}`} />

              {/* Label — editable */}
              {editingId === col.id ? (
                <input
                  autoFocus
                  value={editingValue}
                  onChange={e => setEditingValue(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={handleKeyDown}
                  className="flex-1 bg-white border border-brand-500/50 rounded-lg px-2.5 py-1 text-sm text-gray-900 focus:outline-none"
                />
              ) : (
                <span
                  className={`flex-1 text-sm font-medium ${col.text} cursor-pointer select-none`}
                  onClick={() => startEdit(col)}
                  title="Clique para renomear"
                >
                  {col.label}
                </span>
              )}

              {/* Edit / confirm */}
              {editingId === col.id ? (
                <button
                  onClick={commitEdit}
                  className="flex-shrink-0 p-1.5 rounded-lg bg-brand-500 hover:bg-brand-400 text-gray-900 transition-all"
                >
                  <Check size={12} />
                </button>
              ) : (
                <button
                  onClick={() => startEdit(col)}
                  className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-brand-400 transition-colors"
                >
                  <Pencil size={12} />
                </button>
              )}

              {/* Delete — apenas colunas customizadas */}
              {col.isCustom && onRemove && (
                <button
                  onClick={() => setConfirmRemove(col)}
                  className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                  title="Excluir coluna"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add column — só se o board suporta (onAdd passado) */}
        {onAdd && (
          <div className="px-5 pb-4 flex-shrink-0">
            <p className="text-xs font-medium text-gray-500 mb-2">Nova coluna</p>
            <div className="flex gap-2">
              <input
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder="Nome da coluna..."
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-400/60 transition-colors"
              />
              <button
                onClick={handleAdd}
                disabled={!newLabel.trim()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'rgba(243,146,0,0.12)', color: '#c97700', border: '1px solid rgba(243,146,0,0.25)' }}
              >
                <Plus size={14} />
                Adicionar
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'rgba(243,146,0,0.14)', color: '#c97700', border: '1px solid rgba(243,146,0,0.30)' }}
          >
            Concluído
          </button>
        </div>
      </div>

      {/* Confirm delete dialog */}
      {confirmRemove && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(239,68,68,0.10)' }}>
                <AlertTriangle size={18} className="text-red-500" />
              </div>
              <div>
                <p className="text-[14px] font-bold text-gray-900">Excluir coluna?</p>
                <p className="text-[12px] text-gray-500">"{confirmRemove.label}"</p>
              </div>
            </div>
            <p className="text-[13px] text-gray-600 mb-5 leading-relaxed">
              Os cards desta coluna serão movidos de volta para <strong>Sem Consulta</strong>. Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmRemove(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleRemoveConfirmed}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
                style={{ background: '#EF4444' }}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
