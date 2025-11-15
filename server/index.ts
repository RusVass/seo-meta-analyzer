import { createRequire } from 'node:module'
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express'
import { load, type CheerioAPI } from 'cheerio'
import { z } from 'zod'
import type {
  SectionId,
  SectionResult,
  SeoAnalysis,
  SeoIssue,
  SeoPreviews,
  TagResult,
  TagStatus
} from '../shared/analysis-types.js'

const nodeRequire = createRequire(import.meta.url)
const express = nodeRequire('express') as typeof import('express')
const cors = nodeRequire('cors') as typeof import('cors')

const app = express()
app.use(cors())

const PORT = Number.parseInt(process.env['PORT'] ?? '5174', 10)

const urlSchema = z
  .object({
    url: z
      .string()
      .trim()
      .url()
      .refine(
        (value) => {
          try {
            const parsed = new URL(value)
            return parsed.protocol === 'http:' || parsed.protocol === 'https:'
          } catch {
            return false
          }
        },
        { message: 'Only HTTP(S) URLs are supported.' }
      )
  })
  .strict()

interface AnalyzeQuery {
  url?: string
}

type AnalyzeRequest = ExpressRequest<unknown, unknown, unknown, AnalyzeQuery>
type FetchResponse = Awaited<ReturnType<typeof fetch>> & {
  readonly ok: boolean
  readonly status: number
  readonly url: string
  readonly text: () => Promise<string>
}

app.get('/api/health', (_req: ExpressRequest, res: ExpressResponse) => {
  res.json({ status: 'ok' })
})

app.get('/api/analyze', async (req: AnalyzeRequest, res: ExpressResponse) => {
  const validation = urlSchema.safeParse({ url: req.query.url })

  if (!validation.success) {
    res.status(400).json({
      error: 'Invalid URL',
      details: validation.error.flatten()
    })
    return
  }

  const { url } = validation.data

  try {
    const response = (await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SEO-Meta-Analyzer/1.0; +https://github.com/)',
        Accept: 'text/html,application/xhtml+xml'
      },
      signal: AbortSignal.timeout(15000)
    })) as FetchResponse

    if (!response.ok) {
      res.status(response.status).json({
        error: 'Unable to fetch the page',
        details: `Server responded with status ${response.status}`
      })
      return
    }

    const html = await response.text()
    const finalUrl = response.url

    const analysis = analyzeDocument(html, url, finalUrl)
    res.json(analysis)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({
      error: 'Analysis error',
      details: message
    })
  }
})

app.listen(PORT, () => {
  console.log(`SEO analyzer API started on port ${PORT}`)
})

function analyzeDocument(html: string, requestedUrl: string, finalUrl: string): SeoAnalysis {
  const $ = load(html)
  const baseUrl = safeUrl(finalUrl) ?? safeUrl(requestedUrl) ?? new URL('https://example.com')

  const metaResults = evaluateMetaSection($, baseUrl)
  const openGraphResults = evaluateOpenGraphSection($, baseUrl)
  const twitterResults = evaluateTwitterSection($, baseUrl)

  const sections: SectionResult[] = [
    { id: 'meta', label: 'Technical meta tags', ...metaResults },
    { id: 'openGraph', label: 'Open Graph', ...openGraphResults },
    { id: 'twitter', label: 'Twitter Card', ...twitterResults }
  ]

  const sectionScores = sections.reduce<Record<SectionId, number>>((acc, section) => {
    acc[section.id] = section.score
    return acc
  }, { meta: 0, openGraph: 0, twitter: 0 })

  const overallScore = Math.round(
    sections.reduce((sum, { score }) => sum + score, 0) / sections.length
  )

  const summaryStatus = deriveSummaryStatus(sections)

  const issues = sections
    .flatMap((section) =>
      section.tags
        .filter((tag) => tag.status !== 'ok')
        .map<SeoIssue>((tag) => ({
          id: `${section.id}-${tag.tag}`,
          tag: tag.label,
          section: section.id,
          severity: tag.status,
          message: tag.message,
          recommendation: tag.recommendation ?? ''
        }))
    )
    .sort((a, b) => severityRank(a.severity) - severityRank(b.severity))

  const missing = sections
    .flatMap((section) =>
      section.tags
        .filter((tag) => tag.status === 'error' && tag.value === undefined)
        .map((tag) => tag.label)
    )
    .filter((value, index, array) => array.indexOf(value) === index)

  const previews = buildPreviews(sections, finalUrl, baseUrl)

  return {
    url: requestedUrl,
    finalUrl,
    fetchedAt: new Date().toISOString(),
    summary: {
      overallScore,
      status: summaryStatus,
      sectionScores
    },
    sections,
    issues,
    missing,
    previews
  }
}

