import type { VercelRequest, VercelResponse } from '@vercel/node'

import {
  analyzeQuerySchema,
  analyzeUrl,
  mapAnalysisError
} from '../server/analysis-service.js'

interface AnalyzeQuery {
  url?: string
}

type QueryValue = string | string[] | undefined

const allowOrigin = process.env['ANALYZER_ALLOW_ORIGIN'] ?? '*'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  applyCors(res)

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const query = toAnalyzeQuery(req.query)
  const validation = analyzeQuerySchema.safeParse(query)

  if (!validation.success) {
    res.status(400).json({
      error: 'Invalid URL',
      details: validation.error.flatten()
    })
    return
  }

  try {
    const analysis = await analyzeUrl(validation.data.url)
    res.status(200).json(analysis)
  } catch (error) {
    const { statusCode, payload } = mapAnalysisError(error)
    res.status(statusCode).json(payload)
  }
}

function toAnalyzeQuery(query: VercelRequest['query']): AnalyzeQuery {
  const urlParam = normalizeQueryValue(query['url'])
  return urlParam === undefined ? {} : { url: urlParam }
}

function normalizeQueryValue(value: QueryValue): string | undefined {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value[0]
  return undefined
}

function applyCors(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', allowOrigin)
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Max-Age', '86400')
}

