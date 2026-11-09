'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Activity,
  ClipboardCheck,
  FolderOpen,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Settings2,
  ShieldCheck,
  Truck,
  Users,
  X,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet'
import { Brand } from '@/components/layout/brand'
import type { PortalUser, Workspace } from '@/lib/types'

const driverItems = [
  { href: '/driver', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/driver/submit-pod', label: 'Submit a POD', icon: ClipboardCheck },
  { href: '/driver/submissions', label: 'My submissions', icon: ListChecks },
  { href: '/driver/profile', label: 'My profile', icon: Settings2 },
]

const operationsItems = [
  {
    href: '/operations',
    label: 'Overview',
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: '/operations/loads',
    label: 'All loads',
    icon: Truck,
  },
  {
    href: '/operations/submissions',
    label: 'POD submissions',
    icon: ListChecks,
  },
  {
    href: '/operations/exceptions',
    label: 'POD exceptions',
    icon: Activity,
  },
]

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'DS'
}

function Navigation({
  workspace,
  profile,
  onNavigate,
}: {
  workspace: Workspace
  profile: PortalUser
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const items = workspace === 'Driver' ? driverItems : operationsItems

  return (
    <nav aria-label={`${workspace} navigation`} className="flex flex-col gap-1">
      {items.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${
              active
                ? 'bg-white/12 text-white ring-1 ring-white/10'
                : 'text-slate-300 hover:bg-white/8 hover:text-white'
            }`}
          >
            <Icon aria-hidden="true" className={`size-4 ${active ? 'text-teal-300' : 'text-slate-400 group-hover:text-teal-200'}`} />
            <span>{label}</span>
          </Link>
        )
      })}
      {workspace === 'Operations' && profile.isAdmin ? (
        <Link
          href="/operations/users"
          onClick={onNavigate}
          aria-current={pathname.startsWith('/operations/users') ? 'page' : undefined}
          className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${
            pathname.startsWith('/operations/users')
              ? 'bg-white/12 text-white ring-1 ring-white/10'
              : 'text-slate-300 hover:bg-white/8 hover:text-white'
          }`}
        >
          <Users aria-hidden="true" className="size-4 text-slate-400 group-hover:text-teal-200" />
          <span>User management</span>
        </Link>
      ) : null}
      {workspace === 'Driver' && profile.isAdmin ? (
        <Link
          href="/operations"
          onClick={onNavigate}
          className="group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/8 hover:text-white"
        >
          <ShieldCheck aria-hidden="true" className="size-4 text-slate-400 group-hover:text-teal-200" />
          <span>Operations workspace</span>
        </Link>
      ) : null}
    </nav>
  )
}

export function WorkspaceShell({
  workspace,
  profile,
  children,
}: {
  workspace: Workspace
  profile: PortalUser
  children: React.ReactNode
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [logoutError, setLogoutError] = useState(false)
  const router = useRouter()
  const workspaceLabel = workspace === 'Driver' ? 'Driver workspace' : 'Operations workspace'

  async function signOut() {
    setSigningOut(true)
    setLogoutError(false)
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' })
      if (!response.ok) throw new Error('Sign out failed')
      router.replace('/login')
      router.refresh()
    } catch {
      setLogoutError(true)
      setSigningOut(false)
    }
  }

  const sidebarContent = (onNavigate?: () => void) => (
    <div className="flex h-full flex-col">
      <div className="px-5 py-6"><Brand inverted /></div>
      <div className="px-3 pb-3">
        <p className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Workspace</p>
        <Navigation workspace={workspace} profile={profile} onNavigate={onNavigate} />
      </div>
      <div className="mt-auto px-4 pb-5">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <span className="size-2 rounded-full bg-teal-300" aria-hidden="true" />
            Secure workspace
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-300">Your access is managed by {profile.companyName}.</p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-sidebar text-sidebar-foreground lg:flex">
        {sidebarContent()}
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-border/80 bg-background/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label="Open navigation menu"
                onClick={() => setMobileOpen(true)}
              >
                <Menu aria-hidden="true" />
              </Button>
              <div className="lg:hidden"><Brand /></div>
              <div className="hidden lg:block">
                <p className="text-xs font-medium text-muted-foreground">{profile.companyName}</p>
                <p className="text-sm font-semibold text-foreground">{workspaceLabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold leading-5">{profile.fullName}</p>
                <p className="text-xs text-muted-foreground">{profile.isAdmin ? 'Administrator' : profile.role}</p>
              </div>
              <Avatar className="size-9 border border-border">
                <AvatarFallback className="bg-secondary text-xs font-semibold text-secondary-foreground">
                  {initials(profile.fullName)}
                </AvatarFallback>
              </Avatar>
              <Button variant="outline" size="sm" onClick={signOut} disabled={signingOut}>
                {signingOut ? <span className="sr-only">Signing out</span> : null}
                <LogOut data-icon="inline-start" aria-hidden="true" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </div>
          </div>
        </header>

        {logoutError ? (
          <div className="px-4 pt-3 sm:px-6 lg:px-8" role="alert">
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">Could not sign out. Please try again.</p>
          </div>
        ) : null}

        <main className="mx-auto w-full max-w-[1480px] px-4 py-7 sm:px-6 sm:py-9 lg:px-8">{children}</main>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[min(88vw,300px)] border-0 bg-sidebar p-0 text-sidebar-foreground">
          <SheetTitle className="sr-only">Workspace navigation</SheetTitle>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-3 top-4 text-white hover:bg-white/10 hover:text-white"
            aria-label="Close navigation menu"
            onClick={() => setMobileOpen(false)}
          >
            <X aria-hidden="true" />
          </Button>
          {sidebarContent(() => setMobileOpen(false))}
        </SheetContent>
      </Sheet>
    </div>
  )
}
