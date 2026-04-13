import { useState } from 'react'
import { BarChart3, Building2, CheckSquare, Calendar, UserCog, Settings, TrendingUp, LogOut, ClipboardList, KeyRound } from 'lucide-react'
import logoSidebar from '../assets/logo-sidebar.png'
import { useTasks } from '../context/TasksContext'
import { useAuth } from '../context/AuthContext'
import { usePermissions } from '../hooks/usePermissions'

function getInitials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')
}

const kanbans = [
  { id: 'cadastro', icon: Building2,  label: 'Empresas',       description: 'Cadastro e gestão' },
  { id: 'fiscal',   icon: BarChart3,  label: 'Gestão Fiscal',  description: 'Situação tributária' },
  { id: 'cx',       icon: TrendingUp, label: 'Experiência CX', description: 'Health Score' },
]

const tools = [
  { id: 'tasks',    icon: CheckSquare,  label: 'Tarefas',       description: 'Controle de tarefas' },
  { id: 'calendar', icon: Calendar,     label: 'Calendário',    description: 'Tarefas por data' },
  { id: 'users',    icon: UserCog,      label: 'Usuários',      description: 'Equipe do escritório' },
  { id: 'audit',    icon: ClipboardList, label: 'Auditoria',    description: 'Histórico de ações' },
  { id: 'settings', icon: Settings,     label: 'Configurações', description: 'Preferências do sistema' },
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
  const [hovered, setHovered] = useState(false)

  function getStyle() {
    if (active) return {
      background: 'linear-gradient(135deg, rgba(243,146,0,0.28) 0%, rgba(217,125,0,0.16) 100%)',
      border: '1px solid rgba(243,146,0,0.55)',
      boxShadow: 'inset 0 0 0 1px rgba(243,146,0,0.12)',
    }
    if (hovered) return {
      background: 'rgba(255,255,255,0.09)',
      border: '1px solid rgba(255,255,255,0.12)',
    }
    return { background: 'transparent', border: '1px solid transparent' }
  }

  return (
    <button
      onClick={() => onNavigate(item.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 group relative"
      style={getStyle()}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full"
          style={{ background: '#f39200', boxShadow: '0 0 6px rgba(243,146,0,0.7)' }} />
      )}
      <Icon
        size={16}
        className="flex-shrink-0 transition-colors"
        style={{ color: active ? '#f39200' : hovered ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.35)' }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium leading-tight tracking-tight transition-colors"
           style={{ color: active ? '#ffffff' : hovered ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.65)' }}>
          {item.label}
        </p>
        <p className="text-[11px] truncate mt-0.5"
          style={{ color: active ? 'rgba(255,255,255,0.50)' : hovered ? 'rgba(255,255,255,0.40)' : 'rgba(255,255,255,0.22)' }}>
          {item.description}
        </p>
      </div>
      {badge > 0 && (
        <span className="flex-shrink-0 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold px-1"
          style={{ background: 'linear-gradient(135deg, #f39200, #d97d00)', color: '#ffffff' }}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  )
}

export default function Sidebar({ activePage, onNavigate, onChangePassword }) {
  const [logoError, setLogoError] = useState(false)
  const { tasks } = useTasks()
  const { currentUser, logout } = useAuth()
  const { can } = usePermissions()
  const pendingTaskCount = tasks.filter(t => t.status !== 'concluida').length

  const visibleKanbans = kanbans.filter(item => can(item.id, 'view'))
  const visibleTools   = tools.filter(item => can(item.id, 'view'))

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 flex flex-col z-20"
      style={{
        background: 'linear-gradient(180deg, #00236a 0%, #001a52 100%)',
        borderRight: '1px solid rgba(255,255,255,0.08)',
      }}>

      {/* Logo */}
      <div className="px-5 py-4 flex-shrink-0 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
        {!logoError && (
          <img
            src={logoSidebar}
            alt="GeClient"
            width={36}
            height={36}
            className="object-cover flex-shrink-0"
            style={{ borderRadius: '8px' }}
            onError={() => setLogoError(true)}
          />
        )}
        <span className="text-[17px] font-bold tracking-tight" style={{ color: '#ffffff' }}>
          GeClient
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 flex flex-col overflow-y-auto scrollbar-thin gap-0.5">
        {visibleKanbans.length > 0 && <SectionLabel>Módulos</SectionLabel>}
        {visibleKanbans.map(item => (
          <NavItem key={item.id} item={item} active={activePage === item.id} onNavigate={onNavigate} />
        ))}

        {visibleTools.length > 0 && <SectionLabel>Produtividade</SectionLabel>}
        {visibleTools.map(item => (
          <NavItem
            key={item.id}
            item={item}
            active={activePage === item.id}
            onNavigate={onNavigate}
            badge={item.id === 'tasks' ? pendingTaskCount : 0}
          />
        ))}
      </nav>

      {/* Footer — usuário logado */}
      <div className="px-3 py-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.10)' }}>
        {currentUser && (
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl group"
            style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-gray-900"
              style={{ background: 'linear-gradient(135deg, #f39200, #d97d00)' }}>
              {getInitials(currentUser.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium truncate" style={{ color: 'rgba(255,255,255,0.75)' }}>
                {currentUser.name}
              </p>
              <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.28)' }}>
                {currentUser.role}
              </p>
            </div>
            <button
              onClick={onChangePassword}
              title="Alterar senha"
              className="p-1.5 rounded-lg transition-colors flex-shrink-0"
              style={{ color: 'rgba(255,255,255,0.25)' }}
              onMouseEnter={e => e.currentTarget.style.color = '#f39200'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}
            >
              <KeyRound size={14} />
            </button>
            <button
              onClick={logout}
              title="Sair"
              className="p-1.5 rounded-lg transition-colors flex-shrink-0"
              style={{ color: 'rgba(255,255,255,0.25)' }}
              onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
