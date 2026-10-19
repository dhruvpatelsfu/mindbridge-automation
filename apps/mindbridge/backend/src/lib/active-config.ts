import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadActiveConfig, type ParsedConfig } from '@shared/config-loader'

const moduleDir = dirname(fileURLToPath(import.meta.url))
const DEFAULT_CONFIG_FILE = resolve(moduleDir, '..', '..', '..', 'lab-configs.json')

let cached: ParsedConfig | null = null
let legacyVarWarned = false

function resolveConfigFile(): string {
  return process.env.LAB_CONFIGS_FILE ?? DEFAULT_CONFIG_FILE
}

function resolveLabId(): string {
  if (process.env.LAB_ID) return process.env.LAB_ID
  if (process.env.LAB_CONFIG) {
    if (!legacyVarWarned) {
      legacyVarWarned = true
      process.stderr.write(
        '[deprecation] LAB_CONFIG is deprecated; please set LAB_ID instead.\n'
      )
    }
    return process.env.LAB_CONFIG
  }
  return 'baseline'
}

export function getActiveConfig(): ParsedConfig {
  if (cached !== null) return cached
  cached = loadActiveConfig({
    configFile: resolveConfigFile(),
    labId: resolveLabId()
  })
  return cached
}

export function getActiveDefectIds(): string[] {
  const cfg = getActiveConfig()
  return Object.entries(cfg.defects)
    .filter(([, on]) => on === true)
    .map(([id]) => id)
}

export function __resetConfigCacheForTests(): void {
  cached = null
  legacyVarWarned = false
}
