import 'server-only'

import { getIntegrationReadiness } from '@/lib/integrations/readiness'

export class MakeIntegrationError extends Error {
  constructor(
    readonly code: 'not_configured' | 'invalid_webhook' | 'timeout' | 'upstream_error',
  ) {
    super(code)
    this.name = 'MakeIntegrationError'
  }
}

interface PodSubmission {
  driverName: string
  driverEmail: string
  driverUserId: string
  file: File
  idempotencyKey: string
}

export async function forwardPodSubmission(submission: PodSubmission) {
  const readiness = getIntegrationReadiness().make
  if (!readiness.podUploadReady) {
    throw new MakeIntegrationError('not_configured')
  }

  const rawUrl = process.env.MAKE_POD_SUBMISSION_WEBHOOK_URL
  if (!rawUrl) throw new MakeIntegrationError('not_configured')

  let webhookUrl: URL
  try {
    webhookUrl = new URL(rawUrl)
  } catch {
    throw new MakeIntegrationError('invalid_webhook')
  }

  if (
    webhookUrl.protocol !== 'https:' ||
    !(webhookUrl.hostname === 'make.com' || webhookUrl.hostname.endsWith('.make.com'))
  ) {
    throw new MakeIntegrationError('invalid_webhook')
  }

  // Preserve the sample's IMTBuffer bytes as one binary part; do not base64-encode or duplicate the `files` collection.
  const body = new FormData()
  body.append('driverName', submission.driverName)
  body.append('driverEmail', submission.driverEmail)
  body.append('driverUserId', submission.driverUserId)
  body.append('podFile', submission.file, submission.file.name)

  let response: Response
  try {
    response = await fetch(webhookUrl, {
      method: 'POST',
      body,
      headers: { 'Idempotency-Key': submission.idempotencyKey },
      cache: 'no-store',
      signal: AbortSignal.timeout(25_000),
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new MakeIntegrationError('timeout')
    }
    throw new MakeIntegrationError('upstream_error')
  }

  if (!response.ok) throw new MakeIntegrationError('upstream_error')
  return { accepted: true }
}
