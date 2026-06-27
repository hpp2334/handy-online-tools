import { useWindowsStore } from '@/stores/useWindowsStore'
import type { AppDef } from '@/types'
import { clsx } from 'clsx'

export function AppLauncher({ app }: { app: AppDef }) {
  const create = useWindowsStore((s) => s.create)
  const Icon = app.icon

  return (
    <button
      type="button"
      onClick={() => create(app.id, null)}
      className={clsx(
        'flex h-[120px] w-[120px] flex-col items-center justify-center gap-2 rounded border border-gray-400 p-2',
        'transition-colors hover:bg-gray-400/10 focus:outline-none focus:ring-2 focus:ring-gray-400/40',
      )}
    >
      <Icon size={48} className="text-gray-700" />
      <span className="line-clamp-2 text-center text-xs text-gray-700">
        {app.name}
      </span>
    </button>
  )
}
