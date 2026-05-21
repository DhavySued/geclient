import { useState } from 'react'
import { Draggable } from '@hello-pangea/dnd'
import { Calendar, CheckCircle2, X } from 'lucide-react'
import LevelBadge from './LevelBadge'

const STATUS_ACCENT = {
  sem_inicio:      { border: 'rgba(107,114,128,0.45)', glow: 'rgba(107,114,128,0.04)' },
  em_contato:      { border: 'rgba(59,130,246,0.50)',  glow: 'rgba(59,130,246,0.04)'  },
  aguardando_docs: { border: 'rgba(245,158,11,0.55)',  glow: 'rgba(245,158,11,0.04)'  },
  em_configuracao: { border: 'rgba(139,92,246,0.55)',  glow: 'rgba(139,92,246,0.04)'  },
  concluido:       { border: 'rgba(16,185,129,0.55)',  glow: 'rgba(16,185,129,0.04)'  },
}
const DEFAULT_ACCENT = { border: 'rgba(0,0,0,0.08)', glow: 'transparent' }

function formatSince(dateStr) {
  if (!dateStr) return null
  const diffDays = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Entrou hoje'
  if (diffDays === 1) return 'Há 1 dia'
  if (diffDays < 30)  return `Há ${diffDays} dias`
  const diffWeeks = Math.floor(diffDays / 7)
  if (diffDays < 60)  return `Há ${diffWeeks} semanas`
  const diffMonths = Math.floor(diffDays / 30)
  return `Há ${diffMonths} ${diffMonths === 1 ? 'mês' : 'meses'}`
}

export default function OnboardingCard({ client, index, onOpen, onFinalize, isDragDisabled = false }) {
  const [confirming, setConfirming] = useState(false)
  const accent       = STATUS_ACCENT[client.onboardingStatus ?? 'sem_inicio'] ?? DEFAULT_ACCENT
  const history      = client.onboardingHistory ?? []
  const currentEntry = history[history.length - 1] ?? null
  const sinceTxt     = formatSince(currentEntry?.enteredAt ?? client.onboardingStatusSince)

  function handleFinalize(e) {
    e.stopPropagation()
    onFinalize?.(client.id)
    setConfirming(false)
  }

  return (
    <Draggable draggableId={client.id} index={index} isDragDisabled={isDragDisabled}>
      {(provided, snapshot) => (
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
          <div
            onClick={() => { if (!snapshot.isDragging && !confirming) onOpen?.(client) }}
            className="rounded-2xl p-3.5"
            style={{
              background:  `linear-gradient(135deg, ${accent.glow} 0%, #ffffff 60%)`,
              border:      '1px solid rgba(0,0,0,0.08)',
              borderLeft:  `3px solid ${accent.border}`,
              boxShadow:   snapshot.isDragging
                ? `0 20px 48px rgba(0,0,0,0.22), 0 0 0 2px ${accent.border}`
                : '0 1px 8px rgba(0,0,0,0.08)',
              outline:     'none',
              transition:  'box-shadow 150ms ease',
              cursor:      snapshot.isDragging ? 'grabbing' : 'pointer',
            }}
          >
            {/* Cabeçalho */}
            <div className="flex items-start justify-between gap-2 mb-2.5">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold leading-snug text-gray-900 truncate" title={client.name}>
                  {client.name}
                </p>
                <p className="text-[11px] mt-0.5 text-gray-400 truncate">{client.regime}</p>
              </div>
              <div className="flex-shrink-0">
                <LevelBadge level={client.level} />
              </div>
            </div>

            {/* Data na etapa */}
            <div
              className="flex items-center gap-1.5 mb-3 px-2 py-1 rounded-lg"
              style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.05)' }}
            >
              <Calendar size={10} style={{ color: '#9CA3AF', flexShrink: 0 }} />
              <span className="text-[11px]" style={{ color: sinceTxt ? '#6B7280' : '#D1D5DB' }}>
                {sinceTxt ?? 'Etapa sem data registrada'}
              </span>
            </div>

            {/* Observações — só leitura */}
            {(client.notes ?? '') ? (
              <div
                className="mb-3 rounded-lg px-2 py-1.5"
                style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)' }}
              >
                <p className="text-[11px] leading-relaxed line-clamp-3" style={{ color: '#6B7280' }}>
                  {client.notes}
                </p>
              </div>
            ) : null}

            {/* Footer: Finalizar */}
            <div className="flex items-center justify-end pt-1" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              {confirming ? (
                <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                  <span className="text-[10px] font-medium" style={{ color: '#6B7280' }}>Finalizar?</span>
                  <button
                    onClick={handleFinalize}
                    className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold"
                    style={{ background: 'rgba(16,185,129,0.12)', color: '#059669', border: '1px solid rgba(16,185,129,0.25)' }}
                  >
                    <CheckCircle2 size={10} />
                    Sim
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setConfirming(false) }}
                    className="p-0.5 rounded-md"
                    style={{ color: '#9CA3AF' }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={e => { e.stopPropagation(); setConfirming(true) }}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium transition-all"
                  style={{ color: '#9CA3AF', border: '1px solid transparent' }}
                  onMouseEnter={e => {
                    e.currentTarget.style.color = '#059669'
                    e.currentTarget.style.background = 'rgba(16,185,129,0.08)'
                    e.currentTarget.style.borderColor = 'rgba(16,185,129,0.20)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.color = '#9CA3AF'
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.borderColor = 'transparent'
                  }}
                >
                  <CheckCircle2 size={10} />
                  Finalizar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  )
}
