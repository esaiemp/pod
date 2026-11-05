import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getApiPortalUser } from '@/lib/auth/access'
import { createAdminClient } from '@/lib/supabase/admin'

const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
}).strict()

export async function PATCH(request: Request) {
  const access = await getApiPortalUser()
  if ('response' in access) return access.response

  let input: z.infer<typeof profileSchema>
  try {
    input = profileSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('user_profiles')
    .update({ full_name: input.fullName, updated_at: new Date().toISOString() })
    .eq('user_id', access.profile.userId)
    .eq('company_id', access.profile.companyId)
    .select('user_id,full_name,email,role,is_admin,is_active,company_id')
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ error: 'profile_update_failed' }, { status: 400 })
  }

  return NextResponse.json({
    profile: {
      userId: data.user_id,
      fullName: data.full_name,
      email: data.email,
      role: data.role,
      isAdmin: data.is_admin,
      isActive: data.is_active,
      companyId: data.company_id,
    },
  })
}
