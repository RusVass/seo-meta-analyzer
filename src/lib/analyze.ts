import { z } from 'zod'
import type { SeoAnalysis } from '../../shared/analysis-types'

export const urlSchema = z.string().trim().url({ message: 'Enter a valid URL.' })

export class AnalyzeError extends Error {
  details?: unknown

  constructor(message: string, details?: unknown) {
    super(message)
    this.name = 'AnalyzeError'
    this.details = details
  }
}

export async function analyzeUrl(input: string): Promise<SeoAnalysis> {
  const url = urlSchema.parse(input)

  const response = await fetch(`/api/analyze?url=${encodeURIComponent(url)}`)

  if (!response.ok) {
    const payload = (await safeJson(response)) ?? {}
    const message =
      typeof payload['error'] === 'string'
        ? (payload['error'] as string)
        : 'Analysis failed.'

    throw new AnalyzeError(message, payload['details'])
  }

  const data = await response.json()
  return data as SeoAnalysis
}

async function safeJson(
  response: Response
): Promise<Record<string, unknown> | undefined> {
  try {
    const value = await response.json()
    return isRecord(value) ? value : undefined
  } catch {
    return undefined
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

