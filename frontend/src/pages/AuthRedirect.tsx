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

      setDebugMsg(`Buscando perfil...`)

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) {
        setDebugMsg(`Perfil ausente/inválido. Encerrando sessão...`)
        await supabase.auth.signOut()
        setTimeout(() => navigate('/login', { replace: true }), 1200)
        return
      }

      navigate(profile.role === 'admin' ? '/admin' : '/punch', { replace: true })
    }

    redirect()
  }, [navigate])

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <div className="h-1.5 w-full bg-gradient-to-r from-brand via-forest to-sand" />
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        <p className="max-w-xs text-center font-body text-sm text-ink-muted">{debugMsg}</p>
      </div>
    </div>
  )
}
