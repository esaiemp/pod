import { NextResponse, type NextRequest } from 'next/server'
import { getApiAdminUser } from '@/lib/auth/access'
import { writeAuditEvent } from '@/lib/auth/audit'
import { getRecoveryRedirectUrl, getTrustedAppOrigin } from '@/lib/auth/redirects'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const access = await getApiAdminUser()
  if ('response' in access) return access.response

  const { id } = await context.params
  let origin: string
  try {
    origin = getTrustedAppOrigin(request.nextUrl.origin)
  } catch {
    return NextResponse.json({ error: 'recovery_url_unavailable' }, { status: 503 })
  }

  const admin = createAdminClient()
  const { data: target, error: targetError } = await admin
    .from('user_profiles')
    .select('user_id,email,is_active')
    .eq('user_id', id)
    .eq('company_id', access.profile.companyId)
    .maybeSingle()

  if (targetError) return NextResponse.json({ error: 'user_unavailable' }, { status: 503 })
  if (!target) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (!target.is_active) return NextResponse.json({ error: 'account_disabled' }, { status: 409 })

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email: target.email,
    options: { redirectTo: getRecoveryRedirectUrl(origin) },
  })

  if (error || !data.properties?.action_link) {
    return NextResponse.json({ error: 'recovery_link_unavailable' }, { status: 503 })
  }

  await writeAuditEvent({
    actorUserId: access.profile.userId,
    companyId: access.profile.companyId,
    action: 'user.password_reset_link_created',
    entityType: 'user_profile',
    entityId: id,
  })

  return NextResponse.json({ resetLink: data.properties.action_link })
}
