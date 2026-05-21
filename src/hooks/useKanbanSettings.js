import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// Paleta de cores para colunas criadas pelo usuário
const CUSTOM_PALETTE = [
  { bg: 'bg-sky-500/10',    border: 'border-sky-500/30',    text: 'text-sky-400',    dot: 'bg-sky-400',    headerBg: 'bg-sky-100' },
  { bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-400', dot: 'bg-violet-400', headerBg: 'bg-violet-100' },
  { bg: 'bg-rose-500/10',   border: 'border-rose-500/30',   text: 'text-rose-400',   dot: 'bg-rose-400',   headerBg: 'bg-rose-100' },
  { bg: 'bg-amber-500/10',  border: 'border-amber-500/30',  text: 'text-amber-400',  dot: 'bg-amber-400',  headerBg: 'bg-amber-100' },
  { bg: 'bg-cyan-500/10',   border: 'border-cyan-500/30',   text: 'text-cyan-400',   dot: 'bg-cyan-400',   headerBg: 'bg-cyan-100' },
]

// Mescla linhas do Supabase com as configs de cor dos defaults
function mergeRows(rows, defaultMap) {
  let customCount = 0
  return rows.map(row => {
    const def = defaultMap[row.col_id]
    if (def) return {
      ...def,
      label:       row.label,
      description: row.description ?? def.description ?? '',
    }
    const colors = CUSTOM_PALETTE[customCount++ % CUSTOM_PALETTE.length]
    return {
      id: row.col_id, label: row.label,
      description: row.description ?? '',
      isCustom: true, ...colors,
    }
  })
}

const CACHE_KEY = (boardKey) => `geclient_kanban_${boardKey}`

function readCache(boardKey, defaultMap) {
  try {
    const raw = localStorage.getItem(CACHE_KEY(boardKey))
    if (!raw) return null
    const rows = JSON.parse(raw)
    return mergeRows(rows, defaultMap)
  } catch {
    return null
  }
}

function writeCache(boardKey, data) {
  try {
    localStorage.setItem(CACHE_KEY(boardKey), JSON.stringify(
      data.map(r => ({ col_id: r.col_id, label: r.label, description: r.description ?? '' }))
    ))
  } catch {}
}

/**
 * useKanbanSettings
 *
 * Inicializa do cache localStorage (instantâneo, sem flash) e sincroniza
 * com o Supabase em background. Se nada mudou, bail-out evita re-render.
 */
export function useKanbanSettings(boardKey, defaultColumns) {
  const defaultMap = Object.fromEntries(defaultColumns.map(c => [c.id, c]))
  const [columns, setColumns] = useState(() => readCache(boardKey, defaultMap) ?? defaultColumns)

  // ── Carga do Supabase ──────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data, error } = await supabase
        .from('kanban_column_settings')
        .select('col_id, label, description, position, is_custom')
        .eq('board_key', boardKey)
        .order('position')

      if (cancelled) return
      if (error) { console.warn('[KanbanSettings] Supabase error:', error.message); return }

      if (!data || data.length === 0) {
        // Primeira vez — semeia com os defaults
        const rows = defaultColumns.map((c, i) => ({
          board_key:   boardKey,
          col_id:      c.id,
          label:       c.label,
          description: c.description ?? '',
          position:    i,
          is_custom:   false,
        }))
        supabase.from('kanban_column_settings').insert(rows)
          .then(({ error: e }) => { if (e) console.warn('[KanbanSettings] seed:', e.message) })
        return
      }

      writeCache(boardKey, data)

      const next = mergeRows(data, defaultMap)
      setColumns(prev => {
        if (
          prev.length === next.length &&
          prev.every((c, i) =>
            c.id          === next[i].id &&
            c.label       === next[i].label &&
            (c.description ?? '') === (next[i].description ?? '')
          )
        ) return prev
        return next
      })
    }

    load()
    return () => { cancelled = true }
  }, [boardKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Persist helper — escreve no Supabase e atualiza cache ─────────────────
  function persistAll(next) {
    try {
      localStorage.setItem(CACHE_KEY(boardKey), JSON.stringify(
        next.map(col => ({ col_id: col.id, label: col.label, description: col.description ?? '' }))
      ))
    } catch {}
    Promise.all(
      next.map((col, i) =>
        supabase.from('kanban_column_settings')
          .update({ position: i, label: col.label, description: col.description ?? '' })
          .eq('board_key', boardKey)
          .eq('col_id', col.id)
      )
    ).catch(e => console.warn('[KanbanSettings] persistAll:', e.message))
  }

  // ── Renomear título ──────────────────────────────────────────────────────────
  const updateLabel = useCallback((colId, newLabel) => {
    setColumns(prev => {
      const next = prev.map(c => c.id === colId ? { ...c, label: newLabel } : c)
      persistAll(next)
      return next
    })
  }, [boardKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Editar subtítulo ─────────────────────────────────────────────────────────
  const updateDescription = useCallback((colId, newDesc) => {
    setColumns(prev => {
      const next = prev.map(c => c.id === colId ? { ...c, description: newDesc } : c)
      persistAll(next)
      return next
    })
  }, [boardKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Reordenar ─────────────────────────────────────────────────────────────────
  const reorder = useCallback((fromIdx, toIdx) => {
    setColumns(prev => {
      if (toIdx < 0 || toIdx >= prev.length) return prev
      const next = [...prev]
      const [item] = next.splice(fromIdx, 1)
      next.splice(toIdx, 0, item)
      persistAll(next)
      return next
    })
  }, [boardKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Adicionar coluna customizada ──────────────────────────────────────────────
  const addColumn = useCallback(async (label) => {
    if (!label?.trim()) return
    const colId = `custom_${Date.now()}`

    setColumns(prev => {
      const customCount = prev.filter(c => c.isCustom).length
      const colors = CUSTOM_PALETTE[customCount % CUSTOM_PALETTE.length]
      const newCol = { id: colId, label: label.trim(), description: '', isCustom: true, ...colors }
      const next = [...prev, newCol]
      persistAll(next)
      supabase.from('kanban_column_settings')
        .insert({ board_key: boardKey, col_id: colId, label: label.trim(), description: '', position: next.length - 1, is_custom: true })
        .then(({ error: e }) => { if (e) console.warn('[KanbanSettings] addColumn:', e.message) })
      return next
    })
  }, [boardKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Remover coluna customizada ────────────────────────────────────────────────
  const removeColumn = useCallback((colId) => {
    setColumns(prev => {
      const next = prev.filter(c => c.id !== colId)
      persistAll(next)
      return next
    })
    supabase.from('kanban_column_settings')
      .delete().eq('board_key', boardKey).eq('col_id', colId)
      .then(({ error: e }) => { if (e) console.warn('[KanbanSettings] removeColumn:', e.message) })
    // Fiscal: move cards da coluna removida para sem_consulta
    if (boardKey === 'fiscal') {
      supabase.from('fiscal_month_records')
        .update({ status: 'sem_consulta' }).eq('status', colId)
        .then(({ error: e }) => { if (e) console.warn('[KanbanSettings] reassign fiscal:', e.message) })
    }
    // Onboarding: move clients da coluna removida para sem_inicio
    if (boardKey === 'onboarding') {
      supabase.from('clients')
        .update({ onboarding_status: 'sem_inicio' }).eq('onboarding_status', colId)
        .then(({ error: e }) => { if (e) console.warn('[KanbanSettings] reassign onboarding:', e.message) })
    }
  }, [boardKey]) // eslint-disable-line react-hooks/exhaustive-deps

  return { columns, updateLabel, updateDescription, reorder, addColumn, removeColumn }
}
