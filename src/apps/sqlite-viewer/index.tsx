import { useEffect, useMemo, useState } from 'react'
import type initSqlJsFn from 'sql.js'
import type { Database, SqlJsStatic } from 'sql.js'
import {
  Database as DatabaseIcon,
  ChevronLeft,
  ChevronRight,
  Table as TableIcon,
} from 'lucide-react'
import type { AppDef, AppViewProps } from '@/types'
import { PendingFile } from '@/components/PendingFile'

const PAGE_SIZE = 500
const SQLJS_VERSION = '1.14.1'
const SQLJS_CDN = `https://cdn.jsdelivr.net/npm/sql.js@${SQLJS_VERSION}/dist`
const SQLJS_SCRIPT_URL = `${SQLJS_CDN}/sql-wasm.js`
const SQLJS_WASM_URL = `${SQLJS_CDN}/sql-wasm.wasm`

declare global {
  interface Window {
    initSqlJs?: typeof initSqlJsFn
  }
}

let sqlJsPromise: Promise<SqlJsStatic> | null = null

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector('script[data-sqljs]')) {
      resolve()
      return
    }
    const el = document.createElement('script')
    el.src = src
    el.async = true
    el.dataset.sqljs = '1'
    el.onload = () => resolve()
    el.onerror = () =>
      reject(new Error(`Failed to load sql.js script from ${src}`))
    document.head.appendChild(el)
  })
}

function getSqlJs(): Promise<SqlJsStatic> {
  if (!sqlJsPromise) {
    sqlJsPromise = loadScript(SQLJS_SCRIPT_URL).then(() => {
      const init = window.initSqlJs
      if (!init) throw new Error('sql.js global not found after script load')
      return init({ locateFile: () => SQLJS_WASM_URL })
    })
  }
  return sqlJsPromise
}

interface TableInfo {
  name: string
  rowCount: number
}

interface SqliteState {
  db: Database
  tables: TableInfo[]
}

