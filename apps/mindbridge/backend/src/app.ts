// Express application: health, configuration flags, catalogue, cart, checkout,
// authentication. Anonymous browsing flow keyed on the cookie session id;
// checkout and /api/me require an authenticated session.
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'
import express from 'express'
import { pinoHttp } from 'pino-http'
import { logger } from './lib/logger.js'
import { sessionMiddleware } from './middleware/session.js'
import { errorHandler, type ApiErrorBody } from './middleware/error-handler.js'
import { healthHandler } from './routes/health.js'
import { configFlagsHandler, labInfoHandler } from './routes/config.js'
import { coursesRouter } from './routes/courses.js'
import { cartRouter } from './routes/cart.js'
import { checkoutRouter } from './routes/checkout.js'
import { authRouter, meRouter } from './routes/auth.js'
import { adminRouter } from './routes/admin.js'
import { profileRouter } from './routes/profile.js'
import { dashboardRouter } from './routes/dashboard.js'
import { practiceRouter } from './routes/practice.js'
import { enrollmentRouter } from './routes/enrollment.js'
import { ordersRouter } from './routes/orders.js'
import { seedCourses } from './db/seed.js'

seedCourses()

export const app = express()

app.disable('x-powered-by')
app.use(pinoHttp({ logger }))
app.use(express.json({ limit: '1mb' }))
app.use(sessionMiddleware)

app.get('/api/health', healthHandler)
app.get('/health', healthHandler)

app.get('/api/lab-info', labInfoHandler)
app.get('/api/config/flags', configFlagsHandler)

app.use('/api/courses', coursesRouter)
app.use('/api/cart', cartRouter)
app.use('/api/checkout', checkoutRouter)
app.use('/api/auth', authRouter)
app.use('/api/me', meRouter)
app.use('/api/me/orders', ordersRouter)
app.use('/api/admin', adminRouter)
app.use('/api/profile', profileRouter)
app.use('/api/dashboard', dashboardRouter)
app.use('/api/practice', practiceRouter)
app.use('/api/enrollment', enrollmentRouter)

// 404 for unknown API routes (must come before the SPA fallback so unknown
// /api/* paths return JSON, not the SPA shell).
app.use('/api', (_req, res) => {
  const body: ApiErrorBody = {
    error: { code: 'not_found', message: 'Route not found.' }
  }
  res.status(404).json(body)
})

// Static assets + SPA fallback: serve the built frontend if present so a
// single Node process answers both /api/* and /. Absent in tests; absent
// during `npm run dev` (the Vite dev server handles those then).
const moduleDir = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(moduleDir, '..', '..')
const frontendDist = resolve(appRoot, 'frontend', 'dist')

if (existsSync(frontendDist)) {
  app.use(express.static(frontendDist))
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(resolve(frontendDist, 'index.html'))
  })
}

// Final 404 (non-API, no static match, no SPA index): still return JSON for
// parity with previous behaviour.
app.use((_req, res) => {
  const body: ApiErrorBody = {
    error: { code: 'not_found', message: 'Route not found.' }
  }
  res.status(404).json(body)
})

app.use(errorHandler)
