import { BarChart3, Users, Building2, ChevronRight, CheckSquare, Calendar, UserCog, Settings } from 'lucide-react'
import { useTasks } from '../context/TasksContext'

const kanbans = [
  {
    id: 'cadastro',
    icon: Building2,
    label: 'Empresas',
    description: 'Cadastro e gestão',
  },
  {
    id: 'fiscal',
    icon: BarChart3,
    label: 'Gestão Fiscal',
    description: 'Situação tributária',
  },
  {
    id: 'cx',
    icon: Users,
    label: 'Experiência CX',
    description: 'Health Score',
  },
]

const tools = [
  {
    id: 'tasks',
    icon: CheckSquare,
    label: 'Tarefas',
    description: 'Controle de tarefas',
  },
  {
    id: 'calendar',
    icon: Calendar,
    label: 'Calendário',
    description: 'Tarefas por data',
  },
  {
    id: 'users',
    icon: UserCog,
    label: 'Usuários',
    description: 'Equipe do escritório',
  },
  {
    id: 'settings',
    icon: Settings,
    label: 'Configurações',
    description: 'Preferências do sistema',
  },
]

function NavItem({ item, active, onNavigate, badge }) {
  const Icon = item.icon
  return (
    <button
      onClick={() => onNavigate(item.id)}
      className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-150 group ${
        active
          ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
          : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100 border border-transparent'
      }`}
    >
      <Icon size={18} className={active ? 'text-amber-400' : 'text-gray-500 group-hover:text-gray-300'} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium leading-tight ${active ? 'text-amber-300' : ''}`}>
          {item.label}
        </p>
        <p className="text-xs text-gray-500 truncate">{item.description}</p>
      </div>
      {badge > 0 && (
        <span className="flex-shrink-0 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-amber-500 text-gray-900 text-[10px] font-bold px-1">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
      {active && !badge && <ChevronRight size={14} className="text-amber-500 flex-shrink-0" />}
    </button>
  )
}

export default function Sidebar({ activePage, onNavigate }) {
  const { tasks } = useTasks()
  const pendingTaskCount = tasks.filter(t => t.status !== 'concluida').length

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-gray-900 border-r border-gray-800 flex flex-col z-20">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center flex-shrink-0">
            <Building2 size={18} className="text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">GEClient</p>
            <p className="text-xs text-gray-500 leading-tight">Exp. Contábil</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 flex flex-col gap-1 overflow-y-auto scrollbar-thin">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest px-2 mb-3">
          Módulos
        </p>
        {kanbans.map(item => (
          <NavItem
            key={item.id}
            item={item}
            active={activePage === item.id}
            onNavigate={onNavigate}
          />
        ))}

        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest px-2 mb-3 mt-5">
          Produtividade
        </p>
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
      <div className="px-5 py-4 border-t border-gray-800">
        <p className="text-xs text-gray-600 text-center">v1.0 · GEClient CRM</p>
      </div>
    </aside>
  )
}
