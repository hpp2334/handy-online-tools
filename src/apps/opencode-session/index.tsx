import { useMemo, useState, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  ChevronDown,
  ChevronRight,
  MessagesSquare,
  Terminal,
  FileEdit,
  FilePlus,
  FileText,
  Wrench,
  GitBranch,
  Copy,
  Check,
} from 'lucide-react'
import type { AppDef, AppViewProps } from '@/types'
import { PendingFile } from '@/components/PendingFile'

type Role = 'user' | 'assistant'

interface SessionInfo {
  id?: string
  title?: string
  directory?: string
  agent?: string
  model?: { id?: string; providerID?: string }
  version?: string
  summary?: { additions?: number; deletions?: number; files?: number }
  cost?: number
  tokens?: {
    input?: number
    output?: number
    reasoning?: number
    cache?: { read?: number; write?: number }
  }
  time?: { created?: number; updated?: number }
}

interface MessageInfo {
  id?: string
  role?: Role
  agent?: string
  time?: { created?: number }
}

type PartState = {
  status?: string
  input?: Record<string, unknown>
  output?: string
  metadata?: Record<string, unknown>
  error?: string
  title?: string
  time?: { start?: number; end?: number }
}

type Part =
  | { type: 'text'; text: string }
  | { type: 'reasoning'; text: string; time?: { start?: number; end?: number } }
  | { type: 'tool'; tool: string; state: PartState }
  | { type: 'step-start' }
  | { type: 'step-finish'; reason?: string; tokens?: Record<string, number>; cost?: number }
  | { type: 'patch'; hash?: string; files?: string[] }
  | { type: 'agent'; name?: string }
  | { type: 'compaction' }

interface Message {
  info?: MessageInfo
  parts?: Part[]
}

interface Session {
  info?: SessionInfo
  messages?: Message[]
}

function fmtNum(n?: number): string {
  if (n == null) return '-'
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return String(n)
}

function fmtTime(ms?: number): string {
  if (!ms) return ''
  return new Date(ms).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fmtDur(start?: number, end?: number): string {
  if (!start || !end) return ''
  const s = (end - start) / 1000
  if (s < 60) return `${s.toFixed(1)}s`
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`
}

function SessionView({ session }: { session: Session }) {
  const messages = session.messages ?? []

  return (
    <div className="flex h-full w-full flex-col bg-white">
      <SessionHeader info={session.info} />
      <div className="scrollbar-thin flex-1 overflow-auto divide-y divide-gray-100">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            No messages in this session.
          </div>
        ) : (
          messages.map((m, i) => <MessageRow key={i} msg={m} />)
        )}
      </div>
    </div>
  )
}

function SessionHeader({ info }: { info?: SessionInfo }) {
  const t = info?.tokens
  const s = info?.summary
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-gray-200 bg-gray-50 px-3 py-2 text-[12px]">
      <span className="min-w-0 flex-1 truncate font-semibold text-gray-800">
        {info?.title ?? 'Untitled session'}
      </span>
      {info?.agent && (
        <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[11px] font-medium text-indigo-700">
          {info.agent}
        </span>
      )}
      {info?.model?.id && (
        <span className="text-gray-500">{info.model.id}</span>
      )}
      {t && (
        <span className="text-gray-500">
          tokens <span className="text-gray-700">↓{fmtNum(t.input)}</span> /{' '}
          <span className="text-gray-700">↑{fmtNum(t.output)}</span>
          {t.reasoning ? (
            <> / <span className="text-gray-700">∩{fmtNum(t.reasoning)}</span></>
          ) : null}
        </span>
      )}
      {info?.cost ? (
        <span className="text-gray-500">cost ${info.cost.toFixed(4)}</span>
      ) : null}
      {s && (s.files || s.additions || s.deletions) ? (
        <span className="text-gray-500">
          <span className="text-green-600">+{fmtNum(s.additions)}</span>{' '}
          <span className="text-red-600">-{fmtNum(s.deletions)}</span>{' '}
          <span className="text-gray-400">({fmtNum(s.files)} files)</span>
        </span>
      ) : null}
      {info?.time?.created && (
        <span className="text-gray-400">{fmtTime(info.time.created)}</span>
      )}
    </div>
  )
}

function MessageRow({ msg }: { msg: Message }) {
  const role = msg.info?.role ?? 'assistant'
  const isUser = role === 'user'
  const name = isUser ? 'You' : msg.info?.agent ?? 'Assistant'
  const parts = msg.parts ?? []

  return (
    <div
      className={`flex px-3 py-2 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`flex w-full max-w-[88%] flex-col gap-1 ${
          isUser ? 'items-end' : 'items-start'
        }`}
      >
        <div className="flex items-center gap-2 px-1 text-[11px] text-gray-400">
          <span
            className={
              isUser
                ? 'font-medium text-blue-600'
                : 'font-medium text-gray-600'
            }
          >
            {name}
          </span>
          {msg.info?.time?.created && <span>{fmtTime(msg.info.time.created)}</span>}
        </div>
        <div className="flex w-full flex-col gap-1">
          {parts.map((p, i) => (
            <PartView key={i} part={p} isUser={isUser} />
          ))}
        </div>
      </div>
    </div>
  )
}

