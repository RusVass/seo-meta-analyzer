import { useState } from 'react'
import { urlSchema } from '../lib/analyze'

interface UrlFormProps {
  isLoading: boolean
  onSubmit: (url: string) => void
  initialUrl?: string
}

export function UrlForm({ isLoading, onSubmit, initialUrl = '' }: UrlFormProps) {
  const [value, setValue] = useState(initialUrl)
  const [error, setError] = useState<string>()

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const parsed = urlSchema.safeParse(value)

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter a valid URL.')
      return
    }

    setError(undefined)
    onSubmit(parsed.data)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-5 rounded-xl border border-white/10 bg-[#1E293B]/70 p-7 shadow-lg shadow-black/20 backdrop-blur-md"
    >
      <label htmlFor="url" className="text-sm font-semibold text-gray-100 tracking-wide uppercase">
        Page URL
      </label>
      <div className="flex flex-col gap-3 md:flex-row">
        <input
          id="url"
          name="url"
          type="url"
          placeholder="https://example.com"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="w-full rounded-xl border border-white/10 bg-[#0F172A]/70 px-4 py-3 text-base text-gray-100 placeholder-gray-500 outline-none transition focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/60"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'url-error' : undefined}
          disabled={isLoading}
          autoComplete="url"
        />
        <button
          type="submit"
          className="flex items-center justify-center gap-2 rounded-xl bg-[#3B82F6] px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-[0_0_15px_rgba(59,130,246,0.4)] transition hover:bg-[#60A5FA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60A5FA] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F172A] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isLoading}
        >
          {isLoading && (
            <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          )}
          Analyze
        </button>
      </div>
      {error && (
        <p id="url-error" className="text-sm text-danger">
          {error}
        </p>
      )}
      <p className="text-xs text-gray-300">
        We perform a GET request and audit only publicly available pages — no authentication or
        private data.
      </p>
    </form>
  )
}

