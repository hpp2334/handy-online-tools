import { useRef, useState, type ReactNode } from 'react'
import { openFile, openAsDialog, downloadBlob } from '@/lib/fileActions'
import type { OpenableResource } from '@/lib/fileActions'
import { useBlobStore } from '@/stores/useBlobStore'

interface MenuItem {
  label: string
  action: () => void
}

interface Pos {
  x: number
  y: number
  items: MenuItem[]
}

export function FileEntry({
  children,
  resource,
}: {
  children: ReactNode
  resource: () => Promise<OpenableResource>
}) {
  const [hover, setHover] = useState(false)
  const [menu, setMenu] = useState<Pos | null>(null)
  const resCache = useRef<Promise<OpenableResource> | null>(null)

  const getRes = () => {
    if (!resCache.current) resCache.current = resource()
    return resCache.current
  }

  const handleOpen = async () => {
    const res = await getRes()
    openFile(res)
  }

  const handleOpenAs = async () => {
    const res = await getRes()
    const bytes = await res.bytes()
    const blobId = useBlobStore.getState().store(bytes)
    openAsDialog({ blobId, fileName: res.fileName })
  }

  const handleDownload = async () => {
    const res = await getRes()
    const bytes = await res.bytes()
    downloadBlob(bytes, res.fileName)
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={handleOpen}
      onContextMenu={(e) => {
        e.preventDefault()
        setMenu({
          x: e.clientX,
          y: e.clientY,
          items: [
            { label: 'Open', action: handleOpen },
            { label: 'Open As', action: handleOpenAs },
            { label: 'Download', action: handleDownload },
          ],
        })
      }}
    >
      <div
        className={
          'cursor-pointer rounded ' +
          (hover ? 'bg-gray-400/30' : 'bg-transparent')
        }
      >
        {children}
      </div>
      {menu && (
        <>
          <div className="fixed inset-0 z-[9999]" onClick={() => setMenu(null)} />
          <div
            className="fixed z-[10000] min-w-[140px] rounded-md border border-gray-200 bg-white py-1 text-sm shadow-lg"
            style={{ left: menu.x, top: menu.y }}
          >
            {menu.items.map((item) => (
              <button
                key={item.label}
                type="button"
                className="block w-full px-3 py-1.5 text-left text-gray-700 hover:bg-gray-100"
                onClick={() => {
                  setMenu(null)
                  item.action()
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
