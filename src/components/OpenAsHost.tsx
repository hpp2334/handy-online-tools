import { useEffect, useState } from 'react'
import { listApps } from '@/apps/registry'
import { useWindowsStore } from '@/stores/useWindowsStore'
import { registerOpenAsHandler } from '@/lib/fileActions'
import type { AppExternal } from '@/types'

export function OpenAsHost() {
  const [target, setTarget] = useState<AppExternal | null>(null)
  const create = useWindowsStore((s) => s.create)

  useEffect(() => {
    registerOpenAsHandler((ext) => setTarget(ext))
    return () => registerOpenAsHandler(() => {})
  }, [])

  if (!target) return null

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40"
      onClick={() => setTarget(null)}
    >
      <div
        className="w-[300px] rounded-lg bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-3 text-base font-semibold text-gray-800">
          Choose an app to open with
        </h3>
        <div className="max-h-[400px] overflow-auto">
          {listApps().map((app) => {
            const Icon = app.icon
            return (
              <button
                key={app.id}
                type="button"
                className="flex w-full items-center gap-3 rounded px-2 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => {
                  create(app.id, target)
                  setTarget(null)
                }}
              >
                <Icon size={20} className="text-gray-600" />
                {app.name}
              </button>
            )
          })}
        </div>
        <div className="mt-3 text-right">
          <button
            type="button"
            className="rounded px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
            onClick={() => setTarget(null)}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
