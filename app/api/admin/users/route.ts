import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { getApiAdminUser } from '@/lib/auth/access'
import { writeAuditEvent } from '@/lib/auth/audit'
import { getRecoveryRedirectUrl, getTrustedAppOrigin } from '@/lib/auth/redirects'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const createUserSchema = z.object({
  email: z.string().trim().email().max(254),
  fullName: z.string().trim().min(2).max(120),
  role: z.enum(['Driver', 'BackOffice']),
  isAdmin: z.boolean().default(false),
  legacyDriverUserId: z.string().trim().min(1).max(128).optional(),
  legacyDriverEmail: z.string().trim().email().max(254).optional(),
}).strict()

export async function GET() {
  const access = await getApiAdminUser()
  if ('response' in access) return access.response

  const { data, error } = await access.supabase
    .from('user_profiles')
    .select('user_id,email,full_name,role,is_admin,is_active,company_id,created_at,updated_at')
    .eq('company_id', access.profile.companyId)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: 'users_unavailable' }, { status: 503 })

  const userIds = (data ?? []).map((user) => user.user_id)
  const { data: mappings, error: mappingError } = userIds.length
    ? await access.supabase
        .from('user_identity_mappings')
        .select('user_id,legacy_driver_user_id,legacy_driver_email')
        .eq('company_id', access.profile.companyId)
        .in('user_id', userIds)
    : { data: [], error: null }

  if (mappingError) return NextResponse.json({ error: 'users_unavailable' }, { status: 503 })

  const mappingByUserId = new Map((mappings ?? []).map((mapping) => [mapping.user_id, mapping]))

  return NextResponse.json({
    users: (data ?? []).map((user) => {
      const mapping = mappingByUserId.get(user.user_id)
      return {
        userId: user.user_id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        isAdmin: user.is_admin,
        isActive: user.is_active,
        companyId: user.company_id,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        legacyDriverUserId: mapping?.legacy_driver_user_id ?? null,
        legacyDriverEmail: mapping?.legacy_driver_email ?? null,
      }
    }),
  })
}

export async function POST(request: NextRequest) {
  const access = await getApiAdminUser()
  if ('response' in access) return access.response

  let input: z.infer<typeof createUserSchema>
  try {
    input = createUserSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  if (input.isAdmin && access.profile.role !== 'BackOffice' && !access.profile.isAdmin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  let origin: string
  try {
    origin = getTrustedAppOrigin(request.nextUrl.origin)
  } catch {
    return NextResponse.json({ error: 'recovery_url_unavailable' }, { status: 503 })
  }

  const admin = createAdminClient()
  const email = input.email.toLowerCase()
  const temporaryPassword = crypto.randomUUID() + crypto.randomUUID()
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
  })

  if (createError || !created.user) {
    const status = createError?.code === 'email_exists' ? 409 : 400
    return NextResponse.json({ error: 'user_creation_failed' }, { status })
  }

  const userId = created.user.id
  const { error: profileError } = await admin.from('user_profiles').insert({
    user_id: userId,
    email,
    full_name: input.fullName,
    role: input.role,
    is_admin: input.isAdmin,
    company_id: access.profile.companyId,
  })

  if (profileError) {
    await admin.auth.admin.deleteUser(userId)
    const status = profileError.code === '23505' ? 409 : 400
    return NextResponse.json({ error: 'user_creation_failed' }, { status })
  }

  if (input.role === 'Driver' && input.legacyDriverUserId) {
    const { error: mappingError } = await admin.from('user_identity_mappings').insert({
      user_id: userId,
      company_id: access.profile.companyId,
      legacy_driver_user_id: input.legacyDriverUserId,
      legacy_driver_email: input.legacyDriverEmail?.toLowerCase() ?? null,
    })

    if (mappingError) {
      await admin.auth.admin.deleteUser(userId)
      const status = mappingError.code === '23505' ? 409 : 400
      return NextResponse.json({ error: 'driver_mapping_conflict' }, { status })
    }
  }

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: getRecoveryRedirectUrl(origin) },
  })

  if (linkError || !linkData.properties?.action_link) {
    await admin.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: 'recovery_link_unavailable' }, { status: 503 })
  }

  await writeAuditEvent({
    actorUserId: access.profile.userId,
    companyId: access.profile.companyId,
    action: 'user.create',
    entityType: 'user_profile',
    entityId: userId,
    metadata: { role: input.role, isAdmin: input.isAdmin },
  })

  return NextResponse.json(
    {
      user: {
        userId,
        email,
        fullName: input.fullName,
        role: input.role,
        isAdmin: input.isAdmin,
        isActive: true,
        companyId: access.profile.companyId,
        legacyDriverUserId: input.legacyDriverUserId ?? null,
        legacyDriverEmail: input.legacyDriverEmail?.toLowerCase() ?? null,
      },
      resetLink: linkData.properties.action_link,
    },
    { status: 201 },
  )
}
