import { ProfileForm } from '@/components/auth/profile-form'
import { PageHeading } from '@/components/shared/page-heading'
import { requirePortalUser } from '@/lib/auth/access'

export default async function OperationsProfilePage() {
  const profile = await requirePortalUser('BackOffice')
  return (
    <div className="flex flex-col gap-6">
      <PageHeading eyebrow="Account" title="Profile settings" description="Manage the information associated with your portal account." />
      <ProfileForm fullName={profile.fullName} email={profile.email} role={profile.role} companyName={profile.companyName} />
    </div>
  )
}
