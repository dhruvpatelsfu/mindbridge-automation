import { pino } from 'pino'

const env = process.env.NODE_ENV ?? 'development'

const level = env === 'test' ? 'silent' : env === 'production' ? 'info' : 'debug'

export const logger = pino({ level })
