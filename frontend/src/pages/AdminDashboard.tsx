import { useState, useEffect, useCallback, FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../supabaseClient'
import type { Profile, PunchRecordWithUser, Role } from '../types'
import logo from '../assets/logo.svg'

const API_URL = import.meta.env.VITE_API_URL as string
const PAGE_SIZE = 20

type Tab = 'users' | 'records'

async function apiFetch<T>(path: string, token: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: 'Erro desconhecido' }))
    throw new Error((body as { detail?: string }).detail ?? 'Erro na requisição')
  }
  return res.json() as Promise<T>
}

export function AdminDashboard() {
  const { profile, signOut } = useAuth()
  const [tab, setTab] = useState<Tab>('users')
  const [users, setUsers] = useState<Profile[]>([])
  const [records, setRecords] = useState<PunchRecordWithUser[]>([])
  const [page, setPage] = useState(1)
  const [filterUserId, setFilterUserId] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [loadingData, setLoadingData] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteForm, setInviteForm] = useState({ full_name: '', email: '', role: 'funcionario' as Role })
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState(false)

  const getToken = useCallback(async (): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Sessão expirada')
    return session.access_token
  }, [])

  const loadUsers = useCallback(async () => {
    setLoadingData(true)
    try {
      const token = await getToken()
      const data = await apiFetch<Profile[]>('/admin/users', token)
      setUsers(data)
    } catch {
      // silently fail
    } finally {
      setLoadingData(false)
    }
  }, [getToken])

  const loadRecords = useCallback(async (pageNum: number) => {
    setLoadingData(true)
    try {
      const token = await getToken()
      const base = filterUserId ? `/admin/logs/${filterUserId}` : '/admin/logs'
      const data = await apiFetch<PunchRecordWithUser[]>(`${base}?page=${pageNum}&page_size=${PAGE_SIZE}`, token)
      setRecords(data)
    } catch {
      // silently fail
    } finally {
      setLoadingData(false)
    }
  }, [getToken, filterUserId])

  useEffect(() => {
    if (tab === 'users') loadUsers()
    else loadRecords(page)
  }, [tab, page, loadUsers, loadRecords])

  const filteredRecords = filterDate
    ? records.filter((r) => r.date === filterDate)
    : records

  async function handleInvite(e: FormEvent) {
    e.preventDefault()
    setInviteLoading(true)
    setInviteError(null)
    try {
      const token = await getToken()
      await apiFetch('/auth/invite', token, {
        method: 'POST',
        body: JSON.stringify(inviteForm),
      })
      setInviteSuccess(true)
      setTimeout(() => {
        setShowInviteModal(false)
        setInviteSuccess(false)
        setInviteForm({ full_name: '', email: '', role: 'funcionario' })
        loadUsers()
      }, 2000)
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Erro ao enviar convite.')
    } finally {
      setInviteLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Faixa decorativa */}
      <div className="h-1.5 w-full bg-gradient-to-r from-brand via-forest to-sand" />

      {/* Header */}
      <header className="flex items-center justify-between border-b border-surface-border bg-surface-card px-6 py-4 shadow-soft">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Aldeia Escola" className="h-7 w-auto" />
          <div className="h-4 w-px bg-surface-border" />
          <div>
            <p className="font-display text-sm font-semibold text-ink leading-none">Painel Admin</p>
            <p className="mt-0.5 font-body text-xs text-ink-muted">{profile?.full_name}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="rounded-xl border border-surface-border bg-surface px-4 py-2 font-body text-sm text-ink-muted transition hover:border-brand/30 hover:text-brand"
        >
          Sair
        </button>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-surface-border bg-surface-card px-6">
        {(['users', 'records'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setPage(1) }}
            className={`relative px-4 py-3.5 font-body text-sm font-medium transition ${
              tab === t ? 'text-brand' : 'text-ink-muted hover:text-ink'
            }`}
          >
            {t === 'users' ? 'Usuários' : 'Registros'}
            {tab === t && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute inset-x-0 bottom-0 h-0.5 bg-brand"
              />
            )}
          </button>
        ))}
      </div>

      <main className="px-4 py-6">
        {/* Aba Usuários */}
        {tab === 'users' && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <p className="font-body text-sm text-ink-muted">{users.length} usuário{users.length !== 1 ? 's' : ''}</p>
              <button
                onClick={() => setShowInviteModal(true)}
                className="rounded-xl bg-brand px-4 py-2 font-body text-sm font-semibold text-white shadow-brand transition hover:bg-brand-dark"
              >
                + Convidar
              </button>
            </div>

            {loadingData ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {users.map((u) => (
                  <div key={u.id} className="rounded-2xl border border-surface-border bg-surface-card p-4 shadow-card">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sand font-display text-sm font-bold text-brand">
                          {u.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-display text-sm font-semibold text-ink">{u.full_name}</p>
                          <p className="font-body text-xs text-ink-muted">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className={`rounded-full px-2.5 py-0.5 font-body text-xs font-medium ${
                          u.role === 'admin'
                            ? 'bg-brand/10 text-brand'
                            : 'bg-forest/10 text-forest-dark'
                        }`}>
                          {u.role}
                        </span>
                        <span className={`rounded-full px-2.5 py-0.5 font-body text-xs ${
                          u.is_active
                            ? 'bg-forest/10 text-forest-dark'
                            : 'bg-red-50 text-red-600'
                        }`}>
                          {u.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {users.length === 0 && (
                  <p className="py-8 text-center font-body text-sm text-ink-subtle">Nenhum usuário encontrado.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Aba Registros */}
        {tab === 'records' && (
          <div>
            <div className="mb-4 flex flex-wrap gap-3">
              <select
                value={filterUserId}
                onChange={(e) => { setFilterUserId(e.target.value); setPage(1) }}
                className="flex-1 rounded-xl border border-surface-border bg-surface-card px-3 py-2.5 font-body text-sm text-ink shadow-soft outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              >
                <option value="">Todos os usuários</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.full_name}</option>
                ))}
              </select>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="rounded-xl border border-surface-border bg-surface-card px-3 py-2.5 font-body text-sm text-ink shadow-soft outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>

            {loadingData ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-2xl border border-surface-border bg-surface-card shadow-card">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-surface-border bg-surface">
                        {['Usuário', 'Tipo', 'Data', 'Hora', 'Foto'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left font-body text-xs font-semibold uppercase tracking-wider text-ink-muted">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecords.map((r) => (
                        <tr key={r.id} className="border-b border-surface-border last:border-0 hover:bg-surface/60 transition">
                          <td className="px-4 py-3 font-body text-sm text-ink">{r.user.full_name}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2.5 py-0.5 font-body text-xs font-medium ${
                              r.type === 'entrada'
                                ? 'bg-forest/10 text-forest-dark'
                                : 'bg-brand/10 text-brand'
                            }`}>
                              {r.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-body text-sm text-ink-muted">
                            {new Date(r.punched_at).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-4 py-3 font-body text-sm text-ink-muted">
                            {new Date(r.punched_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-4 py-3">
                            <a href={r.photo_url} target="_blank" rel="noopener noreferrer">
                              <img
                                src={r.photo_url}
                                alt="Foto do ponto"
                                className="h-8 w-8 rounded-lg border border-surface-border object-cover transition hover:border-brand/40"
                              />
                            </a>
                          </td>
                        </tr>
                      ))}
                      {filteredRecords.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center font-body text-sm text-ink-subtle">
                            Nenhum registro encontrado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-xl border border-surface-border bg-surface-card px-4 py-2 font-body text-sm text-ink-muted transition hover:border-brand/30 hover:text-brand disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <span className="font-body text-sm text-ink-muted">Página {page}</span>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={records.length < PAGE_SIZE}
                    className="rounded-xl border border-surface-border bg-surface-card px-4 py-2 font-body text-sm text-ink-muted transition hover:border-brand/30 hover:text-brand disabled:opacity-40"
                  >
                    Próxima
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* Modal Convidar */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 px-4 pb-6 backdrop-blur-sm sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowInviteModal(false)}
          >
            <motion.div
              className="w-full max-w-sm rounded-3xl border border-surface-border bg-surface-card p-6 shadow-card"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="mb-5 font-display text-lg font-bold text-ink">Convidar Usuário</h2>

              {inviteSuccess ? (
                <div className="py-6 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-forest/10">
                    <svg className="h-6 w-6 text-forest" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="font-body text-sm font-medium text-forest-dark">Convite enviado com sucesso!</p>
                </div>
              ) : (
                <form onSubmit={handleInvite} className="flex flex-col gap-4">
                  <input
                    type="text"
                    placeholder="Nome completo"
                    value={inviteForm.full_name}
                    onChange={(e) => setInviteForm((f) => ({ ...f, full_name: e.target.value }))}
                    required
                    className="w-full rounded-xl border border-surface-border bg-surface px-4 py-3 font-body text-sm text-ink placeholder-ink-subtle outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  />
                  <input
                    type="email"
                    placeholder="E-mail"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                    required
                    className="w-full rounded-xl border border-surface-border bg-surface px-4 py-3 font-body text-sm text-ink placeholder-ink-subtle outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  />
                  <select
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm((f) => ({ ...f, role: e.target.value as Role }))}
                    className="w-full rounded-xl border border-surface-border bg-surface px-4 py-3 font-body text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  >
                    <option value="funcionario">Funcionário</option>
                    <option value="admin">Admin</option>
                  </select>

                  {inviteError && (
                    <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-body text-sm text-red-700">
                      {inviteError}
                    </p>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowInviteModal(false)}
                      className="flex-1 rounded-xl border border-surface-border bg-surface py-3 font-body text-sm text-ink-muted transition hover:border-brand/30 hover:text-brand"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={inviteLoading}
                      className="flex-1 rounded-xl bg-brand py-3 font-body text-sm font-semibold text-white shadow-brand transition hover:bg-brand-dark disabled:opacity-60"
                    >
                      {inviteLoading ? 'Enviando...' : 'Convidar'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rodapé */}
      <footer className="border-t border-surface-border px-6 py-4 text-center">
        <p className="font-body text-xs text-ink-subtle">Aldeia Escola · São José dos Campos</p>
      </footer>
    </div>
  )
}
