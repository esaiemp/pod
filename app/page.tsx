import { redirect } from 'next/navigation'
import { getPortalAccess, getWorkspaceHome } from '@/lib/auth/access'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const access = await getPortalAccess()
  if (access.status === 'active') redirect(getWorkspaceHome(access.profile))
  if (access.status === 'disabled') redirect('/account-disabled')
  if (access.status === 'unprovisioned') redirect('/unauthorized?reason=provisioning')
  redirect('/login')
}
