import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Resolves to backend/ from either backend/src/lib/ (vitest) or backend/dist/lib/ (production).
const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const pkg = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')) as {
  version: string
}

export const APP_VERSION = pkg.version
