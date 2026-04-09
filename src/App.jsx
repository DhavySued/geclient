import { useState } from 'react'
import { ClientsProvider, useClients } from './context/ClientsContext'
import { TasksProvider } from './context/TasksContext'
import { UsersProvider } from './context/UsersContext'
import Sidebar from './components/Sidebar'
import ClientDetailModal from './components/ClientDetailModal'
import FiscalPage from './pages/FiscalPage'
import CXPage from './pages/CXPage'
import CadastroPage from './pages/CadastroPage'
import AcompanhamentoPage from './pages/AcompanhamentoPage'
import TasksPage from './pages/TasksPage'
import CalendarPage from './pages/CalendarPage'
import UsersPage from './pages/UsersPage'
import { Loader2, AlertTriangle } from 'lucide-react'

function AppContent() {
  const [activePage, setActivePage] = useState('cadastro')
  const [selectedClient, setSelectedClient] = useState(null)
  const { loading, error, refetch } = useClients()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Loader2 size={28} className="animate-spin text-amber-400" />
          <p className="text-sm">Conectando ao banco de dados…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950 p-6">
        <div className="max-w-sm w-full bg-red-950/50 border border-red-500/30 rounded-2xl p-6 text-center">
          <AlertTriangle size={28} className="text-red-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-red-300 mb-1">Erro de conexão</p>
          <p className="text-xs text-gray-500 mb-4">{error}</p>
          <button
            onClick={refetch}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-gray-900 transition-all"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <main className="flex-1 ml-64 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto scrollbar-thin px-8 py-7">
          {activePage === 'cadastro'  && <CadastroPage />}
          {activePage === 'fiscal'    && <FiscalPage    onOpenClient={setSelectedClient} />}
          {activePage === 'cx'        && <CXPage        onOpenClient={setSelectedClient} />}
          {activePage === 'mensal'    && <AcompanhamentoPage onOpenClient={setSelectedClient} />}
          {activePage === 'tasks'     && <TasksPage     onOpenClient={setSelectedClient} />}
          {activePage === 'calendar'  && <CalendarPage  onOpenClient={setSelectedClient} />}
          {activePage === 'users'     && <UsersPage />}
        </div>
      </main>

      <ClientDetailModal
        client={selectedClient}
        onClose={() => setSelectedClient(null)}
      />
    </div>
  )
}

export default function App() {
  return (
    <ClientsProvider>
      <UsersProvider>
        <TasksProvider>
          <AppContent />
        </TasksProvider>
      </UsersProvider>
    </ClientsProvider>
  )
}
