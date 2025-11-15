import { createRequire } from 'node:module'
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express'
const nodeRequire = createRequire(import.meta.url)
const express = nodeRequire('express') as typeof import('express')
const cors = nodeRequire('cors') as typeof import('cors')

import { analyzeQuerySchema, analyzeUrl, mapAnalysisError } from './analysis-service.js'

interface AnalyzeQuery {
  url?: string
}

type AnalyzeRequest = ExpressRequest<unknown, unknown, unknown, AnalyzeQuery>

const app = express()
app.use(cors())

const PORT = Number.parseInt(process.env['PORT'] ?? '5174', 10)

app.get('/api/health', (_req: ExpressRequest, res: ExpressResponse) => {
  res.json({ status: 'ok' })
})

app.get('/api/analyze', async (req: AnalyzeRequest, res: ExpressResponse) => {
  const validation = analyzeQuerySchema.safeParse({ url: req.query.url })

  if (!validation.success) {
    res.status(400).json({
      error: 'Invalid URL',
      details: validation.error.flatten()
    })
    return
  }

  const { url } = validation.data

  try {
    const analysis = await analyzeUrl(url)
    res.json(analysis)
  } catch (error) {
    const { statusCode, payload } = mapAnalysisError(error)
    res.status(statusCode).json(payload)
  }
})

app.listen(PORT, () => {
  console.log(`SEO analyzer API started on port ${PORT}`)
})

