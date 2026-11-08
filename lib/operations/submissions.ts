
import 'server-only'

import { listCompanyRecords } from '@/lib/integrations/airtable'

export interface PodSubmission {
  id: string
  reference: string
  driverName: string
  driverEmail: string | null
  loadNumber: string | null
  submittedAt: string | null
  status: string
  documentUrl: string | null
  exceptionIds: string[]
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function asLinks(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is string => typeof item === 'string',
      )
    : []
}

export async function getPodSubmissions(): Promise<PodSubmission[]> {
  const [submissions, loads] = await Promise.all([
    listCompanyRecords('submissions', '', { maxRecords: 1000 }),
    listCompanyRecords('loads', '', { maxRecords: 1000 }),
  ])

  const loadNumberById = new Map(
    loads.map((record) => [
      record.id,
      asString(record.fields.LoadNumber),
    ]),
  )

  return submissions
    .map((record) => {
      const fields = record.fields

      const loadNumbers = asLinks(fields['Link To Load'])
        .map((id) => loadNumberById.get(id))
        .filter((value): value is string => Boolean(value))

      return {
        id: record.id,
        reference: asString(fields['Submission Reference']) || record.id,
        driverName: asString(fields['Driver Name']) || 'Unknown',
        driverEmail: asString(fields['Driver Email']) || null,
        loadNumber: loadNumbers.join(', ') || null,
        submittedAt: asString(fields['Submission Date']) || null,
        status: asString(fields['Submission Status']) || 'Unknown',
        documentUrl: asString(fields['Doc Link']) || null,
        exceptionIds: asLinks(fields['Link To Exception']),
      }
    })
    .sort(
      (a, b) =>
        (Date.parse(b.submittedAt ?? '') || 0) -
        (Date.parse(a.submittedAt ?? '') || 0),
    )
}
