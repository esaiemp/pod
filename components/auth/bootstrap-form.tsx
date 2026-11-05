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

const bootstrapSchema = z.object({
  bootstrapSecret: z.string().min(1, 'Enter the one-time setup secret.'),
  companyName: z.string().trim().min(2, 'Enter your company name.').max(120),
  fullName: z.string().trim().min(2, 'Enter your full name.').max(120),
  email: z.string().trim().email('Enter a valid work email.').max(254),
})

type BootstrapValues = z.infer<typeof bootstrapSchema>

export function BootstrapForm({ enabled }: { enabled: boolean }) {
  const [error, setError] = useState<string | null>(null)
  const [resetLink, setResetLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const form = useForm<BootstrapValues>({
    resolver: zodResolver(bootstrapSchema),
    defaultValues: { bootstrapSecret: '', companyName: '', fullName: '', email: '' },
  })

  async function submit(values: BootstrapValues) {
    setError(null)
    setResetLink(null)
    try {
      const response = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const result = await response.json()
      if (!response.ok) {
        setError(
          result.error === 'invalid_bootstrap_secret'
            ? 'The one-time setup secret is incorrect.'
            : result.error === 'bootstrap_already_complete'
              ? 'Initial setup has already been completed.'
              : 'Setup could not be completed. Check the configuration and try again.',
        )
        return
      }
      setResetLink(result.resetLink)
      form.reset({ bootstrapSecret: '', companyName: values.companyName, fullName: values.fullName, email: values.email })
    } catch {
      setError('Setup is temporarily unavailable. Try again shortly.')
    }
  }

  return (
    <Card className="border-border/80 shadow-lg shadow-slate-900/5">
      <CardHeader className="pb-5">
        <div className="mb-3 grid size-11 place-items-center rounded-xl bg-secondary text-primary"><ShieldCheck aria-hidden="true" className="size-5" /></div>
        <CardTitle className="text-xl">Create your administrator</CardTitle>
        <CardDescription>One-time setup. Public account registration is disabled.</CardDescription>
      </CardHeader>
      <CardContent>
        {!enabled ? (
          <Alert>
            <AlertTitle>Setup is not enabled</AlertTitle>
            <AlertDescription>Set a strong, temporary <code>PORTAL_BOOTSTRAP_SECRET</code> in project Vars, then refresh this page. Remove it after the first administrator is created.</AlertDescription>
          </Alert>
        ) : null}
        {error ? <Alert variant="destructive" className="mb-5"><AlertDescription>{error}</AlertDescription></Alert> : null}
        {resetLink ? (
          <Alert className="mb-5">
            <Check aria-hidden="true" />
            <AlertTitle>Administrator created</AlertTitle>
            <AlertDescription className="mt-2">Copy this one-time password setup link and share it through a secure channel. It is not emailed or stored by the portal.</AlertDescription>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Input readOnly aria-label="One-time password setup link" value={resetLink} className="min-w-0" />
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  await navigator.clipboard.writeText(resetLink)
                  setCopied(true)
                }}
              >
                {copied ? <Check data-icon="inline-start" aria-hidden="true" /> : <Copy data-icon="inline-start" aria-hidden="true" />}
                {copied ? 'Copied' : 'Copy link'}
              </Button>
            </div>
          </Alert>
        ) : null}
        <form onSubmit={form.handleSubmit(submit)} noValidate className="flex flex-col gap-4">
          <FieldGroup>
            <Field data-invalid={Boolean(form.formState.errors.bootstrapSecret)}>
              <FieldLabel htmlFor="bootstrap-secret">One-time setup secret</FieldLabel>
              <Input id="bootstrap-secret" type="password" autoComplete="off" aria-invalid={Boolean(form.formState.errors.bootstrapSecret)} {...form.register('bootstrapSecret')} />
              <FieldError>{form.formState.errors.bootstrapSecret?.message}</FieldError>
            </Field>
            <Field data-invalid={Boolean(form.formState.errors.companyName)}>
              <FieldLabel htmlFor="setup-company">Company name</FieldLabel>
              <Input id="setup-company" autoComplete="organization" aria-invalid={Boolean(form.formState.errors.companyName)} {...form.register('companyName')} />
              <FieldError>{form.formState.errors.companyName?.message}</FieldError>
            </Field>
            <Field data-invalid={Boolean(form.formState.errors.fullName)}>
              <FieldLabel htmlFor="setup-name">Administrator name</FieldLabel>
              <Input id="setup-name" autoComplete="name" aria-invalid={Boolean(form.formState.errors.fullName)} {...form.register('fullName')} />
              <FieldError>{form.formState.errors.fullName?.message}</FieldError>
            </Field>
            <Field data-invalid={Boolean(form.formState.errors.email)}>
              <FieldLabel htmlFor="setup-email">Administrator work email</FieldLabel>
              <Input id="setup-email" type="email" autoComplete="email" aria-invalid={Boolean(form.formState.errors.email)} {...form.register('email')} />
              <FieldError>{form.formState.errors.email?.message}</FieldError>
              <FieldDescription>A one-time recovery link will be shown after setup.</FieldDescription>
            </Field>
          </FieldGroup>
          <Button type="submit" disabled={!enabled || form.formState.isSubmitting}>
            {form.formState.isSubmitting ? <LoaderCircle data-icon="inline-start" aria-hidden="true" className="animate-spin" /> : null}
            Create first administrator
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
