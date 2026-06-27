import { recommendApp } from '@/apps/registry'
import { useBlobStore } from '@/stores/useBlobStore'
import { useWindowsStore } from '@/stores/useWindowsStore'
import type { AppExternal } from '@/types'

export interface OpenableResource {
  bytes: () => Promise<Uint8Array>
  fileName: string
}

export function openFile(resource: OpenableResource): void {
  void (async () => {
    const bytes = await resource.bytes()
    const blobId = useBlobStore.getState().store(bytes)
    const external: AppExternal = { blobId, fileName: resource.fileName }
    const create = useWindowsStore.getState().create
    const preferred = recommendApp(resource.fileName)
    if (preferred) {
      create(preferred.id, external)
    } else {
      openAsDialog(external)
    }
  })()
}

let openAsHandler: ((ext: AppExternal) => void) | null = null

export function registerOpenAsHandler(fn: (ext: AppExternal) => void) {
  openAsHandler = fn
}

export function openAsDialog(external: AppExternal) {
  openAsHandler?.(external)
}

export function downloadBlob(bytes: Uint8Array, fileName: string): void {
  const blob = new Blob([bytes.slice().buffer], {
    type: 'application/octet-stream',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
