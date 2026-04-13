import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, LogIn, Lock, User } from 'lucide-react'
import logoLogin from '../assets/logo-login.png'

export default function LoginPage() {
  const { login, loading } = useAuth()
  const [loginStr,     setLoginStr]     = useState('')
  const [password,     setPassword]     = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error,        setError]        = useState(null)
  const [logoError,    setLogoError]    = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    try {
      await login(loginStr, password)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(180deg, #00236a 0%, #001a52 100%)' }}>

      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="text-center mb-8">
          {!logoError ? (
            <img
              src={logoLogin}
              alt="GeClient"
              width={120}
              height={120}
              className="object-cover mx-auto mb-5"
              style={{ borderRadius: '20px', boxShadow: '0 8px 32px rgba(0,0,0,0.35)' }}
              onError={() => setLogoError(true)}
            />
          ) : (
            <div className="w-24 h-24 rounded-2xl mx-auto mb-5 flex items-center justify-center"
              style={{ background: '#f39200' }}>
              <span className="text-2xl font-bold text-white">GC</span>
            </div>
          )}
          <h1 className="text-2xl font-bold" style={{ color: '#F5F5F7' }}>GeClient</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Gestão Contábil · Acesse sua conta
          </p>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl p-6 space-y-4"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {/* Login */}
          <div>
            <label className="block text-xs font-medium mb-1.5"
              style={{ color: 'rgba(255,255,255,0.45)' }}>
              Login
            </label>
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: 'rgba(255,255,255,0.3)' }} />
              <input
                autoFocus
                value={loginStr}
                onChange={e => setLoginStr(e.target.value)}
                placeholder="seu.login"
                autoCapitalize="none"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm placeholder-gray-500 focus:outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#F5F5F7',
                }}
              />
            </div>
          </div>

          {/* Senha */}
          <div>
            <label className="block text-xs font-medium mb-1.5"
              style={{ color: 'rgba(255,255,255,0.45)' }}>
              Senha
            </label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: 'rgba(255,255,255,0.3)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2.5 rounded-xl text-sm placeholder-gray-500 focus:outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#F5F5F7',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Erro */}
          {error && (
            <p className="text-xs px-3 py-2 rounded-lg bg-red-500/15 text-red-300 border border-red-500/20">
              {error}
            </p>
          )}

          {/* Botão */}
          <button
            type="submit"
            disabled={loading || !loginStr.trim() || !password}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, #f39200, #d97d00)',
              color: '#111',
            }}
          >
            <LogIn size={15} />
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.18)' }}>
          v1.0 · GEClient CRM
        </p>
      </div>
    </div>
  )
}
