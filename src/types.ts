import type { ComponentType } from 'react'
import type { LucideIcon } from 'lucide-react'

export interface Point {
  w: number
  h: number
}

export interface AppExternal {
  blobId: string
  fileName: string
}

export interface AppViewProps {
  external: AppExternal | null
  winId: number
}

export interface AppDef {
  id: number
  name: string
  defaultSize: Point
  extensions: string[]
  icon: LucideIcon
  component: ComponentType<{ props: AppViewProps }>
}

export interface WinBounds {
  x: number
  y: number
  w: number
  h: number
}

export interface AppWindow {
  id: number
  appId: number
  title: string
  bounds: WinBounds
  z: number
  external: AppExternal | null
}