function PartView({ part, isUser }: { part: Part; isUser: boolean }) {
  switch (part.type) {
    case 'text':
      if (isUser) return <UserTextBubble text={String(part.text ?? '')} />
      return (
        <div className="max-w-full rounded-2xl rounded-bl-sm bg-gray-100 px-3 py-2 text-[13px] text-gray-800">
          <Markdown tone="light">{String(part.text ?? '')}</Markdown>
        </div>
      )
    case 'reasoning':
      return (
        <Collapsible
          header={
            <>
              <span className="font-medium text-gray-500">Thinking</span>
              {part.time && (
                <span className="text-gray-400">
                  {fmtDur(part.time.start, part.time.end)}
                </span>
              )}
            </>
          }
        >
          <p className="whitespace-pre-wrap text-[12px] italic text-gray-500">
            {String(part.text ?? '')}
          </p>
        </Collapsible>
      )
    case 'tool':
      return <ToolCard part={part as Extract<Part, { type: 'tool' }>} />
    case 'patch':
      return <PatchChip part={part as Extract<Part, { type: 'patch' }>} />
    case 'agent': {
      const p = part as Extract<Part, { type: 'agent' }>
      return (
        <span className="inline-flex w-fit items-center gap-1 rounded bg-purple-50 px-2 py-0.5 text-[11px] text-purple-700">
          <GitBranch size={12} /> @{p.name} invoked
        </span>
      )
    }
    case 'step-start':
    case 'step-finish':
    case 'compaction':
      return null
    default:
      return null
  }
}

function ToolCard({
  part,
}: {
  part: { tool: string; state: PartState }
}) {
  const st = part.state ?? {}
  const Icon = toolIcon(part.tool)
  return (
    <Collapsible
      header={
        <>
          <Icon size={13} className="text-gray-500" />
          <span className="font-mono text-[12px] text-gray-700">
            {part.tool}
          </span>
          <StatusPill status={st.status} />
          {st.title && (
            <span className="truncate text-[12px] text-gray-500">
              {st.title}
            </span>
          )}
          {st.time?.start && st.time?.end && (
            <span className="text-[11px] text-gray-400">
              {fmtDur(st.time.start, st.time.end)}
            </span>
          )}
        </>
      }
    >
      <div className="space-y-2">
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-wide text-gray-400">
            Input
          </div>
          <ToolInput tool={part.tool} input={st.input} />
        </div>
        <ToolOutput state={st} />
      </div>
    </Collapsible>
  )
}

function toolIcon(tool: string) {
  if (tool === 'bash') return Terminal
  if (tool === 'edit') return FileEdit
  if (tool === 'write') return FilePlus
  if (tool === 'read') return FileText
  return Wrench
}

