import { useState, useEffect, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../supabaseClient'

export function SetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const search = new URLSearchParams(window.location.search)
    const code = search.get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) setReady(true)
        })
      })
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError('Não foi possível definir a senha. Tente novamente.')
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      navigate(profile?.role === 'admin' ? '/admin' : '/punch', { replace: true })
    } else {
      navigate('/login', { replace: true })
    }
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen flex-col bg-surface">
        <div className="h-1.5 w-full bg-gradient-to-r from-brand via-forest to-sand" />
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <div className="h-1.5 w-full bg-gradient-to-r from-brand via-forest to-sand" />

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div className="mb-10 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-forest/10 ring-1 ring-forest/20">
              <svg className="h-8 w-8 text-forest" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h1 className="font-display text-2xl font-bold text-ink">Defina sua senha</h1>
            <p className="mt-1.5 font-body text-sm text-ink-muted">Crie uma senha para acessar o sistema</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block font-body text-sm font-medium text-ink">
                Nova senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full rounded-xl border border-surface-border bg-surface-card px-4 py-3 font-body text-sm text-ink placeholder-ink-subtle shadow-soft outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div>
              <label className="mb-1.5 block font-body text-sm font-medium text-ink">
                Confirmar senha
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full rounded-xl border border-surface-border bg-surface-card px-4 py-3 font-body text-sm text-ink placeholder-ink-subtle shadow-soft outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                placeholder="Repita a senha"
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
              {loading ? 'Salvando...' : 'Definir senha e entrar'}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
