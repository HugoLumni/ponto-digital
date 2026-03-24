import { useState, useEffect, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../supabaseClient'
import logo from '../assets/logo.svg'

export function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const hash = window.location.hash
    if (hash.includes('access_token')) {
      navigate('/set-password' + hash, { replace: true })
    }
  }, [navigate])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (profile?.role) {
        navigate('/auth/redirect', { replace: true })
      } else {
        // Evita loop quando há sessão inválida/órfã sem profile correspondente.
        await supabase.auth.signOut()
      }
    })
  }, [navigate])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        setError('E-mail ou senha incorretos. Tente novamente.')
        return
      }
      navigate('/auth/redirect', { replace: true })
    } catch {
      setError('Falha ao autenticar. Tente novamente em instantes.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      {/* Faixa decorativa topo */}
      <div className="h-1.5 w-full bg-gradient-to-r from-brand via-forest to-sand" />

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          {/* Logo / identidade */}
          <div className="mb-10 text-center">
            <img src={logo} alt="Aldeia Escola" className="mx-auto mb-6 h-12 w-auto" />
            <h1 className="font-display text-xl font-bold text-ink">Ponto Digital</h1>
            <p className="mt-1.5 font-body text-sm text-ink-muted">Acesse sua conta para continuar</p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block font-body text-sm font-medium text-ink">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-xl border border-surface-border bg-surface-card px-4 py-3 font-body text-sm text-ink placeholder-ink-subtle shadow-soft outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label className="mb-1.5 block font-body text-sm font-medium text-ink">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-xl border border-surface-border bg-surface-card px-4 py-3 font-body text-sm text-ink placeholder-ink-subtle shadow-soft outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <motion.p
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-body text-sm text-red-700"
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
              className="mt-2 w-full rounded-xl bg-brand py-3.5 font-display text-sm font-semibold text-white shadow-brand transition hover:bg-brand-dark disabled:opacity-60"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </motion.button>
          </form>

          <p className="mt-8 text-center font-body text-xs text-ink-subtle">
            Aldeia Escola de Educação Infantil · São José dos Campos
          </p>
        </motion.div>
      </div>
    </div>
  )
}
