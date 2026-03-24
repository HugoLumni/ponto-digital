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

interface AuthState {
  user: User | null
  profile: Profile | null
  session: Session | null
  /** true enquanto a sessão inicial não foi resolvida */
  loading: boolean
  /** true quando o fetch de profile terminou (com ou sem resultado) */
  profileResolved: boolean
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function isRole(value: unknown): value is Role {
  return value === 'admin' || value === 'funcionario'
}

function fallbackProfileFromUser(user: User): Profile | null {
  const role = user.user_metadata?.role
  if (!isRole(role)) return null
  const fullName =
    typeof user.user_metadata?.full_name === 'string'
      ? user.user_metadata.full_name
      : (user.email ?? 'Usuário')
  return {
    id: user.id,
    full_name: fullName,
    email: user.email ?? '',
    role,
    is_active: true,
    created_at: new Date().toISOString(),
  }
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    if (error || !data) return null
    return data as Profile
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    loading: true,
    profileResolved: false,
  })

  useEffect(() => {
    let mounted = true

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return

        if (session?.user) {
          const user = session.user

          // Usa fallback imediato de user_metadata para não bloquear a UI.
          const fallback = fallbackProfileFromUser(user)

          setState({
            user,
            session,
            loading: false,
            // Se temos fallback com role válido, já consideramos resolvido.
            profile: fallback,
            profileResolved: fallback !== null,
          })

          // Busca perfil real no banco em paralelo (sem timeout agressivo).
          const dbProfile = await fetchProfile(user.id)
          if (!mounted) return

          setState((prev) => {
            if (prev.user?.id !== user.id) return prev
            // Prefere perfil do banco; se falhou, mantém fallback.
            const resolved = dbProfile ?? prev.profile
            return {
              ...prev,
              profile: resolved,
              // Só marca resolvido quando o banco respondeu.
              profileResolved: true,
            }
          })
        } else {
          setState({
            user: null,
            profile: null,
            session: null,
            loading: false,
            profileResolved: true,
          })
        }
      },
    )

    // Destrava loading após 8s caso onAuthStateChange não dispare.
    const fallbackTimer = setTimeout(() => {
      if (mounted) {
        setState((prev) =>
          prev.loading
            ? { ...prev, loading: false, profileResolved: true }
            : prev,
        )
      }
    }, 8000)

    return () => {
      mounted = false
      subscription.unsubscribe()
      clearTimeout(fallbackTimer)
    }
  }, [])

  const signIn = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return error ? error.message : null
    },
    [],
  )

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
