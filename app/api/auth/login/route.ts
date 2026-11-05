import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getWorkspaceHome } from '@/lib/auth/access'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const credentialsSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(256),
})

export async function POST(request: Request) {
  let parsed: z.infer<typeof credentialsSchema>
  try {
    parsed = credentialsSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.email.toLowerCase(),
    password: parsed.password,
  })

  if (error) {
    const code = (error as { code?: string }).code
    if (code === 'email_not_confirmed') {
      return NextResponse.json(
        { error: 'email_confirmation_required' },
        { status: 403 },
      )
    }
    if (error.status === 429 || code === 'over_request_rate_limit') {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
    }
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('user_id,email,full_name,role,is_admin,is_active,company_id')
    .eq('user_id', data.user.id)
    .maybeSingle()

  if (profileError) {
    await supabase.auth.signOut()
    return NextResponse.json({ error: 'account_unavailable' }, { status: 503 })
  }

  if (!profile) {
    await supabase.auth.signOut()
    return NextResponse.json({ error: 'account_not_provisioned' }, { status: 403 })
  }

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id,is_active')
    .eq('id', profile.company_id)
    .maybeSingle()

  if (companyError) {
    await supabase.auth.signOut()
    return NextResponse.json({ error: 'account_unavailable' }, { status: 503 })
  }

  if (!profile.is_active || !company?.is_active) {
    await supabase.auth.signOut()
    return NextResponse.json({ error: 'account_disabled' }, { status: 403 })
  }

  return NextResponse.json({
    redirectTo: getWorkspaceHome({
      role: profile.role as 'Driver' | 'BackOffice',
      isAdmin: profile.is_admin,
    }),
  })
}
