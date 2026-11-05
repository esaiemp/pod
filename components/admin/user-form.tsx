'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Copy, LoaderCircle, UserPlus } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import type { ManagedUser, WorkspaceRole } from '@/lib/types'

const userSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter the user’s full name.').max(120),
  email: z.string().trim().email('Enter a valid work email.').max(254),
  role: z.enum(['Driver', 'BackOffice']),
  isAdmin: z.boolean(),
  legacyDriverUserId: z.string().trim().max(128),
  legacyDriverEmail: z.union([z.literal(''), z.string().trim().email().max(254)]),
})

type UserValues = z.infer<typeof userSchema>

export function AdminUserForm({ user, companyName }: { user?: ManagedUser; companyName: string }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [resetLink, setResetLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const form = useForm<UserValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      fullName: user?.fullName ?? '',
      email: user?.email ?? '',
      role: user?.role ?? 'BackOffice',
      isAdmin: user?.isAdmin ?? false,
      legacyDriverUserId: user?.legacyDriverUserId ?? '',
      legacyDriverEmail: user?.legacyDriverEmail ?? '',
    },
  })
  const role = form.watch('role')

  async function submit(values: UserValues) {
    setError(null)
    setResetLink(null)
    const editing = Boolean(user)
    const endpoint = editing ? `/api/admin/users/${user?.userId}` : '/api/admin/users'
    const payload = {
      fullName: values.fullName,
      email: values.email,
      role: values.role,
      isAdmin: values.isAdmin,
      ...(values.role === 'Driver'
        ? {
            legacyDriverUserId: values.legacyDriverUserId || null,
            legacyDriverEmail: values.legacyDriverEmail || null,
          }
        : {}),
    }

    try {
      const response = await fetch(endpoint, {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!response.ok) {
        setError(
          result.error === 'duplicate_mapping'
            ? 'That legacy driver ID is already assigned to another user in this company.'
            : result.error === 'email_in_use'
              ? 'An account already exists for this email.'
              : result.error === 'self_lockout_prevented'
                ? 'You cannot remove your own administrator access or deactivate your own account.'
                : 'The user could not be saved. Check the fields and try again.',
        )
        return
      }
      if (editing) {
        router.push('/operations/users')
        router.refresh()
        return
      }
      setResetLink(result.resetLink)
      form.reset({ ...values, email: '', fullName: '', legacyDriverUserId: '', legacyDriverEmail: '' })
    } catch {
      setError('The user could not be saved. Try again shortly.')
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Card>
        <CardHeader>
          <CardTitle>{user ? 'Edit user access' : 'Add a user'}</CardTitle>
          <CardDescription>{user ? 'Update this company user’s role, mapping, or active status.' : `This account will be created for ${companyName}.`}</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? <Alert variant="destructive" className="mb-5"><AlertDescription>{error}</AlertDescription></Alert> : null}
          {resetLink ? (
            <Alert className="mb-5">
              <Check aria-hidden="true" />
              <AlertTitle>User created — password setup link ready</AlertTitle>
              <AlertDescription className="mt-2">This one-time recovery link is shown only to you. Share it through a secure channel; the portal does not email or store it.</AlertDescription>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Input readOnly aria-label="One-time password setup link" value={resetLink} />
                <Button type="button" variant="outline" onClick={async () => { await navigator.clipboard.writeText(resetLink); setCopied(true) }}>
                  {copied ? <Check data-icon="inline-start" aria-hidden="true" /> : <Copy data-icon="inline-start" aria-hidden="true" />}
                  {copied ? 'Copied' : 'Copy link'}
                </Button>
              </div>
              <div className="mt-4"><Link href="/operations/users" className={buttonVariants({ variant: 'outline', size: 'sm' })}>Return to user directory</Link></div>
            </Alert>
          ) : null}
          <form onSubmit={form.handleSubmit(submit)} noValidate className="flex flex-col gap-5">
            <FieldGroup>
              <Field data-invalid={Boolean(form.formState.errors.fullName)}>
                <FieldLabel htmlFor="user-full-name">Full name</FieldLabel>
                <Input id="user-full-name" autoComplete="name" aria-invalid={Boolean(form.formState.errors.fullName)} {...form.register('fullName')} />
                <FieldError>{form.formState.errors.fullName?.message}</FieldError>
              </Field>
              <Field data-invalid={Boolean(form.formState.errors.email)}>
                <FieldLabel htmlFor="user-email">Work email</FieldLabel>
                <Input id="user-email" type="email" autoComplete="email" disabled={Boolean(user)} aria-invalid={Boolean(form.formState.errors.email)} {...form.register('email')} />
                <FieldError>{form.formState.errors.email?.message}</FieldError>
              </Field>
              <Field data-invalid={Boolean(form.formState.errors.role)}>
                <FieldLabel htmlFor="user-role">Workspace role</FieldLabel>
                <Controller
                  name="role"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={(value) => field.onChange(value as WorkspaceRole)}>
                      <SelectTrigger id="user-role" aria-invalid={Boolean(form.formState.errors.role)}><SelectValue placeholder="Choose a role" /></SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="Driver">Driver</SelectItem>
                          <SelectItem value="BackOffice">BackOffice</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError>{form.formState.errors.role?.message}</FieldError>
              </Field>
              <Field orientation="horizontal" className="rounded-xl border border-border p-4">
                <div className="flex-1">
                  <FieldLabel htmlFor="user-is-admin">Administrator access</FieldLabel>
                  <FieldDescription>Admins can manage users and see the Operations workspace for this company.</FieldDescription>
                </div>
                <Controller name="isAdmin" control={form.control} render={({ field }) => <Switch id="user-is-admin" checked={field.value} onCheckedChange={field.onChange} />} />
              </Field>
              {role === 'Driver' ? (
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <p className="mb-4 text-sm font-semibold">Legacy driver mapping</p>
                  <div className="flex flex-col gap-4">
                    <Field data-invalid={Boolean(form.formState.errors.legacyDriverUserId)}>
                      <FieldLabel htmlFor="legacy-driver-id">Legacy driver user ID</FieldLabel>
                      <Input id="legacy-driver-id" autoComplete="off" aria-invalid={Boolean(form.formState.errors.legacyDriverUserId)} {...form.register('legacyDriverUserId')} />
                      <FieldDescription>Required before POD uploads can be forwarded to Make.</FieldDescription>
                      <FieldError>{form.formState.errors.legacyDriverUserId?.message}</FieldError>
                    </Field>
                    <Field data-invalid={Boolean(form.formState.errors.legacyDriverEmail)}>
                      <FieldLabel htmlFor="legacy-driver-email">Legacy driver email (optional)</FieldLabel>
                      <Input id="legacy-driver-email" type="email" autoComplete="off" aria-invalid={Boolean(form.formState.errors.legacyDriverEmail)} {...form.register('legacyDriverEmail')} />
                      <FieldError>{form.formState.errors.legacyDriverEmail?.message}</FieldError>
                    </Field>
                  </div>
                </div>
              ) : null}
            </FieldGroup>
            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? <LoaderCircle data-icon="inline-start" aria-hidden="true" className="animate-spin" /> : user ? null : <UserPlus data-icon="inline-start" aria-hidden="true" />}
                {user ? 'Save changes' : 'Create user'}
              </Button>
              <Link href="/operations/users" className={buttonVariants({ variant: 'outline' })}>Cancel</Link>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card className="h-fit bg-slate-50/80">
        <CardHeader>
          <CardTitle className="text-base">Access controls</CardTitle>
          <CardDescription>Portal access stays separate from the existing Airtable and Make workflows.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm leading-5 text-muted-foreground">
          <p>Role determines the workspace. Administrator access is a separate permission and remains company-scoped.</p>
          <p>Passwords are managed by Supabase Auth. The portal never stores passwords in Airtable or its own tables.</p>
          {!user ? <p>The new user’s recovery link is generated once and must be shared securely.</p> : null}
        </CardContent>
      </Card>
    </div>
  )
}
