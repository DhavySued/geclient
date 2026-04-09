import { Draggable } from '@hello-pangea/dnd'
import { MessageSquare, User, Clock } from 'lucide-react'
import LevelBadge from './LevelBadge'
import HealthBar from './HealthBar'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export default function CXCard({ client, index, onOpen }) {
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
            </div>
            <p className="text-sm font-semibold text-gray-100 leading-tight" title={client.name}>
              {client.name}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{client.regime}</p>
          </div>

          {/* Health Bar */}
          <HealthBar score={client.healthScore} />

          {/* Notes */}
          {client.notes && (
            <div className="mt-3 flex items-start gap-1.5">
              <MessageSquare size={11} className="text-gray-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{client.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 mt-2 border-t border-gray-700/60">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <User size={11} />
              <span className="truncate max-w-[100px]">{client.responsible}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock size={11} />
              <span>{formatDate(client.lastInteraction)}</span>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  )
}
