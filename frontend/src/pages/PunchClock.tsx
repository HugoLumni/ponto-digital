import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { usePunch } from '../hooks/usePunch'
import { CameraCapture } from '../components/CameraCapture'
import type { PunchRegisterResponse } from '../types'
import logo from '../assets/logo.svg'

function formatTime(date: Date): string {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
}

type ViewState = 'idle' | 'camera' | 'success' | 'error'

export function PunchClock() {
  const { profile, signOut } = useAuth()
  const { registerPunch, loading } = usePunch()
  const [now, setNow] = useState(new Date())
  const [view, setView] = useState<ViewState>('idle')
  const [lastPunch, setLastPunch] = useState<PunchRegisterResponse | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  async function handleCapture(blob: Blob) {
    setView('idle')
    try {
      const result = await registerPunch(blob)
      setLastPunch(result)
      setView('success')
      setTimeout(() => setView('idle'), 5000)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao registrar ponto.')
      setView('error')
      setTimeout(() => setView('idle'), 4000)
    }
  }

  const isEntrada = lastPunch?.type === 'entrada'

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      {/* Faixa decorativa */}
      <div className="h-1.5 w-full bg-gradient-to-r from-brand via-forest to-sand" />

      {view === 'camera' && (
        <CameraCapture onCapture={handleCapture} onCancel={() => setView('idle')} />
      )}

      {/* Header */}
      <header className="flex items-center justify-between border-b border-surface-border bg-surface-card px-6 py-4 shadow-soft">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Aldeia Escola" className="h-7 w-auto" />
          <div className="h-4 w-px bg-surface-border" />
          <div>
            <p className="font-display text-sm font-semibold text-ink leading-none">
              {profile?.full_name ?? '...'}
            </p>
            <p className="mt-0.5 font-body text-xs text-ink-muted">Funcionário</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="rounded-xl border border-surface-border bg-surface px-4 py-2 font-body text-sm text-ink-muted transition hover:border-brand/30 hover:text-brand"
        >
          Sair
        </button>
      </header>

      {/* Conteúdo principal */}
      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-10">

        {/* Data e hora */}
        <div className="text-center">
          <p className="font-body text-sm capitalize text-ink-muted">{formatDate(now)}</p>
          <p className="mt-1 font-display text-5xl font-bold tabular-nums text-ink">
            {formatTime(now)}
          </p>
        </div>

        {/* Botão principal */}
        <motion.button
          onClick={() => setView('camera')}
          disabled={loading}
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.02 }}
          className="relative flex h-44 w-44 flex-col items-center justify-center gap-3 rounded-full bg-brand shadow-brand transition disabled:opacity-60"
        >
          {/* Anel decorativo */}
          <div className="absolute inset-0 rounded-full border-4 border-sand/40" />
          <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="font-display text-sm font-semibold text-white">
            {loading ? 'Registrando...' : 'Registrar Ponto'}
          </span>
        </motion.button>

        {/* Feedback */}
        <AnimatePresence>
          {view === 'success' && lastPunch && (
            <motion.div
              className={`w-full max-w-xs rounded-2xl border p-5 text-center shadow-card ${
                isEntrada
                  ? 'border-forest/30 bg-forest/5'
                  : 'border-brand/30 bg-brand/5'
              }`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <div className={`mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full ${
                isEntrada ? 'bg-forest/15' : 'bg-brand/15'
              }`}>
                <svg className={`h-5 w-5 ${isEntrada ? 'text-forest' : 'text-brand'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className={`font-display text-base font-semibold capitalize ${isEntrada ? 'text-forest-dark' : 'text-brand-dark'}`}>
                {isEntrada ? 'Entrada registrada' : 'Saída registrada'}
              </p>
              <p className="mt-1 font-body text-sm text-ink-muted">
                {new Date(lastPunch.punched_at).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </motion.div>
          )}

          {view === 'error' && (
            <motion.div
              className="w-full max-w-xs rounded-2xl border border-red-200 bg-red-50 p-5 text-center"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <p className="font-body text-sm text-red-700">{errorMsg}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Rodapé */}
      <footer className="border-t border-surface-border px-6 py-4 text-center">
        <p className="font-body text-xs text-ink-subtle">Aldeia Escola · São José dos Campos</p>
      </footer>
    </div>
  )
}
