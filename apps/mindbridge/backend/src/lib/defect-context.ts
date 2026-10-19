import { existsSync } from 'node:fs'
import { dirname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  applyDefects,
  createDefectContext,
  loadDefects,
  type Defect,
  type DefectContext
} from '@shared/defect-framework'
import { getActiveConfig } from './active-config.js'

const moduleDir = dirname(fileURLToPath(import.meta.url))

// In dev/test, this module is loaded from <repo>/apps/mindbridge/backend/src/lib/.
// In production it ships at <repo>/apps/mindbridge/backend/dist/lib/. Each layout
// resolves to the directory that actually contains importable defect modules
// (.ts in dev/test via vitest's loader, .js in production after the build).
const isCompiledLocation =
  moduleDir.endsWith(`${sep}dist${sep}lib`) || moduleDir.includes(`${sep}dist${sep}lib${sep}`)

const SRC_DEFECTS_DIR = resolve(moduleDir, '..', '..', '..', 'defects')
const DIST_DEFECTS_DIR = resolve(moduleDir, '..', 'defects')

export const DEFECTS_DIR: string = isCompiledLocation ? DIST_DEFECTS_DIR : SRC_DEFECTS_DIR

const cfg = getActiveConfig()

export const defectContext: DefectContext = createDefectContext('mindbridge', cfg.id)

export function getHookBucket<T>(name: string): T[] {
  const existing = defectContext.hooks.get(name) as T[] | undefined
  if (existing) return existing
  const fresh: T[] = []
  defectContext.hooks.set(name, fresh)
  return fresh
}

// Minimal loader used in tests where the source directory contains .ts files.
// vite-node's URL resolver mishandles file:// URLs that contain %20 (paths
// with spaces), so we import the raw absolute path - vite-node accepts this
// and Node native imports also accept it on POSIX runtimes.
async function loadDefectsFromSource(ids: string[]): Promise<Defect[]> {
  const defects: Defect[] = []
  for (const id of ids) {
    const dir = resolve(SRC_DEFECTS_DIR, id)
    if (!existsSync(dir)) {
      throw new Error(`defect-context: no folder for defect id '${id}' at ${dir}`)
    }
    const tsPath = resolve(dir, 'index.ts')
    const jsPath = resolve(dir, 'index.js')
    const target = existsSync(tsPath) ? tsPath : existsSync(jsPath) ? jsPath : null
    if (target === null) {
      throw new Error(`defect-context: no index.ts/index.js in ${dir}`)
    }
    const mod = (await import(target)) as { default?: unknown }
    const candidate = mod.default as Defect | undefined
    if (
      candidate === undefined ||
      typeof candidate.id !== 'string' ||
      typeof candidate.apply !== 'function'
    ) {
      throw new Error(`defect-context: ${target} does not default-export a valid Defect`)
    }
    defects.push(candidate)
  }
  return defects
}

// Production boot path. Uses the shared framework's loadDefects against the
// compiled defects directory, then applies them all to the singleton context.
// Throws on missing modules or apply() rejections so the boot fails loudly.
export async function bootstrapDefects(activeIds: string[]): Promise<void> {
  if (activeIds.length === 0) return

  if (isCompiledLocation) {
    const defects = await loadDefects({ defectsDir: DIST_DEFECTS_DIR, activeDefectIds: activeIds })
    const loadedIds = new Set(defects.map((d) => d.id))
    const missing = activeIds.filter((id) => !loadedIds.has(id))
    if (missing.length > 0) {
      throw new Error(
        `defect-context: failed to load required defects: ${missing.join(', ')} (from ${DIST_DEFECTS_DIR})`
      )
    }
    await applyDefects(defects, defectContext)
    return
  }

  const defects = await loadDefectsFromSource(activeIds)
  await applyDefects(defects, defectContext)
}

// Test helper. Always reads from the source defects directory so tests exercise
// the same TypeScript modules that ship to production.
export async function loadAndApplyDefects(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const defects = await loadDefectsFromSource(ids)
  await applyDefects(defects, defectContext)
}

export function __resetDefectContextForTests(): void {
  defectContext.hooks.clear()
}
