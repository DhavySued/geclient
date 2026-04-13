import { Crown, Star, CircleDot, Users } from 'lucide-react'

const levels = [
  { value: 'all',      label: 'Todos',    icon: Users,     activeBg: 'rgba(243,146,0,0.14)',  activeText: '#f39200', activeBorder: 'rgba(243,146,0,0.30)'  },
  { value: 'Premium',  label: 'Premium',  icon: Crown,     activeBg: 'rgba(251,191,36,0.12)', activeText: '#b45309', activeBorder: 'rgba(251,191,36,0.30)' },
  { value: 'Gold',     label: 'Gold',     icon: Star,      activeBg: 'rgba(234,179,8,0.10)',  activeText: '#a16207', activeBorder: 'rgba(234,179,8,0.28)' },
  { value: 'Standard', label: 'Standard', icon: CircleDot, activeBg: 'rgba(0,0,0,0.06)', activeText: '#4B5563', activeBorder: 'rgba(0,0,0,0.12)' },
]

export default function FilterBar({ activeLevel, onLevelChange, totalClients }) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-[11px] font-medium tracking-widest uppercase"
            style={{ color: '#9CA3AF' }}>
        Filtrar por nível
      </span>
      <div className="flex items-center gap-1.5">
        {levels.map(level => {
          const Icon     = level.icon
          const isActive = activeLevel === level.value
          return (
            <button
              key={level.value}
              onClick={() => onLevelChange(level.value)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150"
              style={isActive ? {
                background: level.activeBg,
                border: `1px solid ${level.activeBorder}`,
                color: level.activeText,
              } : {
                background: 'rgba(0,0,0,0.03)',
                border: '1px solid rgba(0,0,0,0.08)',
                color: '#6B7280',
              }}
            >
              <Icon size={11} />
              {level.label}
            </button>
          )
        })}
      </div>
      <span className="ml-auto text-[11px]" style={{ color: '#9CA3AF' }}>
        {totalClients} cliente{totalClients !== 1 ? 's' : ''} exibido{totalClients !== 1 ? 's' : ''}
      </span>
    </div>
  )
}
