import { useState, useEffect, useCallback, FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../supabaseClient'
import type { Profile, PunchRecordWithUser, Role } from '../types'

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
      // silently fail; user sees empty state
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
      <header className="flex items-center justify-between border-b border-white/5 px-6 py-4">
        <div>
          <h1 className="font-display text-lg font-bold text-white">Painel Admin</h1>
          <p className="font-body text-xs text-slate-400">{profile?.full_name}</p>
        </div>
        <button
          onClick={signOut}
          className="rounded-xl bg-surface-card px-4 py-2 font-body text-sm text-slate-400 ring-1 ring-white/10 transition hover:text-white"
        >
          Sair
        </button>
      </header>

      <div className="flex gap-1 border-b border-white/5 px-6">
        {(['users', 'records'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setPage(1) }}
            className={`relative px-4 py-3 font-body text-sm font-medium transition ${
              tab === t ? 'text-brand' : 'text-slate-400 hover:text-white'
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
        {tab === 'users' && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <p className="font-body text-sm text-slate-400">{users.length} usuários</p>
              <button
                onClick={() => setShowInviteModal(true)}
                className="rounded-xl bg-brand px-4 py-2 font-body text-sm font-semibold text-white transition hover:bg-brand-dark"
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
                  <div
                    key={u.id}
                    className="rounded-2xl bg-surface-card p-4 ring-1 ring-white/5"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-display text-sm font-semibold text-white">{u.full_name}</p>
                        <p className="font-body text-xs text-slate-400">{u.email}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`rounded-full px-2.5 py-0.5 font-body text-xs font-medium ${
                          u.role === 'admin' ? 'bg-brand/20 text-brand' : 'bg-slate-700 text-slate-300'
                        }`}>
                          {u.role}
                        </span>
                        <span className={`rounded-full px-2.5 py-0.5 font-body text-xs ${
                          u.is_active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          {u.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'records' && (
          <div>
            <div className="mb-4 flex flex-wrap gap-3">
              <select
                value={filterUserId}
                onChange={(e) => { setFilterUserId(e.target.value); setPage(1) }}
                className="flex-1 rounded-xl bg-surface-card px-3 py-2 font-body text-sm text-white ring-1 ring-white/10 focus:outline-none focus:ring-brand"
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
                className="rounded-xl bg-surface-card px-3 py-2 font-body text-sm text-white ring-1 ring-white/10 focus:outline-none focus:ring-brand"
              />
            </div>

            {loadingData ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-2xl bg-surface-card ring-1 ring-white/5">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/5">
                        {['Usuário', 'Tipo', 'Data', 'Hora', 'Foto'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left font-body text-xs font-medium uppercase tracking-wider text-slate-400">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecords.map((r) => (
                        <tr key={r.id} className="border-b border-white/5 last:border-0">
                          <td className="px-4 py-3 font-body text-sm text-white">{r.user.full_name}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2.5 py-0.5 font-body text-xs font-medium ${
                              r.type === 'entrada' ? 'bg-brand/20 text-brand' : 'bg-orange-500/20 text-orange-400'
                            }`}>
                              {r.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-body text-sm text-slate-300">
                            {new Date(r.punched_at).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-4 py-3 font-body text-sm text-slate-300">
                            {new Date(r.punched_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-4 py-3">
                            <a href={r.photo_url} target="_blank" rel="noopener noreferrer">
                              <img
                                src={r.photo_url}
                                alt="Foto do ponto"
                                className="h-8 w-8 rounded-lg object-cover ring-1 ring-white/10 transition hover:ring-brand"
                              />
                            </a>
                          </td>
                        </tr>
                      ))}
                      {filteredRecords.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center font-body text-sm text-slate-500">
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
                    className="rounded-xl bg-surface-card px-4 py-2 font-body text-sm text-slate-400 ring-1 ring-white/10 transition hover:text-white disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <span className="font-body text-sm text-slate-400">Página {page}</span>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={records.length < PAGE_SIZE}
                    className="rounded-xl bg-surface-card px-4 py-2 font-body text-sm text-slate-400 ring-1 ring-white/10 transition hover:text-white disabled:opacity-40"
                  >
                    Próxima
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      <AnimatePresence>
        {showInviteModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-6 sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowInviteModal(false)}
          >
            <motion.div
              className="w-full max-w-sm rounded-3xl bg-surface-card p-6"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="mb-4 font-display text-lg font-bold text-white">Convidar Usuário</h2>

              {inviteSuccess ? (
                <p className="py-4 text-center font-body text-brand">Convite enviado com sucesso!</p>
              ) : (
                <form onSubmit={handleInvite} className="flex flex-col gap-4">
                  <input
                    type="text"
                    placeholder="Nome completo"
                    value={inviteForm.full_name}
                    onChange={(e) => setInviteForm((f) => ({ ...f, full_name: e.target.value }))}
                    required
                    className="w-full rounded-xl bg-surface-elevated px-4 py-3 font-body text-sm text-white placeholder-slate-500 outline-none ring-1 ring-white/10 focus:ring-brand"
                  />
                  <input
                    type="email"
                    placeholder="E-mail"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                    required
                    className="w-full rounded-xl bg-surface-elevated px-4 py-3 font-body text-sm text-white placeholder-slate-500 outline-none ring-1 ring-white/10 focus:ring-brand"
                  />
                  <select
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm((f) => ({ ...f, role: e.target.value as Role }))}
                    className="w-full rounded-xl bg-surface-elevated px-4 py-3 font-body text-sm text-white outline-none ring-1 ring-white/10 focus:ring-brand"
                  >
                    <option value="funcionario">Funcionário</option>
                    <option value="admin">Admin</option>
                  </select>

                  {inviteError && (
                    <p className="rounded-xl bg-red-500/10 px-4 py-3 font-body text-sm text-red-400">
                      {inviteError}
                    </p>
                  )}

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowInviteModal(false)}
                      className="flex-1 rounded-xl bg-surface-elevated py-3 font-body text-sm text-slate-400 ring-1 ring-white/10"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={inviteLoading}
                      className="flex-1 rounded-xl bg-brand py-3 font-body text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
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
    </div>
  )
}
