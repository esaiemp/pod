'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, UserPlus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { ManagedUser } from '@/lib/types'

export function UserDirectory({ users }: { users: ManagedUser[] }) {
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busyUserId, setBusyUserId] = useState<string | null>(null)
  const router = useRouter()
  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return users
    return users.filter((user) => `${user.fullName} ${user.email} ${user.role}`.toLowerCase().includes(normalized))
  }, [query, users])

  async function toggleActive(user: ManagedUser) {
    setError(null)
    setBusyUserId(user.userId)
    try {
      const response = await fetch(`/api/admin/users/${user.userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive }),
      })
      if (!response.ok) {
        setError('Access status could not be updated.')
        return
      }
      router.refresh()
    } catch {
      setError('Access status could not be updated. Try again shortly.')
    } finally {
      setBusyUserId(null)
    }
  }

  if (users.length === 0) {
    return (
      <Empty className="rounded-2xl border bg-card py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon"><UserPlus aria-hidden="true" /></EmptyMedia>
          <EmptyTitle>No users yet</EmptyTitle>
          <EmptyDescription>Provision drivers and operations teammates for this company.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent><Link href="/operations/users/new" className={buttonVariants()}><UserPlus data-icon="inline-start" aria-hidden="true" /> Add a user</Link></EmptyContent>
      </Empty>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-sm">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search users" className="pl-9" aria-label="Search users" />
        </div>
        <Link href="/operations/users/new" className={buttonVariants()}><UserPlus data-icon="inline-start" aria-hidden="true" /> Add user</Link>
      </div>
      {error ? <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p> : null}
      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Access</TableHead>
                <TableHead>Legacy mapping</TableHead>
                <TableHead className="text-right">Manage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.userId}>
                  <TableCell className="min-w-56">
                    <p className="font-medium text-foreground">{user.fullName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{user.email}</p>
                  </TableCell>
                  <TableCell><Badge variant="outline">{user.role}</Badge>{user.isAdmin ? <Badge variant="secondary" className="ml-2">Admin</Badge> : null}</TableCell>
                  <TableCell><Badge variant={user.isActive ? 'secondary' : 'outline'}>{user.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                  <TableCell className="max-w-48 truncate text-sm text-muted-foreground">{user.legacyDriverUserId ?? 'Not linked'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/operations/users/${user.userId}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>Manage</Link>
                      <Button type="button" variant="ghost" size="sm" disabled={busyUserId === user.userId} onClick={() => toggleActive(user)} aria-label={`${user.isActive ? 'Deactivate' : 'Activate'} ${user.fullName}`}>
                        {user.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 ? <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">No users match that search.</TableCell></TableRow> : null}
            </TableBody>
          </Table>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Showing {filteredUsers.length} of {users.length} company users.</p>
    </div>
  )
}
