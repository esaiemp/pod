
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getApiPortalUser } from '@/lib/auth/access'
import {
  getIntegrationReadiness,
  getPodUploadLimitBytes,
} from '@/lib/integrations/readiness'
import {
  forwardPodSubmission,
  MakeIntegrationError,
} from '@/lib/integrations/make'
import {
  hasValidPodFileSignature,
  validatePodFileMetadata,
} from '@/lib/security/pod-file'

export const runtime = 'nodejs'
export const maxDuration = 30

const idempotencyKeySchema = z.string().uuid()

export async function POST(request: Request) {
  // 1. Authenticate and authorize the driver
  const access = await getApiPortalUser('Driver')

  if ('response' in access) {
    return access.response
  }

  // 2. Verify Airtable and Make.com readiness
  const readiness = getIntegrationReadiness()

  if (!readiness.airtable.ready || !readiness.make.podUploadReady) {
    return NextResponse.json(
      { error: 'pod_integration_not_ready' },
      { status: 503 }
    )
  }

  // 3. Validate request size
  const maxBytes = getPodUploadLimitBytes()
  const contentLength = Number(request.headers.get('content-length'))

  if (
    Number.isFinite(contentLength) &&
    contentLength > maxBytes + 64 * 1024
  ) {
    return NextResponse.json(
      { error: 'file_too_large' },
      { status: 413 }
    )
  }

  // 4. Validate idempotency key
  const parsedIdempotencyKey = idempotencyKeySchema.safeParse(
    request.headers.get('idempotency-key')
  )

  if (!parsedIdempotencyKey.success) {
    return NextResponse.json(
      { error: 'invalid_request' },
      { status: 400 }
    )
  }

  const idempotencyKey = parsedIdempotencyKey.data

  // 5. Read multipart form data
  let formData: FormData

  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json(
      { error: 'invalid_upload' },
      { status: 400 }
    )
  }

  // 6. Retrieve uploaded POD file
  const file = formData.get('podFile')

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: 'file_required' },
      { status: 400 }
    )
  }

  // 7. Validate file metadata
  const validation = validatePodFileMetadata(file, maxBytes)

  if (!validation.valid) {
    return NextResponse.json(
      {
        error: 'invalid_file',
        message: validation.message,
      },
      { status: 400 }
    )
  }

  // 8. Validate actual file signature
  const bytes = new Uint8Array(await file.arrayBuffer())

  if (!hasValidPodFileSignature(bytes, validation.mimeType)) {
    return NextResponse.json(
      { error: 'invalid_file_signature' },
      { status: 400 }
    )
  }

  // 9. Use authenticated Supabase identity directly
  // No legacy user_identity_mappings lookup required.
  const driverName = access.profile.fullName
  const driverEmail = access.profile.email
  const driverUserId = access.profile.userId

  if (!driverUserId || !driverEmail) {
    return NextResponse.json(
      { error: 'invalid_driver_identity' },
      { status: 403 }
    )
  }

  // 10. Forward POD to the existing Make.com workflow
  try {
    await forwardPodSubmission({
      driverName,
      driverEmail,
      driverUserId,
      file,
      idempotencyKey,
    })
  } catch (error) {
    if (error instanceof MakeIntegrationError) {
      const status =
        error.code === 'not_configured' ? 503 : 502

      return NextResponse.json(
        { error: `pod_${error.code}` },
        { status }
      )
    }

    return NextResponse.json(
      { error: 'pod_upstream_error' },
      { status: 502 }
    )
  }

  // 11. Confirm successful forwarding
  return NextResponse.json(
    { accepted: true },
    { status: 202 }
  )
}