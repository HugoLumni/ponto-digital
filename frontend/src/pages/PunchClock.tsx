import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { usePunch } from '../hooks/usePunch'
import { CameraCapture } from '../components/CameraCapture'
import type { PunchRegisterResponse } from '../types'

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
      setTimeout(() => setView('idle'), 4000)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao registrar ponto.')
      setView('error')
      setTimeout(() => setView('idle'), 4000)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface px-6 py-8">
      {view === 'camera' && (
        <CameraCapture onCapture={handleCapture} onCancel={() => setView('idle')} />
      )}

      <header className="flex items-center justify-between">
        <div>
          <p className="font-body text-xs text-slate-400 uppercase tracking-widest">Bem-vindo</p>
          <h2 className="font-display text-lg font-semibold text-white">
            {profile?.full_name ?? '...'}
          </h2>
        </div>
        <button
          onClick={signOut}
          className="rounded-xl bg-surface-card px-4 py-2 font-body text-sm text-slate-400 ring-1 ring-white/10 transition hover:text-white"
        >
          Sair
        </button>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-8">
        <div className="text-center">
          <p className="font-body text-sm capitalize text-slate-400">{formatDate(now)}</p>
          <p className="mt-1 font-display text-5xl font-bold tabular-nums text-white">
            {formatTime(now)}
          </p>
        </div>

        <motion.button
          onClick={() => setView('camera')}
          disabled={loading}
          whileTap={{ scale: 0.95 }}
          className="flex h-40 w-40 flex-col items-center justify-center gap-3 rounded-full bg-brand shadow-[0_0_40px_rgba(0,196,140,0.35)] transition hover:bg-brand-dark disabled:opacity-60"
        >
          <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="font-display text-sm font-semibold text-white">
            {loading ? 'Registrando...' : 'Registrar Ponto'}
          </span>
        </motion.button>

        <AnimatePresence>
          {view === 'success' && lastPunch && (
            <motion.div
              className="w-full max-w-xs rounded-2xl bg-brand/10 p-5 text-center ring-1 ring-brand/30"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <p className="font-display text-lg font-semibold capitalize text-brand">
                {lastPunch.type === 'entrada' ? 'Entrada registrada ✓' : 'Saída registrada ✓'}
              </p>
              <p className="mt-1 font-body text-sm text-slate-400">
                {new Date(lastPunch.punched_at).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </motion.div>
          )}

          {view === 'error' && (
            <motion.div
              className="w-full max-w-xs rounded-2xl bg-red-500/10 p-5 text-center ring-1 ring-red-500/30"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <p className="font-body text-sm text-red-400">{errorMsg}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
