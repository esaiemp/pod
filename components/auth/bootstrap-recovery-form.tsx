'use client'

import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Copy, LoaderCircle, ShieldCheck } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

const recoverySchema = z.object({
  bootstrapSecret: z.string().min(1, 'Enter the one-time bootstrap secret.').max(512),
  email: z.string().trim().email('Enter the original administrator email.').max(254),
})

type RecoveryValues = z.infer<typeof recoverySchema>

export function BootstrapRecoveryForm() {
  const [error, setError] = useState<string | null>(null)
  const [resetLink, setResetLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const form = useForm<RecoveryValues>({
    resolver: zodResolver(recoverySchema),
    defaultValues: { bootstrapSecret: '', email: '' },
  })

  async function submit(values: RecoveryValues) {
    setError(null)
    setCopied(false)

    try {
      const response = await fetch('/api/setup/recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const result = await response.json()

      if (!response.ok) {
        setError(
          result.error === 'rate_limited'
            ? 'Too many attempts. Wait 15 minutes before trying again.'
            : result.error === 'recovery_redirect_mismatch'
              ? `Supabase returned a different callback URL, so no link was issued. Requested: ${result.expectedRedirect ?? 'unknown'}; returned: ${result.returnedRedirect ?? 'unknown'}. The production callback must match the Auth redirect allowlist.`
              : 'A fresh link could not be created. Check the secret and original administrator email, then try again.',
        )
        return
      }

      setResetLink(result.resetLink)
      form.setValue('bootstrapSecret', '')
    } catch {
      setError('Recovery is temporarily unavailable. Try again shortly.')
    }
  }

  async function copyLink() {
    if (!resetLink) return
    try {
      await navigator.clipboard.writeText(resetLink)
      setCopied(true)
    } catch {
      setError('Clipboard access failed. Select the link and copy it manually.')
    }
  }

  return (
    <Card className="border-border/80 shadow-lg shadow-slate-900/5">
      <CardHeader>
        <div className="mb-2 grid size-11 place-items-center rounded-xl bg-secondary text-primary">
          <ShieldCheck aria-hidden="true" className="size-5" />
        </div>
        <CardTitle>Reissue administrator setup link</CardTitle>
        <CardDescription>
          This only issues a fresh password link for the original administrator; it does not create another account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <Alert variant="destructive" className="mb-5" role="alert">
            <AlertDescription className="break-words">{error}</AlertDescription>
          </Alert>
        ) : null}
        {resetLink ? (
          <Alert className="mb-5">
            <Check aria-hidden="true" />
            <AlertTitle>Fresh password setup link ready</AlertTitle>
            <AlertDescription className="mt-2">
              Use this one-time link now. It is not emailed or stored by the portal; keep it private.
            </AlertDescription>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Input
                readOnly
                aria-label="One-time password setup link"
                value={resetLink}
                onFocus={(event) => event.currentTarget.select()}
              />
              <Button type="button" variant="outline" onClick={copyLink}>
                {copied ? <Check data-icon="inline-start" aria-hidden="true" /> : <Copy data-icon="inline-start" aria-hidden="true" />}
                {copied ? 'Copied' : 'Copy link'}
              </Button>
            </div>
          </Alert>
        ) : null}
        <form onSubmit={form.handleSubmit(submit)} noValidate className="flex flex-col gap-5">
          <FieldGroup>
            <Field data-invalid={Boolean(form.formState.errors.bootstrapSecret)}>
              <FieldLabel htmlFor="recovery-bootstrap-secret">One-time bootstrap secret</FieldLabel>
              <Input
                id="recovery-bootstrap-secret"
                type="password"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={Boolean(form.formState.errors.bootstrapSecret)}
                {...form.register('bootstrapSecret')}
              />
              <FieldDescription>Use the secret configured for this Vercel project. Do not share it in chat.</FieldDescription>
              <FieldError>{form.formState.errors.bootstrapSecret?.message}</FieldError>
            </Field>
            <Field data-invalid={Boolean(form.formState.errors.email)}>
              <FieldLabel htmlFor="recovery-admin-email">Original administrator email</FieldLabel>
              <Input
                id="recovery-admin-email"
                type="email"
                autoComplete="email"
                aria-invalid={Boolean(form.formState.errors.email)}
                {...form.register('email')}
              />
              <FieldError>{form.formState.errors.email?.message}</FieldError>
            </Field>
          </FieldGroup>
          <Button type="submit" disabled={form.formState.isSubmitting || Boolean(resetLink)}>
            {form.formState.isSubmitting ? <LoaderCircle data-icon="inline-start" aria-hidden="true" className="animate-spin" /> : null}
            Generate fresh link
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
