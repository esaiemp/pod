# DailySpark Tech POD Portal

A Next.js portal for drivers and back-office operations. Supabase Auth handles email/password sessions; Supabase Postgres stores company membership, user roles, driver identity mappings, and audit events. Airtable remains the operational system of record, and Make.com remains the existing processing workflow.

See [`SETUP.md`](./SETUP.md) for end-to-end local setup, Supabase migration/auth configuration, Airtable and Make requirements, role testing, and manual Vercel deployment.

## Current integration boundary

The Supabase access-management tables and RLS policies are installed by the migrations in `supabase/migrations/`. Supabase credentials are connected. The Make webhook URL and sample payloads have been supplied; store the URL only in the server-side `MAKE_POD_SUBMISSION_WEBHOOK_URL` variable. Airtable credentials and its live schema are still pending.

Operational pages intentionally do not display sample records. The supplied Make examples confirm `driverName`, `driverEmail`, `driverUserId`, and a binary `podFile`. Airtable reads remain disabled until the real table fields and company filter are verified; uploads remain disabled until the current webhook confirms its multipart parser and duplicate-safe behavior. This prevents unscoped cross-company reads and accidental duplicate submissions.

## Local development

1. Install dependencies with `pnpm install`.
2. Copy `.env.example` to `.env.local` and fill the Supabase values from the connected project environment.
3. Set `APP_URL` to the application origin and provide a temporary, high-entropy `PORTAL_BOOTSTRAP_SECRET` for first-run setup.
4. Start the application with `pnpm dev` and open `/setup`.
5. Create the first company administrator. The page provisions a confirmed Supabase Auth user and creates a one-time password recovery link; share that link only through a secure channel.
6. Remove `PORTAL_BOOTSTRAP_SECRET` after setup. The bootstrap endpoint also refuses to run after the first profile exists.
7. Sign in at `/login`. Administrators can provision and deactivate company-scoped users from Operations → User management.

The portal does not provide public registration. Passwords are handled only by Supabase Auth; they are never written to Airtable or portal tables.

## Airtable configuration checklist

When the Airtable schema is available, configure the server-only values in `.env.local` / Vercel Vars:

- `AIRTABLE_PERSONAL_ACCESS_TOKEN`
- `AIRTABLE_BASE_ID`
- `AIRTABLE_FIELD_MAP_JSON` — exact table and field names from the live base, including a company field and whether it is text or a linked record.
- `AIRTABLE_COMPANY_RECORD_IDS_JSON` — maps Supabase company IDs to the corresponding Airtable company identifiers.
- Set `AIRTABLE_SCHEMA_MAPPING_VERIFIED=true` and `AIRTABLE_TENANT_MAPPING_VERIFIED=true` only after the schema and per-company filter have been tested.

The application applies the company filter before reads and verifies company ownership before record updates. Do not enable these flags until the base’s actual schema and tenant mapping are confirmed.

## Make.com POD upload checklist

The Make adapter is prepared to send a `multipart/form-data` request with `driverName`, `driverEmail`, `driverUserId`, and a binary `podFile`, plus an `Idempotency-Key` header. The supplied examples show raw `IMTBuffer` bytes; the portal preserves them as one binary file part rather than base64 JSON and does not send a separate `files` field. Confirm that the active webhook parser produces the supplied bundle shape and that the scenario deduplicates repeated idempotency keys before enabling uploads. The adapter is disabled unless all of the following are configured and verified:

- `MAKE_POD_SUBMISSION_WEBHOOK_URL`
- `MAKE_POD_UPLOAD_MODE=multipart-file-v1`
- `MAKE_POD_CONTRACT_VERIFIED=true`
- `MAKE_POD_IDEMPOTENCY_VERIFIED=true`

Confirm how the current custom webhook parses the binary file and how the scenario deduplicates a repeated idempotency key before setting the verification flags. The upload endpoint checks file extension, MIME type, file signature, and size. Direct uploads are capped at 4 MiB to remain below Vercel Functions’ 4.5 MB request-body limit with multipart overhead. Larger uploads require a temporary private staging flow and a verified Make ingestion change; the portal does not silently increase the function body limit.

Exception resolution is intended to update only mapped Airtable resolution fields so the existing Make synchronization scenario can continue to own downstream side effects. That path remains disabled until the live exception schema is supplied.

## Verification

- `pnpm typecheck`
- `pnpm test`
- `pnpm test:e2e`
- `pnpm build`

The E2E tests cover the email/password sign-in screen and the unauthenticated route guard. Never use production user credentials in automated tests.
"# pod" 