function evaluateMetaSection($: CheerioAPI, baseUrl: URL): Omit<SectionResult, 'id' | 'label'> {
  const title = normalizeText($('title').first().text())
  const description = getMeta($, 'description')
  const keywords = getMeta($, 'keywords')
  const canonical = getCanonical($, baseUrl)
  const robots = getMeta($, 'robots')

  const tags: TagResult[] = [
    evaluateTitle(title),
    evaluateDescription(description),
    evaluateKeywords(keywords),
    evaluateCanonical(canonical, baseUrl),
    evaluateRobots(robots)
  ]

  return summarizeSection(tags)
}

function evaluateOpenGraphSection(
  $: CheerioAPI,
  baseUrl: URL
): Omit<SectionResult, 'id' | 'label'> {
  const ogTitle = getProperty($, 'og:title')
  const ogDescription = getProperty($, 'og:description')
  const ogImage = getProperty($, 'og:image')
  const ogUrl = resolveMaybeUrl(getProperty($, 'og:url'), baseUrl)
  const ogType = getProperty($, 'og:type')

  const tags: TagResult[] = [
    evaluateOpenGraphTitle(ogTitle),
    evaluateOpenGraphDescription(ogDescription),
    evaluateOpenGraphImage(ogImage, baseUrl),
    evaluateOptionalUrl('og:url', 'OG URL', ogUrl),
    evaluateOpenGraphType(ogType)
  ]

  return summarizeSection(tags)
}

function evaluateTwitterSection(
  $: CheerioAPI,
  baseUrl: URL
): Omit<SectionResult, 'id' | 'label'> {
  const twitterCard = getMeta($, 'twitter:card')
  const twitterTitle = getMeta($, 'twitter:title')
  const twitterDescription = getMeta($, 'twitter:description')
  const twitterImage = resolveMaybeUrl(getMeta($, 'twitter:image'), baseUrl)

  const tags: TagResult[] = [
    evaluateTwitterCard(twitterCard),
    evaluateTwitterTitle(twitterTitle),
    evaluateTwitterDescription(twitterDescription),
    evaluateTwitterImage(twitterImage)
  ]

  return summarizeSection(tags)
}

function summarizeSection(tags: TagResult[]): Omit<SectionResult, 'id' | 'label'> {
  const score = Math.round(tags.reduce((sum, tag) => sum + tag.score, 0) / tags.length)
  const status = deriveSectionStatus(tags)
  return { score, status, tags }
}

function deriveSectionStatus(tags: TagResult[]): TagStatus {
  if (tags.some((tag) => tag.status === 'error')) return 'error'
  if (tags.some((tag) => tag.status === 'warning')) return 'warning'
  return 'ok'
}

function deriveSummaryStatus(sections: SectionResult[]): TagStatus {
  if (sections.some((section) => section.status === 'error')) return 'error'
  if (sections.some((section) => section.status === 'warning')) return 'warning'
  return 'ok'
}

