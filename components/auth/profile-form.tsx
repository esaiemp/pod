'use client'

import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, LoaderCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

const profileSchema = z.object({ fullName: z.string().trim().min(2, 'Enter at least two characters.').max(120) })
type ProfileValues = z.infer<typeof profileSchema>

export function ProfileForm({ fullName, email, role, companyName }: { fullName: string; email: string; role: string; companyName: string }) {
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const form = useForm<ProfileValues>({ resolver: zodResolver(profileSchema), defaultValues: { fullName } })

  async function submit(values: ProfileValues) {
    setMessage(null)
    setError(null)
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!response.ok) {
        setError('Your profile could not be updated. Try again shortly.')
        return
      }
      setMessage('Profile updated.')
    } catch {
      setError('Your profile could not be updated. Try again shortly.')
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Profile details</CardTitle>
        <CardDescription>Contact your administrator to change your email, company, or access role.</CardDescription>
      </CardHeader>
      <CardContent>
        {message ? <Alert className="mb-5"><CheckCircle2 aria-hidden="true" /><AlertDescription>{message}</AlertDescription></Alert> : null}
        {error ? <Alert variant="destructive" className="mb-5"><AlertDescription>{error}</AlertDescription></Alert> : null}
        <form onSubmit={form.handleSubmit(submit)} noValidate className="flex flex-col gap-5">
          <FieldGroup>
            <Field data-invalid={Boolean(form.formState.errors.fullName)}>
              <FieldLabel htmlFor="profile-full-name">Full name</FieldLabel>
              <Input id="profile-full-name" autoComplete="name" aria-invalid={Boolean(form.formState.errors.fullName)} {...form.register('fullName')} />
              <FieldError>{form.formState.errors.fullName?.message}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="profile-email">Work email</FieldLabel>
              <Input id="profile-email" type="email" value={email} readOnly />
            </Field>
            <Field>
              <FieldLabel htmlFor="profile-role">Workspace role</FieldLabel>
              <Input id="profile-role" value={role} readOnly />
            </Field>
            <Field>
              <FieldLabel htmlFor="profile-company">Company</FieldLabel>
              <Input id="profile-company" value={companyName} readOnly />
            </Field>
          </FieldGroup>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? <LoaderCircle data-icon="inline-start" aria-hidden="true" className="animate-spin" /> : null}
            Save profile
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
