import 'server-only'

import { NextResponse } from 'next/server'
import { redirect } from 'next/navigation'
import { canAccessWorkspace } from '@/lib/auth/permissions'
import { createClient } from '@/lib/supabase/server'
import type { PortalUser, WorkspaceRole } from '@/lib/types'

const profileColumns =
  'user_id,email,full_name,role,is_admin,is_active,company_id'

export type PortalAccess =
  | { status: 'anonymous' }
  | { status: 'unprovisioned' }
  | { status: 'disabled'; profile: PortalUser | null }
  | { status: 'active'; profile: PortalUser }

type ResolvedAccess = PortalAccess & {
  supabase: Awaited<ReturnType<typeof createClient>>
}

async function resolvePortalAccess(): Promise<ResolvedAccess> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError && authError.status !== 401 && authError.name !== 'AuthSessionMissingError') {
    throw new Error('Unable to verify the current Supabase session.')
  }

  if (!user) return { status: 'anonymous', supabase }

  const { data: row, error: profileError } = await supabase
    .from('user_profiles')
    .select(profileColumns)
    .eq('user_id', user.id)
    .maybeSingle()

  if (profileError) throw new Error('Unable to load the current user profile.')
  if (!row) return { status: 'unprovisioned', supabase }

  const profileBase = {
    userId: row.user_id,
    email: row.email,
    fullName: row.full_name,
    role: row.role as PortalUser['role'],
    isAdmin: row.is_admin,
    isActive: row.is_active,
    companyId: row.company_id,
    companyName: '',
  }

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id,name,is_active')
    .eq('id', row.company_id)
    .maybeSingle()

  if (companyError) throw new Error('Unable to load the current company.')
  if (!row.is_active || !company?.is_active) {
    return { status: 'disabled', profile: profileBase, supabase }
  }

  return {
    status: 'active',
    profile: { ...profileBase, companyName: company.name },
    supabase,
  }
}

export async function getPortalAccess(): Promise<PortalAccess> {
  const { supabase: _supabase, ...access } = await resolvePortalAccess()
  return access
}

export async function requirePortalUser(workspace?: WorkspaceRole) {
  const access = await getPortalAccess()

  if (access.status === 'anonymous') redirect('/login')
  if (access.status === 'unprovisioned') redirect('/unauthorized?reason=provisioning')
  if (access.status === 'disabled') redirect('/account-disabled')
  if (workspace && !canAccessWorkspace(access.profile, workspace)) {
    redirect('/unauthorized')
  }

  return access.profile
}

export async function requireAdminUser() {
  const profile = await requirePortalUser('BackOffice')
  if (!profile.isAdmin) redirect('/unauthorized')
  return profile
}

export async function getApiPortalUser(workspace?: WorkspaceRole) {
  const access = await resolvePortalAccess()

  if (access.status === 'anonymous') {
    return {
      response: NextResponse.json({ error: 'authentication_required' }, { status: 401 }),
    } as const
  }

  if (access.status === 'unprovisioned') {
    return {
      response: NextResponse.json({ error: 'account_not_provisioned' }, { status: 403 }),
    } as const
  }

  if (access.status === 'disabled') {
    return {
      response: NextResponse.json({ error: 'account_disabled' }, { status: 403 }),
    } as const
  }

  if (workspace && !canAccessWorkspace(access.profile, workspace)) {
    return { response: NextResponse.json({ error: 'forbidden' }, { status: 403 }) } as const
  }

  return { profile: access.profile, supabase: access.supabase } as const
}

export async function getApiAdminUser() {
  const result = await getApiPortalUser('BackOffice')
  if ('response' in result) return result
  if (!result.profile.isAdmin) {
    return { response: NextResponse.json({ error: 'forbidden' }, { status: 403 }) } as const
  }
  return result
}

export function getWorkspaceHome(profile: Pick<PortalUser, 'role' | 'isAdmin'>) {
  return profile.role === 'BackOffice' || profile.isAdmin ? '/operations' : '/driver'
}