function ToolInput({
  tool,
  input,
}: {
  tool: string
  input?: Record<string, unknown>
}) {
  if (!input || Object.keys(input).length === 0) {
    return <span className="text-[12px] italic text-gray-400">no input</span>
  }
  if (tool === 'bash' && typeof input.command === 'string') {
    return (
      <div className="space-y-1">
        {input.description ? (
          <div className="text-[11px] text-gray-500">
            {String(input.description)}
          </div>
        ) : null}
        <CodeBlock dark>{input.command}</CodeBlock>
      </div>
    )
  }
  if (tool === 'edit') {
    return (
      <div className="space-y-1">
        <div className="font-mono text-[11px] text-gray-600">
          {String(input.filePath ?? '')}
        </div>
        <div className="text-[10px] uppercase text-red-400">old</div>
        <CodeBlock className="border border-red-100 bg-red-50 text-red-700">
          {String(input.oldString ?? '')}
        </CodeBlock>
        <div className="text-[10px] uppercase text-green-600">new</div>
        <CodeBlock className="border border-green-100 bg-green-50 text-green-700">
          {String(input.newString ?? '')}
        </CodeBlock>
      </div>
    )
  }
  if (tool === 'write') {
    return (
      <div className="space-y-1">
        <div className="font-mono text-[11px] text-gray-600">
          {String(input.filePath ?? '')}
        </div>
        <CodeBlock className="max-h-60">{String(input.content ?? '')}</CodeBlock>
      </div>
    )
  }
  if (tool === 'read') {
    return (
      <div className="font-mono text-[12px] text-gray-700">
        {String(input.filePath ?? '')}
      </div>
    )
  }
  return (
    <CodeBlock className="max-h-60">
      {JSON.stringify(input, null, 2)}
    </CodeBlock>
  )
}

function ToolOutput({ state }: { state: PartState }) {
  const raw =
    state.output ?? state.error ?? (state.metadata?.output as string | undefined)
  if (raw == null || raw === '') return null
  const text = typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2)
  return (
    <div>
      <div className="mb-1 text-[10px] uppercase tracking-wide text-gray-400">
        {state.status === 'error' ? 'Error' : 'Output'}
      </div>
      <CodeBlock dark className="max-h-80">
        {text}
      </CodeBlock>
    </div>
  )
}

