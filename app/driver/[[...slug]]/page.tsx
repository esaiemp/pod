
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowRight,
  ClipboardCheck,
  FileUp,
  ShieldCheck,
} from 'lucide-react'

import { ProfileForm } from '@/components/auth/profile-form'
import { PodUploadForm } from '@/components/driver/pod-upload-form'
import { ExceptionResolutionButton } from '@/components/driver/exception-resolution-button'
import { BusinessDataPending } from '@/components/shared/business-data-pending'
import { PageHeading } from '@/components/shared/page-heading'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'

import { requirePortalUser } from '@/lib/auth/access'
import {
  getIntegrationReadiness,
  getPodUploadLimitBytes,
} from '@/lib/integrations/readiness'
import { listDriverSubmissions } from '@/lib/integrations/airtable'

export default async function DriverPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>
}) {
  const { slug = [] } = await params
  const profile = await requirePortalUser('Driver')

  // DRIVER DASHBOARD
  if (slug.length === 0) {
    return (
      <div className="flex flex-col gap-7">
        <PageHeading
          eyebrow="Driver workspace"
          title={`Welcome back, ${profile.fullName.split(' ')[0]}`}
          description="Submit delivery documents and follow their processing status."
        />

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
          <Card className="overflow-hidden border-0 bg-sidebar text-sidebar-foreground shadow-sm">
            <CardContent className="flex h-full min-h-64 flex-col justify-between gap-8 p-6 sm:p-8">
              <div className="max-w-xl">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
                  <ShieldCheck className="size-3.5 text-sidebar-primary" />
                  Secure document intake
                </span>

                <h2 className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">
                  Keep every delivery moving.
                </h2>

                <p className="mt-3 max-w-lg text-sm leading-6 text-white/70">
                  Upload a clear proof of delivery. Your document
                  will be routed through the existing processing
                  workflow when its connection is verified.
                </p>
              </div>

              <div>
                <Link
                  href="/driver/submit-pod"
                  className={buttonVariants({
                    className: 'w-full sm:w-auto',
                  })}
                >
                  <FileUp className="size-4" />
                  Submit a POD
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardCheck className="size-4 text-primary" />
                Submission checklist
              </CardTitle>
              <CardDescription>
                Simple checks reduce processing delays.
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col gap-4 text-sm">
              <Checklist text="Use a PDF, PNG, or JPEG file." />
              <Checklist text="Make sure delivery details and signatures are readable." />
              <Checklist text="Check My submissions before retrying an upload." />
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          <Link
            href="/driver/submit-pod"
            className="group rounded-2xl border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold">
                  Submit proof of delivery
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Upload a document for an existing delivery.
                </p>
              </div>

              <span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary">
                <FileUp className="size-5" />
              </span>
            </div>
          </Link>

          <Link
            href="/driver/submissions"
            className="group rounded-2xl border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold">My submissions</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Review your POD processing history.
                </p>
              </div>

              <span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary">
                <ClipboardCheck className="size-5" />
              </span>
            </div>
          </Link>
        </section>
      </div>
    )
  }

  // SUBMIT POD
  if (slug[0] === 'submit-pod' && slug.length === 1) {
    const readiness = getIntegrationReadiness()

    return (
      <div className="flex flex-col gap-6">
        <PodUploadForm
          airtableReady={readiness.airtable.ready}
          makeReady={readiness.make.podUploadReady}
          maxBytes={getPodUploadLimitBytes()}
          driverName={profile.fullName}
        />
      </div>
    )
  }

  // MY SUBMISSIONS
  if (slug[0] === 'submissions' && slug.length === 1) {
    const readiness = getIntegrationReadiness()

    if (!readiness.airtable.ready) {
      return (
        <BusinessDataPending
          title="My submissions"
          description="Airtable integration is not yet ready."
        />
      )
    }

    const submissions = await listDriverSubmissions(profile.email)

    const statusColors: Record<string, string> = {
      Completed: 'bg-green-100 text-green-800',
      Exception: 'bg-orange-100 text-orange-800',
      Processing: 'bg-yellow-100 text-yellow-800',
      Pending: 'bg-gray-100 text-gray-700',
      Received: 'bg-slate-100 text-slate-700',
    }

    return (
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>
              <strong>Submission History</strong>{' '}
              (Track your proof-of-delivery documents.)
            </CardTitle>

            <CardDescription>
              {submissions.length} submissions found
            </CardDescription>
          </CardHeader>

          <CardContent>
            {submissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No submissions found for your account.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="p-3">Reference</th>
                      <th className="p-3">Submission Date</th>
                      <th className="p-3">Submission Status</th>
                      <th className="p-3">Doc Link</th>
                      <th className="p-3">Link to Exception</th>
                    </tr>
                  </thead>

                  <tbody>
                    {submissions.map((record) => {
                      const fields = record.fields

                      const status = String(
                        fields['Submission Status'] ?? 'Unknown',
                      )

                      const dateValue = fields['Submission Date']

                      const parsedDate =
                        typeof dateValue === 'string' ||
                        typeof dateValue === 'number'
                          ? new Date(dateValue)
                          : null

                      const formattedDate =
                        parsedDate &&
                        !Number.isNaN(parsedDate.getTime())
                          ? new Intl.DateTimeFormat('en-CA', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              timeZone: 'America/Toronto',
                            }).format(parsedDate)
                          : '—'

                      const docLink = fields['Doc Link']

                      const exceptionLinks =
                        fields['Link To Exception']

                      const exceptionIds = Array.isArray(exceptionLinks)
                        ? exceptionLinks.filter(
                            (value): value is string =>
                              typeof value === 'string' &&
                              /^rec[A-Za-z0-9]+$/.test(value),
                          )
                        : []

                      return (
                        <tr key={record.id} className="border-b">
                          <td className="p-3 font-medium">
                            {String(
                              fields['Submission Reference'] ?? '—',
                            )}
                          </td>

                          <td className="p-3">
                            {formattedDate}
                          </td>

                          <td className="p-3">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                statusColors[status] ??
                                'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {status}
                            </span>
                          </td>

                          <td className="p-3">
                            {typeof docLink === 'string' &&
                            /^https:\/\/(drive\.google\.com|docs\.google\.com)\//.test(
                              docLink,
                            ) ? (
                              <a
                                href={docLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-teal-700 hover:underline"
                              >
                                View Document
                              </a>
                            ) : (
                              '—'
                            )}
                          </td>

                          <td className="p-3">
                            {exceptionIds.length > 0 ? (
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-800">
                                  Exception
                                </span>

                                {exceptionIds.map((exceptionId) => (
                                  <ExceptionResolutionButton
                                    key={exceptionId}
                                    exceptionId={exceptionId}
                                  />
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">
                                {Array.isArray(exceptionLinks) &&
                                exceptionLinks.length > 0
                                  ? 'Exception unavailable'
                                  : '—'}
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // SUBMISSION DETAILS
  if (slug[0] === 'submissions' && slug.length === 2) {
    return (
      <BusinessDataPending
        title="Submission details"
        description="This record is not queried until the verified Airtable fields and driver scoping are configured."
      />
    )
  }

  // PROFILE
  if (slug[0] === 'profile' && slug.length === 1) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeading
          eyebrow="Account"
          title="Profile settings"
          description="Manage the information associated with your portal account."
        />

        <ProfileForm
          fullName={profile.fullName}
          email={profile.email}
          role={profile.role}
          companyName={profile.companyName}
        />
      </div>
    )
  }

  notFound()
}

function Checklist({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span
        className="mt-0.5 size-2 rounded-full bg-primary"
        aria-hidden="true"
      />
      <p className="text-muted-foreground">{text}</p>
    </div>
  )
}
