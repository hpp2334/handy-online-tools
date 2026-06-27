import { useCallback, useState } from 'react'
import { CloudUpload } from 'lucide-react'
import { clsx } from 'clsx'

export interface PickedFile {
  name: string
  read: () => Promise<Uint8Array>
}

export function FilePicker({
  onFile,
}: {
  onFile: (file: PickedFile) => void | Promise<void>
}) {
  const [dragging, setDragging] = useState(false)

  const pick = useCallback(async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.onchange = async () => {
      const f = input.files?.[0]
      if (!f) return
      const buf = new Uint8Array(await f.arrayBuffer())
      await onFile({ name: f.name, read: async () => buf })
    }
    input.click()
  }, [onFile])

  return (
    <div
      className={clsx(
        'flex h-full w-full cursor-pointer flex-col items-center justify-center gap-3 text-gray-600 transition-colors',
        dragging && 'bg-blue-50 text-blue-600',
      )}
      onClick={pick}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={async (e) => {
        e.preventDefault()
        setDragging(false)
        const f = e.dataTransfer.files[0]
        if (!f) return
        const buf = new Uint8Array(await f.arrayBuffer())
        await onFile({ name: f.name, read: async () => buf })
      }}
    >
      <CloudUpload size={50} />
      <span className="text-sm">
        {dragging ? 'Release to accept' : 'Drag and drop file here'}
      </span>
    </div>
  )
}
