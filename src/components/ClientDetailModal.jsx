import { useState } from 'react'
import {
  X, User, Clock, FileText, AlertTriangle,
  Plus, BarChart3, Users, Briefcase,
  History, Pencil, Check, ChevronDown, ChevronUp, Repeat, Info,
} from 'lucide-react'
import { useTasks } from '../context/TasksContext'
import { useUsers } from '../context/UsersContext'
import { useClients } from '../context/ClientsContext'
import { calcFiscalScore, getApplicableItems } from '../hooks/useFiscalItems'
import { useFiscalItemsCtx } from '../context/FiscalItemsContext'
import { useFiscalConfig } from '../context/FiscalConfigContext'
import { useFiscalRecords } from '../context/FiscalRecordsContext'
import LevelBadge from './LevelBadge'
import RichTextEditor from './RichTextEditor'
import TaskItem, { TemplateCard } from './TaskItem'
import DatePicker from './DatePicker'

// ── Status labels & colors ─────────────────────────────────────────────────

const FISCAL_LABEL = {
  sem_consulta:       'Sem Consulta',
  com_pendencia:      'Com Pendência',
  comunicado_cliente: 'Comunicado ao Cliente',
  em_regularizacao:   'Em Regularização',
  resolvido:          'Resolvido',
  sem_pendencia:      'Sem Pendência',
}
const FISCAL_COLOR = {
  sem_consulta:       'text-gray-400 bg-gray-500/15 border-gray-500/30',
  com_pendencia:      'text-red-400 bg-red-500/15 border-red-500/30',
  comunicado_cliente: 'text-blue-400 bg-blue-500/15 border-blue-500/30',
  em_regularizacao:   'text-purple-400 bg-purple-500/15 border-purple-500/30',
  resolvido:          'text-teal-400 bg-teal-500/15 border-teal-500/30',
  sem_pendencia:      'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
}
const CX_LABEL = { cliente_novo: 'Cliente Novo', promotor: 'Promotor', neutro: 'Neutro', risco_churn: 'Risco Churn', detrator: 'Detrator' }
const CX_COLOR = { cliente_novo: 'text-amber-400 bg-amber-500/15 border-amber-500/30', promotor: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30', neutro: 'text-blue-400 bg-blue-500/15 border-blue-500/30', risco_churn: 'text-orange-400 bg-orange-500/15 border-orange-500/30', detrator: 'text-red-400 bg-red-500/15 border-red-500/30' }

const TAX_COLOR = {
  INSS:        'bg-red-500/20 text-red-300 border-red-500/30',
  FGTS:        'bg-orange-500/20 text-orange-300 border-orange-500/30',
  DAS:         'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  IRPJ:        'bg-purple-500/20 text-purple-300 border-purple-500/30',
  CSLL:        'bg-pink-500/20 text-pink-300 border-pink-500/30',
  COFINS:      'bg-blue-500/20 text-blue-300 border-blue-500/30',
  PIS:         'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  ICMS:        'bg-teal-500/20 text-teal-300 border-teal-500/30',
  'Simples/IVA':'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
}

function formatDate(s) {
  if (!s) return '—'
  return new Date(s + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Shared small components ────────────────────────────────────────────────

function StatusBadge({ label, colorClass }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colorClass}`}>
      {label}
    </span>
  )
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
        active
          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
          : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
      }`}
    >
      {children}
    </button>
  )
}

// ── Overview Tab ───────────────────────────────────────────────────────────

