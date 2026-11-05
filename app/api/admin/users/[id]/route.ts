import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { getApiAdminUser } from '@/lib/auth/access'
import { writeAuditEvent } from '@/lib/auth/audit'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const updateUserSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  role: z.enum(['Driver', 'BackOffice']).optional(),
  isAdmin: z.boolean().optional(),
  isActive: z.boolean().optional(),
  legacyDriverUserId: z.string().trim().min(1).max(128).nullable().optional(),
  legacyDriverEmail: z.string().trim().email().max(254).nullable().optional(),
}).strict().refine((input) => Object.keys(input).length > 0)

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const access = await getApiAdminUser()
  if ('response' in access) return access.response

  const { id } = await context.params
  let input: z.infer<typeof updateUserSchema>
  try {
    input = updateUserSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  if (
    id === access.profile.userId &&
    (input.isActive === false || input.isAdmin === false)
  ) {
    return NextResponse.json({ error: 'self_lockout_prevented' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: target, error: targetError } = await admin
    .from('user_profiles')
    .select('user_id,company_id,role,is_admin,is_active')
    .eq('user_id', id)
    .eq('company_id', access.profile.companyId)
    .maybeSingle()

  if (targetError) return NextResponse.json({ error: 'user_unavailable' }, { status: 503 })
  if (!target) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  if (input.legacyDriverUserId !== undefined || input.legacyDriverEmail !== undefined) {
    const legacyDriverUserId = input.legacyDriverUserId ?? null
    const legacyDriverEmail = input.legacyDriverEmail?.toLowerCase() ?? null

    if (legacyDriverUserId) {
      const { error: mappingError } = await admin.from('user_identity_mappings').upsert(
        {
          user_id: id,
          company_id: access.profile.companyId,
          legacy_driver_user_id: legacyDriverUserId,
          legacy_driver_email: legacyDriverEmail,
        },
        { onConflict: 'user_id' },
      )
      if (mappingError) {
        const status = mappingError.code === '23505' ? 409 : 400
        return NextResponse.json({ error: 'driver_mapping_conflict' }, { status })
      }
    } else {
      const { error: mappingError } = await admin
        .from('user_identity_mappings')
        .delete()
        .eq('user_id', id)
        .eq('company_id', access.profile.companyId)
      if (mappingError) {
        return NextResponse.json({ error: 'driver_mapping_update_failed' }, { status: 400 })
      }
    }
  }

  const updates: Record<string, string | boolean> = {
    updated_at: new Date().toISOString(),
  }
  if (input.fullName !== undefined) updates.full_name = input.fullName
  if (input.role !== undefined) updates.role = input.role
  if (input.isAdmin !== undefined) updates.is_admin = input.isAdmin
  if (input.isActive !== undefined) updates.is_active = input.isActive

  const { data: updated, error: updateError } = await admin
    .from('user_profiles')
    .update(updates)
    .eq('user_id', id)
    .eq('company_id', access.profile.companyId)
    .select('user_id,email,full_name,role,is_admin,is_active,company_id,created_at,updated_at')
    .maybeSingle()

  if (updateError || !updated) {
    return NextResponse.json({ error: 'user_update_failed' }, { status: 400 })
  }

  await writeAuditEvent({
    actorUserId: access.profile.userId,
    companyId: access.profile.companyId,
    action: 'user.update',
    entityType: 'user_profile',
    entityId: id,
    metadata: {
      roleChanged: input.role !== undefined,
      activeChanged: input.isActive !== undefined,
      adminChanged: input.isAdmin !== undefined,
      mappingChanged:
        input.legacyDriverUserId !== undefined || input.legacyDriverEmail !== undefined,
    },
  })

  return NextResponse.json({
    user: {
      userId: updated.user_id,
      email: updated.email,
      fullName: updated.full_name,
      role: updated.role,
      isAdmin: updated.is_admin,
      isActive: updated.is_active,
      companyId: updated.company_id,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    },
  })
}
