import type { LucideIcon } from 'lucide-react'
import { Database, ShieldAlert } from 'lucide-react'
import { PageHeading } from '@/components/shared/page-heading'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'

export function BusinessDataPending({ title, description, icon: Icon = Database }: { title: string; description: string; icon?: LucideIcon }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeading eyebrow="Operations" title={title} description={description} />
      <Alert>
        <ShieldAlert aria-hidden="true" />
        <AlertTitle>Business data is intentionally paused</AlertTitle>
        <AlertDescription>The Airtable credentials, exact field map, and company-level record filter have not been verified. This page will not issue an unscoped query or show placeholder records.</AlertDescription>
      </Alert>
      <Card>
        <CardContent className="p-4 sm:p-8">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><Icon aria-hidden="true" /></EmptyMedia>
              <EmptyTitle>No live records loaded</EmptyTitle>
              <EmptyDescription>Upload the Airtable schema and company mapping when ready; this view can then be connected without replacing the existing workflow.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    </div>
  )
}
