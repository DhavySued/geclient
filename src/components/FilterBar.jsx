import { Crown, Star, CircleDot, Users } from 'lucide-react'

const levels = [
  { value: 'all',      label: 'Todos',    icon: Users,     activeBg: 'rgba(245,158,11,0.14)', activeText: '#FCD34D', activeBorder: 'rgba(245,158,11,0.30)' },
  { value: 'Premium',  label: 'Premium',  icon: Crown,     activeBg: 'rgba(251,191,36,0.14)', activeText: '#FCD34D', activeBorder: 'rgba(251,191,36,0.32)' },
  { value: 'Gold',     label: 'Gold',     icon: Star,      activeBg: 'rgba(234,179,8,0.14)',  activeText: '#FDE68A', activeBorder: 'rgba(234,179,8,0.30)' },
  { value: 'Standard', label: 'Standard', icon: CircleDot, activeBg: 'rgba(255,255,255,0.08)',activeText: '#D1D5DB', activeBorder: 'rgba(255,255,255,0.16)' },
]

export default function FilterBar({ activeLevel, onLevelChange, totalClients }) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-[11px] font-medium tracking-widest uppercase"
            style={{ color: 'rgba(255,255,255,0.25)' }}>
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
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                color: 'rgba(255,255,255,0.38)',
              }}
            >
              <Icon size={11} />
              {level.label}
            </button>
          )
        })}
      </div>
      <span className="ml-auto text-[11px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
        {totalClients} cliente{totalClients !== 1 ? 's' : ''} exibido{totalClients !== 1 ? 's' : ''}
      </span>
    </div>
  )
}