function evaluateTitle(value?: string): TagResult {
  if (!value) {
    return createMissingTag('title', 'Title', true, 'Add a unique, descriptive title (50–60 characters).')
  }

  const length = value.length
  if (length < 30 || length > 70) {
    return {
      tag: 'title',
      label: 'Title',
      value,
      length,
      status: 'warning',
      score: 60,
      message: `Title length is ${length} characters — aim for 50–60.`,
      recommendation: 'Keep the primary query and brand within a 50–60 character window.'
    }
  }

  return {
    tag: 'title',
    label: 'Title',
    value,
    length,
    status: 'ok',
    score: 95,
    message: 'Title length looks good.',
    recommendation: 'Review it periodically to stay aligned with the page intent.'
  }
}

function evaluateDescription(value?: string): TagResult {
  if (!value) {
    return createMissingTag(
      'meta[name="description"]',
      'Meta Description',
      true,
      'Provide a meta description (70–160 characters).'
    )
  }

  const length = value.length
  if (length < 70 || length > 160) {
    return {
      tag: 'meta[name="description"]',
      label: 'Meta Description',
      value,
      length,
      status: 'warning',
      score: 60,
      message: `Description has ${length} characters — aim for 70–160.`,
      recommendation: 'Highlight the value proposition and CTA within 70–160 characters.'
    }
  }

  return {
    tag: 'meta[name="description"]',
    label: 'Meta Description',
    value,
    length,
    status: 'ok',
    score: 95,
    message: 'Meta description length is optimal.',
    recommendation: 'Keep the snippet accurate and aligned with the page content.'
  }
}

function evaluateKeywords(value?: string): TagResult {
  if (!value) {
    return {
      tag: 'meta[name="keywords"]',
      label: 'Meta Keywords',
      status: 'warning',
      score: 50,
      message: 'Keywords tag is missing — search engines largely ignore it.',
      recommendation: 'Optional, but ensure important queries appear naturally in the content.'
    }
  }

  const keywords = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  if (keywords.length > 10) {
    return {
      tag: 'meta[name="keywords"]',
      label: 'Meta Keywords',
      value,
      status: 'warning',
      score: 55,
      message: `Too many keywords listed (${keywords.length}).`,
      recommendation: 'Limit the list to 5–10 relevant phrases.'
    }
  }

  return {
    tag: 'meta[name="keywords"]',
    label: 'Meta Keywords',
    value,
    status: 'ok',
    score: 80,
    message: 'Keywords are present but offer limited SEO value.',
    recommendation: 'Avoid keyword stuffing — keep phrasing natural.'
  }
}

function evaluateCanonical(value: string | undefined, baseUrl: URL): TagResult {
  if (!value) {
    return createMissingTag(
      'link[rel="canonical"]',
      'Canonical',
      false,
      'Set a canonical URL to protect against duplicates, especially with URL parameters.'
    )
  }

  const resolved = resolveMaybeUrl(value, baseUrl)
  if (!resolved) {
    return {
      tag: 'link[rel="canonical"]',
      label: 'Canonical',
      value,
      status: 'error',
      score: 10,
      message: 'Canonical contains an invalid URL.',
      recommendation: 'Use an absolute URL without parameters and prefer https.'
    }
  }

  const canonicalUrl = safeUrl(resolved)
  if (!canonicalUrl) {
    return {
      tag: 'link[rel="canonical"]',
      label: 'Canonical',
      value,
      status: 'error',
      score: 10,
      message: 'Unable to parse the canonical URL.',
      recommendation: 'Ensure the link is valid and uses the https:// scheme.'
    }
  }

  return {
    tag: 'link[rel="canonical"]',
    label: 'Canonical',
    value: canonicalUrl.toString(),
    status: 'ok',
    score: 90,
    message: 'Canonical tag is defined and valid.',
    recommendation: 'Confirm it matches the primary page URL.'
  }
}

