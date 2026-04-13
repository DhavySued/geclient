import { memo } from 'react'
import { Draggable } from '@hello-pangea/dnd'
import { FileText, Clock, AlertTriangle } from 'lucide-react'
import LevelBadge from './LevelBadge'
import { calcFiscalScore, getApplicableItems } from '../hooks/useFiscalItems'
import { useFiscalItemsCtx } from '../context/FiscalItemsContext'
import { useFiscalConfig } from '../context/FiscalConfigContext'

const STATUS_ACCENT = {
  sem_consulta:       { border: 'rgba(107,114,128,0.40)', glow: 'rgba(107,114,128,0.04)',  bar: '#6B7280', text: '#6B7280' },
  com_pendencia:      { border: 'rgba(239,68,68,0.50)',   glow: 'rgba(239,68,68,0.04)',    bar: '#EF4444', text: '#DC2626' },
  comunicado_cliente: { border: 'rgba(59,130,246,0.50)',  glow: 'rgba(59,130,246,0.04)',   bar: '#3B82F6', text: '#2563EB' },
  em_regularizacao:   { border: 'rgba(168,85,247,0.50)',  glow: 'rgba(168,85,247,0.04)',   bar: '#A855F7', text: '#7C3AED' },
  resolvido:          { border: 'rgba(20,184,166,0.50)',  glow: 'rgba(20,184,166,0.04)',   bar: '#14B8A6', text: '#0D9488' },
  sem_pendencia:      { border: 'rgba(16,185,129,0.50)',  glow: 'rgba(16,185,129,0.04)',   bar: '#10B981', text: '#059669' },
}
const DEFAULT_ACCENT = { border: 'rgba(0,0,0,0.08)', glow: 'transparent', bar: '#6B7280', text: '#9CA3AF' }

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function ScoreBar({ score }) {
  if (score === null) return null
  const s = score ?? 0
  const color     = s >= 80 ? '#10B981' : s >= 55 ? '#f39200' : s >= 30 ? '#F97316' : '#EF4444'
  const textColor = s >= 80 ? '#059669' : s >= 55 ? '#c97700' : s >= 30 ? '#EA580C' : '#DC2626'
  return (
    <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(0,0,0,0.07)' }}>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[10px] font-medium tracking-wide uppercase" style={{ color: '#9CA3AF' }}>
          Score Fiscal
        </span>
        <span className="text-[11px] font-semibold" style={{ color: textColor }}>{s}/100</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.08)' }}>
        <div className="h-full rounded-full" style={{ width: `${s}%`, background: color }} />
      </div>
    </div>
  )
}

const FiscalCard = memo(function FiscalCard({ client, index, record, onOpen, isDragDisabled = false }) {
  const { fiscalItems }                            = useFiscalItemsCtx()
  const { regimeItems, conditionItems, tipoItems } = useFiscalConfig()

  const applicableItems = getApplicableItems(client, fiscalItems, regimeItems, conditionItems, tipoItems)
  const fiscalScore     = applicableItems.length > 0
    ? calcFiscalScore(record?.checks ?? {}, applicableItems)
    : null

  const status = record?.status ?? client.fiscalStatus ?? 'sem_consulta'
  const accent = STATUS_ACCENT[status] ?? DEFAULT_ACCENT

  const displayDate = record?.updatedAt
    ? formatDate(record.updatedAt)
    : formatDate(client.lastInteraction)
  const dateLabel = record?.updatedAt ? 'Última análise' : 'Última interação'

  return (
    <Draggable draggableId={client.id} index={index} isDragDisabled={isDragDisabled}>
      {(provided, snapshot) => (
        /*
         * DIV EXTERNA — controlada 100% pela biblioteca DnD.
         * Só tem o que o @hello-pangea/dnd precisa: ref, draggableProps,
         * dragHandleProps. Não colocamos transition aqui porque o DnD usa
         * essa propriedade internamente para animar snap-back e reordenação.
         */
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{
            ...provided.draggableProps.style,   // posicionamento da biblioteca (NUNCA sobrescrever)
            // Zera a duração da animação de drop → sem delay ao soltar o card
            ...(snapshot.isDropAnimating ? { transitionDuration: '0.001s' } : {}),
            cursor: isDragDisabled ? 'default' : snapshot.isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
          }}
        >
          {/*
           * DIV INTERNA — visual puro.
           * Aqui sim podemos ter transition, border, shadow, etc.
           * Como não é o elemento que a biblioteca controla, não há conflito.
           */}
          <div
            onClick={() => { if (!snapshot.isDragging) onOpen?.(client) }}
            className="rounded-2xl p-4"
            style={{
              background:  `linear-gradient(135deg, ${accent.glow} 0%, #ffffff 60%)`,
              border:      `1px solid rgba(0,0,0,0.08)`,
              borderLeft:  `3px solid ${accent.border}`,
              boxShadow:   snapshot.isDragging
                ? `0 20px 48px rgba(0,0,0,0.22), 0 0 0 2px ${accent.border}`
                : '0 1px 8px rgba(0,0,0,0.08)',
              outline:     'none',
              transition:  'box-shadow 150ms ease, border-color 150ms ease',
            }}
          >
            {/* Level + Name */}
            <div className="mb-2.5">
              <div className="mb-1.5">
                <LevelBadge level={client.level} />
              </div>
              <p className="text-[13px] font-semibold leading-snug truncate" style={{ color: '#111827' }} title={client.name}>
                {client.name}
              </p>
              <p className="text-[11px] mt-0.5 truncate" style={{ color: '#9CA3AF' }}>
                {client.cnpj}
              </p>
            </div>

            {/* Regime + alerta exclusão Simples */}
            <div className="flex items-center gap-1.5 mb-0.5">
              <FileText size={10} style={{ color: '#9CA3AF', flexShrink: 0 }} />
              <span className="text-[11px] truncate" style={{ color: '#6B7280' }}>
                {client.regime}
              </span>
              {client.emExclusaoSimples && (
                <span
                  title="Em exclusão do Simples"
                  className="ml-auto flex-shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                  style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.30)' }}
                >
                  <AlertTriangle size={8} />
                  Exclusão
                </span>
              )}
            </div>

            {/* Score bar */}
            <ScoreBar score={fiscalScore} />

            {/* Footer */}
            <div className="flex items-center justify-end mt-3">
              <div className="flex items-center gap-1" title={dateLabel} style={{ color: '#9CA3AF' }}>
                <Clock size={10} />
                <span className="text-[11px]">{displayDate}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  )
})

export default FiscalCard
