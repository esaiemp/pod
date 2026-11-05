'use client'

import { useState } from 'react'
import { AlertCircle, CheckCircle2, FileCheck2, FileUp, LoaderCircle, RotateCcw, ShieldCheck } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { formatBytes, validatePodFileMetadata } from '@/lib/security/pod-file'

export function PodUploadForm({
  airtableReady,
  makeReady,
  maxBytes,
  previewOnly = false,
  driverName,
}: {
  airtableReady: boolean
  makeReady: boolean
  maxBytes: number
  previewOnly?: boolean
  driverName?: string
}) {
  const [file, setFile] = useState<File | null>(null)
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.currentTarget.files?.[0] ?? null
    setSubmitError(null)
    setSuccess(false)
    if (!selected) {
      setFile(null)
      setAttemptId(null)
      setFileError(null)
      return
    }

    const validation = validatePodFileMetadata(selected, maxBytes)
    if (!validation.valid) {
      setFile(null)
      setAttemptId(null)
      setFileError(validation.message)
      event.currentTarget.value = ''
      return
    }

    setFile(selected)
    setFileError(null)
    setAttemptId(crypto.randomUUID())
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    if (!file || !attemptId) return

    setSubmitError(null)
    setSuccess(false)

    if (previewOnly) {
      setSuccess(true)
      setFile(null)
      setAttemptId(null)
      formElement.reset()
      return
    }

    if (!airtableReady || !makeReady) return

    setSubmitting(true)

    const formData = new FormData()
    formData.append('podFile', file, file.name)

    try {
      const response = await fetch('/api/pod/submit', {
        method: 'POST',
        body: formData,
        headers: { 'Idempotency-Key': attemptId },
      })
      const result = await response.json()
      if (!response.ok) {
        if (['pod_integration_not_ready', 'pod_not_configured', 'pod_invalid_webhook'].includes(result.error)) {
          setSubmitError('The POD workflow is not ready yet. Your file was not sent.')
        } else if (result.error === 'invalid_file' || result.error === 'invalid_file_signature') {
          setSubmitError(result.message ?? 'The file could not be validated.')
        } else if (result.error === 'pod_timeout' || result.error === 'pod_upstream_error') {
          setSubmitError('The workflow response was uncertain. Do not submit this file again until Operations checks the workflow.')
        } else {
          setSubmitError('The upload was not accepted. Try again only after checking your submissions or contacting Operations.')
        }
        return
      }
      setSuccess(true)
      setFile(null)
      setAttemptId(null)
      formElement.reset()
    } catch {
      setSubmitError('The connection was interrupted. Check with Operations before retrying to avoid a duplicate submission.')
    } finally {
      setSubmitting(false)
    }
  }

  const integrationReady = airtableReady && makeReady

  return (
    <div className="mx-auto w-full max-w-[560px] py-4 sm:py-8">
      <Card className="shadow-sm">
        <CardHeader className="space-y-3 pb-5 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileUp aria-hidden="true" className="size-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Submit Proof of Delivery</CardTitle>
          <CardDescription className="mx-auto max-w-sm text-sm leading-6">
            Upload your signed Proof of Delivery document. We&apos;ll automatically process it and notify the back-office team.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {previewOnly ? (
            <Alert>
              <ShieldCheck aria-hidden="true" />
              <AlertTitle>Preview only — no upload</AlertTitle>
              <AlertDescription>Your file stays in this browser and is never sent to Make or Airtable.</AlertDescription>
            </Alert>
          ) : !integrationReady ? (
            <Alert role="status" className="text-sm">
              <AlertCircle aria-hidden="true" />
              <AlertDescription>
                Submissions are temporarily unavailable while the workflow is being configured. Please try again later.
              </AlertDescription>
            </Alert>
          ) : null}

          {submitError ? (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          ) : null}
          {success ? (
            <Alert role="status">
              <CheckCircle2 aria-hidden="true" />
              <AlertTitle>{previewOnly ? 'Preview complete' : 'Upload accepted'}</AlertTitle>
              <AlertDescription>
                {previewOnly
                  ? 'The file passed the form checks. Nothing was uploaded, saved, or sent to the workflow.'
                  : 'The workflow accepted the file. Check My submissions for processing updates.'}
              </AlertDescription>
            </Alert>
          ) : null}

          <form onSubmit={submit} className="space-y-5">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="pod-driver-name">Driver Name</FieldLabel>
                <Input
                  id="pod-driver-name"
                  type="text"
                  value={driverName?.trim() || 'Signed-in driver'}
                  readOnly
                  className="bg-muted/60"
                />
                <FieldDescription>Automatically provided by your account.</FieldDescription>
              </Field>
              <Field data-invalid={Boolean(fileError)}>
                <FieldLabel htmlFor="pod-file">Upload POD</FieldLabel>
                <Input
                  id="pod-file"
                  type="file"
                  accept=".pdf,application/pdf,.png,image/png,.jpg,.jpeg,image/jpeg"
                  capture="environment"
                  onChange={handleFileChange}
                  aria-invalid={Boolean(fileError)}
                  aria-describedby="pod-file-help"
                  className="cursor-pointer"
                />
                <FieldDescription id="pod-file-help">
                  PDF, PNG, or JPEG · up to {formatBytes(maxBytes)}. One file per submission.
                </FieldDescription>
                <FieldError>{fileError}</FieldError>
              </Field>
            </FieldGroup>

            {file ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <FileCheck2 aria-hidden="true" className="size-5 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { setFile(null); setAttemptId(null) }}
                  aria-label="Remove selected file"
                >
                  <RotateCcw aria-hidden="true" className="size-4" /> Remove
                </Button>
              </div>
            ) : null}

            <Button
              type="submit"
              disabled={!file || (!previewOnly && !integrationReady) || submitting}
              className="w-full"
            >
              {submitting
                ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                : <FileUp aria-hidden="true" className="size-4" />}
              {submitting ? 'Sending securely…' : previewOnly ? 'Simulate submission' : 'Submit POD'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}