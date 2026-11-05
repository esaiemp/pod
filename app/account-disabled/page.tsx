import Link from 'next/link'
import { AlertTriangle, Mail } from 'lucide-react'
import { Brand } from '@/components/layout/brand'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function AccountDisabledPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f7f8] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><Brand /></div>
        <Card>
          <CardHeader>
            <div className="mb-2 grid size-11 place-items-center rounded-xl bg-amber-50 text-amber-700"><AlertTriangle aria-hidden="true" className="size-5" /></div>
            <CardTitle>Access is currently disabled</CardTitle>
            <CardDescription>Your account or company workspace is inactive. Contact your administrator if you think this is a mistake.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <a href="mailto:support@dailyspark.tech" className={buttonVariants({ variant: 'default' })}>
              <Mail data-icon="inline-start" aria-hidden="true" /> Contact support
            </a>
            <Link href="/login" className={buttonVariants({ variant: 'outline' })}>Return to sign in</Link>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
