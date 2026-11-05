import { AlertCircle, CheckCircle2, Database, Workflow } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { getIntegrationReadiness } from '@/lib/integrations/readiness'

type Readiness = ReturnType<typeof getIntegrationReadiness>

function ReadinessBadge({ ready, pending = 'Pending' }: { ready: boolean; pending?: string }) {
  return (
    <Badge variant={ready ? 'secondary' : 'outline'} className={ready ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'text-muted-foreground'}>
      {ready ? 'Ready' : pending}
    </Badge>
  )
}

export function IntegrationReadinessPanel({ readiness, audience = 'operations' }: { readiness: Readiness; audience?: 'driver' | 'operations'; }) {
  const allReady = readiness.airtable.ready && readiness.make.podUploadReady && (audience !== 'driver')

  return (
    <div className="flex flex-col gap-5">
      {!allReady ? (
        <Alert>
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Live workflows are safely gated</AlertTitle>
          <AlertDescription>
            {audience === 'driver'
              ? 'A driver identity mapping is required before a POD can be submitted. The supplied examples confirm the driver fields and binary file shape; Make multipart intake, duplicate-safe retries, and Airtable company scoping still need verification.'
              : 'The supplied examples confirm the driver fields and binary file shape. Airtable company scoping and Make multipart intake and duplicate-safe retries still need verification before any files or records are sent.'}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><Database aria-hidden="true" className="size-5" /></span>
              <div>
                <CardTitle>Airtable</CardTitle>
                <CardDescription className="mt-1">Operational records and company-scoped views</CardDescription>
              </div>
            </div>
            <ReadinessBadge ready={readiness.airtable.ready} />
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <ReadinessRow label="API credentials" ready={readiness.airtable.credentialsConfigured} />
            <ReadinessRow label="Field mapping" ready={readiness.airtable.fieldMapConfigured && readiness.airtable.schemaVerified} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><Workflow aria-hidden="true" className="size-5" /></span>
              <div>
                <CardTitle>Make</CardTitle>
                <CardDescription className="mt-1">Sample fields confirmed; multipart receipt and idempotency still pending</CardDescription>
              </div>
            </div>
            <ReadinessBadge ready={readiness.make.podUploadReady} />
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <ReadinessRow label="Webhook URL" ready={readiness.make.urlConfigured} />
            <ReadinessRow label="Multipart contract" ready={readiness.make.multipartModeConfigured && readiness.make.contractVerified} />
            <ReadinessRow label="Retry deduplication" ready={readiness.make.idempotencyVerified} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ReadinessRow({ label, ready }: { label: string; ready: boolean }) {
  const Icon = ready ? CheckCircle2 : AlertCircle
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="inline-flex items-center gap-1.5 text-xs font-medium">
        <Icon aria-hidden="true" className={`size-3.5 ${ready ? 'text-emerald-700' : 'text-muted-foreground'}`} />
        {ready ? 'Verified' : 'Pending'}
      </span>
    </div>
  )
}
