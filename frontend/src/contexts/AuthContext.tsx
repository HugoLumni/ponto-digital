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
  loading: boolean
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function isRole(value: unknown): value is Role {
  return value === 'admin' || value === 'funcionario'
}

function profileFromMetadata(user: User): Profile | null {
  const role = user.user_metadata?.role
  if (!isRole(role)) return null
  return {
    id: user.id,
    full_name:
      typeof user.user_metadata?.full_name === 'string'
        ? user.user_metadata.full_name
        : (user.email ?? 'Usuário'),
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
  })

  useEffect(() => {
    let mounted = true

    // getSession() é síncrono com o localStorage — resolve imediatamente
    // sem depender de round-trip ao servidor.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return

      if (session?.user) {
        const user = session.user
        // Usa metadata como perfil imediato para não bloquear a UI.
        const metaProfile = profileFromMetadata(user)
        setState({ user, session, profile: metaProfile, loading: false })

        // Busca perfil real no banco em segundo plano.
        const dbProfile = await fetchProfile(user.id)
        if (!mounted) return
        setState((prev) => {
          if (prev.user?.id !== user.id) return prev
          return { ...prev, profile: dbProfile ?? prev.profile }
        })
      } else {
        setState({ user: null, session: null, profile: null, loading: false })
      }
    }).catch(() => {
      if (mounted) {
        setState({ user: null, session: null, profile: null, loading: false })
      }
    })

    // Escuta mudanças após o bootstrap (login, logout, token refresh).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        // INITIAL_SESSION já foi tratado pelo getSession acima.
        if (event === 'INITIAL_SESSION') return

        if (session?.user) {
          const user = session.user
          const metaProfile = profileFromMetadata(user)
          setState({ user, session, profile: metaProfile, loading: false })

          const dbProfile = await fetchProfile(user.id)
          if (!mounted) return
          setState((prev) => {
            if (prev.user?.id !== user.id) return prev
            return { ...prev, profile: dbProfile ?? prev.profile }
          })
        } else {
          setState({ user: null, session: null, profile: null, loading: false })
        }
      },
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return error ? error.message : null
    },
    [],
  )

  const signOut = useCallback((): void => {
    supabase.auth.signOut().catch(() => {})
    window.location.replace('/login')
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
