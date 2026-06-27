import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import type { AppViewProps } from '@/types'
import { useBlobStore } from '@/stores/useBlobStore'
import { useWindowsStore } from '@/stores/useWindowsStore'
import { FilePicker, type PickedFile } from './FilePicker'

type Status = 'pending' | 'loading' | 'success' | 'error'

export function PendingFile<T>({
  props,
  compute,
  children,
}: {
  props: AppViewProps
  compute: (data: Uint8Array, fileName: string) => Promise<T>
  children: (state: T) => ReactNode
}) {
  const [status, setStatus] = useState<Status>('pending')
  const [error, setError] = useState<string | null>(null)
  const [state, setState] = useState<T | null>(null)
  const setTitle = useWindowsStore((s) => s.setTitle)

  const load = useCallback(
    async (data: Uint8Array, fileName: string) => {
      setStatus('loading')
      try {
        const result = await compute(data, fileName)
        setState(result)
        setStatus('success')
        setTitle(props.winId, fileName)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
        setStatus('error')
      }
    },
    [compute, props.winId, setTitle],
  )

  useEffect(() => {
    if (!props.external) return
    const bytes = useBlobStore.getState().load(props.external.blobId)
    if (bytes) {
      void load(bytes, props.external.fileName)
    }
  }, [props.external, load])

  if (status === 'loading') {
    return (
      <div className="flex h-full w-full items-center justify-center text-gray-500">
        <Loader2 className="animate-spin" size={28} />
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-6 text-center">
        <AlertTriangle size={50} className="text-red-500" />
        <p className="text-red-600">{error}</p>
        <button
          type="button"
          className="rounded bg-gray-200 px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-300"
          onClick={() => setStatus('pending')}
        >
          Close
        </button>
      </div>
    )
  }

  if (status === 'success' && state !== null) {
    return <>{children(state)}</>
  }

  return (
    <FilePicker
      onFile={async (file: PickedFile) => {
        const bytes = await file.read()
        await load(bytes, file.name)
      }}
    />
  )
}
