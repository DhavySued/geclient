import { Draggable } from '@hello-pangea/dnd'
import { User, TrendingUp, FileText } from 'lucide-react'
import LevelBadge from './LevelBadge'
import HealthBar from './HealthBar'

function formatCurrency(v) {
  return v ? `R$ ${Number(v).toLocaleString('pt-BR')}` : null
}

const REGIME_SHORT = {
  'Simples Nacional': 'Simples',
  'Lucro Presumido': 'L. Presumido',
  'Lucro Real': 'Lucro Real',
  'MEI': 'MEI',
}

export default function MonthlyCard({ client, index, onOpen }) {
  const isPremium = client.level === 'Premium'

  return (
    <Draggable draggableId={client.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => { if (!snapshot.isDragging) onOpen?.(client) }}
          className={`card-base ${snapshot.isDragging ? 'opacity-80 scale-[1.02] shadow-2xl border-amber-500/50' : ''} ${
            isPremium ? 'border-amber-500/25 bg-gradient-to-br from-gray-800 to-amber-950/20' : ''
          }`}
        >
          {/* Header */}
          <div className="mb-3">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <LevelBadge level={client.level} />
              {client.regime && (
                <span className="text-xs text-gray-600">
                  {REGIME_SHORT[client.regime] || client.regime}
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-gray-100 leading-tight" title={client.name}>
              {client.name}
            </p>
          </div>

          {/* Health */}
          <HealthBar score={client.healthScore} />

          {/* Revenue */}
          {client.monthlyRevenue > 0 && (
            <div className="flex items-center gap-1.5 mt-3">
              <TrendingUp size={11} className="text-gray-500 flex-shrink-0" />
              <span className="text-xs text-gray-500">{formatCurrency(client.monthlyRevenue)}/mês</span>
            </div>
          )}

          {/* Notes */}
          {client.notes && (
            <div className="flex items-start gap-1.5 mt-1.5">
              <FileText size={11} className="text-gray-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{client.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center gap-1 pt-2 mt-2 border-t border-gray-700/60">
            <User size={11} className="text-gray-500" />
            <span className="text-xs text-gray-500">{client.responsible}</span>
          </div>
        </div>
      )}
    </Draggable>
  )
}
