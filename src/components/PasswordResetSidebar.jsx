import { useState, useEffect } from 'react'
import { X, KeyRound, Eye, EyeOff, Check, Loader2, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function PasswordResetSidebar({ open, onClose }) {
  const { currentUser } = useAuth()

  const [current,        setCurrent]        = useState('')
  const [next,           setNext]           = useState('')
  const [confirm,        setConfirm]        = useState('')
  const [showCurrent,    setShowCurrent]    = useState(false)
  const [showNext,       setShowNext]       = useState(false)
  const [showConfirm,    setShowConfirm]    = useState(false)
  const [saving,         setSaving]         = useState(false)
  const [error,          setError]          = useState('')
  const [success,        setSuccess]        = useState(false)

  // Limpa ao abrir/fechar
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setCurrent(''); setNext(''); setConfirm('')
        setError(''); setSuccess(false); setSaving(false)
        setShowCurrent(false); setShowNext(false); setShowConfirm(false)
      }, 300)
    }
  }, [open])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!current.trim())       { setError('Informe a senha atual.'); return }
    if (next.length < 4)       { setError('A nova senha deve ter pelo menos 4 caracteres.'); return }
    if (next !== confirm)      { setError('As senhas não coincidem.'); return }
    if (next === current)      { setError('A nova senha deve ser diferente da atual.'); return }

    setSaving(true)
    try {
      // Verifica senha atual
      const { data: check, error: checkErr } = await supabase.rpc('check_user_login', {
        p_login:    currentUser.login,
        p_password: current,
      })
      if (checkErr) throw new Error(checkErr.message)
      if (!check || check.length === 0) {
        setError('Senha atual incorreta.')
        setSaving(false)
        return
      }

      // Atualiza para nova senha
      const { error: setErr } = await supabase.rpc('set_user_password', {
        p_user_id: currentUser.id,
        p_password: next,
      })
      if (setErr) throw new Error(setErr.message)

      setSuccess(true)
      setCurrent(''); setNext(''); setConfirm('')
    } catch (err) {
      setError(err.message || 'Erro ao alterar a senha.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-screen w-96 z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ background: '#F8F9FB', borderLeft: '1px solid rgba(0,0,0,0.08)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
              <KeyRound size={16} className="text-brand-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Redefinir senha</p>
              <p className="text-[11px] text-gray-400">{currentUser?.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {success ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center">
                <ShieldCheck size={28} className="text-emerald-500" />
              </div>
              <div>
                <p className="text-base font-bold text-gray-900 mb-1">Senha alterada!</p>
                <p className="text-sm text-gray-500">Sua senha foi atualizada com sucesso.</p>
              </div>
              <button
                onClick={onClose}
                className="mt-2 px-5 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-gray-900 text-sm font-semibold transition-all"
              >
                Fechar
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <p className="text-xs text-gray-500 leading-relaxed">
                Para alterar sua senha, informe a senha atual e escolha uma nova.
              </p>

              {/* Senha atual */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">
                  Senha atual
                </label>
                <div className="relative">
                  <input
                    autoFocus
                    type={showCurrent ? 'text' : 'password'}
                    value={current}
                    onChange={e => setCurrent(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-500/50 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Nova senha */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">
                  Nova senha
                </label>
                <div className="relative">
                  <input
                    type={showNext ? 'text' : 'password'}
                    value={next}
                    onChange={e => setNext(e.target.value)}
                    placeholder="Mínimo 4 caracteres"
                    className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-500/50 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNext(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNext ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>

                {/* Indicador de força */}
                {next.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map(lvl => (
                        <div
                          key={lvl}
                          className="h-1 flex-1 rounded-full transition-colors"
                          style={{
                            backgroundColor: passwordStrength(next) >= lvl
                              ? lvl <= 1 ? '#ef4444'
                              : lvl <= 2 ? '#f97316'
                              : lvl <= 3 ? '#eab308'
                              : '#22c55e'
                              : '#e5e7eb'
                          }}
                        />
                      ))}
                    </div>
                    <p className="text-[10px] text-gray-400">
                      {strengthLabel(passwordStrength(next))}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirmar nova senha */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">
                  Confirmar nova senha
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repita a nova senha"
                    className={`w-full pl-4 pr-10 py-2.5 bg-white border rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none transition-colors ${
                      confirm && next && confirm !== next
                        ? 'border-red-300 focus:border-red-400'
                        : 'border-gray-200 focus:border-brand-500/50'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  {confirm && next && confirm === next && (
                    <Check size={14} className="absolute right-8 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none" />
                  )}
                </div>
                {confirm && next && confirm !== next && (
                  <p className="text-[10px] text-red-400 mt-1">As senhas não coincidem.</p>
                )}
              </div>

              {/* Erro */}
              {error && (
                <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 disabled:opacity-60 disabled:cursor-not-allowed text-gray-900 text-sm font-bold transition-all"
              >
                {saving
                  ? <><Loader2 size={15} className="animate-spin" /> Salvando…</>
                  : <><KeyRound size={15} /> Alterar senha</>
                }
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  )
}

// ── Helpers de força de senha ─────────────────────────────────────────────────
function passwordStrength(pwd) {
  let score = 0
  if (pwd.length >= 6)                        score++
  if (pwd.length >= 10)                       score++
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd) || /[^A-Za-z0-9]/.test(pwd)) score++
  return score
}

function strengthLabel(score) {
  return ['', 'Fraca', 'Regular', 'Boa', 'Forte'][score] ?? ''
}
