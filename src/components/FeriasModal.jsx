import { useState } from 'react'
import { X, Umbrella, Plus, Trash2, Pencil, Check, X as XIcon, Loader2, CalendarDays } from 'lucide-react'
import { useFeriasRecords } from '../context/FeriasRecordsContext'

function today() {
  return new Date().toISOString().slice(0, 10)
}

function fmtDate(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

const EMPTY_FORM = { date: today(), done: false, nextForecast: '', observations: '' }

function RecordRow({ record, clientId, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState({})
  const [saving, setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)

  function startEdit() {
    setDraft({
      date:         record.date ?? today(),
      done:         record.done ?? false,
      nextForecast: record.nextForecast ?? '',
      observations: record.observations ?? '',
    })
    setEditing(true)
  }

  function cancelEdit() { setEditing(false); setDraft({}) }

  async function saveEdit() {
    setSaving(true)
    await onUpdate(record.id, clientId, draft)
    setSaving(false)
    setEditing(false)
  }

  async function handleDelete() {
    setDeleting(true)
    await onDelete(record.id, clientId)
  }

  if (editing) {
    return (
      <tr className="bg-amber-50">
        <td className="px-4 py-2 border-b border-amber-100">
          <input
            type="date"
            value={draft.date}
            onChange={e => setDraft(p => ({ ...p, date: e.target.value }))}
            className="border border-gray-300 rounded-lg px-2 py-1 text-[12px] focus:outline-none focus:ring-2 focus:ring-brand-300 w-full"
          />
        </td>
        <td className="px-4 py-2 border-b border-amber-100 text-center">
          <button
            onClick={() => setDraft(p => ({ ...p, done: !p.done }))}
            className="w-6 h-6 rounded-full flex items-center justify-center mx-auto transition-colors"
            style={{
              background: draft.done ? '#16a34a' : 'transparent',
              border: `2px solid ${draft.done ? '#16a34a' : '#d1d5db'}`,
            }}
          >
            {draft.done && <Check size={12} className="text-white" />}
          </button>
        </td>
        <td className="px-4 py-2 border-b border-amber-100">
          <input
            type="date"
            value={draft.nextForecast}
            onChange={e => setDraft(p => ({ ...p, nextForecast: e.target.value }))}
            className="border border-gray-300 rounded-lg px-2 py-1 text-[12px] focus:outline-none focus:ring-2 focus:ring-brand-300 w-full"
          />
        </td>
        <td className="px-4 py-2 border-b border-amber-100">
          <input
            type="text"
            value={draft.observations}
            onChange={e => setDraft(p => ({ ...p, observations: e.target.value }))}
            className="border border-gray-300 rounded-lg px-2 py-1 text-[12px] focus:outline-none focus:ring-2 focus:ring-brand-300 w-full"
            placeholder="Observação…"
          />
        </td>
        <td className="px-3 py-2 border-b border-amber-100">
          <div className="flex items-center gap-1 justify-end">
            <button
              onClick={saveEdit}
              disabled={saving}
              className="p-1.5 rounded-lg transition-colors"
              style={{ background: '#16a34a', color: '#fff' }}
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            </button>
            <button
              onClick={cancelEdit}
              className="p-1.5 rounded-lg transition-colors text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <XIcon size={12} />
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className="group hover:bg-gray-50 transition-colors">
      <td className="px-4 py-2.5 border-b border-gray-50 text-[13px] text-gray-700 font-medium whitespace-nowrap">
        {fmtDate(record.date)}
      </td>
      <td className="px-4 py-2.5 border-b border-gray-50 text-center">
        {record.done ? (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border"
            style={{ background: '#F0FDF4', borderColor: '#86efac', color: '#16a34a' }}
          >
            <Check size={10} /> Feito
          </span>
        ) : (
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border"
            style={{ background: '#FFF1F2', borderColor: '#fca5a5', color: '#dc2626' }}
          >
            Pendente
          </span>
        )}
      </td>
      <td className="px-4 py-2.5 border-b border-gray-50 text-[13px] text-gray-600 whitespace-nowrap">
        {record.nextForecast ? (
          <span className="flex items-center gap-1">
            <CalendarDays size={12} className="text-gray-400" />
            {fmtDate(record.nextForecast)}
          </span>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>
      <td className="px-4 py-2.5 border-b border-gray-50 text-[12px] text-gray-500 max-w-[220px]">
        <span className="line-clamp-2">{record.observations || <span className="text-gray-300">—</span>}</span>
      </td>
      <td className="px-3 py-2.5 border-b border-gray-50">
        <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={startEdit}
            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title="Editar"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Excluir"
          >
            {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
          </button>
        </div>
      </td>
    </tr>
  )
}

export default function FeriasModal({ client, onClose }) {
  const { getRecords, addRecord, updateRecord, deleteRecord } = useFeriasRecords()
  const [form, setForm]     = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const records = getRecords(client.id)

  async function handleAdd() {
    if (!form.date) { setError('Informe a data.'); return }
    setSaving(true)
    setError('')
    const { error: err } = await addRecord(client.id, form)
    setSaving(false)
    if (err) { setError(err.message ?? 'Erro ao salvar. Tente novamente.'); return }
    setForm(EMPTY_FORM)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col max-h-[88vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #00236a 0%, #001a52 100%)' }}
            >
              <Umbrella size={15} className="text-white" />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-gray-800 leading-tight">{client.name}</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">Histórico de gestão de férias</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Histórico */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <CalendarDays size={28} className="mb-2 text-gray-200" />
              <p className="text-sm font-medium">Nenhum registro ainda</p>
              <p className="text-xs mt-1">Adicione o primeiro registro abaixo</p>
            </div>
          ) : (
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400 border-b border-gray-100">Data</th>
                  <th className="px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400 border-b border-gray-100 w-24">Feito?</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400 border-b border-gray-100">Próxima previsão</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400 border-b border-gray-100">Observação</th>
                  <th className="w-16 border-b border-gray-100" />
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <RecordRow
                    key={r.id}
                    record={r}
                    clientId={client.id}
                    onUpdate={updateRecord}
                    onDelete={deleteRecord}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Novo registro */}
        <div className="border-t border-gray-100 px-6 py-4 flex-shrink-0 bg-gray-50 rounded-b-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-3 flex items-center gap-1.5">
            <Plus size={12} /> Novo registro
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-gray-500">Data</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                className="border border-gray-200 rounded-xl px-3 py-2 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-gray-500">Próxima previsão</label>
              <input
                type="date"
                value={form.nextForecast}
                onChange={e => setForm(p => ({ ...p, nextForecast: e.target.value }))}
                className="border border-gray-200 rounded-xl px-3 py-2 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={() => setForm(p => ({ ...p, done: !p.done }))}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border text-[13px] font-medium transition-colors"
              style={{
                background:   form.done ? '#F0FDF4' : '#fff',
                borderColor:  form.done ? '#86efac' : '#e5e7eb',
                color:        form.done ? '#16a34a' : '#6b7280',
              }}
            >
              <div
                className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                style={{ background: form.done ? '#16a34a' : '#e5e7eb' }}
              >
                {form.done && <Check size={10} className="text-white" />}
              </div>
              Feito
            </button>
          </div>

          <div className="mt-3 flex flex-col gap-1">
            <label className="text-[11px] font-medium text-gray-500">Observação</label>
            <textarea
              value={form.observations}
              onChange={e => setForm(p => ({ ...p, observations: e.target.value }))}
              placeholder="Anote informações relevantes…"
              rows={2}
              className="border border-gray-200 rounded-xl px-3 py-2 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none"
            />
          </div>

          {error && <p className="text-[12px] text-red-500 mt-2">{error}</p>}

          <div className="flex justify-end mt-3">
            <button
              onClick={handleAdd}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-white transition-all"
              style={{ background: 'linear-gradient(135deg, #00236a 0%, #001a52 100%)' }}
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Adicionar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
