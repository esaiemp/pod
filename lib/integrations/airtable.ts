import 'server-only'

import { z } from 'zod'
import { getIntegrationReadiness } from '@/lib/integrations/readiness'

// A dedicated Airtable base is used for each customer deployment.
// Logical field names must match the names used by the API routes.
const tableConfigSchema = z.object({
  fields: z.record(z.string(), z.string().min(1)),
})
const fieldMapSchema = z.record(z.string(), tableConfigSchema)

export interface AirtableRecord {
  id: string
  createdTime?: string
  fields: Record<string, unknown>
}

export class AirtableIntegrationError extends Error {
  constructor(
    readonly code:
      | 'not_configured'
      | 'invalid_mapping'
      | 'not_found'
      | 'rate_limited'
      | 'upstream_error',
  ) {
    super(code)
    this.name = 'AirtableIntegrationError'
  }
}

function parseFieldMap() {
  const readiness = getIntegrationReadiness().airtable
  if (!readiness.ready) throw new AirtableIntegrationError('not_configured')

  try {
    return fieldMapSchema.parse(JSON.parse(process.env.AIRTABLE_FIELD_MAP_JSON ?? '{}'))
  } catch {
    throw new AirtableIntegrationError('invalid_mapping')
  }
}

function getTableConfig(tableName: string) {
  const table = parseFieldMap()[tableName]
  if (!table) throw new AirtableIntegrationError('invalid_mapping')
  return table
}

function airtableBase() {
  const baseId = process.env.AIRTABLE_BASE_ID
  const token = process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
  if (!baseId || !/^app[A-Za-z0-9]+$/.test(baseId) || !token) {
    throw new AirtableIntegrationError('not_configured')
  }
  return { baseId, token }
}

async function airtableFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { baseId, token } = airtableBase()
  let response: Response
  try {
    response = await fetch(`https://api.airtable.com/v0/${baseId}/${path}`, {
      ...init,
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init?.headers ?? {}),
      },
      signal: AbortSignal.timeout(15_000),
    })
  } catch {
    throw new AirtableIntegrationError('upstream_error')
  }

  if (response.status === 429) throw new AirtableIntegrationError('rate_limited')
  if (response.status === 404) throw new AirtableIntegrationError('not_found')
  if (!response.ok) throw new AirtableIntegrationError('upstream_error')
  try {
    return (await response.json()) as T
  } catch {
    throw new AirtableIntegrationError('upstream_error')
  }
}

/**
 * List records from this deployment's dedicated Airtable base.
 * The companyId argument is retained for compatibility with existing callers,
 * but it is intentionally NOT used to filter Airtable records.
 *
 * SECURITY: API routes must authorize users and enforce driver-level visibility.
 * Never expose this unfiltered function directly to a Driver client.
 */
export async function listCompanyRecords(
  tableName: string,
  _companyId: string,
  options: { recordId?: string; maxRecords?: number } = {},
): Promise<AirtableRecord[]> {
  const table = getTableConfig(tableName)
  const maxRecords = Math.min(Math.max(options.maxRecords ?? 100, 1), 1000)
  const params = new URLSearchParams({ pageSize: '100' })

  if (options.recordId) {
    if (!/^rec[A-Za-z0-9]+$/.test(options.recordId)) {
      throw new AirtableIntegrationError('not_found')
    }
    // URLSearchParams performs URL encoding; do not encode the record ID twice.
    params.set('filterByFormula', `RECORD_ID() = "${options.recordId}"`)
  }

  for (const field of new Set(Object.values(table.fields))) {
    params.append('fields[]', field)
  }

  const records: AirtableRecord[] = []
  let offset: string | undefined
  do {
    if (offset) params.set('offset', offset)
    const query = await airtableFetch<{
      records?: AirtableRecord[]
      offset?: string
    }>(`${encodeURIComponent(tableName)}?${params.toString()}`)

    if (!Array.isArray(query.records)) {
      throw new AirtableIntegrationError('upstream_error')
    }
    records.push(...query.records.slice(0, maxRecords - records.length))
    offset = query.offset
  } while (offset && records.length < maxRecords)

  return records
}

/**
 * Update a record in this deployment's Airtable base.
 * SECURITY: Callers must enforce role permissions, record ownership where
 * applicable, and an allowlist of editable logical fields.
 */
export async function updateCompanyRecord(
  tableName: string,
  _companyId: string,
  recordId: string,
  logicalFields: Record<string, unknown>,
) {
  if (!/^rec[A-Za-z0-9]+$/.test(recordId)) {
    throw new AirtableIntegrationError('not_found')
  }

  const table = getTableConfig(tableName)
  const records = await listCompanyRecords(tableName, _companyId, {
    recordId,
    maxRecords: 2,
  })
  if (!records.some((record) => record.id === recordId)) {
    throw new AirtableIntegrationError('not_found')
  }

  const fields = Object.fromEntries(
    Object.entries(logicalFields).map(([logicalName, value]) => {
      const fieldName = table.fields[logicalName]
      if (!fieldName) throw new AirtableIntegrationError('invalid_mapping')
      return [fieldName, value]
    }),
  )

  if (Object.keys(fields).length === 0) {
    throw new AirtableIntegrationError('invalid_mapping')
  }

  return airtableFetch<AirtableRecord>(
    `${encodeURIComponent(tableName)}/${encodeURIComponent(recordId)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    },
  )
}

export async function listDriverSubmissions(
  driverEmail: string,
  maxRecords = 100,
): Promise<AirtableRecord[]> {
  const table = getTableConfig('submissions')

  const emailField = table.fields.driverEmail

  if (!emailField || !driverEmail?.trim()) {
    throw new AirtableIntegrationError('invalid_mapping')
  }

  const normalizedEmail = driverEmail.trim().toLowerCase()

  // Safely encode values for Airtable formula strings.
  const escapeFormula = (value: string) =>
    value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')

  const filterByFormula =
    `LOWER({${emailField.replaceAll('}', '\\}')}}) = ` +
    `"${escapeFormula(normalizedEmail)}"`

  const params = new URLSearchParams({
    pageSize: '100',
    filterByFormula,
  })

  const records: AirtableRecord[] = []
  let offset: string | undefined

  const limit = Math.min(Math.max(maxRecords, 1), 1000)

  do {
    if (offset) params.set('offset', offset)

    const result = await airtableFetch<{
      records?: AirtableRecord[]
      offset?: string
    }>(
      `${encodeURIComponent('POD Submissions')}?${params.toString()}`
    )

    if (!Array.isArray(result.records)) {
      throw new AirtableIntegrationError('upstream_error')
    }

    records.push(...result.records.slice(0, limit - records.length))
    offset = result.offset
  } while (offset && records.length < limit)

  return records
}