
import 'server-only'

import {
  listCompanyRecords,
  type AirtableRecord,
} from '@/lib/integrations/airtable'

export interface PodLoad {
  id: string
  loadNumber: string | null
  customer: string | null
  driver: string | null
  pickupLocation: string | null
  deliveryLocation: string | null
  podStatus: string | null
  invoiceStatus: string | null
  deliveryDate: string | null
  podFileUrl: string | null
  podReceivedDate: string | null
  exceptionReason: string | null
}

function readText(value: unknown): string | null {
  if (typeof value === 'string') {
    return value.trim() || null
  }

  if (typeof value === 'number') {
    return String(value)
  }

  if (Array.isArray(value)) {
    const values = value
      .filter(
        (item): item is string =>
          typeof item === 'string',
      )
      .map((item) => item.trim())
      .filter(Boolean)

    return values.length ? values.join(', ') : null
  }

  return null
}

function mapLoad(record: AirtableRecord): PodLoad {
  const fields = record.fields

  return {
    id: record.id,
    loadNumber: readText(fields.LoadNumber),
    customer: readText(fields.Customer),
    driver: readText(fields.Driver),
    pickupLocation: readText(fields.PickupLocation),
    deliveryLocation: readText(fields.DeliveryLocation),
    podStatus: readText(fields.PODStatus),
    invoiceStatus: readText(fields.InvoiceStatus),
    deliveryDate: readText(fields.DeliveryDate),
    podFileUrl: readText(fields.PODFileUrl),
    podReceivedDate: readText(fields.PODReceivedDate),
    exceptionReason: readText(fields.ExceptionReason),
  }
}

export async function getPodLoads(): Promise<PodLoad[]> {
  const records = await listCompanyRecords(
    'loads',
    '',
    { maxRecords: 1000 },
  )

  return records
    .map(mapLoad)
    .sort((a, b) =>
      (a.loadNumber ?? '').localeCompare(
        b.loadNumber ?? '',
        undefined,
        { numeric: true },
      ),
    )
}
