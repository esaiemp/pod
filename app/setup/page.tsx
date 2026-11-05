import Link from 'next/link'
import { BootstrapForm } from '@/components/auth/bootstrap-form'
import { BootstrapRecoveryForm } from '@/components/auth/bootstrap-recovery-form'
import { Brand } from '@/components/layout/brand'
import { buttonVariants } from '@/components/ui/button'
import { getBootstrapStatus } from '@/lib/auth/bootstrap'

export const dynamic = 'force-dynamic'

export default async function SetupPage() {
  const status = await getBootstrapStatus()
  const isRecovery = status.complete

  return (
    <main className="min-h-screen bg-[#f4f7f8] px-4 py-10 sm:px-6 lg:grid lg:grid-cols-[1fr_520px] lg:items-center lg:gap-16 lg:px-16">
      <section className="mx-auto hidden max-w-xl lg:block">
        <Brand size="large" />
        <p className="mt-12 text-sm font-semibold uppercase tracking-[0.22em] text-primary">
          {isRecovery ? 'Administrator recovery' : 'Secure first-run setup'}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
          {isRecovery ? 'Get a fresh password setup link.' : 'Set up your first administrator.'}
        </h1>
        <p className="mt-5 max-w-lg text-base leading-7 text-slate-600">
          {isRecovery
            ? 'The first administrator already exists. Use the bootstrap secret to issue a fresh one-time password link.'
            : 'This one-time flow creates your company workspace and its first BackOffice administrator. Public registration stays disabled after setup.'}
        </p>
      </section>
      <div className="mx-auto w-full max-w-xl">
        <div className="mb-8 lg:hidden"><Brand /></div>
        {isRecovery ? <BootstrapRecoveryForm /> : <BootstrapForm enabled={status.enabled} />}
        <div className="mt-5 text-center">
          <Link href="/login" className={buttonVariants({ variant: 'link', size: 'sm' })}>
            Return to sign in
          </Link>
        </div>
      </div>
    </main>
  )
}
