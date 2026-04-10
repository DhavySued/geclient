import { Draggable } from '@hello-pangea/dnd'
import { MessageSquare, User, Clock } from 'lucide-react'
import LevelBadge from './LevelBadge'

const STATUS_ACCENT = {
  cliente_novo: { border: 'rgba(245,158,11,0.55)',  glow: 'rgba(245,158,11,0.05)'  },
  promotor:     { border: 'rgba(16,185,129,0.55)',  glow: 'rgba(16,185,129,0.05)'  },
  neutro:       { border: 'rgba(59,130,246,0.55)',  glow: 'rgba(59,130,246,0.05)'  },
  risco_churn:  { border: 'rgba(249,115,22,0.55)',  glow: 'rgba(249,115,22,0.05)'  },
  detrator:     { border: 'rgba(239,68,68,0.55)',   glow: 'rgba(239,68,68,0.05)'   },
}
const DEFAULT_ACCENT = { border: 'rgba(255,255,255,0.08)', glow: 'rgba(255,255,255,0.02)' }

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export default function CXCard({ client, index, onOpen }) {
  const accent = STATUS_ACCENT[client.cxStatus] ?? DEFAULT_ACCENT

  return (
    <Draggable draggableId={client.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => { if (!snapshot.isDragging) onOpen?.(client) }}
          className="rounded-2xl p-4 cursor-grab active:cursor-grabbing"
          style={{
            background: `linear-gradient(135deg, ${accent.glow} 0%, rgba(17,19,24,0.95) 60%)`,
            border: '1px solid rgba(255,255,255,0.07)',
            borderLeft: `3px solid ${accent.border}`,
            boxShadow: snapshot.isDragging
              ? `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${accent.border}`
              : '0 1px 8px rgba(0,0,0,0.3)',
            transition: 'box-shadow 150ms ease',
            willChange: 'transform',
          }}
        >
          {/* Level + Name */}
          <div className="mb-2.5">
            <div className="mb-1.5">
              <LevelBadge level={client.level} />
            </div>
            <p className="text-[13px] font-semibold leading-snug" style={{ color: '#F1F1F3' }} title={client.name}>
              {client.name}
            </p>
            <p className="text-[11px] mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.32)' }}>
              {client.regime}
            </p>
          </div>

          {/* Notes */}
          {client.notes && (
            <div className="flex items-start gap-1.5 pb-2.5 mb-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <MessageSquare size={10} style={{ color: 'rgba(255,255,255,0.22)', flexShrink: 0, marginTop: 1 }} />
              <p className="text-[11px] leading-relaxed line-clamp-2" style={{ color: 'rgba(255,255,255,0.38)' }}>
                {client.notes}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2" style={{ borderTop: client.notes ? undefined : '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.28)' }}>
              <User size={10} />
              <span className="text-[11px] truncate max-w-[90px]">{client.responsible || '—'}</span>
            </div>
            <div className="flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.28)' }}>
              <Clock size={10} />
              <span className="text-[11px]">{formatDate(client.lastInteraction)}</span>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  )
}
