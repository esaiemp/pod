# DailySpark POD Portal — Local Setup and Manual Deployment

This guide describes the source snapshot in this archive. It contains no credentials. The ZIP includes the application source, lockfile, Supabase SQL migrations, `.env.example`, tests, and this guide; it intentionally excludes `.git`, `node_modules`, build output, Vercel project linkage, and local environment files.

## Current capabilities and limits

- Supabase Auth email/password login, one-time first-company/admin bootstrap, company-scoped user management, and audit events are implemented.
- The two workspace roles are `Driver` and `BackOffice`. Administrator access is a separate `is_admin` flag, not a third role.
- `/pod-test` is an unauthenticated UI-only preview. It validates file metadata and simulates confirmation; it does not upload, store, or forward the selected file.
- Real POD uploads are gated until the Airtable tenant/schema mappings and Make multipart/idempotency contract are configured and verified.
- The Operations business-data pages are still placeholders. The Airtable adapter exists, but the current pages do not yet load live Airtable records. Filling Airtable variables alone will not make those pages display data.
- The initial setup creates one company. Admins can manage users within that company, but this snapshot has no UI for creating or managing a second company/tenant. If “two groups” means Driver and BackOffice, that is supported; if it means two separate companies, more company-management work is needed.

## 1. Prerequisites and install

Use Node.js 20.9 or later and the package manager pinned in `package.json` (`pnpm@12.3.4`). From the extracted project root:

```bash
corepack enable
corepack prepare pnpm@12.3.4 --activate
pnpm install --frozen-lockfile
```

## 2. Supabase setup

Use a dedicated non-production Supabase project for local testing when possible. If you reuse an existing project, first confirm the migrations below are already installed; do not run them twice.

