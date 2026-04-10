import { memo } from 'react'
import { Draggable } from '@hello-pangea/dnd'
import { FileX, Clock, User } from 'lucide-react'
import LevelBadge from './LevelBadge'
import { calcFiscalScore, getApplicableItems } from '../hooks/useFiscalItems'
import { useFiscalItemsCtx } from '../context/FiscalItemsContext'
import { useFiscalConfig } from '../context/FiscalConfigContext'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function ScoreBar({ score }) {
  if (score === null) return null
  const s = score ?? 0
  const color =
    s >= 80 ? 'bg-emerald-500' :
    s >= 55 ? 'bg-yellow-400' :
    s >= 30 ? 'bg-orange-500' : 'bg-red-600'
  const textColor =
    s >= 80 ? 'text-emerald-400' :
    s >= 55 ? 'text-yellow-300' :
    s >= 30 ? 'text-orange-400' : 'text-red-400'
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] text-gray-600">Score Fiscal</span>
        <span className={`text-[10px] font-bold ${textColor}`}>{s}/100</span>
      </div>
      <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${s}%` }} />
      </div>
    </div>
  )
}

// record é passado pelo pai — não lê do contexto para não re-renderizar durante drag
const FiscalCard = memo(function FiscalCard({ client, index, record, onOpen }) {
  const isPremium = client.level === 'Premium'
  const { fiscalItems }                            = useFiscalItemsCtx()
  const { regimeItems, conditionItems, tipoItems } = useFiscalConfig()

  const applicableItems = getApplicableItems(client, fiscalItems, regimeItems, conditionItems, tipoItems)
  const fiscalScore     = applicableItems.length > 0
    ? calcFiscalScore(record?.checks ?? {}, applicableItems)
    : null

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
          className={`card-base ${snapshot.isDragging ? 'opacity-90 shadow-2xl border-amber-500/50' : ''} ${
            isPremium ? 'border-amber-500/25 bg-gradient-to-br from-gray-800 to-amber-950/20' : ''
          }`}
        >
          {/* Header */}
          <div className="flex items-start gap-2 mb-3">
            <div className="flex-1 min-w-0">
              <div className="mb-1">
                <LevelBadge level={client.level} />
              </div>
              <p className="text-sm font-semibold text-gray-100 leading-tight truncate" title={client.name}>
                {client.name}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{client.cnpj}</p>
            </div>
          </div>

          {/* Regime */}
          <div className="flex items-center gap-1.5 mb-3">
            <FileX size={12} className="text-gray-500 flex-shrink-0" />
            <span className="text-xs text-gray-400">{client.regime}</span>
          </div>

          {/* Fiscal Score */}
          <ScoreBar score={fiscalScore} />

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-700/60">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <User size={11} />
              <span className="truncate max-w-[100px]">{client.responsible || '—'}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500" title={dateLabel}>
              <Clock size={11} />
              <span>{displayDate}</span>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  )
})

export default FiscalCard