function OverviewTab({ client }) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Status nos Kanbans</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: BarChart3, label: 'Fiscal', badge: FISCAL_LABEL[client.fiscalStatus], color: FISCAL_COLOR[client.fiscalStatus] },
            { icon: Users,     label: 'CX',     badge: CX_LABEL[client.cxStatus],         color: CX_COLOR[client.cxStatus] },
          ].map(({ icon: Icon, label, badge, color }) => (
            <div key={label} className="bg-gray-800/60 rounded-xl p-3 border border-gray-700/50">
              <div className="flex items-center gap-1.5 mb-2">
                <Icon size={13} className="text-gray-500" />
                <span className="text-xs text-gray-500">{label}</span>
              </div>
              <StatusBadge label={badge || '—'} colorClass={color || ''} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Detalhes</p>
        <div className="grid grid-cols-2 gap-3">
          <InfoCard icon={User}         label="Responsável"        value={client.responsible || '—'} />
          <InfoCard icon={Clock}        label="Última interação"   value={formatDate(client.lastInteraction)} />
          <InfoCard icon={Briefcase}    label="Regime"             value={client.regime || '—'} />
        </div>
      </div>
    </div>
  )
}

function InfoCard({ icon: Icon, label, value, valueClass = 'text-gray-200' }) {
  return (
    <div className="bg-gray-800/60 rounded-xl p-3 border border-gray-700/50">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={12} className="text-gray-500" />
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className={`text-sm font-medium ${valueClass}`}>{value}</p>
    </div>
  )
}

// ── Analysis Tab ───────────────────────────────────────────────────────────

function ScoreTooltip() {
  const [visible, setVisible] = useState(false)
  return (
    <span className="relative" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
      <Info size={12} className="cursor-help text-gray-600 hover:text-amber-400 transition-colors" />
      {visible && (
        <div className="absolute left-5 top-0 z-50 w-64 bg-gray-800 border border-gray-600 rounded-xl p-3 shadow-xl text-left">
          <p className="text-xs font-semibold text-gray-200 mb-1.5">Como é calculado</p>
          <ul className="space-y-1 text-xs text-gray-400">
            <li>• Cada item fiscal tem um <span className="text-gray-200">peso</span> (padrão: 10).</li>
            <li>• Score = pesos dos itens <span className="text-emerald-400">✓ Regular</span> ÷ peso total × 100.</li>
            <li>• Itens <span className="text-red-400">✗ Pendente</span> ou sem marcação <span className="text-gray-500">não somam</span>.</li>
          </ul>
          <p className="text-[10px] text-gray-600 mt-2 border-t border-gray-700 pt-2">Ex: 4 itens × peso 10 → 3 regulares = score 75</p>
        </div>
      )}
    </span>
  )
}

