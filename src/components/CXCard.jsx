import { Draggable } from '@hello-pangea/dnd'
import { MessageSquare, Clock } from 'lucide-react'
import LevelBadge from './LevelBadge'

const STATUS_ACCENT = {
  cliente_novo: { border: 'rgba(243,146,0,0.50)',   glow: 'rgba(243,146,0,0.04)'   },
  promotor:     { border: 'rgba(16,185,129,0.50)',  glow: 'rgba(16,185,129,0.04)'  },
  neutro:       { border: 'rgba(59,130,246,0.50)',  glow: 'rgba(59,130,246,0.04)'  },
  risco_churn:  { border: 'rgba(249,115,22,0.50)',  glow: 'rgba(249,115,22,0.04)'  },
  detrator:     { border: 'rgba(239,68,68,0.50)',   glow: 'rgba(239,68,68,0.04)'   },
}
const DEFAULT_ACCENT = { border: 'rgba(0,0,0,0.08)', glow: 'transparent' }

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export default function CXCard({ client, index, onOpen, isDragDisabled = false }) {
  const accent = STATUS_ACCENT[client.cxStatus] ?? DEFAULT_ACCENT

  return (
    <Draggable draggableId={client.id} index={index} isDragDisabled={isDragDisabled}>
      {(provided, snapshot) => (
        /*
         * DIV EXTERNA — controlada 100% pela biblioteca DnD.
         * Não adicionamos transition aqui para não quebrar as animações internas.
         */
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{
            ...provided.draggableProps.style,
            ...(snapshot.isDropAnimating ? { transitionDuration: '0.001s' } : {}),
            cursor: isDragDisabled ? 'default' : snapshot.isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
          }}
        >
          {/*
           * DIV INTERNA — visual puro, sem interferir no DnD.
           */}
          <div
            onClick={() => { if (!snapshot.isDragging) onOpen?.(client) }}
            className="rounded-2xl p-4"
            style={{
              background:  `linear-gradient(135deg, ${accent.glow} 0%, #ffffff 60%)`,
              border:      '1px solid rgba(0,0,0,0.08)',
              borderLeft:  `3px solid ${accent.border}`,
              boxShadow:   snapshot.isDragging
                ? `0 20px 48px rgba(0,0,0,0.22), 0 0 0 2px ${accent.border}`
                : '0 1px 8px rgba(0,0,0,0.08)',
              outline:     'none',
              transition:  'box-shadow 150ms ease',
            }}
          >
            {/* Level + Name */}
            <div className="mb-2.5">
              <div className="mb-1.5">
                <LevelBadge level={client.level} />
              </div>
              <p className="text-[13px] font-semibold leading-snug" style={{ color: '#111827' }} title={client.name}>
                {client.name}
              </p>
              <p className="text-[11px] mt-0.5 truncate" style={{ color: '#9CA3AF' }}>
                {client.regime}
              </p>
            </div>

            {/* Notes */}
            {client.notes && (
              <div className="flex items-start gap-1.5 pb-2.5 mb-2.5" style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                <MessageSquare size={10} style={{ color: '#9CA3AF', flexShrink: 0, marginTop: 1 }} />
                <p className="text-[11px] leading-relaxed line-clamp-2" style={{ color: '#6B7280' }}>
                  {client.notes}
                </p>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-end pt-2" style={{ borderTop: client.notes ? undefined : '1px solid rgba(0,0,0,0.07)' }}>
              <div className="flex items-center gap-1" style={{ color: '#9CA3AF' }}>
                <Clock size={10} />
                <span className="text-[11px]">{formatDate(client.lastInteraction)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  )
}
