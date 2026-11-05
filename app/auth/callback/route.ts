import { NextResponse, type NextRequest } from 'next/server'
import { getSafeAuthCallbackPath } from '@/lib/auth/redirects'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin
  const code = request.nextUrl.searchParams.get('code')
  const tokenHash = request.nextUrl.searchParams.get('token_hash')
  const type = request.nextUrl.searchParams.get('type')
  const next = getSafeAuthCallbackPath(
    request.nextUrl.searchParams.get('next') ?? '/account/reset-password',
    origin,
  )
  const supabase = await createClient()

  let error: unknown
  if (code) {
    const result = await supabase.auth.exchangeCodeForSession(code)
    error = result.error
  } else if (tokenHash && type === 'recovery') {
    const result = await supabase.auth.verifyOtp({ type: 'recovery', token_hash: tokenHash })
    error = result.error
  } else {
    return NextResponse.redirect(new URL('/login?error=invalid_link', origin))
  }

  if (error) return NextResponse.redirect(new URL('/login?error=invalid_link', origin))
  return NextResponse.redirect(new URL(next, origin))
}