function evaluateRobots(value?: string): TagResult {
  if (!value) {
    return {
      tag: 'meta[name="robots"]',
      label: 'Meta Robots',
      status: 'warning',
      score: 60,
      message: 'Meta robots tag is missing — pages are indexable by default.',
      recommendation: 'Add meta robots if you need to restrict indexing or link following.'
    }
  }

  const content = value.toLowerCase()
  if (content.includes('noindex') || content.includes('nofollow')) {
    return {
      tag: 'meta[name="robots"]',
      label: 'Meta Robots',
      value,
      status: 'warning',
      score: 40,
      message: `Directives detected: ${value}.`,
      recommendation: 'Ensure noindex/nofollow values are intentional.'
    }
  }

  return {
    tag: 'meta[name="robots"]',
    label: 'Meta Robots',
    value,
    status: 'ok',
    score: 85,
    message: 'Meta robots allows indexing.',
    recommendation: 'Review robots directives whenever you publish new content.'
  }
}

function evaluateOpenGraphTitle(value?: string): TagResult {
  if (!value) {
    return createMissingTag(
      'meta[property="og:title"]',
      'OG Title',
      true,
      'Provide og:title to craft an engaging social preview.'
    )
  }

  const length = value.length
  if (length < 30 || length > 95) {
    return {
      tag: 'meta[property="og:title"]',
      label: 'OG Title',
      value,
      length,
      status: 'warning',
      score: 60,
      message: `og:title is ${length} characters — aim for 40–80.`,
      recommendation: 'Make the headline punchy and readable within 40–80 characters.'
    }
  }

  return {
    tag: 'meta[property="og:title"]',
    label: 'OG Title',
    value,
    length,
    status: 'ok',
    score: 95,
    message: 'og:title looks good.',
    recommendation: 'Keep it aligned with the core message of the page.'
  }
}

function evaluateOpenGraphDescription(value?: string): TagResult {
  if (!value) {
    return createMissingTag(
      'meta[property="og:description"]',
      'OG Description',
      true,
      'Add og:description (80–200 characters) for social previews.'
    )
  }

  const length = value.length
  if (length < 80 || length > 200) {
    return {
      tag: 'meta[property="og:description"]',
      label: 'OG Description',
      value,
      length,
      status: 'warning',
      score: 60,
      message: `og:description is ${length} characters — target 80–200.`,
      recommendation: 'Explain the value and include a CTA within 80–200 characters.'
    }
  }

  return {
    tag: 'meta[property="og:description"]',
    label: 'OG Description',
    value,
    length,
    status: 'ok',
    score: 90,
    message: 'og:description is in good shape.',
    recommendation: 'Validate the snippet via the Facebook Sharing Debugger.'
  }
}

function evaluateOpenGraphImage(value: string | undefined, baseUrl: URL): TagResult {
  if (!value) {
    return createMissingTag(
      'meta[property="og:image"]',
      'OG Image',
      true,
      'Add og:image (minimum 1200×630 px) for rich previews.'
    )
  }

  const resolved = resolveMaybeUrl(value, baseUrl)
  if (!resolved) {
    return {
      tag: 'meta[property="og:image"]',
      label: 'OG Image',
      value,
      status: 'error',
      score: 10,
      message: 'Invalid URL in og:image.',
      recommendation: 'Use an absolute https link to the image asset.'
    }
  }

  return {
    tag: 'meta[property="og:image"]',
    label: 'OG Image',
    value: resolved,
    status: 'ok',
    score: 95,
    message: 'og:image is set.',
    recommendation: 'Ensure it is at least 1200×630 px in JPEG or WebP format.'
  }
}

function evaluateOptionalUrl(tag: string, label: string, value?: string): TagResult {
  if (!value) {
    return {
      tag,
      label,
      status: 'warning',
      score: 55,
      message: `${label} is missing.`,
      recommendation: `Add the ${label.toLowerCase()} to keep metadata consistent.`
    }
  }

  return {
    tag,
    label,
    value,
    status: 'ok',
    score: 85,
    message: `${label} is set.`,
    recommendation: `Make sure the ${label.toLowerCase()} matches the canonical URL.`
  }
}

