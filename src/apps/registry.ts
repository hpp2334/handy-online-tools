import { zipViewerApp } from '@/apps/zip-viewer'
import { imageViewerApp } from '@/apps/image-viewer'
import { codeViewerApp } from '@/apps/code-viewer'
import { clipboardInspectorApp } from '@/apps/clipboard-inspector'
import { opencodeSessionApp } from '@/apps/opencode-session'
import { sqliteViewerApp } from '@/apps/sqlite-viewer'
import type { AppDef } from '@/types'

const apps: AppDef[] = [
  zipViewerApp,
  imageViewerApp,
  codeViewerApp,
  clipboardInspectorApp,
  opencodeSessionApp,
  sqliteViewerApp,
]

const byId = new Map(apps.map((a) => [a.id, a]))

export function listApps(): AppDef[] {
  return apps
}

export function getApp(id: number): AppDef | undefined {
  return byId.get(id)
}

export function recommendApp(fileName: string): AppDef | undefined {
  const lower = fileName.toLowerCase()
  for (const app of apps) {
    for (const ext of app.extensions) {
      if (lower.endsWith(ext)) {
        return app
      }
    }
  }
  return undefined
}
