import { useRef, useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface CameraCaptureProps {
  onCapture: (blob: Blob) => void
  onCancel: () => void
}

type FacingMode = 'user' | 'environment'

const MAX_DIMENSION = 1024
const JPEG_QUALITY = 0.8

function compressImage(video: HTMLVideoElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    let { videoWidth: w, videoHeight: h } = video

    if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
      if (w > h) {
        h = Math.round((h * MAX_DIMENSION) / w)
        w = MAX_DIMENSION
      } else {
        w = Math.round((w * MAX_DIMENSION) / h)
        h = MAX_DIMENSION
      }
    }

    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return reject(new Error('Canvas context unavailable'))
    ctx.drawImage(video, 0, 0, w, h)
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Falha ao converter imagem'))
      },
      'image/jpeg',
      JPEG_QUALITY,
    )
  })
}

export function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [facingMode, setFacingMode] = useState<FacingMode>('user')
  const [error, setError] = useState<string | null>(null)
  const [capturing, setCapturing] = useState(false)

  const startCamera = useCallback(async (mode: FacingMode) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setError(null)
    } catch {
      setError('Não foi possível acessar a câmera. Verifique as permissões do navegador.')
    }
  }, [])

  useEffect(() => {
    startCamera(facingMode)
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [facingMode, startCamera])

  const handleCapture = useCallback(async () => {
    if (!videoRef.current || capturing) return
    setCapturing(true)
    try {
      const blob = await compressImage(videoRef.current)
      onCapture(blob)
    } catch {
      setError('Falha ao capturar foto. Tente novamente.')
      setCapturing(false)
    }
  }, [capturing, onCapture])

  const toggleCamera = useCallback(() => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))
  }, [])

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex flex-col bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {error ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
            <p className="text-red-400 font-body">{error}</p>
            <button
              onClick={onCancel}
              className="rounded-2xl bg-surface-elevated px-6 py-3 font-body text-white"
            >
              Voltar
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />

            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-8 pb-10 pt-6 bg-gradient-to-t from-black/80 to-transparent">
              <button
                onClick={onCancel}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm"
                aria-label="Cancelar"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <motion.button
                onClick={handleCapture}
                disabled={capturing}
                whileTap={{ scale: 0.92 }}
                className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-white/20 backdrop-blur-sm disabled:opacity-50"
                aria-label="Capturar foto"
              >
                <div className="h-14 w-14 rounded-full bg-white" />
              </motion.button>

              <button
                onClick={toggleCamera}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm"
                aria-label="Alternar câmera"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
