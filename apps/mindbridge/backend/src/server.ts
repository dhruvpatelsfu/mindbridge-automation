import { app } from './app.js'
import { logger } from './lib/logger.js'
import { db } from './db/index.js'
import { getActiveConfig, getActiveDefectIds } from './lib/active-config.js'
import { bootstrapDefects } from './lib/defect-context.js'
import { applyNullStatusToAdminLatestOrder } from './lib/defect-data.js'

const port = Number(process.env.PORT ?? 3000)

// Eager-load the active config so an unknown LAB_ID aborts the boot.
const cfg = getActiveConfig()
const activeDefectIds = getActiveDefectIds()

// Eagerly apply every defect named in the active config. Any load failure
// or apply() rejection crashes the boot so misconfigured labs never go live.
try {
  await bootstrapDefects(activeDefectIds)
} catch (err) {
  logger.error({ err, activeDefectIds }, 'failed to bootstrap defects')
  process.exit(1)
}

// Defects that mutate persisted data run AFTER bootstrapDefects has
// populated their hook buckets. Each helper is a no-op when its bucket
// is empty, so the baseline boot path is unaffected.
applyNullStatusToAdminLatestOrder()

const server = app.listen(port, '0.0.0.0', () => {
  logger.info({ port, labId: cfg.id, defects: activeDefectIds }, 'server listening')
})

function shutdown(signal: NodeJS.Signals): void {
  logger.info({ signal }, 'shutting down')
  server.close(() => {
    db.close()
    process.exit(0)
  })
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
