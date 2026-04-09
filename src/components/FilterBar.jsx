import { Crown, Star, CircleDot, Users } from 'lucide-react'

const levels = [
  { value: 'all',      label: 'Todos',    icon: Users,     color: 'text-gray-400' },
  { value: 'Premium',  label: 'Premium',  icon: Crown,     color: 'text-amber-400' },
  { value: 'Gold',     label: 'Gold',     icon: Star,      color: 'text-yellow-300' },
  { value: 'Standard', label: 'Standard', icon: CircleDot, color: 'text-gray-400' },
]

export default function FilterBar({ activeLevel, onLevelChange, totalClients }) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-xs text-gray-500 font-medium">Filtrar por nível:</span>
      <div className="flex items-center gap-2">
        {levels.map(level => {
          const Icon = level.icon
          const active = activeLevel === level.value
          return (
            <button
              key={level.value}
              onClick={() => onLevelChange(level.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 ${
                active
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
              }`}
            >
              <Icon size={12} className={active ? 'text-amber-400' : level.color} />
              {level.label}
            </button>
          )
        })}
      </div>
      <span className="ml-auto text-xs text-gray-600">
        {totalClients} cliente{totalClients !== 1 ? 's' : ''} exibido{totalClients !== 1 ? 's' : ''}
      </span>
    </div>
  )
}
