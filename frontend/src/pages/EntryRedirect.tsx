import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

function isInviteOrRecovery(search: URLSearchParams, hash: string): boolean {
  const typeFromQuery = search.get('type')
  const hasCode = search.has('code')
  const hasTokenInHash = hash.includes('access_token')

  return (
    hasTokenInHash ||
    (hasCode && (typeFromQuery === 'invite' || typeFromQuery === 'recovery')) ||
    hash.includes('type=invite') ||
    hash.includes('type=recovery')
  )
}

export function EntryRedirect() {
  const navigate = useNavigate()

  useEffect(() => {
    const search = new URLSearchParams(window.location.search)
    const hash = window.location.hash || ''

    if (isInviteOrRecovery(search, hash)) {
      const suffix = `${window.location.search}${hash}`
      navigate(`/set-password${suffix}`, { replace: true })
      return
    }

    navigate('/login', { replace: true })
  }, [navigate])

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <div className="h-1.5 w-full bg-gradient-to-r from-brand via-forest to-sand" />
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    </div>
  )
}
