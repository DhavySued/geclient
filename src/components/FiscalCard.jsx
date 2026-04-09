import { Draggable } from '@hello-pangea/dnd'
import { AlertTriangle, FileX, Clock, User } from 'lucide-react'
import LevelBadge from './LevelBadge'
import { calcFiscalScore, getApplicableItems } from '../hooks/useFiscalItems'
import { useSettings } from '../context/SettingsContext'

const taxColors = {
  INSS: 'bg-red-500/20 text-red-300 border-red-500/30',
  FGTS: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  DAS:  'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  IRPJ: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  CSLL: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  COFINS: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  PIS:  'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  ICMS: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  'Simples/IVA': 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
}

const defaultTaxColor = 'bg-gray-700 text-gray-300 border-gray-600'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function ScoreBar({ score }) {
  if (score === null) return null
  const color =
    score >= 80 ? 'bg-emerald-500' :
    score >= 55 ? 'bg-yellow-400' :
    score >= 30 ? 'bg-orange-500' : 'bg-red-600'
  const textColor =
    score >= 80 ? 'text-emerald-400' :
    score >= 55 ? 'text-yellow-300' :
    score >= 30 ? 'text-orange-400' : 'text-red-400'
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] text-gray-600">Score Fiscal</span>
        <span className={`text-[10px] font-bold ${textColor}`}>{score}/100</span>
      </div>
      <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-300`} style={{ width: `${score}%` }} />
      </div>
    </div>
  )
}

export default function FiscalCard({ client, index, onOpen, selectedMonth }) {
  const isPremium = client.level === 'Premium'
  const { settings } = useSettings()

  const applicableItems = getApplicableItems(client, settings.regimeItems)
  const fiscalEntry = selectedMonth
    ? (client.fiscalHistory ?? []).find(h => h.month === selectedMonth)
    : null
  const fiscalScore = fiscalEntry && applicableItems.length > 0
    ? calcFiscalScore(fiscalEntry.checks ?? {}, applicableItems)
    : null

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
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
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

          {/* Pending Taxes */}
          {client.pendingTaxes.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center gap-1 mb-1.5">
                <AlertTriangle size={12} className="text-orange-400 flex-shrink-0" />
                <span className="text-xs text-gray-500 font-medium">Tributos pendentes</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {client.pendingTaxes.map(tax => (
                  <span
                    key={tax}
                    className={`text-xs px-1.5 py-0.5 rounded border font-medium ${taxColors[tax] || defaultTaxColor}`}
                  >
                    {tax}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Fiscal Score */}
          <ScoreBar score={fiscalScore} />

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-700/60">
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
