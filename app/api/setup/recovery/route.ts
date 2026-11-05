import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { isBootstrapRateLimited, matchesBootstrapSecret } from '@/lib/auth/bootstrap-security'
import { writeAuditEvent } from '@/lib/auth/audit'
import { getRecoveryRedirectUrl, getTrustedAppOrigin } from '@/lib/auth/redirects'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const recoverySchema = z.object({
  bootstrapSecret: z.string().min(1).max(512),
  email: z.string().trim().email().max(254),
}).strict()

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  if (isBootstrapRateLimited(request)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  const configuredSecret = process.env.PORTAL_BOOTSTRAP_SECRET
  if (!configuredSecret) {
    return NextResponse.json({ error: 'recovery_not_configured' }, { status: 503 })
  }

  let input: z.infer<typeof recoverySchema>
  try {
    input = recoverySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  if (!matchesBootstrapSecret(input.bootstrapSecret, configuredSecret)) {
    return NextResponse.json({ error: 'recovery_unavailable' }, { status: 403 })
  }

  let origin: string
  try {
    origin = getTrustedAppOrigin(request.nextUrl.origin)
  } catch {
    return NextResponse.json({ error: 'recovery_not_configured' }, { status: 503 })
  }

  const admin = createAdminClient()
  const { count, error: countError } = await admin
    .from('user_profiles')
    .select('user_id', { count: 'exact', head: true })

  if (countError) {
    return NextResponse.json({ error: 'recovery_unavailable' }, { status: 503 })
  }
  if (count !== 1) {
    return NextResponse.json({ error: 'recovery_unavailable' }, { status: 409 })
  }

  const email = input.email.toLowerCase()
  const { data: profile, error: profileError } = await admin
    .from('user_profiles')
    .select('user_id,email,role,is_admin,is_active,company_id')
    .eq('email', email)
    .eq('role', 'BackOffice')
    .eq('is_admin', true)
    .eq('is_active', true)
    .maybeSingle()

  if (profileError) {
    return NextResponse.json({ error: 'recovery_unavailable' }, { status: 503 })
  }
  if (!profile) {
    return NextResponse.json({ error: 'recovery_unavailable' }, { status: 404 })
  }

  const redirectTo = getRecoveryRedirectUrl(origin)
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email: profile.email,
    options: { redirectTo },
  })

  if (error || !data.properties?.action_link) {
    return NextResponse.json({ error: 'recovery_unavailable' }, { status: 503 })
  }
  if (data.properties.redirect_to !== redirectTo) {
    const formatRedirect = (value: string) => {
      try {
        const url = new URL(value)
        const next = url.searchParams.get('next')
        return `${url.origin}${url.pathname}${next ? `?next=${encodeURIComponent(next)}` : ''}`
      } catch {
        return 'invalid URL'
      }
    }

    return NextResponse.json(
      {
        error: 'recovery_redirect_mismatch',
        expectedRedirect: formatRedirect(redirectTo),
        returnedRedirect: formatRedirect(data.properties.redirect_to ?? ''),
      },
      { status: 503 },
    )
  }

  await writeAuditEvent({
    actorUserId: profile.user_id,
    companyId: profile.company_id,
    action: 'portal.bootstrap_recovery_link_created',
    entityType: 'user_profile',
    entityId: profile.user_id,
  })

  return NextResponse.json({ ok: true, resetLink: data.properties.action_link })
}
