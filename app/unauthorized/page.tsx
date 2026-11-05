import Link from 'next/link'
import { ShieldX } from 'lucide-react'
import { Brand } from '@/components/layout/brand'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function UnauthorizedPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>
}) {
  const { reason } = await searchParams
  const unprovisioned = reason === 'provisioning'

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f7f8] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><Brand /></div>
        <Card>
          <CardHeader>
            <div className="mb-2 grid size-11 place-items-center rounded-xl bg-secondary text-primary"><ShieldX aria-hidden="true" className="size-5" /></div>
            <CardTitle>{unprovisioned ? 'Account is not provisioned' : 'You do not have access to this workspace'}</CardTitle>
            <CardDescription>{unprovisioned ? 'Ask your company administrator to provision your account and assign the correct workspace.' : 'Your account does not have permission to open this page.'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login" className={buttonVariants({ variant: 'outline' })}>Return to sign in</Link>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