1. Create or select a Supabase project and enable Email/Password authentication. The app has no public sign-up page; accounts are provisioned by the first-run flow or a company administrator.
2. Get the project URL, publishable key, and server secret key (or legacy service-role key). The secret/service-role key bypasses RLS and must remain server-side.
3. Apply the migrations to a fresh project, in this order:
   1. `supabase/migrations/20261031_create_access_management.sql`
   2. `supabase/migrations/20261031_bootstrap_first_portal_admin.sql`

   These SQL files create the company/profile/mapping/audit tables, RLS policies, and one-time bootstrap function. They are not designed to be re-run against an already initialized database.

   This archive contains the migration files but not a generated `supabase/config.toml`. For CLI-managed migration history on a fresh project, initialize the CLI config in the project root, preserve the existing migration files, then link and push:

   ```bash
   pnpm dlx supabase init
   pnpm dlx supabase login
   pnpm dlx supabase link --project-ref <project-ref>
   pnpm dlx supabase db push
   ```

   Do not push these migrations blindly to a database that already has the schema. A one-time fresh setup can also apply the two SQL files once in the Supabase SQL Editor; if you use that route, reconcile migration history before later using `db push`. See [Supabase migration docs](https://supabase.com/docs/guides/deployment/database-migrations).
4. In Supabase Auth URL Configuration, set the Site URL to your production app origin when known. Add allowed callback URLs for local and deployed environments:
   - `http://localhost:3000/auth/callback`
   - `https://<your-production-domain>/auth/callback`
   - The exact Vercel Preview callback URL (or a controlled Preview wildcard) if you create users from a Preview deployment.

   The app sends password setup/recovery links through `/auth/callback`, which then routes the user to `/account/reset-password`. Use exact production URLs; keep Preview wildcards restricted. See [Supabase redirect URL docs](https://supabase.com/docs/guides/auth/redirect-urls).

## 3. Local environment and first administrator

Copy the template and fill only the required Supabase values first:

```bash
cp .env.example .env.local
```

Required for local sign-in and setup:

| Variable | Local value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key; the legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` is also supported |
| `SUPABASE_SECRET_KEY` | Supabase secret key; the legacy `SUPABASE_SERVICE_ROLE_KEY` is also supported. Server-side only. |
| `APP_URL` | `http://localhost:3000` |
| `PORTAL_BOOTSTRAP_SECRET` | A temporary, high-entropy secret used only for first setup |
| `POD_MAX_UPLOAD_BYTES` | Keep at `4194304` (4 MiB) for direct Vercel uploads |

Generate the temporary bootstrap secret locally, for example with `openssl rand -base64 32`, and paste it into `.env.local`. Do not commit `.env.local` or share the secret. Leave `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` unset outside v0; it is only needed for the v0 redirect proxy.

The Airtable and Make variables can stay blank and all verification flags should stay `false` during initial UI/account testing. Start the app:

```bash
pnpm dev
```

Then:

1. Open `http://localhost:3000/setup`.
2. Enter the bootstrap secret, company name, first administrator’s full name, and email.
3. Copy the one-time password setup link shown by the page and share it only through a secure channel. The portal does not email or store this link.
4. Open the link, set the password, and sign in at `http://localhost:3000/login`.
5. Remove `PORTAL_BOOTSTRAP_SECRET` from `.env.local` and restart the server. The setup endpoint refuses to create a second initial profile; removing the secret also closes the recovery flow.

## 4. Roles, accounts, and group testing

The first account is automatically created as `BackOffice` with `is_admin=true` for the company entered at `/setup`. After signing in as that administrator, open **Operations → User management** (`/operations/users`) and add two test accounts:

| Test account | Workspace role | Admin flag | Extra setup |
| --- | --- | --- | --- |
| Administrator | `BackOffice` | On | Created by `/setup` |
| Back-office user | `BackOffice` | Off | None |
| Driver | `Driver` | Off | Enter the legacy driver user ID; legacy email is optional |

Each new account returns a one-time password setup link on screen. Send it securely, set a password, and test each account in a separate browser profile or private window.

Expected checks:

- **Administrator:** can open `/operations` and `/operations/users`, create/edit/deactivate users in the same company, and set the Driver/BackOffice role.
- **BackOffice (non-admin):** can open `/operations`, but should not have user-management access.
- **Driver:** opens `/driver`; it should not access the Operations workspace. A legacy driver mapping is required before a real POD can be forwarded.
- **UI preview:** `/pod-test` is intentionally public and safe for file-selection/client-side validation tests. Use only sample or redacted files. Its simulated submit never calls the POD API.

“Two groups” currently means the two workspace roles above. Company/tenant isolation also exists in the schema and RLS, but the app only bootstraps one company and does not provide a company-creation/group-management screen. Do not create a second company by inserting raw profile rows; a proper company provisioning flow is needed to test two separate tenants safely.

## 5. Airtable setup (schema must be supplied and verified)

The repository does not contain the live Airtable base schema or exact table/field names. Use a non-production base for testing. Do not guess field names or set the verification flags based on the example below.

1. Create a narrowly scoped Airtable Personal Access Token with `data.records:read` and `data.records:write`, restricted to the required base. The application only reads records and updates mapped fields; it does not create schema. Keep the token server-side. See [Airtable PAT documentation](https://support.airtable.com/docs/creating-personal-access-tokens).
2. Record the base ID (`app...`), exact table names, exact field labels, and the company/tenant field type. Every table used by the adapter needs a company field that can be filtered safely.
3. Get the active Supabase company ID with a narrowly scoped query such as:

   ```sql
   select id, name from public.companies where is_active = true;
   ```

4. Map each Supabase company UUID to the matching Airtable Company record ID (`rec...`). If the Airtable company field is text, it must contain that record ID; if it is a linked-record field, it must link to the correct Company record.
5. Configure the server-only values in `.env.local` and later in Vercel:

   ```dotenv
   AIRTABLE_PERSONAL_ACCESS_TOKEN=<token>
   AIRTABLE_BASE_ID=app<base-id>
   AIRTABLE_FIELD_MAP_JSON='{"<exact table name>":{"companyField":"<exact company field>","companyFieldType":"text","fields":{"<logical field>":"<exact Airtable field>"}}}'
   AIRTABLE_COMPANY_RECORD_IDS_JSON='{"<Supabase company UUID>":"rec<Airtable company record ID>"}'
   AIRTABLE_SCHEMA_MAPPING_VERIFIED=false
   AIRTABLE_TENANT_MAPPING_VERIFIED=false
   ```

   `companyFieldType` must be `text` or `linkedRecord`. The JSON above is only the required shape; replace every placeholder with values from the real base.
6. Verify that a company-scoped query returns only records for that company and that updates cannot change the company field. Only then set both verification flags to `true`.

**Important:** the current Operations data screens are placeholders and do not yet call the Airtable adapter. The real field map and page/API wiring are still required before live records appear. Keep verification flags false until the actual base schema and tenant filter are confirmed.

## 6. Make.com POD intake setup

The server forwards a single `multipart/form-data` request to the Make webhook with these exact parts:

- `driverName`
- `driverEmail`
- `driverUserId` (the legacy driver ID)
- `podFile` (one binary file part, not base64 JSON and not a separate `files` collection)
- `Idempotency-Key` request header (UUID)

Create a test Make scenario/webhook that accepts that shape, records the idempotency key, prevents a repeated key from producing a second Airtable side effect, and returns a successful 2xx response only when it has accepted the request. Confirm Make actually exposes the custom header to the scenario; if it does not, adjust the contract before enabling uploads. Test against a non-production Airtable base.

Set these server-side variables only after the webhook parser and duplicate behavior are verified:

```dotenv
MAKE_POD_SUBMISSION_WEBHOOK_URL=https://<your-make-webhook>.make.com/...
MAKE_POD_UPLOAD_MODE=multipart-file-v1
MAKE_POD_CONTRACT_VERIFIED=false
MAKE_POD_IDEMPOTENCY_VERIFIED=false
```

After end-to-end tests pass, set the last two values to `true`. Real POD submission requires all of the following: an active Driver account, a legacy driver ID mapping, verified Airtable credentials/schema/tenant mapping, and a verified Make multipart/idempotency contract. The upload endpoint validates file type, MIME, signature, and size; direct uploads are capped at 4 MiB for Vercel request-body limits. The endpoint remains disabled while any readiness gate is false.

## 7. Manual Vercel deployment

A ZIP cannot be imported directly as a Vercel project. Either commit the extracted source to a private Git repository and import it in Vercel, or deploy from the extracted project root with the [Vercel CLI](https://vercel.com/docs/cli/deploy):

```bash
vercel login
vercel link
vercel --target=preview
vercel --prod
```

Configure Vercel Project → **Settings → Environment Variables** before deploying. Add the Supabase URL/key pair and server secret to Development, Preview, and Production as appropriate; use a separate test Supabase project and test Make/Airtable resources for Preview. Do not upload or commit `.env.local`.

Set `APP_URL` per environment:

- Development: `http://localhost:3000`
- Preview: a stable HTTPS Vercel Preview/branch origin that you also allow in Supabase Auth
- Production: your production origin, for example `https://portal.example.com`

In Production, the app prefers Vercel’s `VERCEL_PROJECT_PRODUCTION_URL` when available. Recovery-link generation in Preview needs an explicit `APP_URL`; do not point it to production. Do not carry v0’s `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` into a standalone Vercel project.

For the first deployed environment, temporarily set a unique `PORTAL_BOOTSTRAP_SECRET`, deploy, and complete `/setup` against the intended Supabase database. Then remove the secret from that Vercel environment and redeploy. Set the Supabase Site URL and allowed `/auth/callback` URLs to the final domain/Preview origin. Add Airtable and Make secrets only after their non-production contracts are verified. Vercel documents that a brand-new project’s first CLI deployment may be Production; configure the project and environment variables before the first deploy, and use an existing project/Preview target when you need a test deployment first.

## 8. Verification checklist

From the project root:

```bash
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

If Playwright reports a missing browser binary, install Chromium with `pnpm exec playwright install chromium`. The E2E suite covers the login screen and unauthenticated route guard; it does not exercise real production credentials or Make/Airtable.

Before enabling real submissions, verify all of these in a non-production environment:

- Unauthenticated users are redirected to `/login` for protected pages.
- BackOffice non-admin can see Operations but cannot manage users.
- Driver can see Driver pages but not Operations pages.
- Admin can create the two role types and the Driver mapping is unique and correct.
- Airtable filters records to the correct company and never crosses tenant boundaries.
- Make receives one binary `podFile`; repeating an idempotency key does not create a duplicate record.
- A valid sample under 4 MiB succeeds; unsupported type, invalid signature, and oversized files fail.
- `/pod-test` remains a UI-only simulation and is not used as evidence of live Make/Airtable connectivity.
- `PORTAL_BOOTSTRAP_SECRET` is removed after bootstrap; no server secret or PAT is exposed through a `NEXT_PUBLIC_` variable or committed file.
