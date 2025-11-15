import type { SeoIssue } from '../../shared/analysis-types'
import { getStatusConfig } from '../lib/status'

interface IssuesListProps {
  issues: SeoIssue[]
  missing: string[]
}

export function IssuesList({ issues, missing }: IssuesListProps) {
  if (!issues.length) {
    return (
      <section className="rounded-2xl border border-white/10 bg-[#1E293B]/60 p-6 text-sm text-gray-300 shadow-lg shadow-black/20 backdrop-blur-lg">
        ✅ No critical issues detected. Keep monitoring tags as the page evolves.
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-[#1E293B]/60 p-6 shadow-lg shadow-black/20 backdrop-blur-xl">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
        Improvement recommendations
      </h3>
      <ul className="mt-4 space-y-4">
        {issues.map((issue) => {
          const config = getStatusConfig(issue.severity)
          return (
            <li key={issue.id} className="rounded-xl border border-white/10 bg-[#0F172A]/60 p-4 shadow-inner shadow-black/10 backdrop-blur">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-100">{issue.tag}</p>
                  <p className="text-xs text-gray-300">Section: {sectionLabel(issue.section)}</p>
                </div>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs ${config.badge}`}>
                  {config.label}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-300">{issue.message}</p>
              {issue.recommendation && (
                <p className="mt-2 text-xs text-gray-300">
                  <span className="font-semibold text-gray-100">Action:</span>{' '}
                  {issue.recommendation}
                </p>
              )}
            </li>
          )
        })}
      </ul>
      {missing.length > 0 && (
        <div className="mt-5 rounded-xl border border-dashed border-danger/60 bg-danger/10 p-4 shadow-inner shadow-danger/10 backdrop-blur">
          <p className="text-sm font-semibold text-danger">Missing critical tags</p>
          <ul className="mt-2 list-inside list-disc text-sm text-danger">
            {missing.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function sectionLabel(section: SeoIssue['section']): string {
  switch (section) {
    case 'meta':
      return 'Technical SEO'
    case 'openGraph':
      return 'Social (Open Graph)'
    case 'twitter':
      return 'Twitter Card'
    default:
      return section
  }
}

