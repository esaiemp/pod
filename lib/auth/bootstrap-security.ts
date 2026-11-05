import 'server-only'

import { createHash, timingSafeEqual } from 'node:crypto'
import type { NextRequest } from 'next/server'

const attempts = new Map<string, { count: number; expiresAt: number }>()

export function isBootstrapRateLimited(request: NextRequest) {
  const key = request.headers.get('x-real-ip') ?? request.headers.get('x-forwarded-for') ?? 'unknown'
  const now = Date.now()
  const current = attempts.get(key)

  if (!current || current.expiresAt < now) {
    attempts.set(key, { count: 1, expiresAt: now + 15 * 60 * 1000 })
    return false
  }

  current.count += 1
  return current.count > 5
}

export function matchesBootstrapSecret(provided: string, configured: string) {
  const providedHash = createHash('sha256').update(provided).digest()
  const configuredHash = createHash('sha256').update(configured).digest()
  return timingSafeEqual(providedHash, configuredHash)
}

export function clearBootstrapRateLimits() {
  attempts.clear()
}
