import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getRecoveryRedirectUrl,
  getSafeAuthCallbackPath,
  getTrustedAppOrigin,
} from '@/lib/auth/redirects'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('recovery redirects', () => {
  it('prefers the Vercel production domain over a stale APP_URL', () => {
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('APP_URL', 'https://dailysparktech.com/pod/')
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'dailyspark-pod-portal-development.vercel.app')
    vi.stubEnv('NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL', 'http://localhost:3000/auth/callback')

    const origin = getTrustedAppOrigin('http://localhost:3000')
    const redirect = new URL(getRecoveryRedirectUrl(origin))

    expect(redirect.origin).toBe('https://dailyspark-pod-portal-development.vercel.app')
    expect(redirect.pathname).toBe('/auth/callback')
    expect(redirect.search).toBe('')
  })

  it('preserves the v0 redirect proxy outside production', () => {
    vi.stubEnv('VERCEL_ENV', 'preview')
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('APP_URL', 'https://dailyspark-pod-portal-development.vercel.app')
    vi.stubEnv('NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL', 'https://v0-preview.example/auth/callback?source=preview')

    const origin = getTrustedAppOrigin('https://preview.example')
    const redirect = new URL(getRecoveryRedirectUrl(origin))

    expect(redirect.origin).toBe('https://v0-preview.example')
    expect(redirect.pathname).toBe('/auth/callback')
    expect(redirect.searchParams.get('source')).toBe('preview')
    expect(redirect.searchParams.get('next')).toBe('/account/reset-password')
  })
})

describe('auth callback destination', () => {
  const origin = 'https://dailyspark-pod-portal-development.vercel.app'

  it('allows only the password reset page', () => {
    expect(getSafeAuthCallbackPath('/account/reset-password?next=https://outside.example', origin)).toBe('/account/reset-password')
    expect(getSafeAuthCallbackPath('/operations', origin)).toBe('/')
  })

  it('rejects external redirect URLs', () => {
    expect(getSafeAuthCallbackPath('https://outside.example/account/reset-password', origin)).toBe('/')
    expect(getSafeAuthCallbackPath('//outside.example', origin)).toBe('/')
  })
})
