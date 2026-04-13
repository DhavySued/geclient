import { Droppable } from '@hello-pangea/dnd'

const ACCENT = {
  sem_consulta:       { border: 'rgba(107,114,128,0.40)', glow: 'rgba(107,114,128,0.05)',  pill: 'rgba(107,114,128,0.10)', pillText: '#6B7280' },
  com_pendencia:      { border: 'rgba(239,68,68,0.50)',   glow: 'rgba(239,68,68,0.05)',    pill: 'rgba(239,68,68,0.10)',   pillText: '#DC2626' },
  comunicado_cliente: { border: 'rgba(59,130,246,0.50)',  glow: 'rgba(59,130,246,0.05)',   pill: 'rgba(59,130,246,0.10)',  pillText: '#2563EB' },
  em_regularizacao:   { border: 'rgba(168,85,247,0.50)',  glow: 'rgba(168,85,247,0.05)',   pill: 'rgba(168,85,247,0.10)',  pillText: '#7C3AED' },
  resolvido:          { border: 'rgba(20,184,166,0.50)',  glow: 'rgba(20,184,166,0.05)',   pill: 'rgba(20,184,166,0.10)',  pillText: '#0D9488' },
  sem_pendencia:      { border: 'rgba(16,185,129,0.50)',  glow: 'rgba(16,185,129,0.05)',   pill: 'rgba(16,185,129,0.10)',  pillText: '#059669' },
  cliente_novo:       { border: 'rgba(243,146,0,0.50)',   glow: 'rgba(243,146,0,0.05)',    pill: 'rgba(243,146,0,0.10)',   pillText: '#c97700' },
  promotor:           { border: 'rgba(16,185,129,0.50)',  glow: 'rgba(16,185,129,0.05)',   pill: 'rgba(16,185,129,0.10)',  pillText: '#059669' },
  neutro:             { border: 'rgba(59,130,246,0.50)',  glow: 'rgba(59,130,246,0.05)',   pill: 'rgba(59,130,246,0.10)',  pillText: '#2563EB' },
  risco_churn:        { border: 'rgba(249,115,22,0.50)',  glow: 'rgba(249,115,22,0.05)',   pill: 'rgba(249,115,22,0.10)',  pillText: '#EA580C' },
  detrator:           { border: 'rgba(239,68,68,0.50)',   glow: 'rgba(239,68,68,0.05)',    pill: 'rgba(239,68,68,0.10)',   pillText: '#DC2626' },
}

const FALLBACK = { border: 'rgba(0,0,0,0.10)', glow: 'rgba(0,0,0,0.03)', pill: 'rgba(0,0,0,0.08)', pillText: '#9CA3AF' }

// ── Header avulso — usado na linha sticky fora do overflow-x ──────────────────
export function KanbanColumnHeader({ column }) {
  const accent = ACCENT[column.id] ?? FALLBACK
  const count  = column.clients?.length ?? 0
  return (
    <div
      className="min-w-[272px] w-[272px] flex-shrink-0 rounded-2xl px-4 py-3.5"
      style={{
        background: `linear-gradient(135deg, ${accent.glow} 0%, rgba(249,250,251,0.95) 100%)`,
        backdropFilter: 'blur(8px)',
        border: `1px solid ${accent.border}`,
        borderLeftWidth: '3px',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-semibold leading-tight truncate" style={{ color: '#111827' }}>
          {column.label}
        </p>
        <span className="flex-shrink-0 text-[11px] font-bold px-2.5 py-0.5 rounded-full"
          style={{ background: accent.pill, color: accent.pillText }}>
          {count}
        </span>
      </div>
      {column.description && (
        <p className="text-[11px] mt-1 truncate" style={{ color: '#9CA3AF' }}>
          {column.description}
        </p>
      )}
    </div>
  )
}

// ── Coluna completa ───────────────────────────────────────────────────────────
export default function KanbanColumn({ column, children, colorConfig, showHeader = true }) {
  const accent = ACCENT[column.id] ?? FALLBACK
  const count  = column.clients.length

  return (
    <div className="kanban-column">
      {showHeader && (
        <div
          className="rounded-2xl px-4 py-3.5 flex-shrink-0"
          style={{
            background: `linear-gradient(135deg, ${accent.glow} 0%, rgba(249,250,251,0.95) 100%)`,
            backdropFilter: 'blur(8px)',
            border: `1px solid ${accent.border}`,
            borderLeftWidth: '3px',
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] font-semibold leading-tight truncate" style={{ color: '#111827' }}>
              {column.label}
            </p>
            <span className="flex-shrink-0 text-[11px] font-bold px-2.5 py-0.5 rounded-full"
              style={{ background: accent.pill, color: accent.pillText }}>
              {count}
            </span>
          </div>
          {column.description && (
            <p className="text-[11px] mt-1 truncate" style={{ color: '#9CA3AF' }}>
              {column.description}
            </p>
          )}
        </div>
      )}

      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex flex-col gap-2.5 rounded-2xl p-1.5 flex-1"
            style={{
              background:   snapshot.isDraggingOver ? accent.glow                   : 'transparent',
              border:       snapshot.isDraggingOver ? `2px dashed ${accent.border}` : '2px solid transparent',
              borderRadius: '16px',
            }}
          >
            {children}
            {provided.placeholder}
            {count === 0 && !snapshot.isDraggingOver && (
              <div className="flex items-center justify-center h-14 rounded-xl"
                style={{ border: '1px dashed rgba(0,0,0,0.08)' }}>
                <p className="text-[11px]" style={{ color: '#9CA3AF' }}>Sem clientes</p>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  )
}
