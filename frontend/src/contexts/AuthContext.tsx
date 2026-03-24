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
import type { Profile } from '../types'

interface AuthState {
  user: User | null
  profile: Profile | null
  session: Session | null
  /** true apenas enquanto a sessão inicial ainda não foi resolvida */
  loading: boolean
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function fetchProfile(userId: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

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

    // Resolve sessão inicial uma única vez
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return
      if (session?.user) {
        const profile = await fetchProfile(session.user.id)
        if (mounted) {
          setState({ user: session.user, profile, session, loading: false })
        }
      } else {
        if (mounted) {
          setState({ user: null, profile: null, session: null, loading: false })
        }
      }
    }).catch(() => {
      if (mounted) {
        setState({ user: null, profile: null, session: null, loading: false })
      }
    })

    // Escuta mudanças de sessão subsequentes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        // INITIAL_SESSION já foi tratado acima; evita dupla execução
        if (event === 'INITIAL_SESSION') return

        if (session?.user) {
          const profile = await fetchProfile(session.user.id)
          if (mounted) {
            setState({ user: session.user, profile, session, loading: false })
          }
        } else {
          if (mounted) {
            setState({ user: null, profile: null, session: null, loading: false })
          }
        }
      },
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
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