function evaluateOpenGraphType(value?: string): TagResult {
  if (!value) {
    return {
      tag: 'meta[property="og:type"]',
      label: 'OG Type',
      status: 'warning',
      score: 55,
      message: 'OG type is missing.',
      recommendation: 'Set a type such as website, article, or product.'
    }
  }

  return {
    tag: 'meta[property="og:type"]',
    label: 'OG Type',
    value,
    status: 'ok',
    score: 85,
    message: 'OG type is set.',
    recommendation: 'Keep it aligned with the page content.'
  }
}

function evaluateTwitterCard(value?: string): TagResult {
  if (!value) {
    return {
      tag: 'meta[name="twitter:card"]',
      label: 'Twitter Card',
      status: 'warning',
      score: 55,
      message: 'Twitter card is not defined.',
      recommendation: 'Use summary_large_image for rich link previews.'
    }
  }

  const normalized = value.toLowerCase()
  if (normalized !== 'summary_large_image' && normalized !== 'summary') {
    return {
      tag: 'meta[name="twitter:card"]',
      label: 'Twitter Card',
      value,
      status: 'warning',
      score: 60,
      message: `Non-standard twitter:card value — ${value}.`,
      recommendation: 'Use summary or summary_large_image for consistent rendering.'
    }
  }

  return {
    tag: 'meta[name="twitter:card"]',
    label: 'Twitter Card',
    value: normalized,
    status: 'ok',
    score: 85,
    message: 'Twitter card value looks good.',
    recommendation: 'Validate it with the Twitter Card Validator.'
  }
}

function evaluateTwitterTitle(value?: string): TagResult {
  if (!value) {
    return createMissingTag(
      'meta[name="twitter:title"]',
      'Twitter Title',
      true,
      'Add twitter:title — keep it short and compelling.'
    )
  }

  const length = value.length
  if (length > 70) {
    return {
      tag: 'meta[name="twitter:title"]',
      label: 'Twitter Title',
      value,
      length,
      status: 'warning',
      score: 60,
      message: `Twitter title has ${length} characters — trim to 70.`,
      recommendation: 'Rewrite the headline to 70 characters or fewer for social.'
    }
  }

  return {
    tag: 'meta[name="twitter:title"]',
    label: 'Twitter Title',
    value,
    length,
    status: 'ok',
    score: 90,
    message: 'Twitter title looks good.',
    recommendation: 'Align it with the OG title and HTML title.'
  }
}

function evaluateTwitterDescription(value?: string): TagResult {
  if (!value) {
    return createMissingTag(
      'meta[name="twitter:description"]',
      'Twitter Description',
      true,
      'Add twitter:description (up to 200 characters).'
    )
  }

  const length = value.length
  if (length > 200) {
    return {
      tag: 'meta[name="twitter:description"]',
      label: 'Twitter Description',
      value,
      length,
      status: 'warning',
      score: 60,
      message: `Twitter description has ${length} characters — limit to 200.`,
      recommendation: 'Focus on the key benefit within 200 characters.'
    }
  }

  return {
    tag: 'meta[name="twitter:description"]',
    label: 'Twitter Description',
    value,
    length,
    status: 'ok',
    score: 90,
    message: 'Twitter description length is on point.',
    recommendation: 'Surface the value and CTA tailored for social.'
  }
}

function evaluateTwitterImage(value?: string): TagResult {
  if (!value) {
    return {
      tag: 'meta[name="twitter:image"]',
      label: 'Twitter Image',
      status: 'warning',
      score: 55,
      message: 'Twitter image is not specified.',
      recommendation: 'Provide an image 1200×630 px or 800×418 px for cards.'
    }
  }

  return {
    tag: 'meta[name="twitter:image"]',
    label: 'Twitter Image',
    value,
    status: 'ok',
    score: 85,
    message: 'Twitter image is set.',
    recommendation: 'Ensure the image is accessible and in a supported format.'
  }
}

