import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, Search, X, Building2 } from 'lucide-react'

/**
 * ClientSelect — select com busca e ordem alfabética.
 *
 * Props:
 *   clients    — array de { id, name }
 *   value      — id selecionado (string)
 *   onChange   — (id: string) => void
 *   placeholder — texto quando sem seleção (default "Cliente (opcional)")
 *   className  — classes extras no wrapper
 */
export default function ClientSelect({ clients = [], value, onChange, placeholder = 'Cliente (opcional)', className = '' }) {
  const [open,   setOpen]   = useState(false)
  const [search, setSearch] = useState('')
  const rootRef     = useRef(null)
  const inputRef    = useRef(null)
  const mousedownRef = useRef(false)

  const sorted = useMemo(() =>
    [...clients].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }))
  , [clients])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? sorted.filter(c => c.name.toLowerCase().includes(q)) : sorted
  }, [sorted, search])

  const selected = clients.find(c => c.id === value)

  function handleOpen() {
    setOpen(true)
    setSearch('')
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function handleSelect(id) {
    onChange(id)
    setOpen(false)
    setSearch('')
  }

  function handleClear(e) {
    e.stopPropagation()
    onChange('')
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return
    function onOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [open])

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onMouseDown={() => { mousedownRef.current = true; setTimeout(() => { mousedownRef.current = false }, 200) }}
        onFocus={() => { if (!mousedownRef.current) handleOpen() }}
        onClick={open ? () => { setOpen(false); setSearch('') } : handleOpen}
        className="w-full flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-left transition-colors focus:outline-none focus:border-brand-400/60 hover:border-gray-300"
      >
        <Building2 size={13} className="flex-shrink-0 text-gray-400" />
        <span className={`flex-1 truncate ${selected ? 'text-gray-800' : 'text-gray-400'}`}>
          {selected ? selected.name : placeholder}
        </span>
        {selected ? (
          <X size={13} className="flex-shrink-0 text-gray-300 hover:text-gray-500" onClick={handleClear} />
        ) : (
          <ChevronDown size={13} className={`flex-shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute left-0 right-0 z-50 mt-1 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden"
          style={{ maxHeight: 260 }}
        >
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
            <Search size={13} className="flex-shrink-0 text-gray-400" />
            <input
              ref={inputRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar empresa..."
              className="flex-1 text-sm text-gray-800 placeholder-gray-400 focus:outline-none bg-transparent"
              onKeyDown={e => {
                if (e.key === 'Escape') { setOpen(false); setSearch('') }
                if (e.key === 'Enter' && filtered.length === 1) handleSelect(filtered[0].id)
              }}
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="text-gray-300 hover:text-gray-500">
                <X size={12} />
              </button>
            )}
          </div>

          {/* Opção "nenhum" */}
          <div className="overflow-y-auto scrollbar-thin" style={{ maxHeight: 210 }}>
            <button
              type="button"
              onClick={() => handleSelect('')}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                !value ? 'bg-brand-50 text-brand-600 font-medium' : 'text-gray-400 hover:bg-gray-50'
              }`}
            >
              {placeholder}
            </button>

            {filtered.length === 0 && (
              <p className="px-3 py-3 text-[12px] text-gray-400 text-center">Nenhuma empresa encontrada</p>
            )}

            {filtered.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelect(c.id)}
                className={`w-full text-left px-3 py-2 text-sm transition-colors truncate ${
                  c.id === value
                    ? 'bg-brand-50 text-brand-600 font-semibold'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
