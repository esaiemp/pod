
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink, LoaderCircle, Search } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

import type { PodException } from '@/lib/operations/exception'

type ExceptionsDashboardProps = {
  exceptions: PodException[]
}

const RESOLUTION_ACTIONS = [
  'Approve',
  'Request Signature',
  'Request Resubmission',
  'Reject',
] as const

function isFinalStatus(status?: string | null) {
  return ['resolved', 'rejected'].includes(
    (status ?? '').trim().toLowerCase()
  )
}

function statusBadgeClass(status: string) {
  switch (status.trim().toLowerCase()) {
    case 'resolved':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    case 'rejected':
    case 'resolution failed':
      return 'border-red-200 bg-red-50 text-red-700'
    case 'pending review':
      return 'border-amber-200 bg-amber-50 text-amber-700'
    case 'in review':
    case 'processing':
      return 'border-sky-200 bg-sky-50 text-sky-700'
    case 'awaiting resubmission':
      return 'border-teal-200 bg-teal-50 text-teal-700'
    default:
      return 'border-slate-200 bg-slate-50 text-slate-700'
  }
}

function displayValue(value?: string | null) {
  return value?.trim() || 'Not selected'
}

export function ExceptionsDashboard({
  exceptions,
}: ExceptionsDashboardProps) {
  const router = useRouter()

  const [records, setRecords] = useState(exceptions)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [selectedException, setSelectedException] =
    useState<PodException | null>(null)

  const [resolutionAction, setResolutionAction] = useState('')
  const [resolutionNotes, setResolutionNotes] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Keep the local dashboard synchronized with fresh server data.
  useEffect(() => {
    setRecords(exceptions)
  }, [exceptions])

  const statuses = useMemo(
    () =>
      Array.from(
        new Set(records.map((record) => record.status).filter(Boolean))
      ).sort(),
    [records]
  )

  const filteredExceptions = useMemo(() => {
    const query = search.trim().toLowerCase()

    return records.filter((record) => {
      const matchesSearch =
        !query ||
        [
          record.loadNumber,
          record.reason,
          record.status,
          record.processingState,
          record.resolutionAction ?? '',
          record.resolutionNotes ?? '',
        ].some((value) => value.toLowerCase().includes(query))

      const matchesStatus =
        statusFilter === 'all' || record.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [records, search, statusFilter])

  const readOnly = selectedException
    ? isFinalStatus(selectedException.status)
    : false

  function openException(record: PodException) {
    setSelectedException(record)
    setResolutionAction(record.resolutionAction ?? '')
    setResolutionNotes(record.resolutionNotes ?? '')
    setError(null)
    setSuccess(null)
  }

  function closeDialog() {
    if (isSubmitting) return

    setSelectedException(null)
    setResolutionAction('')
    setResolutionNotes('')
    setError(null)
    setSuccess(null)
  }

  async function handleSubmit() {
    if (!selectedException || isSubmitting) return

    if (isFinalStatus(selectedException.status)) {
      setError('This exception is already finalized.')
      return
    }

    if (
      !RESOLUTION_ACTIONS.some(
        (action) => action === resolutionAction
      )
    ) {
      setError('Please select a valid resolution action.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(
        `/api/operations/exceptions/${encodeURIComponent(
          selectedException.id
        )}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            resolutionAction,
            resolutionNotes: resolutionNotes.trim(),
          }),
        }
      )

      const result = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(
          result?.error ||
            'Unable to submit the resolution action.'
        )
      }

      // Reflect the successful Airtable update immediately.
      setRecords((current) =>
        current.map((record) =>
          record.id === selectedException.id
            ? {
                ...record,
                status: 'Resolved',
                resolutionAction,
                resolutionNotes: resolutionNotes.trim(),
              }
            : record
        )
      )

      setSuccess('Resolution action saved successfully.')

      setSelectedException(null)
      setResolutionAction('')
      setResolutionNotes('')

      // Refresh the server-rendered exception data.
      router.refresh()
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to save the resolution action.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          POD Exceptions
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review failed POD submissions and request the appropriate
          resolution.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Exceptions ({records.length})
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search load, reason or status"
                className="pl-9"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">All statuses</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="px-3 py-4 font-medium">Load</th>
                  <th className="px-3 py-4 font-medium">Reason</th>
                  <th className="px-3 py-4 font-medium">Status</th>
                  <th className="px-3 py-4 font-medium">Document</th>
                  <th className="px-3 py-4 font-medium">Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredExceptions.map((record) => (
                  <tr
                    key={record.id}
                    className="border-b last:border-0"
                  >
                    <td className="whitespace-nowrap px-3 py-4 font-medium">
                      {record.loadNumber || 'Not linked'}
                    </td>

                    <td className="px-3 py-4">
                      {record.reason || 'No reason provided'}
                    </td>

                    <td className="whitespace-nowrap px-3 py-4">
                      <Badge
                        variant="outline"
                        className={statusBadgeClass(record.status)}
                      >
                        {record.status || 'Unknown'}
                      </Badge>
                    </td>

                    <td className="whitespace-nowrap px-3 py-4">
                      {record.documentUrl ? (
                        <a
                          href={record.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-teal-700 hover:underline"
                        >
                          View file
                          <ExternalLink className="size-3.5" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">
                          Unavailable
                        </span>
                      )}
                    </td>

                    <td className="px-3 py-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openException(record)}
                      >
                        {isFinalStatus(record.status)
                          ? 'View'
                          : 'Review'}
                      </Button>
                    </td>
                  </tr>
                ))}

                {filteredExceptions.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-10 text-center text-muted-foreground"
                    >
                      No exceptions match your search or filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={selectedException !== null}
        onOpenChange={(open) => {
          if (!open) closeDialog()
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          {selectedException && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {readOnly
                    ? 'View POD Exception'
                    : 'Review POD Exception'}
                </DialogTitle>

                <DialogDescription>
                  {selectedException.loadNumber || 'Not linked'}
                  {' · '}
                  {selectedException.status}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 py-2">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Exception reason
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {selectedException.reason ||
                      'No reason provided'}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Status
                    </p>
                    <Badge
                      variant="outline"
                      className={`mt-1 ${statusBadgeClass(
                        selectedException.status
                      )}`}
                    >
                      {selectedException.status}
                    </Badge>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">
                      Processing State
                    </p>
                    <p className="mt-1 font-medium">
                      {selectedException.processingState || 'Pending'}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">
                    Current Resolution Action
                  </p>
                  <p className="mt-1 font-medium">
                    {displayValue(
                      selectedException.resolutionAction
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">
                    Current Resolution Notes
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">
                    {selectedException.resolutionNotes?.trim() ||
                      'No notes provided'}
                  </p>
                </div>

                {selectedException.documentUrl && (
                  <a
                    href={selectedException.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-teal-700 hover:underline"
                  >
                    View POD document
                    <ExternalLink className="size-4" />
                  </a>
                )}

                <div className="border-t pt-5">
                  {readOnly ? (
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                      This exception is finalized. Its resolution
                      details are available for viewing only.
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <label
                          htmlFor="resolution-action"
                          className="text-sm font-medium"
                        >
                          Resolution action
                        </label>

                        <select
                          id="resolution-action"
                          value={resolutionAction}
                          onChange={(event) =>
                            setResolutionAction(event.target.value)
                          }
                          disabled={isSubmitting}
                          className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                        >
                          <option value="">
                            Select an action
                          </option>

                          {RESOLUTION_ACTIONS.map((action) => (
                            <option key={action} value={action}>
                              {action}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor="resolution-notes"
                          className="text-sm font-medium"
                        >
                          Resolution notes
                        </label>

                        <Textarea
                          id="resolution-notes"
                          value={resolutionNotes}
                          onChange={(event) =>
                            setResolutionNotes(event.target.value)
                          }
                          disabled={isSubmitting}
                          maxLength={2000}
                          rows={4}
                          placeholder="Explain what the driver needs to do next..."
                        />

                        <div className="flex justify-between gap-3 text-xs text-muted-foreground">
                          <span>
                            Optional. Add useful instructions for the driver.
                          </span>
                          <span>
                            {resolutionNotes.length}/2000
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {error && (
                  <div
                    role="alert"
                    className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                  >
                    {error}
                  </div>
                )}

                {success && (
                  <div
                    role="status"
                    className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
                  >
                    {success}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeDialog}
                  disabled={isSubmitting}
                >
                  Close
                </Button>

                {!readOnly && (
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={
                      isSubmitting || !resolutionAction
                    }
                    className="bg-teal-700 text-white hover:bg-teal-800"
                  >
                    {isSubmitting ? (
                      <>
                        <LoaderCircle className="mr-2 size-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Submit resolution action'
                    )}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
