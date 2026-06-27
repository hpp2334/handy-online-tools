import { create } from 'zustand'

interface BlobState {
  blobs: Map<string, Uint8Array>
  store: (data: Uint8Array) => string
  load: (id: string) => Uint8Array | undefined
  remove: (id: string) => void
}

let counter = 0

export const useBlobStore = create<BlobState>((set, get) => ({
  blobs: new Map(),
  store: (data) => {
    const id = `blob_${Date.now()}_${counter++}`
    set((state) => {
      const next = new Map(state.blobs)
      next.set(id, data)
      return { blobs: next }
    })
    return id
  },
  load: (id) => get().blobs.get(id),
  remove: (id) =>
    set((state) => {
      const next = new Map(state.blobs)
      next.delete(id)
      return { blobs: next }
    }),
}))
