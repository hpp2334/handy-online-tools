import { create } from 'zustand'
import { getApp } from '@/apps/registry'
import type { AppExternal, AppWindow, WinBounds } from '@/types'

interface WindowsState {
  windows: AppWindow[]
  topZ: number
  allocated: number
  create: (appId: number, external?: AppExternal | null) => void
  remove: (id: number) => void
  activate: (id: number) => void
  updateBounds: (id: number, bounds: WinBounds) => void
  setTitle: (id: number, title: string) => void
}

export const useWindowsStore = create<WindowsState>((set, get) => ({
  windows: [],
  topZ: 1,
  allocated: 0,
  create: (appId, external = null) => {
    const app = getApp(appId)
    if (!app) return
    const id = get().allocated + 1
    const z = get().topZ + 1
    const win: AppWindow = {
      id,
      appId,
      title: app.name,
      bounds: { x: 40, y: 40, w: app.defaultSize.w, h: app.defaultSize.h },
      z,
      external,
    }
    set((state) => ({
      windows: [...state.windows, win],
      allocated: id,
      topZ: z,
    }))
  },
  remove: (id) =>
    set((state) => ({
      windows: state.windows.filter((w) => w.id !== id),
    })),
  activate: (id) =>
    set((state) => {
      const target = state.windows.find((w) => w.id === id)
      if (!target) return state
      if (target.z === state.topZ) return state
      const nextZ = state.topZ + 1
      return {
        windows: state.windows.map((w) =>
          w.id === id ? { ...w, z: nextZ } : w,
        ),
        topZ: nextZ,
      }
    }),
  updateBounds: (id, bounds) =>
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, bounds } : w,
      ),
    })),
  setTitle: (id, title) =>
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, title } : w,
      ),
    })),
}))
