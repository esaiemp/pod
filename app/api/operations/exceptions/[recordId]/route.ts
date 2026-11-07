
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { requirePortalUser } from '@/lib/auth/access'
import {
  AirtableIntegrationError,
  listCompanyRecords,
  updateCompanyRecord,
} from '@/lib/integrations/airtable'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const resolutionSchema = z.object({
  resolutionAction: z.enum([
    'Approve',
    'Request Signature',
    'Request Resubmission',
    'Reject',
  ]),
  resolutionNotes: z.string().trim().max(2000).default(''),
})

type RouteContext = {
  params: Promise<{
    recordId: string
  }>
}

function normalize(value: unknown): string {
  return String(value ?? '').trim().toLowerCase()
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    // 1. Authenticate and authorize the Back Office user.
    const profile = await requirePortalUser('BackOffice')

    const { recordId } = await context.params

    // 2. Validate Airtable record ID.
    if (!/^rec[A-Za-z0-9]+$/.test(recordId)) {
      return NextResponse.json(
        { error: 'Invalid exception record ID.' },
        { status: 400 },
      )
    }

    // 3. Validate submitted resolution details.
    const body = await request.json()
    const fields = resolutionSchema.parse(body)

    // 4. Retrieve the latest exception from Airtable.
    const records = await listCompanyRecords(
      'exceptions',
      '',
      {
        recordId,
        maxRecords: 1,
      },
    )

    const exception = records.find(
      (record) => record.id === recordId,
    )

    if (!exception) {
      return NextResponse.json(
        { error: 'Exception not found.' },
        { status: 404 },
      )
    }

    // 5. Check the current exception status.
    const currentStatus = normalize(
      exception.fields.Status,
    )

    // Finalized exceptions are strictly read-only.
    if (
      currentStatus === 'resolved' ||
      currentStatus === 'rejected'
    ) {
      return NextResponse.json(
        {
          error:
            'This exception has already been finalized and cannot be modified.',
          code: 'exception_finalized',
        },
        { status: 409 },
      )
    }

    // 6. Prevent duplicate submissions while Make is
    // processing or has completed the previous action.
    const currentProcessingState = normalize(
      exception.fields.ProcessingState,
    )

    if (
      currentProcessingState === 'processing' ||
      currentProcessingState === 'completed'
    ) {
      return NextResponse.json(
        {
          error:
            'This exception is already being processed or has been completed.',
          code: 'exception_processing',
        },
        { status: 409 },
      )
    }

    // 7. Update all three fields in Airtable.
    // Make will detect ResolutionAction and process
    // the requested workflow.
    const updatedRecord = await updateCompanyRecord(
      'exceptions',
      '',
      recordId,
      {
        resolutionAction: fields.resolutionAction,
        resolutionNotes: fields.resolutionNotes,
        status: 'Resolved',
      },
    )

    // 8. Return updated exception details.
    return NextResponse.json({
      success: true,
      message: 'Resolution action saved successfully.',
      exceptionId: updatedRecord.id,
      status: 'Resolved',
      resolutionAction: fields.resolutionAction,
      resolutionNotes: fields.resolutionNotes,
      updatedBy: profile.email,
    })
  } catch (error) {
    // Invalid request body or resolution action.
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid resolution data.',
          details: error.flatten(),
        },
        { status: 400 },
      )
    }

    // Airtable integration failures.
    if (error instanceof AirtableIntegrationError) {
      const status =
        error.code === 'not_found'
          ? 404
          : error.code === 'rate_limited'
            ? 429
            : error.code === 'not_configured' ||
                error.code === 'invalid_mapping'
              ? 503
              : 502

      return NextResponse.json(
        {
          error: 'Unable to update the POD exception.',
          code: error.code,
        },
        { status },
      )
    }

    // Do not expose internal errors to clients.
    console.error(
      '[POD Exception Resolution Error]',
      error,
    )

    return NextResponse.json(
      {
        error: 'Unable to save the resolution action.',
      },
      { status: 500 },
    )
  }
}
