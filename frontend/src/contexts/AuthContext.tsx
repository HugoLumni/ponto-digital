/**
 * AuthContext — fonte única de verdade para sessão e perfil.
 *
 * Fases de bootstrap:
 *   sessionReady=false  → sessão ainda não foi resolvida pelo SDK (spinner global)
 *   sessionReady=true, profileStatus='loading' → sessão existe, buscando perfil
 *   sessionReady=true, profileStatus='ready'   → perfil carregado com sucesso
 *   sessionReady=true, profileStatus='missing' → perfil não existe na tabela
 *   sessionReady=true, profileStatus='error'   → falha de rede/RLS ao buscar perfil
 *   sessionReady=true, profileStatus='idle'    → sem sessão ativa
 *
 * Regra fundamental: NENHUM guard ou página deve tomar decisão de navegação
 * enquanto sessionReady=false ou profileStatus='loading'.
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../supabaseClient'
import type { Profile, Role } from '../types'

export type ProfileStatus = 'idle' | 'loading' | 'ready' | 'missing' | 'error'

interface AuthState {
  user: User | null
  profile: Profile | null
  session: Session | null
  /** false enquanto o SDK ainda não resolveu a sessão inicial */
  sessionReady: boolean
  /** estado de resolução do perfil */
  profileStatus: ProfileStatus
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

// ─── helpers ────────────────────────────────────────────────────────────────

function isRole(value: unknown): value is Role {
  return value === 'admin' || value === 'funcionario'
}

/** Constrói um Profile mínimo a partir de user_metadata quando disponível */
function profileFromMetadata(user: User): Profile | null {
  const role = user.user_metadata?.role
  if (!isRole(role)) return null
  return {
    id: user.id,
    full_name: typeof user.user_metadata?.full_name === 'string'
      ? user.user_metadata.full_name
      : (user.email ?? 'Usuário'),
    email: user.email ?? '',
    role,
    is_active: true,
    created_at: new Date().toISOString(),
  }
}

/** Busca perfil no banco com retry simples (1 tentativa extra após 1.5s) */
async function fetchProfileWithRetry(userId: string): Promise<{ data: Profile | null; status: ProfileStatus }> {
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 1500))
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.warn(`[auth] fetchProfile tentativa ${attempt + 1} erro:`, error.message)
        continue
      }
      if (!data) return { data: null, status: 'missing' }
      return { data: data as Profile, status: 'ready' }
    } catch (err) {
      console.warn(`[auth] fetchProfile tentativa ${attempt + 1} exceção:`, err)
    }
  }
  return { data: null, status: 'error' }
}

// ─── provider ───────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    sessionReady: false,
    profileStatus: 'idle',
  })

  useEffect(() => {
    let mounted = true

    async function resolveSession(session: Session | null) {
      if (!mounted) return

      if (!session?.user) {
        setState({
          user: null,
          profile: null,
          session: null,
          sessionReady: true,
          profileStatus: 'idle',
        })
        return
      }

      const user = session.user

      // Libera sessionReady imediatamente com fallback de metadata (se existir),
      // para que guards possam mostrar spinner sem bloquear o SDK.
      const metaProfile = profileFromMetadata(user)
      setState({
        user,
        profile: metaProfile,
        session,
        sessionReady: true,
        profileStatus: 'loading',
      })

      // Busca perfil real no banco (com retry)
      const { data: dbProfile, status } = await fetchProfileWithRetry(user.id)
      if (!mounted) return

      setState((prev) => {
        // Descarta se o usuário mudou durante o fetch
        if (prev.user?.id !== user.id) return prev
        return {
          ...prev,
          profile: dbProfile ?? prev.profile,
          profileStatus: status,
        }
      })
    }

    // onAuthStateChange é a única fonte de verdade.
    // INITIAL_SESSION dispara imediatamente com a sessão atual (ou null).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        await resolveSession(session)
      },
    )

    // Fallback: se o SDK não disparar em 6s, desbloqueia o app.
    const fallback = setTimeout(() => {
      if (mounted) {
        setState((prev) =>
          prev.sessionReady
            ? prev
            : { ...prev, sessionReady: true, profileStatus: 'error' },
        )
      }
    }, 6000)

    return () => {
      mounted = false
      subscription.unsubscribe()
      clearTimeout(fallback)
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error ? error.message : null
  }, [])

  const signOut = useCallback(async (): Promise<void> => {
    await supabase.auth.signOut()
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}
