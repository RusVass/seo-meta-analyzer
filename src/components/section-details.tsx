import type { SectionResult, TagResult } from '../../shared/analysis-types'
import { getStatusConfig } from '../lib/status'

interface SectionDetailsProps {
  sections: SectionResult[]
}

export function SectionDetails({ sections }: SectionDetailsProps) {
  return (
    <section className="space-y-5">
      {sections.map((section) => (
        <article
          key={section.id}
          className="rounded-2xl border border-white/10 bg-[#1E293B]/60 p-6 shadow-lg shadow-black/25 backdrop-blur-xl"
        >
          <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-300">Section</p>
              <h3 className="text-xl font-semibold text-gray-100">{section.label}</h3>
            </div>
            <StatusBadge status={section.status} score={section.score} />
          </header>
          <div className="mt-5 space-y-3">
            {section.tags.map((tag) => (
              <TagRow key={tag.tag} tag={tag} />
            ))}
          </div>
        </article>
      ))}
    </section>
  )
}

interface StatusBadgeProps {
  status: Parameters<typeof getStatusConfig>[0]
  score: number
}

function StatusBadge({ status, score }: StatusBadgeProps) {
  const config = getStatusConfig(status)
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-1 text-xs font-semibold backdrop-blur ${config.badge}`}
    >
      <span>{config.label}</span>
      <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white">
        {score} / 100
      </span>
    </span>
  )
}

function TagRow({ tag }: { tag: TagResult }) {
  const config = getStatusConfig(tag.status)
  return (
    <div className="rounded-xl border border-white/10 bg-[#0F172A]/60 p-4 shadow-inner shadow-black/10 backdrop-blur">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-100">{tag.label}</p>
          <p className="text-xs text-gray-300">{tag.tag}</p>
        </div>
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs ${config.badge}`}>
          {config.label}
        </span>
      </div>
      <p className="mt-3 text-sm text-gray-300">{tag.message}</p>
      {tag.value && (
        <div className="mt-3 rounded-lg border border-white/10 bg-[#1E293B]/60 p-3 text-sm text-gray-100">
          {tag.value}
          {typeof tag.length === 'number' && (
            <span className="ml-2 text-xs text-gray-300">({tag.length} characters)</span>
          )}
        </div>
      )}
      {tag.recommendation && (
        <p className="mt-2 text-xs text-gray-300">
          <span className="font-semibold text-gray-100">Recommendation:</span>{' '}
          {tag.recommendation}
        </p>
      )}
    </div>
  )
}

