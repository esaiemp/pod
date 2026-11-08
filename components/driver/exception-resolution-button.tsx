
'use client'

import { useState } from 'react'
import { ExternalLink, LoaderCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type ExceptionDetails = {
  id: string
  loadNumber: string | null
  reason: string | null
  status: string | null
  processingState: string | null
  resolutionAction: string | null
  resolutionNotes: string | null
  documentUrl: string | null
}

type Props = {
  exceptionId: string
}

const ACTION_INSTRUCTIONS: Record<string, string> = {
  Approve: 'Your POD has been approved by Back Office.',
  'Request Signature':
    'A signature is required. Obtain the missing signature and follow the instructions provided by Back Office.',
  'Request Resubmission':
    'A replacement POD is required. Review the instructions and submit a corrected document.',
  Reject:
    'The submitted POD has been rejected. Review the reason and contact Back Office if clarification is needed.',
}

function isSafeDocumentUrl(url: string | null): url is string {
  if (!url) return false

  try {
    const parsed = new URL(url)

    return (
      parsed.protocol === 'https:' &&
      ['drive.google.com', 'docs.google.com'].includes(
        parsed.hostname,
      )
    )
  } catch {
    return false
  }
}

export function ExceptionResolutionButton({
  exceptionId,
}: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [details, setDetails] =
    useState<ExceptionDetails | null>(null)

  async function loadException() {
    setLoading(true)
    setError(null)
    setDetails(null)

    try {
      const response = await fetch(
        `/api/driver/exceptions/${encodeURIComponent(exceptionId)}`,
        {
          method: 'GET',
          cache: 'no-store',
        },
      )

      if (!response.ok) {
        throw new Error(
          response.status === 404
            ? 'Exception details were not found or are not available for your account.'
            : 'Unable to load exception details.',
        )
      }

      const data = (await response.json()) as ExceptionDetails
      setDetails(data)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred.',
      )
    } finally {
      setLoading(false)
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)

    if (nextOpen) {
      void loadException()
    }
  }

  const action = details?.resolutionAction?.trim() || null
  const notes = details?.resolutionNotes?.trim() || null
  const isResolved =
    details?.status?.trim().toLowerCase() === 'resolved'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => handleOpenChange(true)}
        className="border-teal-200 text-teal-700 hover:bg-teal-50"
      >
        View Resolution
      </Button>

      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle>POD Exception Details</DialogTitle>
          <DialogDescription>
            Review the exception status and instructions from
            Back Office.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div
            className="flex items-center justify-center gap-3 py-12 text-sm text-muted-foreground"
            role="status"
          >
            <LoaderCircle className="size-5 animate-spin" />
            Loading exception details...
          </div>
        )}

        {error && (
          <div className="space-y-4">
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => void loadException()}
            >
              Try again
            </Button>
          </div>
        )}

        {!loading && !error && details && (
          <div className="space-y-5 py-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">
                  Load Number
                </p>
                <p className="mt-1 font-medium">
                  {details.loadNumber || 'Not linked'}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  Exception Status
                </p>
                <span
                  className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                    isResolved
                      ? 'bg-green-100 text-green-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {details.status || 'Pending Review'}
                </span>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">
                Exception Reason
              </p>
              <p className="mt-1 text-sm">
                {details.reason || 'Not specified'}
              </p>
            </div>

            <div className="border-t pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Back Office Resolution
              </p>

              {action ? (
                <div className="mt-3 space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Resolution Action
                    </p>
                    <p className="mt-1 text-lg font-semibold text-teal-700">
                      {action}
                    </p>
                  </div>

                  {ACTION_INSTRUCTIONS[action] && (
                    <div className="rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900">
                      {ACTION_INSTRUCTIONS[action]}
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-medium">
                      Instructions / Notes from Back Office
                    </p>

                    <div className="mt-2 whitespace-pre-wrap rounded-lg border bg-muted/30 p-4 text-sm leading-6">
                      {notes || 'No additional instructions provided.'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  Back Office has not submitted a resolution
                  decision yet. Please check again later.
                </div>
              )}
            </div>

            {isSafeDocumentUrl(details.documentUrl) && (
              <div className="border-t pt-4">
                <a
                  href={details.documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-teal-700 hover:underline"
                >
                  View Original POD Document
                  <ExternalLink className="size-4" />
                </a>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
