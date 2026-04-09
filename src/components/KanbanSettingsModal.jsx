import { useState } from 'react'
import { X, ChevronUp, ChevronDown, Pencil, Check, GripVertical } from 'lucide-react'

export default function KanbanSettingsModal({ columns, onRename, onReorder, onClose }) {
  const [editingId, setEditingId]     = useState(null)
  const [editingValue, setEditingValue] = useState('')

  function startEdit(col) {
    setEditingId(col.id)
    setEditingValue(col.label)
  }

  function commitEdit() {
    if (editingId && editingValue.trim()) {
      onRename(editingId, editingValue.trim())
    }
    setEditingId(null)
    setEditingValue('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') commitEdit()
    if (e.key === 'Escape') { setEditingId(null); setEditingValue('') }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl w-full max-w-md flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-white">Configurar Colunas</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-200 transition-colors p-1 rounded-lg hover:bg-gray-800"
          >
            <X size={17} />
          </button>
        </div>

        {/* Column list */}
        <div className="px-5 py-4 space-y-2">
          <p className="text-xs text-gray-600 mb-3">
            Use ▲▼ para reordenar. Clique no nome para renomear.
          </p>

          {columns.map((col, idx) => (
            <div
              key={col.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/60 border border-gray-700/50"
            >
              {/* Up / Down */}
              <div className="flex flex-col gap-0.5 flex-shrink-0">
                <button
                  onClick={() => onReorder(idx, idx - 1)}
                  disabled={idx === 0}
                  className="p-0.5 rounded text-gray-600 hover:text-gray-300 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  onClick={() => onReorder(idx, idx + 1)}
                  disabled={idx === columns.length - 1}
                  className="p-0.5 rounded text-gray-600 hover:text-gray-300 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
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
                  className="flex-1 bg-gray-900 border border-amber-500/50 rounded-lg px-2.5 py-1 text-sm text-gray-100 focus:outline-none"
                />
              ) : (
                <span
                  className={`flex-1 text-sm font-medium ${col.text} cursor-pointer`}
                  onClick={() => startEdit(col)}
                  title="Clique para renomear"
                >
                  {col.label}
                </span>
              )}

              {/* Edit / confirm button */}
              {editingId === col.id ? (
                <button
                  onClick={commitEdit}
                  className="flex-shrink-0 p-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-gray-900 transition-all"
                >
                  <Check size={12} />
                </button>
              ) : (
                <button
                  onClick={() => startEdit(col)}
                  className="flex-shrink-0 p-1.5 rounded-lg text-gray-600 hover:text-amber-400 transition-colors"
                >
                  <Pencil size={12} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-800">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-900 text-sm font-semibold transition-all"
          >
            Concluído
          </button>
        </div>
      </div>
    </div>
  )
}
