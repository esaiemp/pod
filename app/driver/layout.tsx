import type { ReactNode } from 'react'
import { WorkspaceShell } from '@/components/layout/workspace-shell'
import { requirePortalUser } from '@/lib/auth/access'

export default async function DriverLayout({ children }: Readonly<{ children: ReactNode }>) {
  const profile = await requirePortalUser('Driver')
  return <WorkspaceShell profile={profile} workspace="Driver">{children}</WorkspaceShell>
}
