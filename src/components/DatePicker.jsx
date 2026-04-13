import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function formatDisplay(value) {
  if (!value) return null
  return new Date(value + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function getTodayStr() {
  const d = new Date()
  return toDateStr(d.getFullYear(), d.getMonth(), d.getDate())
}

// ── Popup rendered via portal ─────────────────────────────────────────────────

function CalendarPopup({ value, anchorRef, onSelect, onClose }) {
  const popupRef   = useRef(null)
  const [pos, setPos] = useState({ top: 0, left: 0, above: false })

  const initView = () => {
    if (value) {
      const d = new Date(value + 'T12:00:00')
      return { month: d.getMonth(), year: d.getFullYear() }
    }
    const n = new Date()
    return { month: n.getMonth(), year: n.getFullYear() }
  }

  const [view, setView] = useState(initView)
  const todayStr = getTodayStr()

  // Position popup below (or above) the anchor
  useEffect(() => {
    if (!anchorRef.current) return
    const rect  = anchorRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const popupH = 280
    const above  = spaceBelow < popupH + 8

    setPos({
      top:   above ? rect.top - popupH - 4 : rect.bottom + 4,
      left:  Math.min(rect.left, window.innerWidth - 256 - 8),
      above,
    })
  }, [anchorRef])

  // Close on outside click
  useEffect(() => {
    function handle(e) {
      if (
        popupRef.current  && !popupRef.current.contains(e.target) &&
        anchorRef.current && !anchorRef.current.contains(e.target)
      ) onClose()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [anchorRef, onClose])

  function prevMonth() {
    setView(v => v.month === 0
      ? { month: 11, year: v.year - 1 }
      : { month: v.month - 1, year: v.year })
  }

  function nextMonth() {
    setView(v => v.month === 11
      ? { month: 0, year: v.year + 1 }
      : { month: v.month + 1, year: v.year })
  }

  // Build grid (Sun-start)
  const { month, year } = view
  const firstDow = new Date(year, month, 1).getDay()
  const lastDate = new Date(year, month + 1, 0).getDate()
  const cells    = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= lastDate; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  return createPortal(
    <div
      ref={popupRef}
      style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999, width: 256 }}
      className="bg-white border border-gray-200 rounded-2xl shadow-2xl p-3 select-none"
    >
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3 px-1">
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); prevMonth() }}
          className="p-1 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all"
        >
          <ChevronLeft size={15} />
        </button>
        <span className="text-sm font-semibold text-gray-700">
          {MONTHS[month]} {year}
        </span>
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); nextMonth() }}
          className="p-1 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-gray-600 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />
          const str        = toDateStr(year, month, day)
          const isSelected = str === value
          const isToday    = str === todayStr
          const col        = i % 7
          const isWeekend  = col === 0 || col === 6

          return (
            <button
              key={str}
              type="button"
              onMouseDown={e => { e.preventDefault(); onSelect(str) }}
              className={`h-8 w-full flex items-center justify-center text-xs rounded-lg font-medium transition-all ${
                isSelected
                  ? 'bg-brand-500 text-gray-900 font-bold shadow'
                  : isToday
                  ? 'bg-blue-500/20 text-blue-300 font-semibold'
                  : isWeekend
                  ? 'text-gray-600 hover:bg-gray-100 hover:text-gray-600'
                  : 'text-gray-400 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {day}
            </button>
          )
        })}
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-100">
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); onSelect(todayStr) }}
          className="text-xs text-brand-400 hover:text-brand-300 transition-colors font-medium"
        >
          Hoje
        </button>
        {value && (
          <button
            type="button"
            onMouseDown={e => { e.preventDefault(); onSelect('') }}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            Limpar data
          </button>
        )}
      </div>
    </div>,
    document.body
  )
}

// ── Public component ──────────────────────────────────────────────────────────

export default function DatePicker({ value, onChange, placeholder = 'Selecionar data', className = '' }) {
  const [open, setOpen]     = useState(false)
  const triggerRef          = useRef(null)

  const handleSelect = useCallback((dateStr) => {
    onChange(dateStr)
    setOpen(false)
  }, [onChange])

  const handleClose = useCallback(() => setOpen(false), [])

  function clearDate(e) {
    e.stopPropagation()
    onChange('')
  }

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center gap-2 bg-white border rounded-lg px-3 py-2 text-sm text-left transition-all ${
          open ? 'border-brand-500/50' : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <Calendar size={14} className={value ? 'text-brand-400 flex-shrink-0' : 'text-gray-600 flex-shrink-0'} />
        <span className={`flex-1 truncate ${value ? 'text-gray-600' : 'text-gray-600'}`}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        {value && (
          <span
            onClick={clearDate}
            className="flex-shrink-0 text-gray-600 hover:text-gray-600 transition-colors"
          >
            <X size={13} />
          </span>
        )}
      </button>

      {open && (
        <CalendarPopup
          value={value}
          anchorRef={triggerRef}
          onSelect={handleSelect}
          onClose={handleClose}
        />
      )}
    </div>
  )
}
