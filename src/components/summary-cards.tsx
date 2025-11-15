import type { SeoAnalysis } from '../../shared/analysis-types'
import { getStatusConfig } from '../lib/status'

interface SummaryCardsProps {
  analysis: SeoAnalysis
}

export function SummaryCards({ analysis }: SummaryCardsProps) {
  return (
    <section className="grid gap-5 md:grid-cols-4">
      <article className="md:col-span-2 rounded-2xl border border-white/10 bg-[#0F172A]/60 p-6 shadow-[0_25px_60px_-25px_rgba(15,23,42,0.8)] backdrop-blur-xl">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-gray-300">Overall score</p>
            <h2 className="mt-2 text-3xl font-semibold text-gray-100">
              {analysis.summary.overallScore}
              <span className="ml-1 text-base font-normal text-gray-400">/ 100</span>
            </h2>
          </div>
          <StatusBadge status={analysis.summary.status} />
        </header>
        <p className="mt-4 max-w-lg text-sm text-gray-300">
          Final URL:{' '}
          <a
            href={analysis.finalUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[#3B82F6] underline decoration-transparent transition hover:text-[#60A5FA] hover:decoration-[#60A5FA]"
          >
            {analysis.finalUrl}
          </a>
        </p>
        <p className="mt-2 text-xs text-gray-300">
          Last updated: {new Date(analysis.fetchedAt).toLocaleString()}
        </p>
      </article>
      {analysis.sections.map((section) => (
        <article
          key={section.id}
          className="rounded-2xl border border-white/10 bg-[#1E293B]/60 p-5 shadow-lg shadow-black/25 backdrop-blur"
        >
          <header className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-300">Section</p>
              <h3 className="text-lg font-semibold text-gray-100">{section.label}</h3>
            </div>
            <StatusBadge status={section.status} />
          </header>
          <p className="mt-6 text-3xl font-semibold text-gray-100">
            {analysis.summary.sectionScores[section.id]}
            <span className="ml-1 text-sm font-normal text-gray-400">/ 100</span>
          </p>
          <p className="mt-2 text-xs text-gray-300">
            Issues: {section.tags.filter((tag) => tag.status !== 'ok').length}
          </p>
        </article>
      ))}
    </section>
  )
}

interface StatusBadgeProps {
  status: Parameters<typeof getStatusConfig>[0]
}

function StatusBadge({ status }: StatusBadgeProps) {
  const config = getStatusConfig(status)
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1 text-xs font-semibold backdrop-blur ${config.badge}`}
    >
      <span className="inline-block h-2 w-2 rounded-full bg-[#3B82F6]" />
      {config.label}
    </span>
  )
}

