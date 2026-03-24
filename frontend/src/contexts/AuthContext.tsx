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

  const fullName = typeof user.user_metadata?.full_name === 'string'
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

async function fetchProfileWithTimeout(userId: string, timeoutMs = 4000): Promise<Profile | null> {
  return Promise.race([
    fetchProfile(userId),
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), timeoutMs)
    }),
  ])
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

    // onAuthStateChange com INITIAL_SESSION é a única fonte de verdade.
    // Ele dispara imediatamente com a sessão atual (ou null) antes de qualquer
    // evento subsequente, eliminando a corrida com getSession().
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return

        if (session?.user) {
          const user = session.user
          const fallbackProfile = fallbackProfileFromUser(user)

          // Libera a UI imediatamente com fallback (quando existir),
          // sem bloquear no fetch de profile.
          setState({
            user,
            profile: fallbackProfile,
            session,
            loading: false,
            // Sem role no metadata, ainda vamos resolver pelo banco.
            profileResolved: fallbackProfile !== null,
          })

          const dbProfile = await fetchProfileWithTimeout(user.id)
          if (!mounted) return

          // Evita race: só aplica se ainda for o mesmo usuário logado.
          setState((prev) => {
            if (prev.user?.id !== user.id) return prev
            return {
              ...prev,
              profile: dbProfile ?? prev.profile,
              profileResolved: true,
            }
          })
        } else {
          setState({ user: null, profile: null, session: null, loading: false, profileResolved: true })
        }
      },
    )

    // Fallback de segurança: se onAuthStateChange não disparar em 5s, destrava o loading.
    const fallback = setTimeout(() => {
      if (mounted) {
        setState((prev) => {
          if (!prev.loading) return prev
          return { ...prev, loading: false, profileResolved: true }
        })
      }
    }, 5000)

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