function AnalysisTab({ client, selectedMonth }) {
  const { updateClient }                           = useClients()
  const { getRecord, upsertRecord }                = useFiscalRecords()
  const { fiscalItems }                            = useFiscalItemsCtx()
  const { regimeItems, conditionItems, tipoItems } = useFiscalConfig()
  const applicableItems = getApplicableItems(client, fiscalItems, regimeItems, conditionItems, tipoItems)

  const activeMonth   = selectedMonth ?? new Date().toISOString().slice(0, 7)
  const record        = getRecord(client.id, activeMonth)
  const savedChecks   = record?.checks ?? {}

  // Draft local — só persiste ao clicar em Salvar
  const [draft,   setDraft]   = useState(() => ({ ...savedChecks }))
  const [saving,  setSaving]  = useState(false)

  // Sincroniza draft quando o registro externo muda (ex: outro usuário ou tab)
  const savedKey = JSON.stringify(savedChecks)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useState(() => { setDraft({ ...savedChecks }) }, [savedKey])

  const isDirty      = JSON.stringify(draft) !== JSON.stringify(savedChecks)
  const allMarked    = applicableItems.length > 0 &&
    applicableItems.every(i => draft[i.id] === 'ok' || draft[i.id] === 'pendente')
  const canSave      = isDirty && allMarked

  const previewScore = applicableItems.length > 0 ? calcFiscalScore(draft, applicableItems) ?? 0 : 0
  const displayScore = isDirty ? previewScore : (calcFiscalScore(savedChecks, applicableItems) ?? 0)

  const scoreTextColor =
    displayScore >= 80 ? 'text-emerald-400' :
    displayScore >= 55 ? 'text-yellow-300' :
    displayScore >= 30 ? 'text-orange-400' : 'text-red-400'
  const scoreBarColor =
    displayScore >= 80 ? 'bg-emerald-500' :
    displayScore >= 55 ? 'bg-yellow-400' :
    displayScore >= 30 ? 'bg-orange-500' : 'bg-red-600'

  function setCheck(itemId, value) {
    setDraft(prev => ({ ...prev, [itemId]: prev[itemId] === value ? null : value }))
  }

  function handleCancel() {
    setDraft({ ...savedChecks })
  }

  async function handleSave() {
    setSaving(true)
    try {
      await upsertRecord(client.id, activeMonth, {
        status:       record?.status       ?? client.fiscalStatus,
        checks:       draft,
        pendingTaxes: record?.pendingTaxes ?? client.pendingTaxes ?? [],
        note:         record?.note         ?? '',
      })
      updateClient(client.id, { scoreFiscal: previewScore })
    } finally {
      setSaving(false)
    }
  }

  const unmarkedCount = applicableItems.filter(i => !draft[i.id]).length

  return (
    <div className="space-y-5">

      {/* Resumo da empresa */}
      <div className="bg-gray-800/60 rounded-xl p-3 border border-gray-700/50">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">Perfil da Empresa</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-20 flex-shrink-0">Regime</span>
            <span className="text-xs font-medium text-gray-200 truncate">{client.regime || '—'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-20 flex-shrink-0">Tipo</span>
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
              client.tipo === 'Comércio' ? 'text-blue-300 bg-blue-500/15' :
              client.tipo === 'Misto'    ? 'text-purple-300 bg-purple-500/15' :
                                           'text-emerald-300 bg-emerald-500/15'
            }`}>{client.tipo || 'Serviço'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-20 flex-shrink-0">Empregados</span>
            <span className={`text-xs font-medium ${client.hasEmployees ? 'text-amber-300' : 'text-gray-500'}`}>
              {client.hasEmployees ? 'Sim' : 'Não'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-20 flex-shrink-0">Pró-labore</span>
            <span className={`text-xs font-medium ${client.hasProLabore ? 'text-amber-300' : 'text-gray-500'}`}>
              {client.hasProLabore ? 'Sim' : 'Não'}
            </span>
          </div>
        </div>
      </div>

      {/* Score Fiscal em destaque */}
      <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700/50">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Saúde Fiscal</p>
              <ScoreTooltip />
            </div>
            <p className="text-xs text-gray-600 mt-0.5">{formatMonth(activeMonth)}</p>
          </div>
          <div className="text-right leading-none">
            <span className={`text-4xl font-bold ${scoreTextColor}`}>{displayScore}</span>
            <span className="text-sm text-gray-600"> /100</span>
          </div>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${scoreBarColor} rounded-full transition-all duration-500`}
            style={{ width: `${displayScore}%` }}
          />
        </div>
        {applicableItems.length === 0 && (
          <p className="text-xs text-gray-600 mt-2 italic">Configure os itens fiscais nas Configurações.</p>
        )}
      </div>

      {/* Checklist */}
      {applicableItems.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Checklist — {formatMonth(activeMonth)}
            </p>
            {isDirty && unmarkedCount > 0 && (
              <span className="text-[10px] text-orange-400">{unmarkedCount} item{unmarkedCount > 1 ? 's' : ''} sem marcação</span>
            )}
          </div>
          <div className="space-y-1.5">
            {applicableItems.map(item => {
              const state = draft[item.id] ?? null
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all ${
                    state === 'ok'      ? 'bg-emerald-500/10 border-emerald-500/30' :
                    state === 'pendente'? 'bg-red-500/10 border-red-500/30' :
                                         'bg-gray-800/60 border-orange-500/30'
                  }`}
                >
                  <span className={`flex-1 text-sm font-medium ${
                    state === 'ok'      ? 'text-emerald-300' :
                    state === 'pendente'? 'text-red-300' :
                                         'text-orange-300/70'
                  }`}>
                    {item.label}
                    {!state && <span className="ml-1 text-[10px] text-orange-500/80">*</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCheck(item.id, 'ok')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                      state === 'ok'
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'bg-gray-700/50 border-gray-600 text-gray-500 hover:border-emerald-500/60 hover:text-emerald-400'
                    }`}
                  >
                    ✓ Regular
                  </button>
                  <button
                    type="button"
                    onClick={() => setCheck(item.id, 'pendente')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                      state === 'pendente'
                        ? 'bg-red-500 border-red-500 text-white'
                        : 'bg-gray-700/50 border-gray-600 text-gray-500 hover:border-red-500/60 hover:text-red-400'
                    }`}
                  >
                    ✗ Pendente
                  </button>
                </div>
              )
            })}
          </div>

          {/* Salvar / Cancelar */}
          {isDirty && (
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave || saving}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                  canSave && !saving
                    ? 'bg-amber-500 hover:bg-amber-400 text-gray-900'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                {saving ? 'Salvando…' : canSave ? 'Salvar' : `Marque todos os itens (${unmarkedCount} restante${unmarkedCount > 1 ? 's' : ''})`}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="px-4 py-2 rounded-xl border border-gray-700 text-gray-400 hover:text-gray-200 text-sm transition-all"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Observações */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <FileText size={14} className="text-gray-400" />
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Observações internas</p>
        </div>
        <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700/50 min-h-[80px]">
          {client.notes
            ? <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{client.notes}</p>
            : <p className="text-sm text-gray-600 italic">Nenhuma observação registrada.</p>}
        </div>
      </div>

    </div>
  )
}

// ── Tasks Tab ──────────────────────────────────────────────────────────────

function TasksTab({ client }) {
  const { tasks, addTask, updateTask, deleteTask } = useTasks()
  const { users } = useUsers()
  const clientTasks = tasks.filter(t => t.clientId === client.id)

  const [title,         setTitle]         = useState('')
  const [desc,          setDesc]          = useState('')
  const [dueDate,       setDueDate]       = useState('')
  const [time,          setTime]          = useState('')
  const [priority,      setPriority]      = useState('media')
  const [assigned,      setAssigned]      = useState('')
  const [showForm,      setShowForm]      = useState(false)
  const [repeatMonthly, setRepeatMonthly] = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [saveError,     setSaveError]     = useState('')

  async function handleAdd(e) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    setSaveError('')
    try {
      const isRecurring = repeatMonthly && !!dueDate
      await addTask({
        clientId:        client.id,
        title:           title.trim(),
        description:     desc,
        dueDate:         isRecurring ? null : (dueDate || null),
        time:            time || null,
        priority,
        assignedTo:      assigned || null,
        repeatMonthly:   isRecurring,
        repeatDay:       isRecurring ? parseInt(dueDate.split('-')[2]) : undefined,
        lastSpawnedMonth: isRecurring ? null : undefined,
      })
      setTitle(''); setDesc(''); setDueDate(''); setTime('')
      setPriority('media'); setAssigned(''); setRepeatMonthly(false); setShowForm(false)
    } catch (err) {
      setSaveError(err.message || 'Erro ao salvar tarefa.')
    } finally {
      setSaving(false)
    }
  }

  function handleToggle(task) {
    updateTask(task.id, { status: task.status === 'concluida' ? 'pendente' : 'concluida' })
  }

  const templateTasks = clientTasks.filter(t => t.repeatMonthly)
  const regularTasks  = clientTasks.filter(t => !t.repeatMonthly)
  const pending       = regularTasks.filter(t => t.status !== 'concluida')
  const done          = regularTasks.filter(t => t.status === 'concluida')

  return (
    <div className="space-y-3">
      {/* Add button / form */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-gray-600 text-gray-500 hover:text-amber-400 hover:border-amber-500/40 hover:bg-amber-500/5 transition-all text-sm"
        >
          <Plus size={15} /> Nova tarefa
        </button>
      ) : (
        <form onSubmit={handleAdd} className="bg-gray-800/80 rounded-xl p-4 border border-amber-500/30 space-y-3">
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Título da tarefa *"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
          />
          <RichTextEditor value={desc} onChange={setDesc} placeholder="Descrição com formatação (opcional)" minHeight={70} />
          <div className="grid grid-cols-2 gap-2">
            <DatePicker
              value={dueDate}
              onChange={setDueDate}
              placeholder="Selecionar data"
            />
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-400 focus:outline-none focus:border-amber-500/50"
            />
            <select
              value={priority}
              onChange={e => setPriority(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-400 focus:outline-none focus:border-amber-500/50"
            >
              <option value="nenhuma">Sem prioridade</option>
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
            </select>
            {users.length > 0 && (
              <select
                value={assigned}
                onChange={e => setAssigned(e.target.value)}
                className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-400 focus:outline-none focus:border-amber-500/50"
              >
                <option value="">Responsável</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name.split(' ')[0]}</option>)}
              </select>
            )}
          </div>

          {/* Repeat monthly toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              onClick={() => setRepeatMonthly(v => !v)}
              className={`w-8 h-4 rounded-full transition-colors flex-shrink-0 relative ${repeatMonthly ? 'bg-purple-500' : 'bg-gray-700'}`}
            >
              <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${repeatMonthly ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            <div className="flex items-center gap-1.5">
              <Repeat size={12} className={repeatMonthly ? 'text-purple-400' : 'text-gray-600'} />
              <span className={`text-xs ${repeatMonthly ? 'text-purple-300' : 'text-gray-600'}`}>
                {repeatMonthly
                  ? dueDate
                    ? `Repete todo mês no dia ${parseInt(dueDate.split('-')[2])}`
                    : 'Repetir todo mês · selecione uma data acima'
                  : 'Repetir todo mês'}
              </span>
            </div>
          </label>

          {saveError && (
            <p className="text-xs text-red-400 bg-red-950/40 border border-red-500/30 rounded-lg px-3 py-2">{saveError}</p>
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-gray-900 text-sm font-semibold transition-all">
              {saving ? 'Salvando…' : 'Adicionar'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-gray-200 text-sm transition-all">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Pending */}
      {pending.length > 0 && (
        <div className="space-y-2">
          {pending.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              users={users}
              onToggle={handleToggle}
              onUpdate={updateTask}
              onDelete={deleteTask}
            />
          ))}
        </div>
      )}

      {/* Done */}
      {done.length > 0 && (
        <div>
          <p className="text-xs text-gray-600 mb-2 mt-1">Concluídas ({done.length})</p>
          <div className="space-y-2">
            {done.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                users={users}
                onToggle={handleToggle}
                onUpdate={updateTask}
                onDelete={deleteTask}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recurring templates for this client */}
      {templateTasks.length > 0 && (
        <div className={regularTasks.length > 0 ? 'pt-3 border-t border-gray-800' : ''}>
          <div className="flex items-center gap-2 mb-2">
            <Repeat size={12} className="text-purple-400" />
            <span className="text-xs font-medium text-gray-600">Recorrentes</span>
          </div>
          <div className="space-y-2">
            {templateTasks.map(task => (
              <TemplateCard
                key={task.id}
                task={task}
                users={users}
                onUpdate={updateTask}
                onDelete={deleteTask}
              />
            ))}
          </div>
        </div>
      )}

      {clientTasks.length === 0 && !showForm && (
        <div className="text-center py-10 text-gray-600">
          <p className="text-sm">Nenhuma tarefa ainda.</p>
          <p className="text-xs mt-1">Clique em "Nova tarefa" para começar.</p>
        </div>
      )}
    </div>
  )
}

// ── Fiscal History Tab ─────────────────────────────────────────────────────

const TAX_CHIP = {
  INSS:        'bg-red-500/20 text-red-300 border-red-500/30',
  FGTS:        'bg-orange-500/20 text-orange-300 border-orange-500/30',
  DAS:         'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  IRPJ:        'bg-purple-500/20 text-purple-300 border-purple-500/30',
  CSLL:        'bg-pink-500/20 text-pink-300 border-pink-500/30',
  COFINS:      'bg-blue-500/20 text-blue-300 border-blue-500/30',
  PIS:         'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  ICMS:        'bg-teal-500/20 text-teal-300 border-teal-500/30',
  'Simples/IVA':'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
}

function formatMonth(m) {
  const [year, month] = m.split('-')
  const label = new Date(Number(year), Number(month) - 1, 1)
    .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function CheckChip({ label, state, onClick }) {
  const styles = {
    ok:       'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
    pendente: 'bg-red-500/15 text-red-300 border-red-500/40',
    null:     'bg-gray-700/40 text-gray-600 border-gray-700/50',
  }
  const icons = { ok: '✓', pendente: '✗', null: '—' }
  const s = state ?? 'null'
  return (
    <button
      type="button"
      onClick={onClick}
      title="Clique para alternar: não consultado → OK → Pendente"
      className={`text-[10px] px-2 py-0.5 rounded-lg border font-medium transition-all hover:opacity-80 ${styles[s]}`}
    >
      {icons[s]} {label}
    </button>
  )
}

function FiscalScoreBar({ score }) {
  if (score === null) return null
  const textColor =
    score >= 80 ? 'text-emerald-400' :
    score >= 55 ? 'text-yellow-300' :
    score >= 30 ? 'text-orange-400' : 'text-red-400'
  const barColor =
    score >= 80 ? 'bg-emerald-500' :
    score >= 55 ? 'bg-yellow-400' :
    score >= 30 ? 'bg-orange-500' : 'bg-red-600'
  return (
    <div className="flex items-center gap-2 mt-2">
      <span className="text-[10px] text-gray-600 flex-shrink-0">Score Fiscal</span>
      <div className="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-[10px] font-bold ${textColor} flex-shrink-0`}>{score}/100</span>
    </div>
  )
}

function FiscalHistoryTab({ client }) {
  const { getClientHistory, upsertRecord } = useFiscalRecords()
  const { fiscalItems }                    = useFiscalItemsCtx()
  const { regimeItems, conditionItems, tipoItems } = useFiscalConfig()
  const applicableItems = getApplicableItems(client, fiscalItems, regimeItems, conditionItems, tipoItems)
  const currentMonth    = new Date().toISOString().slice(0, 7)
  const history         = getClientHistory(client.id)
  const hasCurrentMonth = history.some(h => h.month === currentMonth)

  const [editingNote, setEditingNote] = useState(null)
  const [noteValue,   setNoteValue]   = useState('')
  const [expanded,    setExpanded]    = useState({})

  async function registerCurrentMonth() {
    const existing = history.find(h => h.month === currentMonth)
    await upsertRecord(client.id, currentMonth, {
      status:       existing?.status       ?? client.fiscalStatus,
      checks:       existing?.checks       ?? {},
      pendingTaxes: existing?.pendingTaxes ?? client.pendingTaxes ?? [],
      note:         existing?.note         ?? '',
    })
  }

  async function toggleCheck(entry, itemId) {
    const checks  = { ...(entry.checks ?? {}) }
    const current = checks[itemId] ?? null
    checks[itemId] = current === null ? 'ok' : current === 'ok' ? 'pendente' : null
    await upsertRecord(client.id, entry.month, {
      status:       entry.status,
      checks,
      pendingTaxes: entry.pendingTaxes ?? [],
      note:         entry.note ?? '',
    })
  }

  async function saveNote(entry) {
    await upsertRecord(client.id, entry.month, {
      status:       entry.status,
      checks:       entry.checks ?? {},
      pendingTaxes: entry.pendingTaxes ?? [],
      note:         noteValue,
    })
    setEditingNote(null)
  }

  function toggleExpand(month) {
    setExpanded(prev => ({ ...prev, [month]: !prev[month] }))
  }

  if (history.length === 0) {
    return (
      <div className="space-y-4">
        <button
          onClick={registerCurrentMonth}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-amber-500/40 text-amber-400 hover:bg-amber-500/5 transition-all text-sm font-medium"
        >
          <History size={15} /> Registrar mês atual
        </button>
        <div className="text-center py-10 text-gray-600">
          <History size={28} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum histórico ainda.</p>
          <p className="text-xs mt-1">Mova o card no Kanban ou clique em "Registrar mês atual".</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {!hasCurrentMonth && (
        <button
          onClick={registerCurrentMonth}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-amber-500/40 text-amber-400 hover:bg-amber-500/5 transition-all text-sm font-medium"
        >
          <History size={15} /> Registrar mês atual
        </button>
      )}

      <div className="relative">
        <div className="absolute left-[11px] top-3 bottom-3 w-px bg-gray-700/60" />

        <div className="space-y-3">
          {history.map((entry) => {
            const isCurrentMonth = entry.month === currentMonth
            const isExpanded     = expanded[entry.month] ?? isCurrentMonth
            const isEditingThis  = editingNote === entry.month
            const score          = applicableItems.length > 0
              ? calcFiscalScore(entry.checks ?? {}, applicableItems)
              : null

            return (
              <div key={entry.month} className="relative pl-7">
                {/* timeline dot */}
                <div className={`absolute left-0 top-3.5 w-[9px] h-[9px] rounded-full border-2 ${
                  isCurrentMonth ? 'bg-amber-400 border-amber-400' : 'bg-gray-700 border-gray-600'
                }`} />

                <div className={`rounded-xl border p-3 transition-all ${
                  isCurrentMonth ? 'border-amber-500/30 bg-amber-950/10' : 'border-gray-700/50 bg-gray-800/40'
                }`}>
                  {/* Header row */}
                  <div
                    className="flex items-center justify-between gap-2 cursor-pointer"
                    onClick={() => toggleExpand(entry.month)}
                  >
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className={`text-xs font-semibold ${isCurrentMonth ? 'text-amber-300' : 'text-gray-400'}`}>
                        {formatMonth(entry.month)}
                        {isCurrentMonth && <span className="ml-1.5 text-[10px] text-amber-500/70 font-normal">• atual</span>}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${FISCAL_COLOR[entry.status] ?? 'text-gray-400 bg-gray-700/40 border-gray-600'}`}>
                        {FISCAL_LABEL[entry.status] ?? entry.status}
                      </span>
                      {score !== null && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          score >= 80 ? 'text-emerald-400 bg-emerald-500/10' :
                          score >= 55 ? 'text-yellow-300 bg-yellow-500/10' :
                          score >= 30 ? 'text-orange-400 bg-orange-500/10' : 'text-red-400 bg-red-500/10'
                        }`}>
                          {score}/100
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {entry.updatedAt && (
                        <span className="text-[10px] text-gray-600" title="Última edição">
                          {new Date(entry.updatedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      {isExpanded
                        ? <ChevronUp size={13} className="text-gray-600" />
                        : <ChevronDown size={13} className="text-gray-600" />
                      }
                    </div>
                  </div>

                  {/* Expanded */}
                  {isExpanded && (
                    <div className="mt-3 space-y-3">
                      {/* Score bar */}
                      {applicableItems.length > 0 && <FiscalScoreBar score={score} />}

                      {/* Checks grid */}
                      {applicableItems.length > 0 && (
                        <div>
                          <p className="text-[10px] text-gray-600 mb-1.5 font-medium uppercase tracking-wide">Consultas</p>
                          <div className="flex flex-wrap gap-1.5">
                            {applicableItems.map(item => (
                              <CheckChip
                                key={item.id}
                                label={item.label}
                                state={entry.checks?.[item.id] ?? null}
                                onClick={() => toggleCheck(entry, item.id)}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Note */}
                      <div>
                        <p className="text-[10px] text-gray-600 mb-1 font-medium uppercase tracking-wide">Observação</p>
                        {isEditingThis ? (
                          <div className="flex gap-2 items-start">
                            <textarea
                              autoFocus
                              value={noteValue}
                              onChange={e => setNoteValue(e.target.value)}
                              rows={2}
                              placeholder="Observação sobre este mês..."
                              className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-500/50 resize-none"
                            />
                            <button
                              onClick={() => saveNote(entry)}
                              className="flex-shrink-0 p-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-gray-900 transition-all"
                            >
                              <Check size={12} />
                            </button>
                          </div>
                        ) : (
                          <div
                            className="flex items-start gap-2 cursor-pointer group"
                            onClick={() => { setEditingNote(entry.month); setNoteValue(entry.note ?? '') }}
                          >
                            <p className={`flex-1 text-xs leading-relaxed ${entry.note ? 'text-gray-400' : 'text-gray-600 italic'}`}>
                              {entry.note || 'Clique para adicionar uma observação...'}
                            </p>
                            <Pencil size={11} className="flex-shrink-0 text-gray-700 group-hover:text-gray-400 mt-0.5 transition-colors" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Main Modal ─────────────────────────────────────────────────────────────

export default function ClientDetailModal({ client, selectedMonth, onClose }) {
  const [tab, setTab] = useState('overview')
  const { clients }          = useClients()
  const { tasks }            = useTasks()
  const { getClientHistory } = useFiscalRecords()

  // Sempre usa a versão live do contexto — atualizações refletem em tempo real sem fechar o modal
  const liveClient = client ? (clients.find(c => c.id === client.id) ?? client) : null

  if (!liveClient) return null

  const pendingCount = tasks.filter(t => t.clientId === liveClient.id && t.status !== 'concluida').length
  const historyCount = getClientHistory(liveClient.id).length

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <LevelBadge level={liveClient.level} />
                <span className="text-xs text-gray-500">{liveClient.cnpj}</span>
              </div>
              <h2 className="text-lg font-bold text-white leading-tight">{liveClient.name}</h2>
            </div>
            <button onClick={onClose} className="flex-shrink-0 text-gray-500 hover:text-gray-200 transition-colors p-1 rounded-lg hover:bg-gray-800">
              <X size={20} />
            </button>
          </div>
          <div className="flex gap-1 mt-4 flex-wrap">
            <TabBtn active={tab === 'overview'} onClick={() => setTab('overview')}>Visão Geral</TabBtn>
            <TabBtn active={tab === 'analysis'} onClick={() => setTab('analysis')}>Análise Fiscal</TabBtn>
            <TabBtn active={tab === 'history'}  onClick={() => setTab('history')}>
              Histórico Fiscal{historyCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-700 text-gray-400 text-[10px] font-bold">
                  {historyCount}
                </span>
              )}
            </TabBtn>
            <TabBtn active={tab === 'tasks'}    onClick={() => setTab('tasks')}>
              Tarefas{pendingCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-gray-900 text-[10px] font-bold">
                  {pendingCount}
                </span>
              )}
            </TabBtn>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-5">
          {tab === 'overview' && <OverviewTab       client={liveClient} />}
          {tab === 'analysis' && <AnalysisTab      client={liveClient} selectedMonth={selectedMonth} />}
          {tab === 'history'  && <FiscalHistoryTab client={liveClient} />}
          {tab === 'tasks'    && <TasksTab         client={liveClient} />}
        </div>
      </div>
    </div>
  )
}
