import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowUpRight, CheckCircle2, ShieldCheck } from 'lucide-react'
import { LoginForm } from '@/components/auth/login-form'
import { Brand } from '@/components/layout/brand'
import { getWorkspaceHome, getPortalAccess } from '@/lib/auth/access'

export const dynamic = 'force-dynamic'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const access = await getPortalAccess()
  if (access.status === 'active') redirect(getWorkspaceHome(access.profile))
  if (access.status === 'disabled') redirect('/account-disabled')
  if (access.status === 'unprovisioned') redirect('/unauthorized?reason=provisioning')

  const { error } = await searchParams

  return (
    <main className="min-h-screen bg-white lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-sidebar px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-20">
        <div className="absolute -right-28 top-32 size-96 rounded-full border border-white/10" aria-hidden="true" />
        <div className="absolute -right-12 top-48 size-64 rounded-full border border-teal-300/15" aria-hidden="true" />
        <div className="relative z-10"><Brand inverted size="large" /></div>
        <div className="relative z-10 max-w-xl pb-12">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-teal-100">
            <span className="size-1.5 rounded-full bg-teal-300" aria-hidden="true" />
            Daily operations, one clear view
          </p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">Every delivery, accounted for.</h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">A secure workspace for drivers and operations teams to submit, review, and resolve proof-of-delivery documents.</p>
          <div className="mt-10 grid gap-4 text-sm text-slate-200">
            <div className="flex items-center gap-3"><CheckCircle2 aria-hidden="true" className="size-4 text-teal-300" /> Driver and operations workspaces</div>
            <div className="flex items-center gap-3"><CheckCircle2 aria-hidden="true" className="size-4 text-teal-300" /> Access scoped by company and role</div>
            <div className="flex items-center gap-3"><CheckCircle2 aria-hidden="true" className="size-4 text-teal-300" /> Existing workflows stay in control</div>
          </div>
        </div>
        <div className="relative z-10 flex items-center gap-2 text-xs text-slate-400"><ShieldCheck aria-hidden="true" className="size-4" /> Protected by company-managed access</div>
      </section>

      <section className="flex min-h-screen flex-col px-5 py-7 sm:px-8 lg:justify-center lg:px-12 xl:px-20">
        <div className="mb-12 lg:hidden"><Brand /></div>
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Welcome back</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Sign in to DailySpark</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Use the email and password provided by your administrator.</p>
          </div>
          <LoginForm invalidLink={error === 'invalid_link'} />
          <div className="mt-7 flex items-center justify-between gap-4 border-t border-border pt-5 text-sm">
            <span className="text-muted-foreground">Need an account?</span>
            <Link href="/setup" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
              Administrator setup or recovery <ArrowUpRight aria-hidden="true" className="size-3.5" />
            </Link>
          </div>
        </div>
        <p className="mx-auto mt-auto pt-12 text-center text-xs text-muted-foreground lg:hidden">Secure access managed by your company administrator.</p>
      </section>
    </main>
  )
}
