import { useMemo, useState } from 'react'
import { unzipSync } from 'fflate'
import { File, FolderClosed, FolderOpen, ChevronRight } from 'lucide-react'
import type { AppDef, AppViewProps } from '@/types'
import { PendingFile } from '@/components/PendingFile'
import { FileEntry } from '@/components/FileEntry'

interface ZipState {
  entries: ZipEntry[]
  read: (path: string) => Uint8Array
}

interface ZipEntry {
  path: string
  isDir: boolean
}

interface TreeNode {
  name: string
  path: string
  isDir: boolean
  children: TreeNode[]
}

function buildTree(entries: ZipEntry[]): TreeNode {
  const root: TreeNode = { name: 'root', path: '', isDir: true, children: [] }

  for (const entry of entries) {
    const parts = entry.path.split('/').filter(Boolean)
    let node = root
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLast = i === parts.length - 1
      const isDir = isLast ? entry.isDir : true
      let child = node.children.find((c) => c.name === part && c.isDir === isDir)
      if (!child) {
        child = {
          name: part,
          path: parts.slice(0, i + 1).join('/'),
          isDir,
          children: [],
        }
        node.children.push(child)
      }
      node = child
    }
  }

  const sort = (n: TreeNode) => {
    n.children.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    n.children.forEach(sort)
  }
  sort(root)
  return root
}

function ZipViewer({ props }: { props: AppViewProps }) {
  return (
    <PendingFile<ZipState>
      props={props}
      compute={(data) => {
        const unzipped = unzipSync(new Uint8Array(data))
        const entries: ZipEntry[] = Object.keys(unzipped).map((path) => ({
          path,
          isDir: path.endsWith('/'),
        }))
        return Promise.resolve({
          entries,
          read: (p: string) => unzipped[p],
        })
      }}
    >
      {(state) => <ZipTree state={state} />}
    </PendingFile>
  )
}

function ZipTree({ state }: { state: ZipState }) {
  const root = useMemo(() => buildTree(state.entries), [state.entries])

  return (
    <div className="scrollbar-thin h-full w-full overflow-auto py-1">
      {root.children.map((child) => (
        <TreeRow key={child.path} node={child} level={0} state={state} />
      ))}
    </div>
  )
}

function TreeRow({
  node,
  level,
  state,
}: {
  node: TreeNode
  level: number
  state: ZipState
}) {
  const [open, setOpen] = useState(false)

  if (node.isDir) {
    return (
      <div>
        <div
          className="flex cursor-pointer items-center gap-2 py-1 pr-2 hover:bg-gray-100"
          style={{ paddingLeft: level * 16 }}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? (
            <ChevronRight size={16} className="rotate-90 text-gray-500" />
          ) : (
            <ChevronRight size={16} className="text-gray-500" />
          )}
          {open ? (
            <FolderOpen size={18} className="text-amber-500" />
          ) : (
            <FolderClosed size={18} className="text-amber-500" />
          )}
          <span className="truncate text-sm font-medium text-gray-800">
            {node.name}
          </span>
        </div>
        {open &&
          node.children.map((child) => (
            <TreeRow
              key={child.path}
              node={child}
              level={level + 1}
              state={state}
            />
          ))}
      </div>
    )
  }

  return (
    <FileEntry
      resource={async () => ({
        fileName: node.name,
        bytes: async () => state.read(node.path),
      })}
    >
      <div
        className="flex items-center gap-2 py-1 pr-2"
        style={{ paddingLeft: level * 16 + 20 }}
      >
        <File size={18} className="text-blue-grey-600 text-slate-500" />
        <span className="truncate text-sm text-gray-700">{node.name}</span>
      </div>
    </FileEntry>
  )
}

export const zipViewerApp: AppDef = {
  id: 1,
  name: 'Zip Viewer',
  defaultSize: { w: 300, h: 600 },
  extensions: ['.zip'],
  icon: FolderClosed,
  component: (p) => <ZipViewer props={p.props} />,
}
