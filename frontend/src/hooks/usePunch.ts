import { useState, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import type { PunchRegisterResponse } from '../types'

interface UsePunchReturn {
  registerPunch: (photoBlob: Blob) => Promise<PunchRegisterResponse>
  loading: boolean
  error: string | null
}

export function usePunch(): UsePunchReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const registerPunch = useCallback(async (photoBlob: Blob): Promise<PunchRegisterResponse> => {
    setLoading(true)
    setError(null)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setLoading(false)
      throw new Error('Sessão expirada. Faça login novamente.')
    }

    const apiUrl = import.meta.env.VITE_API_URL as string
    const formData = new FormData()
    formData.append('photo', photoBlob, 'punch.jpg')

    const response = await fetch(`${apiUrl}/punch/register`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const body = await response.json().catch(() => ({ detail: 'Erro desconhecido.' }))
      const message = (body as { detail?: string }).detail ?? 'Falha ao registrar ponto.'
      setError(message)
      setLoading(false)
      throw new Error(message)
    }

    const data = (await response.json()) as PunchRegisterResponse
    setLoading(false)
    return data
  }, [])

  return { registerPunch, loading, error }
}
