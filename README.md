# Studiobase

Studiobase is a web app for generating product ad imagery from a text prompt and optional reference images. Users sign in, describe what they want, optionally attach up to four reference images, and the app calls an image-generation model to produce a result that's stored in S3 and tracked in Supabase. Generated images can be re-used as references to iterate on the next render.

Video generation is stubbed out in the UI as "coming soon" — only image generation is wired up end-to-end.

## Stack

- **Next.js 16.2** (App Router, Turbopack) with React 19
- **TypeScript** + **Tailwind CSS v4**
- **Clerk** for authentication (modal sign-in, route-level middleware)
- **AWS S3** for binary storage (reference uploads + generated outputs), accessed via presigned URLs
- **Supabase** (Postgres) for generation metadata, accessed with the service-role key from server routes only
- **OpenRouter** as the inference gateway; the model used is `google/gemini-3.1-flash-image-preview`

## How it works

### Auth

`middleware.ts` wraps every non-static route with `clerkMiddleware`, so server routes can resolve `auth()` to the current `userId`. The home page (`app/page.tsx`) shows a Clerk sign-in modal on submit if the user isn't signed in, then resumes the pending generation once `isSignedIn` flips.

### Reference uploads (browser → S3 direct)

Reference images never pass through the Next.js server. The flow:

1. Browser POSTs the file's MIME type to `POST /api/upload-url`.
2. The server (`app/api/upload-url/route.ts`) validates the type against `ALLOWED_REFERENCE_MIME_TYPES`, mints an S3 key under `studiobase_image_uploads/<uuid>.<ext>`, and returns a presigned `PUT` URL plus a presigned `GET` URL.
3. Browser `PUT`s the file straight to S3, then keeps the returned `key` and `viewUrl` in component state.

The UI caps references at `MAX_REFERENCE_IMAGES` (4) and persists prompt/aspect/size/reference state to `localStorage` under `studiobase-draft` so refreshes don't lose work.

### Generation (`POST /api/generate`)

`app/api/generate/route.ts` is the core endpoint:

1. Requires a Clerk session.
2. Validates `prompt`, `aspectRatio` ∈ `{1:1, 16:9, 9:16}`, `imageSize` ∈ `{1K, 2K, 4K}`, and filters `referenceKeys` through `isAllowedKey` (rejects path traversal and any key not under an allowed prefix).
3. Presigns a fresh `GET` URL for each reference and builds an OpenRouter chat-completions payload with `modalities: ["image", "text"]` and an `image_config` carrying aspect ratio + size.
4. Downloads the resulting image (handles both `data:` URLs and remote URLs), uploads the bytes to S3 under `studiobase_generations/<uuid>.<ext>`.
5. Inserts a row into `public.generations` with `user_id`, prompt, aspect, size, image key, and reference keys.
6. Returns the generation metadata plus a freshly presigned view URL.

### Listing (`GET /api/generations`)

Returns the signed-in user's last 60 generations, ordered by `created_at desc`. Each row's `image_key` is presigned on the way out, so URLs are valid for `PRESIGNED_URL_TTL_SECONDS` (1 hour).

### Edit / iterate (`POST /api/edit-generation`)

When a user clicks "edit" on a past generation, the server:

1. Looks up the generation, confirms it belongs to the caller.
2. `CopyObject`s the stored output from `studiobase_generations/...` into `studiobase_image_uploads/...` (so the image now lives where reference uploads live).
3. Returns the new key + presigned view URL, which the client adds to the reference list as if the user had uploaded it.

This is the loop that lets a generation feed back in as an input.

### Storage layout

S3 keys are namespaced by purpose so server-side validation can refuse anything off-prefix:

- `studiobase_image_uploads/<uuid>.<ext>` — user-supplied references and copies of past generations promoted back into reference slots.
- `studiobase_generations/<uuid>.<ext>` — model outputs.

The Supabase schema is a single table (`supabase/schema.sql`):

```
generations (
  id uuid PK,
  user_id text,             -- Clerk user id
  media_type text,          -- 'image' | 'video' | 'audio' (only 'image' is used today)
  prompt text,
  aspect_ratio text,
  image_size text,
  image_key text,           -- S3 key, presigned at read time
  reference_keys text[],    -- S3 keys of inputs
  created_at timestamptz
)
```

with an index on `(user_id, created_at desc)` for the listing query. Row-level security is **not** enforced in SQL; access is gated by the API routes using the service-role key plus Clerk's `userId` check.

## Project layout

```
app/
  layout.tsx              ClerkProvider + Geist fonts
  page.tsx                Single-page UI (prompt form, references, gallery, zoom modal)
  api/
    upload-url/           Presign PUT/GET for direct-to-S3 reference uploads
    generate/             Validates input, calls OpenRouter, persists output
    generations/          Lists current user's recent generations
    edit-generation/      Copies a past output into the references prefix
lib/
  s3.ts                   Cached S3Client + bucket-name helper
  presign.ts              presignViewUrl + isAllowedKey (prefix/traversal guard)
  supabase.ts             Cached service-role client + GenerationRow type
  constants.ts            S3 prefixes, TTLs, reference limits, allowed MIME types
supabase/
  schema.sql              Table + index definition
middleware.ts             Clerk middleware over all non-asset routes
```

## Environment

Required env vars (read directly from `process.env` — there is no `.env.example`):

| Variable | Used by |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Clerk auth |
| `AWS_S3_REGION`, `AWS_S3_ACCESS`, `AWS_S3_SECRET`, `AWS_S3_BUCKET_NAME` | `lib/s3.ts` |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabase.ts` |
| `OPENROUTER_API_KEY` | `app/api/generate/route.ts` |

The S3 bucket must allow CORS `PUT` from the app origin, since the browser uploads references directly. The Supabase database needs `supabase/schema.sql` applied once.

## Running locally

```bash
npm install
npm run dev      # next dev (Turbopack)
```

Then open http://localhost:3000. Other scripts:

```bash
npm run build    # next build
npm run start    # next start (production server)
npm run lint     # eslint
```

## Notes

- This project is on Next.js 16.2; APIs and conventions may differ from older versions. See `AGENTS.md`.
- The Supabase service-role key is used server-side only and must never be exposed to the client.
- All S3 access from the browser is through short-lived presigned URLs; the bucket should not be public.
