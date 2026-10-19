import { readFileSync } from 'node:fs'
import { z, ZodError } from 'zod'

export interface LabConfigEntry {
  description?: string
  defects: Record<string, boolean>
}

export interface ParsedConfig {
  id: string
  description?: string
  defects: Record<string, boolean>
}

const LabConfigEntrySchema = z.object({
  description: z.string().optional(),
  defects: z.record(z.string(), z.boolean())
})

const LabConfigsFileSchema = z.record(z.string(), LabConfigEntrySchema)

export interface LoadActiveConfigOptions {
  configFile: string
  labId: string
}

function describeZodError(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : '<root>'
      return `${path}: ${issue.message}`
    })
    .join('; ')
}

export function loadActiveConfig(opts: LoadActiveConfigOptions): ParsedConfig {
  if (!opts.configFile) {
    throw new Error('loadActiveConfig: configFile is required')
  }
  if (!opts.labId) {
    throw new Error('loadActiveConfig: labId is required')
  }

  let raw: string
  try {
    raw = readFileSync(opts.configFile, 'utf8')
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    throw new Error(`Failed to read lab-configs file '${opts.configFile}': ${reason}`)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    throw new Error(`Invalid JSON in lab-configs file '${opts.configFile}': ${reason}`)
  }

  const result = LabConfigsFileSchema.safeParse(parsed)
  if (!result.success) {
    throw new Error(
      `Lab-configs file '${opts.configFile}' failed schema validation: ${describeZodError(result.error)}`
    )
  }

  const entry = result.data[opts.labId]
  if (!entry) {
    const known = Object.keys(result.data).join(', ') || '<none>'
    throw new Error(
      `Lab id '${opts.labId}' not found in '${opts.configFile}'. Known ids: ${known}`
    )
  }

  return {
    id: opts.labId,
    description: entry.description,
    defects: entry.defects
  }
}