function createMissingTag(
  tag: string,
  label: string,
  critical: boolean,
  recommendation: string
): TagResult {
  return {
    tag,
    label,
    status: critical ? 'error' : 'warning',
    score: critical ? 0 : 50,
    message: `${label} not found.`,
    recommendation
  }
}

function buildPreviews(
  sections: SectionResult[],
  finalUrl: string,
  baseUrl: URL
): SeoPreviews {
  const meta = sections.find((section) => section.id === 'meta')?.tags ?? []
  const openGraph = sections.find((section) => section.id === 'openGraph')?.tags ?? []
  const twitter = sections.find((section) => section.id === 'twitter')?.tags ?? []

  const title =
    meta.find((tag) => tag.tag === 'title')?.value ??
    openGraph.find((tag) => tag.tag === 'meta[property="og:title"]')?.value ??
    'Preview'

  const description =
    meta.find((tag) => tag.tag === 'meta[name="description"]')?.value ??
    openGraph.find((tag) => tag.tag === 'meta[property="og:description"]')?.value ??
    ''

  const ogTitle =
    openGraph.find((tag) => tag.tag === 'meta[property="og:title"]')?.value ?? title
  const ogDescription =
    openGraph.find((tag) => tag.tag === 'meta[property="og:description"]')?.value ??
    description
  const ogImage =
    openGraph.find((tag) => tag.tag === 'meta[property="og:image"]')?.value ?? undefined
  const ogUrl =
    openGraph.find((tag) => tag.tag === 'og:url')?.value ?? new URL(finalUrl).toString()

  const twitterTitle =
    twitter.find((tag) => tag.tag === 'meta[name="twitter:title"]')?.value ?? title
  const twitterDescription =
    twitter.find((tag) => tag.tag === 'meta[name="twitter:description"]')?.value ??
    description
  const twitterImage =
    twitter.find((tag) => tag.tag === 'meta[name="twitter:image"]')?.value ?? ogImage
  const twitterCard =
    twitter.find((tag) => tag.tag === 'meta[name="twitter:card"]')?.value ??
    'summary_large_image'

  return {
    google: {
      title,
      description,
      url: finalUrl,
      domain: baseUrl.hostname
    },
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      url: ogUrl,
      siteName: baseUrl.hostname,
      ...(ogImage ? { image: ogImage } : {})
    },
    twitter: {
      title: twitterTitle,
      description: twitterDescription,
      url: finalUrl,
      siteName: baseUrl.hostname,
      card: twitterCard,
      ...(twitterImage ? { image: twitterImage } : {})
    }
  }
}

function getMeta($: CheerioAPI, name: string): string | undefined {
  return normalizeText($(`meta[name="${name}"]`).attr('content'))
}

function getProperty($: CheerioAPI, property: string): string | undefined {
  return normalizeText($(`meta[property="${property}"]`).attr('content'))
}

function getCanonical($: CheerioAPI, baseUrl: URL): string | undefined {
  const canonicalTag = $('link[rel="canonical"]').attr('href')
  return resolveMaybeUrl(canonicalTag, baseUrl)
}

function resolveMaybeUrl(value: string | undefined, baseUrl: URL): string | undefined {
  if (!value) return undefined
  try {
    const resolved = new URL(value, baseUrl)
    return resolved.toString()
  } catch {
    return undefined
  }
}

function normalizeText(value: string | undefined | null): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  return trimmed.length ? trimmed : undefined
}

function severityRank(status: TagStatus): number {
  if (status === 'error') return 0
  if (status === 'warning') return 1
  return 2
}

function safeUrl(value: string): URL | undefined {
  try {
    return new URL(value)
  } catch {
    return undefined
  }
}

