export const workspaceRoles = ['Driver', 'BackOffice'] as const

export type WorkspaceRole = (typeof workspaceRoles)[number]
export type Workspace = 'Driver' | 'Operations'

export interface PortalUser {
  userId: string
  email: string
  fullName: string
  role: WorkspaceRole
  isAdmin: boolean
  isActive: boolean
  companyId: string
  companyName: string
}

export interface ManagedUser extends Omit<PortalUser, 'companyName'> {
  createdAt: string
  updatedAt: string
  legacyDriverUserId: string | null
  legacyDriverEmail: string | null
}
