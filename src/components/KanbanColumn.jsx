import { Droppable } from '@hello-pangea/dnd'

// Mapeia o id da coluna para a cor de acento (border esquerda + glow)
const ACCENT = {
  sem_consulta:       { border: 'rgba(156,163,175,0.5)',  glow: 'rgba(107,114,128,0.08)',  pill: 'rgba(156,163,175,0.12)', pillText: '#9CA3AF' },
  com_pendencia:      { border: 'rgba(239,68,68,0.55)',   glow: 'rgba(239,68,68,0.07)',    pill: 'rgba(239,68,68,0.14)',   pillText: '#FCA5A5' },
  comunicado_cliente: { border: 'rgba(59,130,246,0.55)',  glow: 'rgba(59,130,246,0.07)',   pill: 'rgba(59,130,246,0.14)',  pillText: '#93C5FD' },
  em_regularizacao:   { border: 'rgba(168,85,247,0.55)',  glow: 'rgba(168,85,247,0.07)',   pill: 'rgba(168,85,247,0.14)',  pillText: '#C4B5FD' },
  resolvido:          { border: 'rgba(20,184,166,0.55)',  glow: 'rgba(20,184,166,0.07)',   pill: 'rgba(20,184,166,0.14)',  pillText: '#5EEAD4' },
  sem_pendencia:      { border: 'rgba(16,185,129,0.55)',  glow: 'rgba(16,185,129,0.07)',   pill: 'rgba(16,185,129,0.14)',  pillText: '#6EE7B7' },
  cliente_novo:       { border: 'rgba(245,158,11,0.55)',  glow: 'rgba(245,158,11,0.07)',   pill: 'rgba(245,158,11,0.14)',  pillText: '#FCD34D' },
  promotor:           { border: 'rgba(16,185,129,0.55)',  glow: 'rgba(16,185,129,0.07)',   pill: 'rgba(16,185,129,0.14)',  pillText: '#6EE7B7' },
  neutro:             { border: 'rgba(59,130,246,0.55)',  glow: 'rgba(59,130,246,0.07)',   pill: 'rgba(59,130,246,0.14)',  pillText: '#93C5FD' },
  risco_churn:        { border: 'rgba(249,115,22,0.55)',  glow: 'rgba(249,115,22,0.07)',   pill: 'rgba(249,115,22,0.14)',  pillText: '#FDBA74' },
  detrator:           { border: 'rgba(239,68,68,0.55)',   glow: 'rgba(239,68,68,0.07)',    pill: 'rgba(239,68,68,0.14)',   pillText: '#FCA5A5' },
}

const FALLBACK = { border: 'rgba(255,255,255,0.10)', glow: 'rgba(255,255,255,0.03)', pill: 'rgba(255,255,255,0.08)', pillText: '#9CA3AF' }

export default function KanbanColumn({ column, children, colorConfig }) {
  const accent = ACCENT[column.id] ?? FALLBACK
  const count  = column.clients.length

  return (
    <div className="kanban-column">
      {/* Column Header */}
      <div
        className="rounded-2xl px-4 py-3.5 flex-shrink-0"
        style={{
          background: `linear-gradient(135deg, ${accent.glow} 0%, rgba(255,255,255,0.02) 100%)`,
          border: `1px solid ${accent.border}`,
          borderLeftWidth: '3px',
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] font-semibold leading-tight truncate" style={{ color: '#F1F1F3' }}>
            {column.label}
          </p>
          <span
            className="flex-shrink-0 text-[11px] font-bold px-2.5 py-0.5 rounded-full"
            style={{ background: accent.pill, color: accent.pillText }}
          >
            {count}
          </span>
        </div>
        {column.description && (
          <p className="text-[11px] mt-1 truncate" style={{ color: 'rgba(255,255,255,0.28)' }}>
            {column.description}
          </p>
        )}
      </div>

      {/* Droppable Area */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex flex-col gap-2.5 min-h-[100px] rounded-2xl p-1.5 transition-colors duration-150"
            style={snapshot.isDraggingOver ? {
              background: accent.glow,
              border: `2px dashed ${accent.border}`,
            } : {
              border: '2px solid transparent',
            }}
          >
            {children}
            {provided.placeholder}
            {count === 0 && !snapshot.isDraggingOver && (
              <div className="flex items-center justify-center h-14 rounded-xl"
                style={{ border: '1px dashed rgba(255,255,255,0.07)' }}>
                <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.18)' }}>Sem clientes</p>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  )
}
