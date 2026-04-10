import { memo } from 'react'
import { Draggable } from '@hello-pangea/dnd'
import { FileText, Clock, User } from 'lucide-react'
import LevelBadge from './LevelBadge'
import { calcFiscalScore, getApplicableItems } from '../hooks/useFiscalItems'
import { useFiscalItemsCtx } from '../context/FiscalItemsContext'
import { useFiscalConfig } from '../context/FiscalConfigContext'

const STATUS_ACCENT = {
  sem_consulta:       { border: 'rgba(156,163,175,0.45)', glow: 'rgba(107,114,128,0.05)',  bar: '#6B7280', text: '#9CA3AF' },
  com_pendencia:      { border: 'rgba(239,68,68,0.50)',   glow: 'rgba(239,68,68,0.06)',    bar: '#EF4444', text: '#FCA5A5' },
  comunicado_cliente: { border: 'rgba(59,130,246,0.50)',  glow: 'rgba(59,130,246,0.06)',   bar: '#3B82F6', text: '#93C5FD' },
  em_regularizacao:   { border: 'rgba(168,85,247,0.50)',  glow: 'rgba(168,85,247,0.06)',   bar: '#A855F7', text: '#C4B5FD' },
  resolvido:          { border: 'rgba(20,184,166,0.50)',  glow: 'rgba(20,184,166,0.06)',   bar: '#14B8A6', text: '#5EEAD4' },
  sem_pendencia:      { border: 'rgba(16,185,129,0.50)',  glow: 'rgba(16,185,129,0.06)',   bar: '#10B981', text: '#6EE7B7' },
}
const DEFAULT_ACCENT = { border: 'rgba(255,255,255,0.08)', glow: 'rgba(255,255,255,0.02)', bar: '#6B7280', text: '#9CA3AF' }

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function ScoreBar({ score }) {
  if (score === null) return null
  const s = score ?? 0
  const color = s >= 80 ? '#10B981' : s >= 55 ? '#F59E0B' : s >= 30 ? '#F97316' : '#EF4444'
  const textColor = s >= 80 ? '#6EE7B7' : s >= 55 ? '#FCD34D' : s >= 30 ? '#FDBA74' : '#FCA5A5'
  return (
    <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[10px] font-medium tracking-wide uppercase" style={{ color: 'rgba(255,255,255,0.28)' }}>
          Score Fiscal
        </span>
        <span className="text-[11px] font-semibold" style={{ color: textColor }}>{s}/100</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
        <div className="h-full rounded-full" style={{ width: `${s}%`, background: color }} />
      </div>
    </div>
  )
}

const FiscalCard = memo(function FiscalCard({ client, index, record, onOpen }) {
  const { fiscalItems }                            = useFiscalItemsCtx()
  const { regimeItems, conditionItems, tipoItems } = useFiscalConfig()

  const applicableItems = getApplicableItems(client, fiscalItems, regimeItems, conditionItems, tipoItems)
  const fiscalScore     = applicableItems.length > 0
    ? calcFiscalScore(record?.checks ?? {}, applicableItems)
    : null

  const status  = record?.status ?? client.fiscalStatus ?? 'sem_consulta'
  const accent  = STATUS_ACCENT[status] ?? DEFAULT_ACCENT

  const displayDate = record?.updatedAt
    ? formatDate(record.updatedAt)
    : formatDate(client.lastInteraction)
  const dateLabel = record?.updatedAt ? 'Última análise' : 'Última interação'

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
            border: `1px solid rgba(255,255,255,0.07)`,
            borderLeft: `3px solid ${accent.border}`,
            boxShadow: snapshot.isDragging
              ? `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${accent.border}`
              : '0 1px 8px rgba(0,0,0,0.3)',
            transition: 'box-shadow 150ms ease, border-color 150ms ease',
            willChange: 'transform',
          }}
        >
          {/* Level + Name */}
          <div className="mb-2.5">
            <div className="mb-1.5">
              <LevelBadge level={client.level} />
            </div>
            <p className="text-[13px] font-semibold leading-snug truncate" style={{ color: '#F1F1F3' }} title={client.name}>
              {client.name}
            </p>
            <p className="text-[11px] mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.32)' }}>
              {client.cnpj}
            </p>
          </div>

          {/* Regime */}
          <div className="flex items-center gap-1.5 mb-0.5">
            <FileText size={10} style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
            <span className="text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.38)' }}>
              {client.regime}
            </span>
          </div>

          {/* Score bar */}
          <ScoreBar score={fiscalScore} />

          {/* Footer */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.28)' }}>
              <User size={10} />
              <span className="text-[11px] truncate max-w-[90px]">{client.responsible || '—'}</span>
            </div>
            <div className="flex items-center gap-1" title={dateLabel} style={{ color: 'rgba(255,255,255,0.28)' }}>
              <Clock size={10} />
              <span className="text-[11px]">{displayDate}</span>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  )
})

export default FiscalCard
