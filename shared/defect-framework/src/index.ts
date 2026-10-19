import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export interface DefectContext {
  hooks: Map<string, unknown[]>
  appName: string
  configName: string
}

export interface Defect {
  id: string
  description: string
  apply: (context: DefectContext) => void | Promise<void>
}

export interface LoadDefectsOptions {
  defectsDir: string
  activeDefectIds: string[]
}

export interface ApplyDefectsOptions {
  onError?: (defect: Defect, error: unknown) => void
}

export function createDefectContext(appName: string, configName: string): DefectContext {
  return {
    hooks: new Map(),
    appName,
    configName
  }
}

function isDefect(value: unknown): value is Defect {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.description === 'string' &&
    typeof candidate.apply === 'function'
  )
}

export async function loadDefects(opts: LoadDefectsOptions): Promise<Defect[]> {
  const loaded: Defect[] = []
  for (const id of opts.activeDefectIds) {
    const moduleDir = resolve(opts.defectsDir, id)
    if (!existsSync(moduleDir)) {
      console.warn(`[defect-framework] skipping unknown defect id '${id}' (no folder at ${moduleDir})`)
      continue
    }
    const tsPath = resolve(moduleDir, 'index.ts')
    const jsPath = resolve(moduleDir, 'index.js')
    const target = existsSync(tsPath) ? tsPath : existsSync(jsPath) ? jsPath : null
    if (target === null) {
      console.warn(`[defect-framework] skipping defect '${id}': no index.ts/index.js in ${moduleDir}`)
      continue
    }
    const mod = (await import(pathToFileURL(target).href)) as { default?: unknown }
    const candidate = mod.default
    if (!isDefect(candidate)) {
      console.warn(`[defect-framework] skipping defect '${id}': default export is not a valid Defect`)
      continue
    }
    if (candidate.id !== id) {
      console.warn(
        `[defect-framework] defect at '${id}' reports id '${candidate.id}'; using module path id`
      )
    }
    loaded.push(candidate)
  }
  return loaded
}

export async function applyDefects(
  defects: Defect[],
  context: DefectContext,
  opts: ApplyDefectsOptions = {}
): Promise<void> {
  for (const defect of defects) {
    try {
      await defect.apply(context)
    } catch (err) {
      if (opts.onError) {
        opts.onError(defect, err)
      } else {
        throw err
      }
    }
  }
}
