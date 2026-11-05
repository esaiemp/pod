import type { PortalUser, WorkspaceRole } from '@/lib/types'

export function canAccessWorkspace(profile: Pick<PortalUser, 'role' | 'isAdmin'>, workspace: WorkspaceRole) {
  if (workspace === 'Driver') return profile.role === 'Driver'
  return profile.role === 'BackOffice' || profile.isAdmin
}
