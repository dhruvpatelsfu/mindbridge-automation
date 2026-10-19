import type { RequestHandler } from 'express'
import { getActiveConfig } from '../lib/active-config.js'

interface LabInfoResponse {
  labId: string
  description?: string
  defects: Record<string, boolean>
}

function buildLabInfo(): LabInfoResponse {
  const cfg = getActiveConfig()
  const body: LabInfoResponse = {
    labId: cfg.id,
    defects: cfg.defects
  }
  if (cfg.description !== undefined) {
    body.description = cfg.description
  }
  return body
}

export const labInfoHandler: RequestHandler = (_req, res) => {
  res.status(200).json(buildLabInfo())
}

// Deprecated alias kept for one release so older callers do not break.
// Same body as /api/lab-info, with a Deprecation header pointing to the
// canonical path.
export const configFlagsHandler: RequestHandler = (_req, res) => {
  res.setHeader('Deprecation', 'true')
  res.setHeader('Link', '</api/lab-info>; rel="successor-version"')
  res.status(200).json(buildLabInfo())
}
