import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowRight, CircleAlert, FileCheck2, Files, LayoutDashboard, Truck, Users } from 'lucide-react'
import { AdminUserForm } from '@/components/admin/user-form'
import { UserDirectory } from '@/components/admin/user-directory'
import { BusinessDataPending } from '@/components/shared/business-data-pending'
import { IntegrationReadinessPanel } from '@/components/shared/integration-readiness'
import { PageHeading } from '@/components/shared/page-heading'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { requirePortalUser } from '@/lib/auth/access'
import { getIntegrationReadiness } from '@/lib/integrations/readiness'
import { createClient } from '@/lib/supabase/server'
import type { ManagedUser } from '@/lib/types'

const operationalSections: Record<string, { title: string; description: string; icon: typeof Truck }> = {
  loads: { title: 'All loads', description: 'Search and review delivery records for your company.', icon: Truck },
  'invoice-ready': { title: 'Invoice-ready', description: 'Review loads that are ready for invoicing.', icon: FileCheck2 },
  exceptions: { title: 'POD exceptions', description: 'Review and resolve exceptions using the existing synchronization workflow.', icon: CircleAlert },
  documents: { title: 'Documents', description: 'Browse POD files and supporting delivery documents.', icon: Files },
}

export default async function OperationsPage({ params }: { params: Promise<{ segments?: string[] }> }) {
  const { segments = [] } = await params
  const profile = await requirePortalUser('BackOffice')

  if (segments[0] === 'users') {
    if (!profile.isAdmin) redirect('/unauthorized')
    if (segments.length === 1) {
      const users = await loadManagedUsers(profile.companyId)
      return (
        <div className="flex flex-col gap-6">
          <PageHeading eyebrow="Administration" title="User management" description={`Manage workspace roles and access for ${profile.companyName}.`} />
          <UserDirectory users={users} />
        </div>
      )
    }
    if (segments.length === 2 && segments[1] === 'new') {
      return (
        <div className="flex flex-col gap-6">
          <PageHeading eyebrow="Administration" title="Add a user" description="Create a company-scoped portal account." />
          <AdminUserForm companyName={profile.companyName} />
        </div>
      )
    }
    if (segments.length === 2) {
      const user = await loadManagedUser(profile.companyId, segments[1])
      if (!user) notFound()
      return (
        <div className="flex flex-col gap-6">
          <PageHeading eyebrow="Administration" title={user.fullName} description="Update this user’s workspace access and legacy driver mapping." />
          <AdminUserForm user={user} companyName={profile.companyName} />
        </div>
      )
    }
    notFound()
  }

  if (segments.length > 1) notFound()
  if (segments.length === 1 && !operationalSections[segments[0]]) notFound()

  if (segments.length === 1) {
    const section = operationalSections[segments[0]]
    return <BusinessDataPending title={section.title} description={section.description} icon={section.icon} />
  }

  const readiness = getIntegrationReadiness()
  return (
    <div className="flex flex-col gap-7">
      <PageHeading eyebrow="Operations workspace" title="Operations overview" description={`A clear view of the ${profile.companyName} POD workflow.`} />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Loads" icon={Truck} /><SummaryCard title="Invoice-ready" icon={FileCheck2} /><SummaryCard title="Open exceptions" icon={CircleAlert} /><SummaryCard title="Documents" icon={Files} />
      </section>
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><CardTitle className="flex items-center gap-2"><LayoutDashboard aria-hidden="true" className="size-4 text-primary" /> Operations data</CardTitle><CardDescription className="mt-1">Live operational records are not shown until the Airtable fields and company-level filter are verified.</CardDescription></div>
          <Badge variant={readiness.airtable.ready ? 'secondary' : 'outline'}>{readiness.airtable.ready ? 'Airtable ready' : 'Awaiting Airtable mapping'}</Badge>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link href="/operations/loads" className={buttonVariants({ variant: 'outline' })}>View loads <ArrowRight data-icon="inline-end" aria-hidden="true" /></Link>
          <Link href="/operations/exceptions" className={buttonVariants({ variant: 'outline' })}>Review exceptions <ArrowRight data-icon="inline-end" aria-hidden="true" /></Link>
          {profile.isAdmin ? <Link href="/operations/users" className={buttonVariants({ variant: 'outline' })}><Users data-icon="inline-start" aria-hidden="true" /> Manage users</Link> : null}
        </CardContent>
      </Card>
      <IntegrationReadinessPanel readiness={readiness} audience="operations" />
      <Card>
        <CardHeader><CardTitle className="text-base">Existing workflow boundary</CardTitle><CardDescription>The portal is designed to work with your current Airtable and Make.com setup.</CardDescription></CardHeader>
        <CardContent className="text-sm leading-6 text-muted-foreground">POD intake and exception updates remain gated until the actual field mapping, tenant filter, webhook binary format, and duplicate handling are confirmed. No sample or fabricated business records are displayed.</CardContent>
      </Card>
    </div>
  )
}

function SummaryCard({ title, icon: Icon }: { title: string; icon: typeof Truck }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2"><div><CardDescription>{title}</CardDescription><CardTitle className="mt-2 text-xl text-muted-foreground">—</CardTitle></div><span className="grid size-9 place-items-center rounded-lg bg-secondary text-primary"><Icon aria-hidden="true" className="size-4" /></span></CardHeader>
      <CardContent><p className="text-xs text-muted-foreground">Waiting for verified Airtable data</p></CardContent>
    </Card>
  )
}

async function loadManagedUsers(companyId: string): Promise<ManagedUser[]> {
  const supabase = await createClient()
  const [{ data: profiles, error: profilesError }, { data: mappings, error: mappingsError }] = await Promise.all([
    supabase.from('user_profiles').select('user_id,email,full_name,role,is_admin,is_active,company_id,created_at,updated_at').eq('company_id', companyId).order('created_at', { ascending: false }).limit(200),
    supabase.from('user_identity_mappings').select('user_id,legacy_driver_user_id,legacy_driver_email').eq('company_id', companyId),
  ])
  if (profilesError || mappingsError) throw new Error('Unable to load company users.')
  const mappingByUser = new Map((mappings ?? []).map((mapping) => [mapping.user_id, mapping]))
  return (profiles ?? []).map((row) => {
    const mapping = mappingByUser.get(row.user_id)
    return {
      userId: row.user_id,
      email: row.email,
      fullName: row.full_name,
      role: row.role,
      isAdmin: row.is_admin,
      isActive: row.is_active,
      companyId: row.company_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      legacyDriverUserId: mapping?.legacy_driver_user_id ?? null,
      legacyDriverEmail: mapping?.legacy_driver_email ?? null,
    }
  })
}

async function loadManagedUser(companyId: string, userId: string): Promise<ManagedUser | null> {
  const supabase = await createClient()
  const [{ data: row, error: profileError }, { data: mapping, error: mappingError }] = await Promise.all([
    supabase.from('user_profiles').select('user_id,email,full_name,role,is_admin,is_active,company_id,created_at,updated_at').eq('company_id', companyId).eq('user_id', userId).maybeSingle(),
    supabase.from('user_identity_mappings').select('legacy_driver_user_id,legacy_driver_email').eq('company_id', companyId).eq('user_id', userId).maybeSingle(),
  ])
  if (profileError || mappingError) throw new Error('Unable to load the requested company user.')
  if (!row) return null
  return {
    userId: row.user_id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    isAdmin: row.is_admin,
    isActive: row.is_active,
    companyId: row.company_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    legacyDriverUserId: mapping?.legacy_driver_user_id ?? null,
    legacyDriverEmail: mapping?.legacy_driver_email ?? null,
  }
}
