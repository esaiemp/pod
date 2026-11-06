
import Link from 'next/link'
import {
  ArrowRight,
  CircleAlert,
  Clock3,
  FileCheck2,
  Files,
} from 'lucide-react'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

import type {
  RecentPodSubmission,
  RecentPodException,
} from '@/lib/operations/overview'

type DashboardProps = {
  totalSubmissions: number
  invoiceReady: number
  openExceptions: number
  pendingProcessing: number
  recentSubmissions: RecentPodSubmission[]
  recentExceptions: RecentPodException[]
}

function formatDate(value: string | null) {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase()

  const className =
    normalized.includes('exception') ||
    normalized.includes('failed')
      ? 'bg-red-50 text-red-700 border-red-200'
      : normalized.includes('completed') ||
          normalized.includes('ready') ||
          normalized.includes('received')
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-amber-50 text-amber-700 border-amber-200'

  return (
    <Badge variant="outline" className={className}>
      {status}
    </Badge>
  )
}

export function OverviewDashboard({
  totalSubmissions,
  invoiceReady,
  openExceptions,
  pendingProcessing,
  recentSubmissions,
  recentExceptions,
}: DashboardProps) {
  const metrics = [
    {
      label: 'Total POD submissions',
      value: totalSubmissions,
      icon: Files,
      href: '/operations/documents',
    },
    {
      label: 'Invoice-ready',
      value: invoiceReady,
      icon: FileCheck2,
      href: '/operations/invoice-ready',
    },
    {
      label: 'Open exceptions',
      value: openExceptions,
      icon: CircleAlert,
      href: '/operations/exceptions',
    },
    {
      label: 'Pending / Processing',
      value: pendingProcessing,
      icon: Clock3,
      href: '/operations/documents',
    },
  ]

  return (
    <div className="flex flex-col gap-7">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon, href }) => (
          <Link key={label} href={href} className="block">
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardContent className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {label}
                  </p>
                  <p className="mt-3 text-3xl font-semibold tabular-nums">
                    {value.toLocaleString()}
                  </p>
                </div>
                <span className="rounded-xl bg-primary/10 p-3 text-primary">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Recent POD submissions</CardTitle>
          <Link
            href="/operations/documents"
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            View all <ArrowRight className="size-4" />
          </Link>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-3 py-3 font-medium">Reference</th>
                  <th className="px-3 py-3 font-medium">Driver</th>
                  <th className="px-3 py-3 font-medium">Load</th>
                  <th className="px-3 py-3 font-medium">Submitted</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Document</th>
                </tr>
              </thead>
              <tbody>
                {recentSubmissions.map((submission) => (
                  <tr
                    key={submission.id}
                    className="border-b last:border-0 hover:bg-muted/40"
                  >
                    <td className="px-3 py-4 font-medium">
                      {submission.reference}
                    </td>
                    <td className="px-3 py-4">
                      {submission.driverName}
                    </td>
                    <td className="px-3 py-4">
                      {submission.loadNumber ?? '—'}
                    </td>
                    <td className="px-3 py-4">
                      {formatDate(submission.submittedAt)}
                    </td>
                    <td className="px-3 py-4">
                      <StatusBadge status={submission.status} />
                    </td>
                    <td className="px-3 py-4">
                      {submission.documentUrl ? (
                        <a
                          href={submission.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          View file
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recentSubmissions.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No POD submissions available.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Exceptions requiring attention</CardTitle>
          <Link
            href="/operations/exceptions"
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            View all <ArrowRight className="size-4" />
          </Link>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-3 py-3 font-medium">Load</th>
                  <th className="px-3 py-3 font-medium">Reason</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Created</th>
                  <th className="px-3 py-3 font-medium">Document</th>
                </tr>
              </thead>
              <tbody>
                {recentExceptions.map((exception) => (
                  <tr
                    key={exception.id}
                    className="border-b last:border-0 hover:bg-muted/40"
                  >
                    <td className="px-3 py-4 font-medium">
                      {exception.loadNumber}
                    </td>
                    <td className="px-3 py-4">
                      {exception.reason}
                    </td>
                    <td className="px-3 py-4">
                      <StatusBadge status={exception.status} />
                    </td>
                    <td className="px-3 py-4">
                      {formatDate(exception.createdAt)}
                    </td>
                    <td className="px-3 py-4">
                      {exception.documentUrl ? (
                        <a
                          href={exception.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          View file
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recentExceptions.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No open exceptions.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}