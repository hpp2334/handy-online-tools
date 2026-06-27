import { useEffect, useMemo, useRef, useState } from 'react'
import hljs from 'highlight.js/lib/common'
import {
  Braces,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react'
import type { AppDef, AppViewProps } from '@/types'
import { PendingFile } from '@/components/PendingFile'
import { tryFormatJson } from '@/utils/json'

function formatContent(name: string, raw: string): string {
  if (name.toLowerCase().endsWith('.json')) {
    return tryFormatJson(raw) ?? raw
  }
  return raw
}

function languageFromName(name: string): string | undefined {
  const lower = name.toLowerCase()
  const ext = lower.slice(lower.lastIndexOf('.') + 1)
  if (!ext) return undefined
  if (['txt'].includes(ext)) return 'plaintext'
  return ext
}

function highlightCode(code: string, name: string): string {
  const lang = languageFromName(name)
  try {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value
    }
    return hljs.highlightAuto(code).value
  } catch {
    return escapeHtml(code)
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

const LINE_HEIGHT = 20

function CodeViewer({ props }: { props: AppViewProps }) {
  return (
    <PendingFile<{ text: string; name: string }>
      props={props}
      compute={(data, name) => {
        const raw = new TextDecoder('utf-8').decode(data)
        return Promise.resolve({ text: formatContent(name, raw), name })
      }}
    >
      {({ text, name }) => <CodeCanvas text={text} name={name} />}
    </PendingFile>
  )
}

function CodeCanvas({ text, name }: { text: string; name: string }) {
  const html = useMemo(() => highlightCode(text, name), [text, name])

  const [query, setQuery] = useState('')
  const [findOpen, setFindOpen] = useState(false)
  const [current, setCurrent] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  const matches = useMemo(() => {
    if (!query) return [] as number[]
    const lowerText = text.toLowerCase()
    const q = query.toLowerCase()
    const result: number[] = []
    let idx = lowerText.indexOf(q)
    while (idx !== -1) {
      result.push(idx)
      idx = lowerText.indexOf(q, idx + q.length)
    }
    return result
  }, [query, text])

  const matchLines = useMemo(
    () =>
      matches.map((offset) => text.slice(0, offset).split('\n').length - 1),
    [matches, text],
  )

  useEffect(() => {
    setCurrent(0)
  }, [query])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        setFindOpen(true)
      } else if (e.key === 'Escape') {
        setFindOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (matchLines.length === 0) return
    const line = matchLines[current] ?? 0
    const target = line * LINE_HEIGHT
    const el = scrollRef.current
    if (!el) return
    if (target < el.scrollTop || target > el.scrollTop + el.clientHeight - LINE_HEIGHT) {
      el.scrollTop = target - el.clientHeight / 2
    }
  }, [current, matchLines])

  const go = (delta: number) => {
    if (matchLines.length === 0) return
    setCurrent((c) => (c + delta + matchLines.length) % matchLines.length)
  }

  return (
    <div className="relative flex h-full w-full flex-col bg-white">
      {findOpen && (
        <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded border border-gray-300 bg-white p-1 shadow">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find"
            className="w-44 px-2 py-1 text-[13px] outline-none"
          />
          <span className="min-w-[44px] text-center text-xs text-gray-500">
            {matches.length === 0
              ? 'none'
              : `${current + 1}/${matches.length}`}
          </span>
          <button
            type="button"
            className="rounded p-1 text-gray-600 hover:bg-gray-100 disabled:opacity-30"
            disabled={matches.length === 0}
            onClick={() => go(-1)}
            title="Previous"
          >
            <ChevronUp size={16} />
          </button>
          <button
            type="button"
            className="rounded p-1 text-gray-600 hover:bg-gray-100 disabled:opacity-30"
            disabled={matches.length === 0}
            onClick={() => go(1)}
            title="Next"
          >
            <ChevronDown size={16} />
          </button>
          <button
            type="button"
            className="rounded p-1 text-gray-600 hover:bg-gray-100"
            onClick={() => {
              setFindOpen(false)
              setQuery('')
            }}
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div ref={scrollRef} className="scrollbar-thin flex-1 overflow-auto">
        <div className="relative">
          {findOpen && matchLines.length > 0 && (
            <div className="pointer-events-none absolute inset-x-0">
              {matchLines.map((line, i) => (
                <div
                  key={i}
                  className={
                    i === current
                      ? 'absolute inset-x-0 bg-yellow-300/50'
                      : 'absolute inset-x-0 bg-yellow-200/30'
                  }
                  style={{ top: line * LINE_HEIGHT, height: LINE_HEIGHT }}
                />
              ))}
            </div>
          )}
          <pre
            className="m-0 min-w-full p-3 font-mono text-[13px]"
            style={{ lineHeight: `${LINE_HEIGHT}px` }}
          >
            <code
              className="hljs block"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </pre>
        </div>
      </div>

      {!findOpen && (
        <button
          type="button"
          className="absolute right-2 top-2 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-600 shadow hover:bg-gray-100"
          onClick={() => setFindOpen(true)}
        >
          Find
        </button>
      )}
    </div>
  )
}

export const codeViewerApp: AppDef = {
  id: 3,
  name: 'Code Viewer',
  defaultSize: { w: 800, h: 600 },
  extensions: [
    '.txt',
    '.json',
    '.yml',
    '.yaml',
    '.dart',
    '.js',
    '.jsx',
    '.ts',
    '.tsx',
    '.rs',
    '.py',
    '.proto',
    '.java',
    '.kt',
    '.xml',
    '.svg',
  ],
  icon: Braces,
  component: (p) => <CodeViewer props={p.props} />,
}
