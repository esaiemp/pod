'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle, LockKeyhole, Mail } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid work email.').max(254),
  password: z.string().min(1, 'Enter your password.').max(256),
})

type LoginValues = z.infer<typeof loginSchema>

export function LoginForm({ invalidLink = false }: { invalidLink?: boolean }) {
  const router = useRouter()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  async function submit(values: LoginValues) {
    setSubmitError(null)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const result = await response.json()

      if (!response.ok) {
        if (result.error === 'account_disabled') {
          router.replace('/account-disabled')
          return
        }
        if (result.error === 'account_not_provisioned') {
          router.replace('/unauthorized?reason=provisioning')
          return
        }
        if (result.error === 'rate_limited') {
          setSubmitError('Too many attempts. Wait a moment and try again.')
          return
        }
        if (result.error === 'email_confirmation_required') {
          setSubmitError('This account still needs email confirmation. Contact your administrator.')
          return
        }
        setSubmitError('The email or password is incorrect.')
        return
      }

      router.replace(result.redirectTo)
      router.refresh()
    } catch {
      setSubmitError('Sign-in is temporarily unavailable. Try again shortly.')
    }
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate className="flex flex-col gap-5">
      {invalidLink ? (
        <Alert variant="destructive">
          <AlertDescription>This recovery link is invalid or has expired. Ask your administrator for a new one.</AlertDescription>
        </Alert>
      ) : null}
      {submitError ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      ) : null}
      <FieldGroup>
        <Field data-invalid={Boolean(form.formState.errors.email)}>
          <FieldLabel htmlFor="login-email">Work email</FieldLabel>
          <div className="relative">
            <Mail aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="login-email"
              type="email"
              autoComplete="username"
              placeholder="name@company.com"
              className="pl-10"
              aria-invalid={Boolean(form.formState.errors.email)}
              {...form.register('email')}
            />
          </div>
          <FieldError>{form.formState.errors.email?.message}</FieldError>
        </Field>
        <Field data-invalid={Boolean(form.formState.errors.password)}>
          <FieldLabel htmlFor="login-password">Password</FieldLabel>
          <div className="relative">
            <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              className="pl-10"
              aria-invalid={Boolean(form.formState.errors.password)}
              {...form.register('password')}
            />
          </div>
          <FieldError>{form.formState.errors.password?.message}</FieldError>
        </Field>
      </FieldGroup>
      <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? <LoaderCircle data-icon="inline-start" aria-hidden="true" className="animate-spin" /> : null}
        Sign in to your workspace
      </Button>
    </form>
  )
}
