# SEO Meta Analyzer

SEO Meta Analyzer audits public URLs to evaluate critical SEO meta tags, Open Graph data, and Twitter Card metadata. It is designed for developers, marketers, and content teams who need actionable diagnostics before publishing.

## Tech Stack

- React 19 with TypeScript and Vite
- Tailwind CSS for styling
- Express server with Cheerio for HTML parsing
- Zod for validation
- npm-run-all, TSX, and TypeScript build tooling

## Main Features

- Fetches any public page and validates meta, Open Graph, and Twitter Card tags.
- Generates per-section scores with status badges for quick triage.
- Lists prioritized issues with remediation guidance and missing critical tags.
- Renders Google search, Facebook/LinkedIn, and Twitter share previews.
- Shares TypeScript models between client and server for type safety.

## Project Structure

```
.
├── src/               # React client (App shell, UI components, Tailwind styles)
│   ├── components/    # Summary cards, previews, issues list, section details, URL form
│   ├── lib/           # Client-side fetcher and status utilities
│   └── main.tsx       # Vite entry point
├── server/            # Express API that performs the analysis
│   └── index.ts
├── shared/            # Domain types reused on both sides
├── public/            # Static assets served by Vite
├── tailwind.config.ts # Tailwind theme customization
├── vite.config.ts     # Vite setup with API proxy for development
└── tsconfig*.json     # TypeScript configurations for client and server
```

## Installation & Setup

1. Install Node.js 20 or newer.
2. Clone the repository.
3. Install dependencies:

   ```
   npm install
   ```

## Running the Project

- Development:

  ```
  npm run dev
  ```

  Runs the Vite client (default http://localhost:5173) and the Express API on port 5174 with proxying via Vite.

- Production:

  ```
  npm run build
  npm run build:server
  node dist/server/server/index.js
  ```

  Serve the generated `dist/` directory with a static file host or CDN and ensure it can reach the running API instance.

- Preview the production build locally:

  ```
  npm run preview
  ```

## Testing

Automated tests are not yet configured.

## Environment Variables

- `PORT` (optional): Port for the Express API. Defaults to `5174`.

## Known Limitations / Future Improvements

- Production deployment requires wiring the static frontend and the API manually; no single deployment script is provided.
- No caching or rate limiting around remote fetches; heavy usage may hit upstream rate limits.
- Lacks authentication and persistence; every request performs a fresh crawl.
- No automated tests or CI pipeline; regressions must be caught manually.
- Does not yet validate structured data (JSON-LD, microdata) beyond meta tags.