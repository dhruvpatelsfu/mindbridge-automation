import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express'
import { ZodError } from 'zod'
import { logger } from '../lib/logger.js'

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>

export function asyncHandler(fn: AsyncHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

export interface ApiErrorBody {
  error: {
    code: string
    message: string
    fields?: Array<{ field: string; message: string }>
  }
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fields?: Array<{ field: string; message: string }>

  constructor(
    status: number,
    code: string,
    message: string,
    fields?: Array<{ field: string; message: string }>
  ) {
    super(message)
    this.status = status
    this.code = code
    this.fields = fields
  }
}

export function zodToApiError(err: ZodError, summary = 'Request validation failed.'): ApiError {
  const fields = err.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join('.') : '<body>',
    message: issue.message
  }))
  return new ApiError(400, 'validation_error', summary, fields)
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ApiError) {
    const body: ApiErrorBody = {
      error: {
        code: err.code,
        message: err.message,
        ...(err.fields ? { fields: err.fields } : {})
      }
    }
    res.status(err.status).json(body)
    return
  }

  if (err instanceof ZodError) {
    const wrapped = zodToApiError(err)
    res.status(wrapped.status).json({
      error: {
        code: wrapped.code,
        message: wrapped.message,
        ...(wrapped.fields ? { fields: wrapped.fields } : {})
      }
    } satisfies ApiErrorBody)
    return
  }

  logger.error({ err }, 'unhandled error')
  res.status(500).json({
    error: { code: 'internal_error', message: 'Internal server error.' }
  } satisfies ApiErrorBody)
}
