'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle, LockKeyhole } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'

const passwordSchema = z.object({
  password: z.string().min(12, 'Use at least 12 characters.').max(128),
  confirmation: z.string().min(1, 'Confirm your new password.'),
}).refine((values) => values.password === values.confirmation, {
  path: ['confirmation'],
  message: 'Passwords do not match.',
})

type PasswordValues = z.infer<typeof passwordSchema>

export function ResetPasswordForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [complete, setComplete] = useState(false)
  const form = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: '', confirmation: '' },
  })

  async function submit(values: PasswordValues) {
    setError(null)
    const { error: updateError } = await createClient().auth.updateUser({ password: values.password })
    if (updateError) {
      setError('The recovery link may have expired. Ask your administrator for a new one.')
      return
    }
    setComplete(true)
    router.replace('/')
    router.refresh()
  }

  return (
    <Card className="border-border/80 shadow-lg shadow-slate-900/5">
      <CardHeader>
        <div className="mb-2 grid size-11 place-items-center rounded-xl bg-secondary text-primary"><LockKeyhole aria-hidden="true" className="size-5" /></div>
        <CardTitle>Choose a new password</CardTitle>
        <CardDescription>Use at least 12 characters. Your password is stored only by Supabase Auth.</CardDescription>
      </CardHeader>
      <CardContent>
        {error ? <Alert variant="destructive" className="mb-5"><AlertDescription>{error}</AlertDescription></Alert> : null}
        {complete ? <Alert className="mb-5"><AlertDescription>Password updated. Redirecting to your workspace.</AlertDescription></Alert> : null}
        <form onSubmit={form.handleSubmit(submit)} noValidate className="flex flex-col gap-5">
          <FieldGroup>
            <Field data-invalid={Boolean(form.formState.errors.password)}>
              <FieldLabel htmlFor="new-password">New password</FieldLabel>
              <Input id="new-password" type="password" autoComplete="new-password" aria-invalid={Boolean(form.formState.errors.password)} {...form.register('password')} />
              <FieldError>{form.formState.errors.password?.message}</FieldError>
            </Field>
            <Field data-invalid={Boolean(form.formState.errors.confirmation)}>
              <FieldLabel htmlFor="confirm-password">Confirm new password</FieldLabel>
              <Input id="confirm-password" type="password" autoComplete="new-password" aria-invalid={Boolean(form.formState.errors.confirmation)} {...form.register('confirmation')} />
              <FieldError>{form.formState.errors.confirmation?.message}</FieldError>
            </Field>
          </FieldGroup>
          <Button type="submit" disabled={form.formState.isSubmitting || complete}>
            {form.formState.isSubmitting ? <LoaderCircle data-icon="inline-start" aria-hidden="true" className="animate-spin" /> : null}
            Update password
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
