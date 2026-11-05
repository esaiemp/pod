import type { ReactNode } from 'react'
import { WorkspaceShell } from '@/components/layout/workspace-shell'
import { requirePortalUser } from '@/lib/auth/access'

export default async function OperationsLayout({ children }: Readonly<{ children: ReactNode }>) {
  const profile = await requirePortalUser('BackOffice')
  return <WorkspaceShell profile={profile} workspace="Operations">{children}</WorkspaceShell>
}
