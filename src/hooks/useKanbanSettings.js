const STORAGE_KEY = 'geclient_kanban_settings'

function loadAll() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }
  catch { return {} }
}

function saveAll(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

// Merge stored (order + label overrides) with defaults (color config, new columns)
function mergeWithDefaults(stored, defaults) {
  const storedMap = Object.fromEntries((stored || []).map(c => [c.id, c]))
  const result = []

  // Stored columns that still exist in defaults (preserves order + label)
  for (const s of (stored || [])) {
    const def = defaults.find(d => d.id === s.id)
    if (def) result.push({ ...def, label: s.label })
  }

  // New default columns not yet in storage (appended at end)
  for (const def of defaults) {
    if (!storedMap[def.id]) result.push({ ...def })
  }

  return result
}

import { useState } from 'react'

// defaultColumns: [{ id, label, bg, border, text, dot, headerBg, description?, icon? }]
export function useKanbanSettings(boardKey, defaultColumns) {
  const [columns, setColumns] = useState(() => {
    const stored = loadAll()[boardKey]
    return mergeWithDefaults(stored, defaultColumns)
  })

  function updateLabel(id, newLabel) {
    setColumns(prev => {
      const next = prev.map(c => c.id === id ? { ...c, label: newLabel } : c)
      const all = loadAll()
      saveAll({ ...all, [boardKey]: next.map(c => ({ id: c.id, label: c.label })) })
      return next
    })
  }

  function reorder(fromIdx, toIdx) {
    if (toIdx < 0 || toIdx >= columns.length) return
    setColumns(prev => {
      const next = [...prev]
      const [item] = next.splice(fromIdx, 1)
      next.splice(toIdx, 0, item)
      const all = loadAll()
      saveAll({ ...all, [boardKey]: next.map(c => ({ id: c.id, label: c.label })) })
      return next
    })
  }

  return { columns, updateLabel, reorder }
}
