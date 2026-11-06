import 'server-only'

import { listCompanyRecords } from '../integrations/airtable'

export interface RecentPodSubmission {
  id: string
  reference: string
  driverName: string
  loadNumber: string | null
  submittedAt: string | null
  status: string
  documentUrl: string | null
}

export interface RecentPodException {
  id: string
  loadNumber: string
  reason: string
  status: string
  createdAt: string | null
  documentUrl: string | null
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function asLinks(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is string => typeof item === 'string'
      )
    : []
}

function timestamp(value: string): number {
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export async function getOperationsOverview() {
  const [loads, submissions, exceptions] = await Promise.all([
    listCompanyRecords('loads', '', { maxRecords: 1000 }),
    listCompanyRecords('submissions', '', { maxRecords: 1000 }),
    listCompanyRecords('exceptions', '', { maxRecords: 1000 }),
  ])

  // 1. Invoice-ready loads
  const invoiceReady = loads.filter(
    (record) =>
      asString(record.fields.InvoiceStatus)
        .trim()
        .toLowerCase() === 'ready'
  ).length

  // 2. Open exceptions
  const openExceptionRecords = exceptions.filter((record) => {
    const status = asString(record.fields.Status)
      .trim()
      .toLowerCase()

    const processingState = asString(
      record.fields.ProcessingState
    )
      .trim()
      .toLowerCase()

    return (
      status !== 'resolved' &&
      status !== 'rejected' &&
      processingState !== 'completed'
    )
  })

  const openExceptions = openExceptionRecords.length

  // 3. Pending or processing POD submissions
  const pendingProcessing = submissions.filter((record) => {
    const status = asString(
      record.fields['Submission Status']
    )
      .trim()
      .toLowerCase()

    return ['pending', 'received', 'processing'].includes(
      status
    )
  }).length

  // 4. Recent POD submissions
  const recentSubmissions = submissions
  .map((record) => ({
    id: record.id,
    reference: asString(
      record.fields['Submission Reference']
    ),
    driverName: asString(
      record.fields['Driver Name']
    ),
    loadNumber: null as string | null,
    submittedAt: asString(
      record.fields['Submission Date']
    ) || null,
    status: asString(
      record.fields['Submission Status']
    ) || 'Unknown',
    documentUrl: asString(
      record.fields['Doc Link']
    ) || null,
    loadIds: asLinks(
      record.fields['Link To Load']
    ),
  }))
  .sort(
    (a, b) =>
      timestamp(b.submittedAt ?? '') -
      timestamp(a.submittedAt ?? '')
  )
  .slice(0, 10)

  // 5. Exceptions requiring attention
  const recentExceptions = openExceptionRecords
    .map((record) => ({
      id: record.id,
      loadNumber: asString(
        record.fields.LoadNumber
      ),
      reason: asString(
        record.fields.Reason
      ),
      status: asString(
        record.fields.Status
      ),
      processingState: asString(
        record.fields.ProcessingState
      ),
      createdAt: asString(record.fields.CreatedAt) || null,
      documentUrl: asString(record.fields.DocumentURL) || null,
    }))
    .sort(
      (a, b) =>
        timestamp(b.createdAt ?? '') -
        timestamp(a.createdAt ?? '')
    )
    .slice(0, 10)

  return {
    totalLoads: loads.length,
    totalSubmissions: submissions.length,
    invoiceReady,
    openExceptions,
    pendingProcessing,
    recentSubmissions,
    recentExceptions,
  }
}