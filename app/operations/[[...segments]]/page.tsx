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
import { getOperationsOverview } from '@/lib/operations/overview'
import { OverviewDashboard } from '@/components/operations/overview-dashboard'
import { ExceptionsDashboard } from '@/components/operations/exceptions-dashboard'
import { getPodExceptions } from '@/lib/operations/exception'

const operationalSections: Record<string, { title: string; description: string; icon: typeof Truck }> = {
  loads: { title: 'All loads', description: 'Search and review delivery records for your company.', icon: Truck },
  'invoice-ready': { title: 'Invoice-ready', description: 'Review loads that are ready for invoicing.', icon: FileCheck2 },
  exceptions: { title: 'POD exceptions', description: 'Review and resolve exceptions using the existing synchronization workflow.', icon: CircleAlert },
  documents: { title: 'Documents', description: 'Browse POD files and supporting delivery documents.', icon: Files },
}

export default async function OperationsPage({
  params,
}: {
  params: Promise<{ segments?: string[] }>
}) {
  const { segments = [] } = await params
  const profile = await requirePortalUser('BackOffice')

  // 1. POD Exceptions
  if (segments.length === 1 && segments[0] === 'exceptions') {
    const exceptions = await getPodExceptions()

    return <ExceptionsDashboard exceptions={exceptions} />
  }

  // 2. User management (Admin only)
  if (segments[0] === 'users') {
    if (!profile.isAdmin) redirect('/unauthorized')

    if (segments.length === 1) {
      const users = await loadManagedUsers(profile.companyId)

      return (
        <div className="flex flex-col gap-6">
          <PageHeading
            eyebrow="Administration"
            title="User management"
            description={`Manage workspace roles and access for ${profile.companyName}.`}
          />
          <UserDirectory users={users} />
        </div>
      )
    }

    if (segments.length === 2 && segments[1] === 'new') {
      return (
        <div className="flex flex-col gap-6">
          <PageHeading
            eyebrow="Administration"
            title="Add a user"
            description="Create a company-scoped portal account."
          />
          <AdminUserForm companyName={profile.companyName} />
        </div>
      )
    }

    if (segments.length === 2) {
      const user = await loadManagedUser(
        profile.companyId,
        segments[1]
      )

      if (!user) notFound()

      return (
        <div className="flex flex-col gap-6">
          <PageHeading
            eyebrow="Administration"
            title={user.fullName}
            description="Update this user's workspace access."
          />
          <AdminUserForm
            user={user}
            companyName={profile.companyName}
          />
        </div>
      )
    }

    notFound()
  }

  // 3. Other operational sections
  if (segments.length > 1) notFound()

  if (segments.length === 1) {
    const section = operationalSections[segments[0]]

    if (!section) notFound()

    return (
      <BusinessDataPending
        title={section.title}
        description={section.description}
        icon={section.icon}
      />
    )
  }

  // 4. Operations overview
  const overview = await getOperationsOverview()

  return (
    <OverviewDashboard
      totalSubmissions={overview.totalSubmissions}
      invoiceReady={overview.invoiceReady}
      openExceptions={overview.openExceptions}
      pendingProcessing={overview.pendingProcessing}
      recentSubmissions={overview.recentSubmissions}
      recentExceptions={overview.recentExceptions}
    />
  )
}

function SummaryCard({
  title,
  value,
  icon: Icon,
}: {
  title: string
  value: number
  icon: typeof Truck
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
        <div>
          <CardDescription>{title}</CardDescription>
          <CardTitle className="mt-2 text-2xl">
            {value.toLocaleString()}
          </CardTitle>
        </div>
        <span className="grid size-9 place-items-center rounded-lg bg-secondary text-primary">
          <Icon aria-hidden="true" className="size-4" />
        </span>
      </CardHeader>
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