function quoteIdent(name: string): string {
  return '"' + name.replace(/"/g, '""') + '"'
}

function quoteStr(value: string): string {
  return "'" + value.replace(/'/g, "''") + "'"
}

function loadTables(db: Database): TableInfo[] {
  const res = db.exec(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  )
  const names: string[] =
    res.length > 0 ? (res[0].values.map((r) => r[0] as string)) : []
  return names.map((name) => ({ name, rowCount: countRows(db, name) }))
}

function countRows(db: Database, name: string): number {
  const res = db.exec(`SELECT COUNT(*) FROM ${quoteIdent(name)}`)
  if (res.length === 0) return 0
  return res[0].values[0][0] as number
}

interface PageData {
  columns: string[]
  rows: SqlValue[][]
}

type SqlValue = number | string | Uint8Array | null

interface ColumnMeta {
  name: string
  type: string
}

function fetchColumns(db: Database, name: string): ColumnMeta[] {
  const res = db.exec(`PRAGMA table_info(${quoteIdent(name)})`)
  if (res.length === 0) return []
  return res[0].values.map((row) => ({
    name: row[1] as string,
    type: (row[2] as string) ?? '',
  }))
}

function typeColor(type: string): string {
  const t = type.toUpperCase()
  if (t.includes('INT')) return 'bg-blue-100 text-blue-700'
  if (
    t.includes('CHAR') ||
    t.includes('CLOB') ||
    t.includes('TEXT')
  )
    return 'bg-emerald-100 text-emerald-700'
  if (t.includes('BLOB')) return 'bg-violet-100 text-violet-700'
  if (t.includes('DATE') || t.includes('TIME'))
    return 'bg-pink-100 text-pink-700'
  if (t.includes('BOOL')) return 'bg-rose-100 text-rose-700'
  if (
    t.includes('REAL') ||
    t.includes('FLOA') ||
    t.includes('DOUB') ||
    t.includes('NUM') ||
    t.includes('DEC')
  )
    return 'bg-amber-100 text-amber-700'
  return 'bg-gray-100 text-gray-600'
}

function fetchPage(
  db: Database,
  name: string,
  offset: number,
  limit: number,
): PageData {
  const res = db.exec(
    `SELECT * FROM ${quoteIdent(name)} LIMIT ${limit} OFFSET ${offset}`,
  )
  if (res.length === 0) return { columns: [], rows: [] }
  return { columns: res[0].columns, rows: res[0].values as SqlValue[][] }
}

function fetchSchema(db: Database, name: string): string {
  const res = db.exec(
    `SELECT sql FROM sqlite_master WHERE type='table' AND name=${quoteStr(name)}`,
  )
  if (res.length === 0 || res[0].values[0][0] == null) {
    return '-- no schema information available'
  }
  return res[0].values[0][0] as string
}

function SqliteViewer({ props }: { props: AppViewProps }) {
  return (
    <PendingFile<SqliteState>
      props={props}
      compute={async (data) => {
        const SQL = await getSqlJs()
        const db = new SQL.Database(data)
        const tables = loadTables(db)
        return { db, tables }
      }}
    >
      {(state) => <SqliteWorkspace state={state} />}
    </PendingFile>
  )
}

function SqliteWorkspace({ state }: { state: SqliteState }) {
  const [selected, setSelected] = useState<string | null>(
    state.tables[0]?.name ?? null,
  )

  const active = useMemo(
    () => state.tables.find((t) => t.name === selected) ?? null,
    [state.tables, selected],
  )

  return (
    <div className="flex h-full w-full bg-white">
      <Sidebar
        tables={state.tables}
        active={selected}
        onSelect={setSelected}
      />
      {active ? (
        <MainArea db={state.db} table={active} />
      ) : (
        <EmptyMain />
      )}
    </div>
  )
}

function Sidebar({
  tables,
  active,
  onSelect,
}: {
  tables: TableInfo[]
  active: string | null
  onSelect: (name: string) => void
}) {
  return (
    <div className="scrollbar-thin flex h-full w-56 shrink-0 flex-col overflow-auto border-r border-gray-200 bg-gray-50">
      <div className="sticky top-0 bg-gray-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Tables
      </div>
      {tables.length === 0 ? (
        <div className="px-3 py-2 text-sm text-gray-400">No tables found</div>
      ) : (
        tables.map((t) => (
          <button
            key={t.name}
            type="button"
            onClick={() => onSelect(t.name)}
            className={
              'flex items-center justify-between gap-2 px-3 py-1.5 text-left text-sm transition-colors ' +
              (t.name === active
                ? 'bg-blue-100 text-blue-800'
                : 'text-gray-700 hover:bg-gray-100')
            }
          >
            <span className="flex min-w-0 items-center gap-2">
              <TableIcon
                size={14}
                className={
                  t.name === active ? 'text-blue-600' : 'text-gray-400'
                }
              />
              <span className="truncate">{t.name}</span>
            </span>
            <span
              className={
                'shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-medium ' +
                (t.name === active
                  ? 'bg-blue-200 text-blue-800'
                  : 'bg-gray-200 text-gray-600')
              }
            >
              {t.rowCount}
            </span>
          </button>
        ))
      )}
    </div>
  )
}

function EmptyMain() {
  return (
    <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
      Select a table to view its data
    </div>
  )
}

function MainArea({ db, table }: { db: Database; table: TableInfo }) {
  const [tab, setTab] = useState<'data' | 'schema'>('data')
  const [page, setPage] = useState(0)

  useEffect(() => {
    setPage(0)
  }, [table.name])

  const pageCount = Math.max(1, Math.ceil(table.rowCount / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-1 border-b border-gray-200 px-2">
        <TabButton active={tab === 'data'} onClick={() => setTab('data')}>
          Data
        </TabButton>
        <TabButton active={tab === 'schema'} onClick={() => setTab('schema')}>
          Schema
        </TabButton>
        <span className="ml-auto truncate px-2 text-xs text-gray-400">
          {table.name}
        </span>
      </div>
      {tab === 'data' ? (
        <DataTab
          db={db}
          table={table}
          page={safePage}
          pageCount={pageCount}
          onPageChange={setPage}
        />
      ) : (
        <SchemaTab db={db} name={table.name} />
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'border-b-2 px-3 py-2 text-sm font-medium transition-colors ' +
        (active
          ? 'border-blue-600 text-blue-700'
          : 'border-transparent text-gray-500 hover:text-gray-800')
      }
    >
      {children}
    </button>
  )
}

function DataTab({
  db,
  table,
  page,
  pageCount,
  onPageChange,
}: {
  db: Database
  table: TableInfo
  page: number
  pageCount: number
  onPageChange: (page: number) => void
}) {
  const data = useMemo(
    () =>
      fetchPage(db, table.name, page * PAGE_SIZE, PAGE_SIZE),
    [db, table.name, page],
  )

  const typeByName = useMemo(() => {
    const cols = fetchColumns(db, table.name)
    const m = new Map<string, string>()
    for (const c of cols) m.set(c.name, c.type)
    return m
  }, [db, table.name])

  const headerCols =
    data.columns.length > 0
      ? data.columns
      : Array.from(typeByName.keys())

  const start = table.rowCount === 0 ? 0 : page * PAGE_SIZE + 1
  const end = Math.min(table.rowCount, (page + 1) * PAGE_SIZE)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="scrollbar-thin flex-1 overflow-auto">
        {headerCols.length === 0 ? (
          <div className="p-4 text-sm text-gray-400">Table is empty</div>
        ) : (
          <table className="border-collapse text-[13px]">
            <thead className="sticky top-0 z-10">
              <tr>
                {headerCols.map((col, i) => {
                  const t = typeByName.get(col) ?? ''
                  return (
                    <th
                      key={i}
                      className="border-b border-r border-gray-200 bg-gray-100 px-3 py-1.5 text-left align-top whitespace-nowrap"
                    >
                      <div className="font-semibold text-gray-700">{col}</div>
                      {t && (
                        <span
                          className={
                            'mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium leading-none ' +
                            typeColor(t)
                          }
                        >
                          {t}
                        </span>
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={headerCols.length}
                    className="px-3 py-6 text-center text-sm text-gray-400"
                  >
                    No rows
                  </td>
                </tr>
              ) : (
                data.rows.map((row, ri) => (
                  <tr key={ri} className="hover:bg-blue-50/40">
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className="border-b border-r border-gray-100 px-3 py-1 align-top whitespace-nowrap text-gray-800"
                      >
                        <CellValue value={cell} />
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-gray-200 px-3 py-1.5 text-xs text-gray-600">
        <span>
          {table.rowCount > 0
            ? `Rows ${start}–${end} of ${table.rowCount}`
            : '0 rows'}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => onPageChange(Math.max(0, page - 1))}
            className="rounded p-1 text-gray-600 hover:bg-gray-100 disabled:opacity-30"
            title="Previous page"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="min-w-[60px] text-center">
            {page + 1} / {pageCount}
          </span>
          <button
            type="button"
            disabled={page >= pageCount - 1}
            onClick={() => onPageChange(Math.min(pageCount - 1, page + 1))}
            className="rounded p-1 text-gray-600 hover:bg-gray-100 disabled:opacity-30"
            title="Next page"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

function CellValue({ value }: { value: SqlValue }) {
  if (value === null) {
    return <span className="text-gray-400">∅</span>
  }
  if (value instanceof Uint8Array) {
    return (
      <span className="text-gray-500">[BLOB {value.byteLength} bytes]</span>
    )
  }
  if (typeof value === 'number') {
    return <span className="font-mono tabular-nums">{value}</span>
  }
  return <span className="font-mono">{value}</span>
}

function SchemaTab({ db, name }: { db: Database; name: string }) {
  const ddl = useMemo(() => fetchSchema(db, name), [db, name])
  return (
    <div className="scrollbar-thin min-h-0 flex-1 overflow-auto bg-gray-50 p-4">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        CREATE statement
      </div>
      <pre className="overflow-auto whitespace-pre-wrap break-words rounded border border-gray-200 bg-white p-3 font-mono text-[13px] text-gray-800">
        {ddl}
      </pre>
    </div>
  )
}

export const sqliteViewerApp: AppDef = {
  id: 6,
  name: 'SQLite Viewer',
  defaultSize: { w: 900, h: 600 },
  extensions: ['.db', '.sqlite', '.sqlite3'],
  icon: DatabaseIcon,
  component: (p) => <SqliteViewer props={p.props} />,
}
