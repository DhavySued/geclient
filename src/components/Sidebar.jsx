import { BarChart3, Building2, CheckSquare, Calendar, UserCog, Settings, TrendingUp } from 'lucide-react'
import { useTasks } from '../context/TasksContext'

const kanbans = [
  { id: 'cadastro', icon: Building2,  label: 'Empresas',       description: 'Cadastro e gestão' },
  { id: 'fiscal',   icon: BarChart3,  label: 'Gestão Fiscal',  description: 'Situação tributária' },
  { id: 'cx',       icon: TrendingUp, label: 'Experiência CX', description: 'Health Score' },
]

const tools = [
  { id: 'tasks',    icon: CheckSquare, label: 'Tarefas',       description: 'Controle de tarefas' },
  { id: 'calendar', icon: Calendar,    label: 'Calendário',    description: 'Tarefas por data' },
  { id: 'users',    icon: UserCog,     label: 'Usuários',      description: 'Equipe do escritório' },
  { id: 'settings', icon: Settings,    label: 'Configurações', description: 'Preferências do sistema' },
]

function SectionLabel({ children }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] px-3 mt-5 mb-1.5 first:mt-0"
       style={{ color: 'rgba(255,255,255,0.22)' }}>
      {children}
    </p>
  )
}

function NavItem({ item, active, onNavigate, badge }) {
  const Icon = item.icon
  return (
    <button
      onClick={() => onNavigate(item.id)}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 group relative"
      style={active ? {
        background: 'linear-gradient(135deg, rgba(245,158,11,0.13) 0%, rgba(217,119,6,0.07) 100%)',
        border: '1px solid rgba(245,158,11,0.22)',
      } : {
        background: 'transparent',
        border: '1px solid transparent',
      }}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-amber-400" />
      )}
      <Icon
        size={16}
        className="flex-shrink-0 transition-colors"
        style={{ color: active ? '#FCD34D' : 'rgba(255,255,255,0.28)' }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium leading-tight tracking-tight transition-colors"
           style={{ color: active ? '#FDE68A' : 'rgba(255,255,255,0.65)' }}>
          {item.label}
        </p>
        <p className="text-[11px] truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.22)' }}>
          {item.description}
        </p>
      </div>
      {badge > 0 && (
        <span className="flex-shrink-0 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold px-1"
          style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#0A0A0F' }}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  )
}

export default function Sidebar({ activePage, onNavigate }) {
  const { tasks } = useTasks()
  const pendingTaskCount = tasks.filter(t => t.status !== 'concluida').length

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 flex flex-col z-20"
      style={{
        background: 'linear-gradient(180deg, #0D0E14 0%, #0A0B10 100%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}>

      {/* Logo */}
      <div className="px-5 py-5 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, rgba(245,158,11,0.22) 0%, rgba(180,83,9,0.12) 100%)',
              border: '1px solid rgba(245,158,11,0.28)',
              boxShadow: '0 0 16px rgba(245,158,11,0.10)',
            }}>
            <Building2 size={17} className="text-amber-400" />
          </div>
          <div>
            <p className="text-[14px] font-semibold tracking-tight" style={{ color: '#F5F5F7' }}>
              GEClient
            </p>
            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.28)' }}>
              Gestão Contábil
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 flex flex-col overflow-y-auto scrollbar-thin gap-0.5">
        <SectionLabel>Módulos</SectionLabel>
        {kanbans.map(item => (
          <NavItem key={item.id} item={item} active={activePage === item.id} onNavigate={onNavigate} />
        ))}

        <SectionLabel>Produtividade</SectionLabel>
        {tools.map(item => (
          <NavItem
            key={item.id}
            item={item}
            active={activePage === item.id}
            onNavigate={onNavigate}
            badge={item.id === 'tasks' ? pendingTaskCount : 0}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-[11px] text-center" style={{ color: 'rgba(255,255,255,0.18)' }}>
          v1.0 · GEClient CRM
        </p>
      </div>
    </aside>
  )
}
