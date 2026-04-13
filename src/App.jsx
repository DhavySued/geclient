import { useState } from 'react'
import { ClientsProvider, useClients } from './context/ClientsContext'
import { TasksProvider } from './context/TasksContext'
import { UsersProvider } from './context/UsersContext'
import { SettingsProvider } from './context/SettingsContext'
import { FiscalItemsProvider } from './context/FiscalItemsContext'
import { FiscalConfigProvider } from './context/FiscalConfigContext'
import { FiscalRecordsProvider } from './context/FiscalRecordsContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AuditProvider } from './context/AuditContext'
import { usePermissions } from './hooks/usePermissions'
import Sidebar from './components/Sidebar'
import ClientDetailModal from './components/ClientDetailModal'
import PasswordResetSidebar from './components/PasswordResetSidebar'
import FiscalPage from './pages/FiscalPage'
import CXPage from './pages/CXPage'
import CadastroPage from './pages/CadastroPage'
import TasksPage from './pages/TasksPage'
import CalendarPage from './pages/CalendarPage'
import UsersPage from './pages/UsersPage'
import SettingsPage from './pages/SettingsPage'
import LoginPage from './pages/LoginPage'
import AuditPage from './pages/AuditPage'
import { Loader2, AlertTriangle, ShieldOff } from 'lucide-react'

function AccessDenied() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <ShieldOff size={36} className="mx-auto mb-3 text-gray-300" />
        <p className="text-sm font-semibold text-gray-500">Acesso restrito</p>
        <p className="text-xs text-gray-400 mt-1">Você não tem permissão para visualizar este módulo.</p>
      </div>
    </div>
  )
}

function AppContent() {
  const [activePage, setActivePage] = useState(
    () => localStorage.getItem('geclient_active_page') ?? 'cadastro'
  )
  const [selectedClient, setSelectedClient] = useState(null)
  const [selectedMonth, setSelectedMonth]   = useState(null)
  const [showPasswordReset, setShowPasswordReset] = useState(false)
  const { loading, error, refetch } = useClients()
  const { can } = usePermissions()

  function navigate(page) {
    setActivePage(page)
    localStorage.setItem('geclient_active_page', page)
  }

  function openClient(client, month = null) {
    setSelectedClient(client)
    setSelectedMonth(month)
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <Loader2 size={28} className="animate-spin text-brand-400" />
          <p className="text-sm">Conectando ao banco de dados…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 p-6">
        <div className="max-w-sm w-full bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <AlertTriangle size={28} className="text-red-500 mx-auto mb-3" />
          <p className="text-sm font-semibold text-red-700 mb-1">Erro de conexão</p>
          <p className="text-xs text-gray-500 mb-4">{error}</p>
          <button
            onClick={refetch}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-brand-500 hover:bg-brand-400 text-gray-900 transition-all"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar activePage={activePage} onNavigate={navigate} onChangePassword={() => setShowPasswordReset(true)} />
      <main className="flex-1 ml-64 flex flex-col">
        <div className="page-scroll flex-1 overflow-auto scrollbar-thin px-8 py-7 flex flex-col">
          {activePage === 'cadastro'  && (can('cadastro', 'view') ? <CadastroPage /> : <AccessDenied />)}
          {activePage === 'fiscal'    && (can('fiscal',   'view') ? <FiscalPage    onOpenClient={openClient} /> : <AccessDenied />)}
          {activePage === 'cx'        && (can('cx',       'view') ? <CXPage        onOpenClient={client => openClient(client)} /> : <AccessDenied />)}
          {activePage === 'tasks'     && (can('tasks',    'view') ? <TasksPage     onOpenClient={client => openClient(client)} /> : <AccessDenied />)}
          {activePage === 'calendar'  && (can('calendar', 'view') ? <CalendarPage  onOpenClient={client => openClient(client)} /> : <AccessDenied />)}
          {activePage === 'users'     && (can('users',    'view') ? <UsersPage /> : <AccessDenied />)}
          {activePage === 'audit'     && (can('audit',    'view') ? <AuditPage /> : <AccessDenied />)}
          {activePage === 'settings'  && (can('settings', 'view') ? <SettingsPage /> : <AccessDenied />)}
        </div>
      </main>

      <ClientDetailModal
        client={selectedClient}
        selectedMonth={selectedMonth}
        onClose={() => { setSelectedClient(null); setSelectedMonth(null) }}
      />

      <PasswordResetSidebar
        open={showPasswordReset}
        onClose={() => setShowPasswordReset(false)}
      />
    </div>
  )
}

function AuthGate() {
  const { currentUser } = useAuth()
  if (!currentUser) return <LoginPage />
  return (
    <AuditProvider>
      <SettingsProvider>
        <FiscalItemsProvider>
          <FiscalConfigProvider>
            <FiscalRecordsProvider>
              <ClientsProvider>
                <UsersProvider>
                  <TasksProvider>
                    <AppContent />
                  </TasksProvider>
                </UsersProvider>
              </ClientsProvider>
            </FiscalRecordsProvider>
          </FiscalConfigProvider>
        </FiscalItemsProvider>
      </SettingsProvider>
    </AuditProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  )
}
