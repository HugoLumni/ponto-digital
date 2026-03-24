import { useState, useEffect, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../supabaseClient'

export function Login() {
  const { signIn, profile } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Detecta token de convite/recovery no hash da URL e redireciona para SetPassword
  useEffect(() => {
    const hash = window.location.hash
    if (hash.includes('access_token')) {
      navigate('/set-password' + hash, { replace: true })
    }
  }, [navigate])

  // Redireciona quando o profile carregar após login
  useEffect(() => {
    if (profile) {
      navigate(profile.role === 'admin' ? '/admin' : '/punch', { replace: true })
    }
  }, [profile, navigate])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const errorMsg = await signIn(email, password)
    if (errorMsg) {
      setError('E-mail ou senha incorretos. Tente novamente.')
      setLoading(false)
      return
    }

    // Busca o profile diretamente para redirecionar sem depender do estado do hook
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      navigate(profileData?.role === 'admin' ? '/admin' : '/punch', { replace: true })
    }

    setLoading(false)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-6">
      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/20">
            <svg className="h-8 w-8 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-bold text-white">Ponto Digital</h1>
          <p className="mt-1 font-body text-sm text-slate-400">Acesse sua conta para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block font-body text-sm font-medium text-slate-300">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-xl bg-surface-card px-4 py-3 font-body text-white placeholder-slate-500 outline-none ring-1 ring-white/10 transition focus:ring-brand"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label className="mb-1.5 block font-body text-sm font-medium text-slate-300">
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-xl bg-surface-card px-4 py-3 font-body text-white placeholder-slate-500 outline-none ring-1 ring-white/10 transition focus:ring-brand"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <motion.p
              className="rounded-xl bg-red-500/10 px-4 py-3 font-body text-sm text-red-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {error}
            </motion.p>
          )}

          <motion.button
            type="submit"
            disabled={loading}
            whileTap={{ scale: 0.97 }}
            className="mt-2 w-full rounded-xl bg-brand py-3.5 font-display text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </motion.button>
        </form>
      </motion.div>
    </div>
  )
}
