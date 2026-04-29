# QuoteKit

QuoteKit is a proposal and quote generation workspace for freelancers, agencies, and small businesses. It helps teams create branded proposals, manage clients and templates, build pricing tables, share client-facing links, and track proposal activity.

## Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Supabase Auth, Database, and Edge Functions
- OpenAI-compatible chat completions for proposal writing assistance

## Requirements

- Node.js 20+
- npm 10+
- A Supabase project with auth enabled

## Environment

Create a local environment file:

```sh
cp .env.example .env
```

Fill in the frontend Supabase values:

```sh
VITE_SUPABASE_PROJECT_ID=your-project-ref
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
```

If you want Google sign-in, enable the Google provider in Supabase Auth and add your local and deployed app origins to the allowed redirect URLs.

## Supabase Setup

Apply the SQL migrations in `supabase/migrations` to provision the database.

The Edge Functions use server-side secrets:

```sh
supabase secrets set OPENAI_API_KEY=your-api-key
supabase secrets set OPENAI_MODEL=gpt-4o-mini
```

`OPENAI_MODEL` is optional and defaults to `gpt-4o-mini`.

## Local Development

```sh
npm install
npm run dev
```

## Production Build

```sh
npm run build
npm run preview
```

The compiled app is emitted to `dist/` and can be served by any static hosting provider.

## Testing

```sh
npm test
npm run lint
```

## Deployment Notes

- Configure the `VITE_SUPABASE_*` variables in the frontend deployment environment.
- Deploy the Supabase migrations and Edge Functions with the Supabase CLI.
- Configure `OPENAI_API_KEY` as an Edge Function secret.
- Social preview metadata uses the local `public/social-card.svg` asset.
