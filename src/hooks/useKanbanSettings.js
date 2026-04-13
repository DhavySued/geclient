import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const LS_KEY = 'geclient_kanban_settings'  // localStorage fallback

// Paleta de cores para colunas criadas pelo usuário
const CUSTOM_PALETTE = [
  { bg: 'bg-sky-500/10',    border: 'border-sky-500/30',    text: 'text-sky-400',    dot: 'bg-sky-400',    headerBg: 'bg-sky-100' },
  { bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-400', dot: 'bg-violet-400', headerBg: 'bg-violet-100' },
  { bg: 'bg-rose-500/10',   border: 'border-rose-500/30',   text: 'text-rose-400',   dot: 'bg-rose-400',   headerBg: 'bg-rose-100' },
  { bg: 'bg-amber-500/10',  border: 'border-amber-500/30',  text: 'text-amber-400',  dot: 'bg-amber-400',  headerBg: 'bg-amber-100' },
  { bg: 'bg-cyan-500/10',   border: 'border-cyan-500/30',   text: 'text-cyan-400',   dot: 'bg-cyan-400',   headerBg: 'bg-cyan-100' },
]

// ── localStorage helpers ───────────────────────────────────────────────────────
function lsLoad(boardKey) {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}')[boardKey] ?? null }
  catch { return null }
}

function lsSave(boardKey, rows) {
  try {
    const all = JSON.parse(localStorage.getItem(LS_KEY) || '{}')
    localStorage.setItem(LS_KEY, JSON.stringify({ ...all, [boardKey]: rows }))
  } catch { /* ignore */ }
}

// ── Helpers de merge ────────────────────────────────────────────────────────────
// Recebe rows: [{ col_id, label, is_custom }] e mescla com config de cor dos defaults
function mergeRows(rows, defaultMap) {
  let customCount = 0
  return rows.map(row => {
    const def = defaultMap[row.col_id]
    if (def) return { ...def, label: row.label }
    const colors = CUSTOM_PALETTE[customCount++ % CUSTOM_PALETTE.length]
    return { id: row.col_id, label: row.label, description: '', isCustom: true, ...colors }
  })
}

/**
 * useKanbanSettings
 *
 * Estratégia dual:
 *   1. Renderiza imediatamente com localStorage (sem flash)
 *   2. Tenta carregar do Supabase — se existir, usa e atualiza o cache local
 *   3. Se Supabase falhar (tabela não criada ainda), continua com localStorage
 *   4. Todas as mutações escrevem em ambos simultaneamente
 */
export function useKanbanSettings(boardKey, defaultColumns) {
  const defaultMap = Object.fromEntries(defaultColumns.map(c => [c.id, c]))

  // Inicializa do localStorage para render imediato sem flash
  const [columns, setColumns] = useState(() => {
    const stored = lsLoad(boardKey)
    if (stored?.length) return mergeRows(stored, defaultMap)
    return defaultColumns
  })

  // ── Carga do Supabase (sobrescreve localStorage se tiver dados) ────────────
  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data, error } = await supabase
        .from('kanban_column_settings')
        .select('col_id, label, position, is_custom')
        .eq('board_key', boardKey)
        .order('position')

      if (cancelled) return

      // Tabela não existe ainda ou outro erro — mantém localStorage
      if (error) { console.warn('[KanbanSettings] Supabase indisponível, usando cache local:', error.message); return }

      if (!data || data.length === 0) {
        // Primeira vez no Supabase — semeia com os dados atuais (localStorage ou defaults)
        const current = lsLoad(boardKey) ?? defaultColumns.map((c, i) => ({ col_id: c.id, label: c.label, position: i, is_custom: false }))
        const rows = current.map((row, i) => ({
          board_key: boardKey,
          col_id:    row.col_id ?? row.id,
          label:     row.label,
          position:  i,
          is_custom: row.is_custom ?? false,
        }))
        supabase.from('kanban_column_settings').insert(rows)
          .then(({ error: e }) => { if (e) console.warn('[KanbanSettings] seed:', e.message) })
        return  // mantém o que já está em memória
      }

      // Tem dados no Supabase → atualiza memória + localStorage
      const rows = data.map(r => ({ col_id: r.col_id, label: r.label, is_custom: r.is_custom }))
      lsSave(boardKey, rows)
      setColumns(mergeRows(rows, defaultMap))
    }

    load()
    return () => { cancelled = true }
  }, [boardKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Persist helper (escreve em ambos) ────────────────────────────────────────
  function persistAll(next) {
    const rows = next.map(c => ({ col_id: c.id, label: c.label, is_custom: c.isCustom ?? false }))
    lsSave(boardKey, rows)
    // Atualiza posições no Supabase — falha silenciosa se tabela não existir
    Promise.all(
      next.map((col, i) =>
        supabase.from('kanban_column_settings')
          .update({ position: i, label: col.label })
          .eq('board_key', boardKey)
          .eq('col_id', col.id)
      )
    ).catch(e => console.warn('[KanbanSettings] persistAll:', e.message))
  }

  // ── Renomear ─────────────────────────────────────────────────────────────────
  const updateLabel = useCallback((colId, newLabel) => {
    setColumns(prev => {
      const next = prev.map(c => c.id === colId ? { ...c, label: newLabel } : c)
      persistAll(next)
      return next
    })
  }, [boardKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Reordenar ────────────────────────────────────────────────────────────────
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

  // ── Adicionar coluna customizada ─────────────────────────────────────────────
  const addColumn = useCallback(async (label) => {
    if (!label?.trim()) return
    const colId = `custom_${Date.now()}`

    setColumns(prev => {
      const customCount = prev.filter(c => c.isCustom).length
      const colors = CUSTOM_PALETTE[customCount % CUSTOM_PALETTE.length]
      const newCol = { id: colId, label: label.trim(), description: '', isCustom: true, ...colors }
      const next = [...prev, newCol]
      persistAll(next)
      // Também insere no Supabase (além do update de posições)
      supabase.from('kanban_column_settings')
        .insert({ board_key: boardKey, col_id: colId, label: label.trim(), position: next.length - 1, is_custom: true })
        .then(({ error: e }) => { if (e) console.warn('[KanbanSettings] addColumn:', e.message) })
      return next
    })
  }, [boardKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Remover coluna customizada ───────────────────────────────────────────────
  const removeColumn = useCallback((colId) => {
    setColumns(prev => {
      const next = prev.filter(c => c.id !== colId)
      persistAll(next)
      return next
    })
    // Remove do Supabase
    supabase.from('kanban_column_settings')
      .delete().eq('board_key', boardKey).eq('col_id', colId)
      .then(({ error: e }) => { if (e) console.warn('[KanbanSettings] removeColumn:', e.message) })
    // Fiscal: move cards da coluna removida para sem_consulta
    if (boardKey === 'fiscal') {
      supabase.from('fiscal_month_records')
        .update({ status: 'sem_consulta' }).eq('status', colId)
        .then(({ error: e }) => { if (e) console.warn('[KanbanSettings] reassign:', e.message) })
    }
  }, [boardKey]) // eslint-disable-line react-hooks/exhaustive-deps

  return { columns, updateLabel, reorder, addColumn, removeColumn }
}