function PatchChip({
  part,
}: {
  part: { hash?: string; files?: string[] }
}) {
  const [open, setOpen] = useState(false)
  const files = part.files ?? []
  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700 hover:bg-amber-100"
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <FileEdit size={12} />
        Patched {files.length} file{files.length === 1 ? '' : 's'}
      </button>
      {open && files.length > 0 && (
        <ul className="mt-1 space-y-0.5 border-l-2 border-amber-200 pl-3 text-[11px] text-gray-600">
          {files.map((f, i) => (
            <li key={i} className="truncate font-mono">
              {f}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Collapsible({
  header,
  children,
}: {
  header: ReactNode
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="w-full rounded border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-2 py-1.5 text-left hover:bg-gray-50"
      >
        {open ? (
          <ChevronDown size={12} className="shrink-0 text-gray-400" />
        ) : (
          <ChevronRight size={12} className="shrink-0 text-gray-400" />
        )}
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          {header}
        </div>
      </button>
      {open && <div className="border-t border-gray-100 p-2">{children}</div>}
    </div>
  )
}

function StatusPill({ status }: { status?: string }) {
  if (status === 'completed') {
    return (
      <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
        ok
      </span>
    )
  }
  if (status === 'error') {
    return (
      <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
        error
      </span>
    )
  }
  if (status) {
    return (
      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
        {status}
      </span>
    )
  }
  return null
}

function CodeBlock({
  children,
  dark,
  className = '',
}: {
  children: string
  dark?: boolean
  className?: string
}) {
  return (
    <pre
      className={`scrollbar-thin overflow-x-auto whitespace-pre-wrap break-words rounded p-2 font-mono text-[12px] ${
        dark ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-800'
      } ${className}`}
    >
      {children}
    </pre>
  )
}

function UserTextBubble({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="group relative w-fit max-w-full">
      <div className="rounded-2xl rounded-br-sm bg-blue-500 px-3 py-2 text-[13px] text-white">
        <Markdown tone="dark">{text}</Markdown>
      </div>
      <div className="pointer-events-none absolute right-0 top-full z-10 flex justify-end opacity-0 transition-opacity duration-100 group-hover:opacity-100">
        <button
          type="button"
          onClick={copy}
          className="pointer-events-auto flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-600 shadow-sm hover:bg-gray-50"
        >
          {copied ? (
            <>
              <Check size={12} className="text-green-600" /> Copied
            </>
          ) : (
            <>
              <Copy size={12} /> Copy
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function Markdown({
  children,
  tone,
}: {
  children: string
  tone: 'light' | 'dark'
}) {
  const dark = tone === 'dark'
  return (
    <div
      className={`text-[13px] [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&>*]:my-2 [&_a]:underline [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 ${
        dark ? '[&_a]:text-blue-100' : '[&_a]:text-blue-600'
      }`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p>{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
          ),
          em: ({ children }) => <em>{children}</em>,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noreferrer">
              {children}
            </a>
          ),
          ul: ({ children }) => <ul>{children}</ul>,
          ol: ({ children }) => <ol>{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          h1: ({ children }) => (
            <h1 className="text-base font-semibold">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-[15px] font-semibold">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-[14px] font-semibold">{children}</h3>
          ),
          blockquote: ({ children }) => (
            <blockquote
              className={`border-l-2 pl-2 italic ${
                dark
                  ? 'border-blue-300 text-blue-50'
                  : 'border-gray-300 text-gray-600'
              }`}
            >
              {children}
            </blockquote>
          ),
          pre: ({ children }) => (
            <pre
              className={`scrollbar-thin overflow-x-auto rounded p-2 font-mono text-[12px] ${
                dark ? 'bg-blue-700/40 text-blue-50' : 'bg-gray-800 text-gray-50'
              }`}
            >
              {children}
            </pre>
          ),
          code: ({ className, children }) => {
            const text = String(children ?? '')
            const isBlock =
              /language-[\w-]+/.test(className || '') || text.includes('\n')
            if (isBlock) {
              return <code className="font-mono">{children}</code>
            }
            return (
              <code
                className={`rounded px-1 py-0.5 font-mono text-[12px] ${
                  dark
                    ? 'bg-blue-400/30 text-white'
                    : 'bg-gray-200 text-pink-600'
                }`}
              >
                {children}
              </code>
            )
          },
          table: ({ children }) => (
            <table
              className={`my-2 border-collapse text-[12px] ${
                dark ? 'text-blue-50' : 'text-gray-700'
              }`}
            >
              {children}
            </table>
          ),
          th: ({ children }) => (
            <th
              className={`border px-2 py-1 font-semibold ${
                dark ? 'border-blue-300' : 'border-gray-300'
              }`}
            >
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td
              className={`border px-2 py-1 ${
                dark ? 'border-blue-300' : 'border-gray-300'
              }`}
            >
              {children}
            </td>
          ),
          hr: () => (
            <hr
              className={`my-2 ${
                dark ? 'border-blue-300/50' : 'border-gray-200'
              }`}
            />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}

function OpenCodeSession({ props }: { props: AppViewProps }) {
  const parse = useMemo(
    () => async (data: Uint8Array): Promise<Session> => {
      const raw = new TextDecoder('utf-8').decode(data)
      const obj = JSON.parse(raw) as Session
      if (!obj || !Array.isArray(obj.messages)) {
        throw new Error('Not an OpenCode session file: missing messages[]')
      }
      return obj
    },
    [],
  )

  return (
    <PendingFile<Session> props={props} compute={parse}>
      {(session) => <SessionView session={session} />}
    </PendingFile>
  )
}

export const opencodeSessionApp: AppDef = {
  id: 5,
  name: 'OpenCode Session',
  defaultSize: { w: 820, h: 700 },
  extensions: [],
  icon: MessagesSquare,
  component: (p) => <OpenCodeSession props={p.props} />,
}
