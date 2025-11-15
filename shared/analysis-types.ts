export type TagStatus = 'ok' | 'warning' | 'error'

export type SectionId = 'meta' | 'openGraph' | 'twitter'

export interface TagResult {
  tag: string
  label: string
  value?: string
  status: TagStatus
  score: number
  length?: number
  message: string
  recommendation?: string
}

export interface SectionResult {
  id: SectionId
  label: string
  status: TagStatus
  score: number
  tags: TagResult[]
}

export interface SeoIssue {
  id: string
  tag: string
  section: SectionId
  severity: TagStatus
  message: string
  recommendation: string
}

export interface SearchPreview {
  title: string
  description: string
  url: string
  domain: string
}

export interface SocialPreview {
  title: string
  description: string
  image?: string
  url: string
  siteName: string
}

export interface TwitterPreview extends SocialPreview {
  card: string
}

export interface SeoPreviews {
  google: SearchPreview
  openGraph: SocialPreview
  twitter: TwitterPreview
}

export interface SeoSummary {
  overallScore: number
  status: TagStatus
  sectionScores: Record<SectionId, number>
}

export interface SeoAnalysis {
  url: string
  finalUrl: string
  fetchedAt: string
  summary: SeoSummary
  sections: SectionResult[]
  issues: SeoIssue[]
  missing: string[]
  previews: SeoPreviews
}

