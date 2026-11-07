
import 'server-only'

import {
  listCompanyRecords,
  type AirtableRecord,
} from '@/lib/integrations/airtable'

export interface PodException {
  id: string
  loadNumber: string | null
  reason: string
  status: string
  processingState: string | null
  resolutionAction: string | null
  resolutionNotes: string | null
  documentUrl: string | null
  createdAt: string | null
}

function text(value: unknown): string | null {
  if (typeof value !== 'string') return null
  return value.trim() || null
}

function mapException(record: AirtableRecord): PodException {
  const fields = record.fields

  return {
    id: record.id,
    loadNumber: text(fields.LoadNumber),
    reason: text(fields.Reason) ?? 'Not specified',
    status: text(fields.Status) ?? 'Pending Review',
    processingState: text(fields.ProcessingState),
    resolutionAction: text(fields.ResolutionAction),

    // Retrieve the resolution notes from Airtable
    resolutionNotes: text(fields.ResolutionNotes),

    documentUrl: text(fields.DocumentURL),
    createdAt: text(fields.CreatedAt),
  }
}

export async function getPodExceptions(): Promise<PodException[]> {
  const records = await listCompanyRecords(
    'exceptions',
    '',
    { maxRecords: 1000 }
  )

  return records
    .map(mapException)
    .sort(
      (a, b) =>
        (Date.parse(b.createdAt ?? '') || 0) -
        (Date.parse(a.createdAt ?? '') || 0)
    )
}
