import { useCallback, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { getApp } from '@/apps/registry'
import { useWindowsStore } from '@/stores/useWindowsStore'
import type { AppWindow, WinBounds } from '@/types'
import { clsx } from 'clsx'

const MIN_W = 200
const MIN_H = 120
const BAR_H = 40

type ResizeDir = 'left' | 'right' | 'top' | 'bottom' | 'tl' | 'tr' | 'bl' | 'br'

interface DragState {
  mode: 'move' | ResizeDir
  startX: number
  startY: number
  startBounds: WinBounds
}

const EDGE = 8

function onEdge(localX: number, localY: number, b: WinBounds): ResizeDir | null {
  const left = localX <= EDGE
  const right = localX >= b.w - EDGE
  const top = localY <= EDGE
  const bottom = localY >= b.h - EDGE
  if (left && top) return 'tl'
  if (left && bottom) return 'bl'
  if (right && top) return 'tr'
  if (right && bottom) return 'br'
  if (left) return 'left'
  if (right) return 'right'
  if (top) return 'top'
  if (bottom) return 'bottom'
  return null
}

function cursorFor(dir: ResizeDir | 'move' | null): string {
  switch (dir) {
    case 'move':
      return 'grab'
    case 'left':
    case 'right':
      return 'ew-resize'
    case 'top':
    case 'bottom':
      return 'ns-resize'
    case 'tl':
    case 'br':
      return 'nwse-resize'
    case 'tr':
    case 'bl':
      return 'nesw-resize'
    default:
      return 'default'
  }
}

export function WindowFrame({ win }: { win: AppWindow }) {
  const app = getApp(win.appId)
  const remove = useWindowsStore((s) => s.remove)
  const activate = useWindowsStore((s) => s.activate)
  const updateBounds = useWindowsStore((s) => s.updateBounds)

  const [drag, setDrag] = useState<DragState | null>(null)
  const [cursor, setCursor] = useState<string>('default')
  const frameRef = useRef<HTMLDivElement>(null)

  const bounds = win.bounds

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const d = drag
      if (!d) return
      const dx = e.clientX - d.startX
      const dy = e.clientY - d.startY
      let { x, y, w, h } = d.startBounds

      const applyX = (leftDelta: number, widthDelta: number) => {
        const newW = d.startBounds.w - widthDelta
        if (newW >= MIN_W) {
          x = d.startBounds.x + leftDelta
          w = newW
        }
      }
      const applyY = (topDelta: number, heightDelta: number) => {
        const newH = d.startBounds.h - heightDelta
        if (newH >= MIN_H) {
          y = d.startBounds.y + topDelta
          h = newH
        }
      }

      if (d.mode === 'move') {
        x = d.startBounds.x + dx
        y = d.startBounds.y + dy
      } else {
        if (d.mode.includes('left')) applyX(dx, dx)
        if (d.mode.includes('right')) w = Math.max(MIN_W, d.startBounds.w + dx)
        if (d.mode.includes('top')) applyY(dy, dy)
        if (d.mode.includes('bottom'))
          h = Math.max(MIN_H, d.startBounds.h + dy)
      }

      updateBounds(win.id, { x, y, w, h })
    },
    [drag, updateBounds, win.id],
  )

  const onPointerUp = useCallback(() => {
    setDrag(null)
    setCursor('default')
  }, [])

  useEffect(() => {
    if (!drag) return
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [drag, onPointerMove, onPointerUp])

  if (!app) return null

  const Component = app.component

  const startInteract = (mode: 'move' | ResizeDir) => (e: React.PointerEvent) => {
    e.preventDefault()
    activate(win.id)
    setDrag({
      mode,
      startX: e.clientX,
      startY: e.clientY,
      startBounds: { ...bounds },
    })
    if (mode === 'move') setCursor('grabbing')
  }

  const handleHover = (e: React.PointerEvent) => {
    if (drag) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const localX = e.clientX - rect.left
    const localY = e.clientY - rect.top
    const dir = onEdge(localX, localY, bounds)
    setCursor(cursorFor(dir ?? null))
  }

  return (
    <div
      ref={frameRef}
      className="absolute select-none"
      style={{
        left: bounds.x,
        top: bounds.y,
        width: bounds.w + EDGE * 2,
        height: bounds.h + BAR_H + EDGE * 2,
        zIndex: win.z,
        cursor,
      }}
      onPointerMove={handleHover}
    >
      <div className="relative" style={{ padding: EDGE }}>
        <div
          className="flex h-full w-full flex-col overflow-hidden rounded-xl bg-white shadow-[0_4px_10px_rgba(0,0,0,0.1)]"
          style={{ width: bounds.w, height: bounds.h + BAR_H }}
        >
          <div
            className="flex h-10 shrink-0 items-center justify-between rounded-t-xl bg-[#E0E0E0] px-3"
            onPointerDown={startInteract('move')}
            onPointerOver={() => !drag && setCursor('grab')}
          >
            <span className="truncate text-sm font-medium text-gray-800">
              {win.title}
            </span>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => remove(win.id)}
              className="rounded p-1 text-gray-600 hover:bg-black/10 hover:text-gray-900"
              aria-label="Close window"
            >
              <X size={16} />
            </button>
          </div>
          <div className="relative flex-1 overflow-hidden">
            <Component props={{ external: win.external, winId: win.id }} />
          </div>
        </div>

        {(
          [
            ['left', 'left-0 top-0 h-full w-2 cursor-ew-resize'],
            ['right', 'right-0 top-0 h-full w-2 cursor-ew-resize'],
            ['top', 'left-0 top-0 w-full h-2 cursor-ns-resize'],
            ['bottom', 'left-0 bottom-0 w-full h-2 cursor-ns-resize'],
            ['tl', 'left-0 top-0 h-2 w-2 cursor-nwse-resize'],
            ['tr', 'right-0 top-0 h-2 w-2 cursor-nesw-resize'],
            ['bl', 'left-0 bottom-0 h-2 w-2 cursor-nesw-resize'],
            ['br', 'right-0 bottom-0 h-2 w-2 cursor-nwse-resize'],
          ] as const
        ).map(([dir, cls]) => (
          <div
            key={dir}
            className={clsx('absolute z-10', cls)}
            onPointerDown={startInteract(dir)}
          />
        ))}
      </div>
    </div>
  )
}
