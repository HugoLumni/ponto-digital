import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export function AuthRedirect() {
  const navigate = useNavigate()
  const [debugMsg, setDebugMsg] = useState('Autenticando...')

  useEffect(() => {
    async function redirect() {
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        setDebugMsg(`Sem sessão: ${userError?.message ?? 'user null'}`)
        setTimeout(() => navigate('/login', { replace: true }), 3000)
        return
      }

      setDebugMsg(`Usuário OK: ${user.id} — buscando perfil...`)

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) {
        setDebugMsg(`Erro no perfil: ${profileError?.message ?? 'profile null'} — code: ${profileError?.code}`)
        setTimeout(() => navigate('/login', { replace: true }), 5000)
        return
      }

      setDebugMsg(`Role: ${profile.role} — redirecionando...`)
      navigate(profile.role === 'admin' ? '/admin' : '/punch', { replace: true })
    }

    redirect()
  }, [navigate])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface px-6">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      <p className="font-body text-sm text-slate-400 text-center max-w-xs">{debugMsg}</p>
    </div>
  )
}
