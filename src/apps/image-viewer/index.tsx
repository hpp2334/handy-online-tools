import { useEffect, useRef, useState } from 'react'
import { Image as ImageIcon } from 'lucide-react'
import type { AppDef, AppViewProps } from '@/types'
import { PendingFile } from '@/components/PendingFile'

interface ImageState {
  name: string
  url: string
}

function ImageViewer({ props }: { props: AppViewProps }) {
  return (
    <PendingFile<ImageState>
      props={props}
      compute={(data, name) => {
        const blob = new Blob([data.slice().buffer])
        return Promise.resolve({ name, url: URL.createObjectURL(blob) })
      }}
    >
      {({ url }) => <ImageCanvas url={url} />}
    </PendingFile>
  )
}

function ImageCanvas({ url }: { url: string }) {
  const [scale, setScale] = useState(1)
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(
    null,
  )

  useEffect(() => {
    return () => URL.revokeObjectURL(url)
  }, [url])

  return (
    <div
      ref={ref}
      className="relative h-full w-full overflow-hidden bg-neutral-800"
      onWheel={(e) => {
        e.preventDefault()
        setScale((s) => Math.min(5, Math.max(0.5, s - e.deltaY * 0.001)))
      }}
      onPointerDown={(e) => {
        const el = e.currentTarget
        drag.current = {
          x: e.clientX,
          y: e.clientY,
          left: el.scrollLeft,
          top: el.scrollTop,
        }
      }}
      onPointerMove={(e) => {
        const d = drag.current
        if (!d) return
        e.currentTarget.scrollLeft = d.left - (e.clientX - d.x)
        e.currentTarget.scrollTop = d.top - (e.clientY - d.y)
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerLeave={() => (drag.current = null)}
    >
      <div className="flex h-full w-full items-center justify-center p-4">
        <img
          src={url}
          alt=""
          draggable={false}
          style={{ transform: `scale(${scale})` }}
          className="max-h-full max-w-full select-none object-contain transition-transform duration-75"
        />
      </div>
      <div className="pointer-events-none absolute bottom-5 left-0 right-0 flex justify-center">
        <span className="rounded bg-black/55 px-3 py-1.5 text-sm text-white">
          {(scale * 100).toFixed(2)}%
        </span>
      </div>
    </div>
  )
}

export const imageViewerApp: AppDef = {
  id: 2,
  name: 'Image Viewer',
  defaultSize: { w: 800, h: 600 },
  extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
  icon: ImageIcon,
  component: (p) => <ImageViewer props={p.props} />,
}
