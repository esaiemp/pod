
import { NextRequest, NextResponse } from 'next/server'

import { requirePortalUser } from '@/lib/auth/access'
import {
  AirtableIntegrationError,
  getDriverException,
} from '@/lib/integrations/airtable'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{
    recordId: string
  }>
}

function readText(value: unknown): string | null {
  return typeof value === 'string'
    ? value.trim() || null
    : null
}

export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const profile = await requirePortalUser('Driver')
    const { recordId } = await context.params

    if (!/^rec[A-Za-z0-9]+$/.test(recordId)) {
      return NextResponse.json(
        { error: 'Invalid exception ID.' },
        { status: 400 },
      )
    }

    const exception = await getDriverException(
      profile.email,
      recordId,
    )

    if (!exception) {
      return NextResponse.json(
        { error: 'Exception not found.' },
        { status: 404 },
      )
    }

    const fields = exception.fields

    return NextResponse.json(
      {
        id: exception.id,
        loadNumber: readText(fields.LoadNumber),
        reason: readText(fields.Reason),
        status: readText(fields.Status),
        processingState: readText(fields.ProcessingState),
        resolutionAction: readText(fields.ResolutionAction),
        resolutionNotes: readText(fields.ResolutionNotes),
        documentUrl: readText(fields.DocumentURL),
      },
      {
        headers: {
          'Cache-Control': 'private, no-store',
        },
      },
    )
  } catch (error) {
    if (error instanceof AirtableIntegrationError) {
      return NextResponse.json(
        {
          error: 'Unable to retrieve exception details.',
        },
        {
          status:
            error.code === 'rate_limited'
              ? 429
              : error.code === 'not_found'
                ? 404
                : 503,
        },
      )
    }

    console.error('[Driver Exception Details]', error)

    return NextResponse.json(
      { error: 'Unable to retrieve exception details.' },
      { status: 500 },
    )
  }
}
