import { Crown, Star, Circle } from 'lucide-react'

const config = {
  Premium: {
    className: 'badge-premium',
    icon: Crown,
    label: 'Premium',
  },
  Gold: {
    className: 'badge-gold',
    icon: Star,
    label: 'Gold',
  },
  Standard: {
    className: 'badge-standard',
    icon: Circle,
    label: 'Standard',
  },
}

export default function LevelBadge({ level }) {
  const cfg = config[level] || config.Standard
  const Icon = cfg.icon
  return (
    <span className={cfg.className}>
      <Icon size={10} />
      {cfg.label}
    </span>
  )
}
