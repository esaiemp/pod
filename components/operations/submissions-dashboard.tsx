
'use client'

import { useMemo, useState } from 'react'
import { FileText, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { PodSubmission } from '@/lib/operations/submissions'

type Props = {
  submissions: PodSubmission[]
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

function isSafeUrl(value: string | null): value is string {
  if (!value) return false

  try {
    const url = new URL(value)
    return url.protocol === 'https:'
  } catch {
    return false
  }
}

export function SubmissionsDashboard({ submissions }: Props) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState<PodSubmission | null>(null)

  const completed = submissions.filter(
    (item) => item.status.toLowerCase() === 'completed',
  ).length

  const exceptions = submissions.filter(
    (item) => item.status.toLowerCase() === 'exception',
  ).length

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()

    return submissions.filter((item) => {
      const matchesSearch =
        !query ||
        [
          item.reference,
          item.driverName,
          item.driverEmail,
          item.loadNumber,
          item.status,
        ].some((value) =>
          (value ?? '').toLowerCase().includes(query),
        )

      const matchesStatus =
        statusFilter === 'all' ||
        item.status.toLowerCase() === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [submissions, search, statusFilter])

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-teal-700">
          Operations
        </p>
        <h1 className="mt-2 text-3xl font-bold">
          All POD Submissions
        </h1>
        <p className="mt-2 text-muted-foreground">
          Monitor submitted POD documents, drivers, loads, and exceptions.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Total Submissions', value: submissions.length },
          { label: 'Completed', value: completed },
          { label: 'Exceptions', value: exceptions },
        ].map((item) => (
          <Card key={item.label}>
            <CardHeader className="pb-2">
              <p className="text-sm text-muted-foreground">
                {item.label}
              </p>
              <CardTitle className="text-3xl">
                {item.value}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submission Records</CardTitle>
          <p className="text-sm text-muted-foreground">
            {filtered.length} of {submissions.length} submissions
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search reference, driver, load..."
                className="pl-9"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-10 rounded-md border bg-background px-3 text-sm"
              aria-label="Filter submissions by status"
            >
              <option value="all">All statuses</option>
              <option value="completed">Completed</option>
              <option value="exception">Exception</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
            </select>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40">
                <tr>
                  {[
                    'Reference',
                    'Driver',
                    'Load',
                    'Submitted',
                    'Status',
                    'Action',
                  ].map((heading) => (
                    <th key={heading} className="p-3 font-semibold">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="p-3 font-medium">
                      {item.reference}
                    </td>
                    <td className="p-3">{item.driverName}</td>
                    <td className="p-3">{item.loadNumber || '—'}</td>
                    <td className="p-3">{formatDate(item.submittedAt)}</td>
                    <td className="p-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          item.status.toLowerCase() === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : item.status.toLowerCase() === 'exception'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelected(item)}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No matching submissions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      >
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle>
              POD Submission Details
            </DialogTitle>
            <DialogDescription>
              {selected?.reference}
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground">Driver</p>
                  <p className="font-medium">{selected.driverName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium">{selected.status}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Load</p>
                  <p className="font-medium">
                    {selected.loadNumber || 'Not linked'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Submitted</p>
                  <p className="font-medium">
                    {formatDate(selected.submittedAt)}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-muted-foreground">
                  Linked Exceptions
                </p>
                <p className="mt-1 font-medium">
                  {selected.exceptionIds.length > 0
                    ? `${selected.exceptionIds.length} linked exception(s)`
                    : 'No exceptions linked'}
                </p>
              </div>

              {isSafeUrl(selected.documentUrl) && (
                <a
                  href={selected.documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-teal-700 hover:underline"
                >
                  <FileText className="size-4" />
                  View POD Document
                </a>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
