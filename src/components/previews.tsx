import type { SeoPreviews } from '../../shared/analysis-types'

interface PreviewsProps {
  previews: SeoPreviews
}

export function Previews({ previews }: PreviewsProps) {
  return (
    <section className="grid gap-5 lg:grid-cols-3">
      <PreviewCard title="Google Preview">
        <GooglePreview {...previews.google} />
      </PreviewCard>
      <PreviewCard title="Facebook / LinkedIn">
        <SocialPreview {...previews.openGraph} />
      </PreviewCard>
      <PreviewCard title="Twitter Card">
        <TwitterPreview {...previews.twitter} />
      </PreviewCard>
    </section>
  )
}

interface PreviewCardProps {
  title: string
  children: React.ReactNode
}

function PreviewCard({ title, children }: PreviewCardProps) {
  return (
    <article className="rounded-2xl border border-white/10 bg-[#1E293B]/60 p-6 shadow-lg shadow-black/20 backdrop-blur-xl">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-300">{title}</h3>
      <div className="mt-4 rounded-xl border border-white/10 bg-[#0F172A]/60 p-4 shadow-inner shadow-black/10 backdrop-blur">
        {children}
      </div>
    </article>
  )
}

function GooglePreview({
  title,
  description,
  url,
  domain
}: SeoPreviews['google']) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-emerald-400">{domain}</p>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="block text-lg font-semibold text-[#3B82F6] transition hover:text-[#60A5FA] hover:underline"
      >
        {title}
      </a>
      <p className="text-sm text-gray-300">{description || 'Description not found.'}</p>
    </div>
  )
}

function SocialPreview({
  title,
  description,
  image,
  url,
  siteName
}: SeoPreviews['openGraph']) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0F172A]/50">
      {image ? (
        <img
          src={image}
          alt=""
          className="h-40 w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-40 w-full items-center justify-center bg-[#1E293B]/60 text-xs text-gray-300">
          Image not provided
        </div>
      )}
      <div className="bg-[#1E293B]/60 p-4">
        <p className="text-xs text-gray-300">{siteName}</p>
        <p className="mt-2 text-base font-semibold text-gray-100">{title}</p>
        <p className="mt-1 overflow-hidden text-ellipsis text-sm text-gray-300">
          {description || 'No description provided.'}
        </p>
        <p className="mt-2 text-xs text-[#3B82F6]">{url}</p>
      </div>
    </div>
  )
}

function TwitterPreview({
  title,
  description,
  image,
  url,
  siteName,
  card
}: SeoPreviews['twitter']) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0F172A]/50">
      {image ? (
        <img
          src={image}
          alt=""
          className={card === 'summary' ? 'h-40 w-40 object-cover' : 'h-40 w-full object-cover'}
          loading="lazy"
        />
      ) : (
        <div className="flex h-40 w-full items-center justify-center bg-[#1E293B]/60 text-xs text-gray-300">
          Image not provided
        </div>
      )}
      <div className="bg-[#1E293B]/60 p-4">
        <p className="text-xs text-gray-300">
          {siteName} · Twitter card: {card}
        </p>
        <p className="mt-2 text-base font-semibold text-gray-100">{title}</p>
        <p className="mt-1 overflow-hidden text-ellipsis text-sm text-gray-300">
          {description || 'No description provided.'}
        </p>
        <p className="mt-2 text-xs text-[#3B82F6]">{url}</p>
      </div>
    </div>
  )
}

