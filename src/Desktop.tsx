import { listApps } from '@/apps/registry'
import { useWindowsStore } from '@/stores/useWindowsStore'
import { WindowFrame } from './components/WindowFrame'
import { AppLauncher } from './components/AppLauncher'
import { OpenAsHost } from './components/OpenAsHost'

export function Desktop() {
  const windows = useWindowsStore((s) => s.windows)

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#F5F5F5]">
      <div className="h-full w-full overflow-auto p-4">
        <div className="flex flex-wrap gap-4">
          {listApps().map((app) => (
            <AppLauncher key={app.id} app={app} />
          ))}
        </div>
      </div>

      {windows.map((win) => (
        <WindowFrame key={win.id} win={win} />
      ))}

      <OpenAsHost />
    </div>
  )
}
