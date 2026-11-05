import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, FlaskConical } from 'lucide-react'
import { PodUploadForm } from '@/components/driver/pod-upload-form'
import { buttonVariants } from '@/components/ui/button'
import { getPodUploadLimitBytes } from '@/lib/integrations/readiness'

export const metadata: Metadata = {
  title: 'POD Upload Preview',
  description: 'Test the POD upload form without uploading or storing a document.',
  robots: { index: false, follow: false },
}

export default function PodTestPage() {
  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:py-12">
        <Link href="/login" className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'w-fit' })}>
          <ArrowLeft data-icon="inline-start" aria-hidden="true" />
          Back to sign in
        </Link>

        <header className="max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <FlaskConical aria-hidden="true" className="size-4" />
            UI-only preview
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Test the POD upload form</h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            Select a sample PDF or image to check file selection and validation. The simulated submit only shows the confirmation state.
          </p>
        </header>

        <PodUploadForm
          airtableReady={false}
          makeReady={false}
          identityMapped={false}
          maxBytes={getPodUploadLimitBytes()}
          previewOnly
        />
      </div>
    </main>
  )
}
