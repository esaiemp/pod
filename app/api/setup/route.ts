import { randomBytes } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { isBootstrapRateLimited, matchesBootstrapSecret, clearBootstrapRateLimits } from '@/lib/auth/bootstrap-security'
import { getRecoveryRedirectUrl, getTrustedAppOrigin } from '@/lib/auth/redirects'
import { writeAuditEvent } from '@/lib/auth/audit'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const bootstrapSchema = z.object({
  bootstrapSecret: z.string().min(1).max(512),
  companyName: z.string().trim().min(2).max(120),
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
})

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  if (isBootstrapRateLimited(request)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  const configuredSecret = process.env.PORTAL_BOOTSTRAP_SECRET
  if (!configuredSecret) {
    return NextResponse.json({ error: 'bootstrap_not_configured' }, { status: 503 })
  }

  let input: z.infer<typeof bootstrapSchema>
  try {
    input = bootstrapSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  if (!matchesBootstrapSecret(input.bootstrapSecret, configuredSecret)) {
    return NextResponse.json({ error: 'invalid_bootstrap_secret' }, { status: 403 })
  }

  let origin: string
  try {
    origin = getTrustedAppOrigin(request.nextUrl.origin)
  } catch {
    return NextResponse.json({ error: 'recovery_redirect_not_configured' }, { status: 503 })
  }
  const admin = createAdminClient()
  const { count, error: countError } = await admin
    .from('user_profiles')
    .select('user_id', { count: 'exact', head: true })

  if (countError) {
    return NextResponse.json({ error: 'bootstrap_unavailable' }, { status: 503 })
  }
  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: 'bootstrap_already_complete' }, { status: 409 })
  }

  const email = input.email.toLowerCase()
  const temporaryPassword = randomBytes(32).toString('base64url')
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
  })

  if (createError || !created.user) {
    return NextResponse.json({ error: 'bootstrap_unavailable' }, { status: 400 })
  }

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: getRecoveryRedirectUrl(origin) },
  })

  if (linkError || !linkData.properties?.action_link) {
    await admin.auth.admin.deleteUser(created.user.id)
    return NextResponse.json({ error: 'bootstrap_unavailable' }, { status: 503 })
  }

  const { data: companyId, error: bootstrapError } = await admin.rpc(
    'bootstrap_first_admin',
    {
      p_user_id: created.user.id,
      p_email: email,
      p_full_name: input.fullName,
      p_company_name: input.companyName,
    },
  )

  if (bootstrapError || !companyId) {
    await admin.auth.admin.deleteUser(created.user.id)
    return NextResponse.json(
      {
        error:
          bootstrapError?.code === '23505'
            ? 'bootstrap_already_complete'
            : 'bootstrap_unavailable',
      },
      { status: bootstrapError?.code === '23505' ? 409 : 503 },
    )
  }

  await writeAuditEvent({
    actorUserId: created.user.id,
    companyId,
    action: 'portal.bootstrap',
    entityType: 'user_profile',
    entityId: created.user.id,
    metadata: { role: 'BackOffice', isAdmin: true },
  })

  clearBootstrapRateLimits()
  return NextResponse.json({
    ok: true,
    resetLink: linkData.properties.action_link,
  })
}
