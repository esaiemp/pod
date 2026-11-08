
'use client'

import { useMemo, useState } from 'react'
import {
  ExternalLink,
  FileCheck2,
  Search,
  Truck,
  X,
} from 'lucide-react'

import type { PodLoad } from '@/lib/operations/load'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

type Props = {
  loads: PodLoad[]
}

function normalize(value: string | null): string {
  return (value ?? '').trim().toLowerCase()
}

function isInvoiceReady(value: string | null): boolean {
  const status = normalize(value).replace(/[\s_-]+/g, '')
  return status === 'ready' || status === 'invoiceready'
}

function hasPod(value: string | null): boolean {
  const status = normalize(value)
  return [
    'received',
    'completed',
    'approved',
    'verified',
  ].includes(status)
}

function formatDate(value: string | null): string {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

function isSafeDocumentUrl(
  value: string | null,
): value is string {
  if (!value) return false

  try {
    const url = new URL(value)
    return (
      url.protocol === 'https:' &&
      [
        'drive.google.com',
        'docs.google.com',
      ].includes(url.hostname)
    )
  } catch {
    return false
  }
}

function StatusBadge({
  value,
  type,
}: {
  value: string | null
  type: 'pod' | 'invoice'
}) {
  const label = value || 'Not set'
  const status = normalize(value)

  const success =
    type === 'invoice'
      ? isInvoiceReady(value) ||
        ['invoiced', 'paid'].includes(status)
      : hasPod(value)

  const warning = [
    'pending',
    'processing',
    'missing',
    'exception',
    'not received',
  ].includes(status)

  return (
    <Badge
      variant="outline"
      className={
        success
          ? 'border-green-200 bg-green-50 text-green-800'
          : warning
            ? 'border-amber-200 bg-amber-50 text-amber-800'
            : 'border-slate-200 bg-slate-50 text-slate-700'
      }
    >
      {label}
    </Badge>
  )
}

function Detail({
  label,
  value,
}: {
  label: string
  value: string | null
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium">
        {value || '—'}
      </p>
    </div>
  )
}

export function LoadsDashboard({ loads }: Props) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<
    'all' | 'invoice-ready' | 'pod-missing'
  >('all')
  const [selectedLoad, setSelectedLoad] =
    useState<PodLoad | null>(null)

  const invoiceReadyCount = loads.filter(
    (load) => isInvoiceReady(load.invoiceStatus),
  ).length

  const missingPodCount = loads.filter(
    (load) => !hasPod(load.podStatus),
  ).length

  const filteredLoads = useMemo(() => {
    const query = search.trim().toLowerCase()

    return loads.filter((load) => {
      const matchesSearch =
        !query ||
        [
          load.loadNumber,
          load.customer,
          load.driver,
          load.pickupLocation,
          load.deliveryLocation,
          load.podStatus,
          load.invoiceStatus,
        ].some((value) =>
          normalize(value).includes(query),
        )

      const matchesFilter =
        filter === 'all' ||
        (filter === 'invoice-ready' &&
          isInvoiceReady(load.invoiceStatus)) ||
        (filter === 'pod-missing' &&
          !hasPod(load.podStatus))

      return matchesSearch && matchesFilter
    })
  }, [loads, search, filter])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-teal-700">
          Operations
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          All Loads
        </h1>
        <p className="mt-2 text-muted-foreground">
          Search, monitor and review delivery records
          from Airtable.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <Truck className="size-4" />
              Total Loads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {loads.length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileCheck2 className="size-4" />
              Invoice Ready
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-700">
              {invoiceReadyCount}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <X className="size-4" />
              POD Not Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-700">
              {missingPodCount}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Load Records</CardTitle>
          <p className="text-sm text-muted-foreground">
            {filteredLoads.length} of {loads.length} loads
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search load, customer, driver..."
                className="pl-9"
              />
            </div>

            <select
              aria-label="Filter loads"
              value={filter}
              onChange={(event) =>
                setFilter(
                  event.target.value as typeof filter,
                )
              }
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="all">All Loads</option>
              <option value="invoice-ready">
                Invoice Ready
              </option>
              <option value="pod-missing">
                POD Not Completed
              </option>
            </select>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-muted/40">
                <tr className="border-b text-left">
                  {[
                    'Load Number',
                    'Customer',
                    'Driver',
                    'Delivery Date',
                    'POD Status',
                    'Invoice Status',
                    'Action',
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-4 py-3 font-semibold"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filteredLoads.map((load) => (
                  <tr
                    key={load.id}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-medium">
                      {load.loadNumber || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {load.customer || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {load.driver || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {formatDate(load.deliveryDate)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        value={load.podStatus}
                        type="pod"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        value={load.invoiceStatus}
                        type="invoice"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setSelectedLoad(load)
                        }
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}

                {filteredLoads.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-muted-foreground"
                    >
                      No matching loads found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={selectedLoad !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedLoad(null)
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>
              Load {selectedLoad?.loadNumber || 'Details'}
            </DialogTitle>
            <DialogDescription>
              Delivery information and document status.
            </DialogDescription>
          </DialogHeader>

          {selectedLoad && (
            <div className="space-y-5 py-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <Detail
                  label="Customer"
                  value={selectedLoad.customer}
                />
                <Detail
                  label="Driver"
                  value={selectedLoad.driver}
                />
                <Detail
                  label="Pickup Location"
                  value={selectedLoad.pickupLocation}
                />
                <Detail
                  label="Delivery Location"
                  value={selectedLoad.deliveryLocation}
                />
                <Detail
                  label="Delivery Date"
                  value={formatDate(
                    selectedLoad.deliveryDate,
                  )}
                />
                <Detail
                  label="POD Received Date"
                  value={formatDate(
                    selectedLoad.podReceivedDate,
                  )}
                />
              </div>

              <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    POD Status
                  </p>
                  <StatusBadge
                    value={selectedLoad.podStatus}
                    type="pod"
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Invoice Status
                  </p>
                  <StatusBadge
                    value={selectedLoad.invoiceStatus}
                    type="invoice"
                  />
                </div>
              </div>

              {selectedLoad.exceptionReason && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-900">
                    Exception Reason
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-amber-900">
                    {selectedLoad.exceptionReason}
                  </p>
                </div>
              )}

              {isSafeDocumentUrl(
                selectedLoad.podFileUrl,
              ) && (
                <a
                  href={selectedLoad.podFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-teal-700 hover:underline"
                >
                  View POD Document
                  <ExternalLink className="size-4" />
                </a>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setSelectedLoad(null)
                  }
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
