import type { RequestHandler } from 'express'
import { APP_VERSION } from '../lib/version.js'
import { getActiveConfig } from '../lib/active-config.js'

export const healthHandler: RequestHandler = (_req, res) => {
  res.status(200).json({
    ok: true,
    config: getActiveConfig().id,
    version: APP_VERSION
  })
}
