import { useState } from 'react'
import type { SeoAnalysis } from '../shared/analysis-types'
import { AnalyzeError, analyzeUrl } from './lib/analyze'
import { IssuesList } from './components/issues-list'
import { Previews } from './components/previews'
import { SectionDetails } from './components/section-details'
import { SummaryCards } from './components/summary-cards'
import { UrlForm } from './components/url-form'

function App() {
  const [analysis, setAnalysis] = useState<SeoAnalysis>()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>()

  const handleAnalyze = async (url: string) => {
    try {
      setIsLoading(true)
      setError(undefined)
      const result = await analyzeUrl(url)
      setAnalysis(result)
    } catch (err) {
      if (err instanceof AnalyzeError) {
        setError(err.message)
        return
      }
      setError('We could not finish the analysis. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-gray-100 antialiased">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-16">
        <header className="mt-6 space-y-6 text-center">
          <span className="inline-flex w-fit items-center rounded-full border border-[#3B82F6]/40 bg-[#3B82F6]/15 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-[#60A5FA] shadow-[0_0_10px_rgba(59,130,246,0.25)]">
            SEO Meta Analyzer
          </span>
          <h1 className="text-3xl font-semibold leading-tight text-gray-100 md:text-5xl">
            Instant audit of meta tags and social previews
          </h1>
          <p className="mx-auto max-w-2xl text-sm text-gray-300 md:text-base md:leading-relaxed">
            Enter a URL to check core SEO tags, Open Graph, and Twitter Card data.
            Get actionable recommendations and real previews for search and social.
          </p>
        </header>

        <UrlForm isLoading={isLoading} onSubmit={handleAnalyze} initialUrl={analysis?.finalUrl ?? ''} />

        {error && (
          <div className="rounded-2xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger shadow-lg shadow-danger/10 backdrop-blur">
            {error}
          </div>
        )}

        {analysis ? (
          <>
            <SummaryCards analysis={analysis} />

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-100">Visual previews</h2>
              <Previews previews={analysis.previews} />
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-100">Technical SEO</h2>
              <SectionDetails sections={analysis.sections} />
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-100">Recommendations</h2>
              <IssuesList issues={analysis.issues} missing={analysis.missing} />
            </section>
          </>
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#1E293B]/60 p-10 text-center text-gray-300 shadow-xl shadow-black/20 backdrop-blur-xl">
      <h2 className="text-xl font-semibold text-gray-100">Ready to audit a page?</h2>
      <p className="mt-3 text-sm text-gray-300">
        Provide a URL and we will surface technical meta tags, Open Graph, Twitter Card data, and
        tips to improve the snippet.
      </p>
    </section>
  )
}

export default App
