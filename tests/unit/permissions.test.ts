import { describe, expect, it } from 'vitest'
import { canAccessWorkspace } from '@/lib/auth/permissions'

const driver = { role: 'Driver' as const, isAdmin: false }
const office = { role: 'BackOffice' as const, isAdmin: false }
const driverAdmin = { role: 'Driver' as const, isAdmin: true }

describe('workspace permissions', () => {
  it('keeps Driver and BackOffice workspaces separate by default', () => {
    expect(canAccessWorkspace(driver, 'Driver')).toBe(true)
    expect(canAccessWorkspace(driver, 'BackOffice')).toBe(false)
    expect(canAccessWorkspace(office, 'BackOffice')).toBe(true)
    expect(canAccessWorkspace(office, 'Driver')).toBe(false)
  })

  it('grants an administrator Operations access without changing the stored role', () => {
    expect(canAccessWorkspace(driverAdmin, 'BackOffice')).toBe(true)
    expect(canAccessWorkspace(driverAdmin, 'Driver')).toBe(true)
  })
})
