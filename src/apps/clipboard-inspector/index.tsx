import { useCallback, useEffect, useState } from 'react'
import { Clipboard, Download, AlertCircle } from 'lucide-react'
import type { AppDef, AppViewProps } from '@/types'
import { downloadBlob } from '@/lib/fileActions'

interface ClipboardItemData {
  type: string
  label: string
  size: number
  text?: string
  imageUrl?: string
  fileName: string
  bytes?: () => Promise<Uint8Array>
}

const TEXT_TYPES = ['text/plain', 'text/html']

function extForType(type: string): string {
  if (type === 'text/html') return 'html'
  if (type === 'text/plain') return 'txt'
  if (type.startsWith('image/')) return type.slice('image/'.length)
  return 'bin'
}

function formatSize(size: number): string {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max) + '...'
}

function ClipboardInspector(_props: { props: AppViewProps }) {
  const [items, setItems] = useState<ClipboardItemData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const readClipboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (!navigator.clipboard || !navigator.clipboard.read) {
        setError('Clipboard API not available in this browser.')
        return
      }
      const clipboardItems = await navigator.clipboard.read()
      const collected: ClipboardItemData[] = []
      for (const item of clipboardItems) {
        for (const type of item.types) {
          try {
            if (TEXT_TYPES.includes(type)) {
              const blob = await item.getType(type)
              const text = await blob.text()
              collected.push({
                type,
                label: `${type} (Value)`,
                size: text.length,
                text,
                fileName: `clipboard_${Date.now()}.${extForType(type)}`,
                bytes: async () => new Uint8Array(await blob.arrayBuffer()),
              })
            } else if (type.startsWith('image/')) {
              const blob = await item.getType(type)
              const buf = new Uint8Array(await blob.arrayBuffer())
              collected.push({
                type,
                label: `${type} (File)`,
                size: buf.length,
                imageUrl: URL.createObjectURL(blob),
                fileName: `clipboard_${Date.now()}.${extForType(type)}`,
                bytes: async () => buf,
              })
            }
          } catch {
            // ignore unsupported type
          }
        }
      }
      setItems(collected)
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Failed to read clipboard. Permission may be denied.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault()
        void readClipboard()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [readClipboard])

  return (
    <div className="flex h-full w-full flex-col bg-white">
      {loading ? (
        <div className="flex flex-1 items-center justify-center text-gray-500">
          Reading clipboard...
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-4 text-center">
          <button
            type="button"
            onClick={readClipboard}
            className="flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Clipboard size={16} />
            Paste from Clipboard
          </button>
          <p className="text-sm text-gray-500">
            No clipboard content to display. Press Ctrl/Cmd+V or click the Paste
            button.
          </p>
          {error && (
            <p className="flex items-center gap-1 text-sm text-red-600">
              <AlertCircle size={14} /> {error}
            </p>
          )}
        </div>
      ) : (
        <div className="scrollbar-thin flex-1 overflow-auto p-2">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-2">
            {items.map((item, i) => (
              <Card key={i} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Card({ item }: { item: ClipboardItemData }) {
  return (
    <div className="flex flex-col rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-semibold text-gray-800">
          {item.label}
        </span>
        {item.bytes && (
          <button
            type="button"
            title="Download"
            className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            onClick={async () => {
              const data = await item.bytes!()
              downloadBlob(data, item.fileName)
            }}
          >
            <Download size={16} />
          </button>
        )}
      </div>
      <span className="text-xs text-gray-500">Size: {formatSize(item.size)}</span>
      <hr className="my-2 border-gray-200" />
      <div className="min-h-[120px] flex-1 overflow-auto">
        {item.imageUrl ? (
          <div className="flex h-full items-center justify-center">
            <img
              src={item.imageUrl}
              alt=""
              className="max-h-[220px] max-w-full object-contain"
            />
          </div>
        ) : item.text !== undefined ? (
          <pre className="whitespace-pre-wrap break-words font-mono text-xs text-gray-700">
            {truncate(item.text, 500)}
          </pre>
        ) : (
          <span className="text-xs text-gray-400">Binary data</span>
        )}
      </div>
    </div>
  )
}

export const clipboardInspectorApp: AppDef = {
  id: 4,
  name: 'Clipboard Inspector',
  defaultSize: { w: 800, h: 600 },
  extensions: [],
  icon: Clipboard,
  component: (p) => <ClipboardInspector props={p.props} />,
}
