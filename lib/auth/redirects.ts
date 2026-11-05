import 'server-only'

const RECOVERY_PATH = '/account/reset-password'

function isProductionDeployment() {
  return process.env.VERCEL_ENV === 'production' || (!process.env.VERCEL_ENV && process.env.NODE_ENV === 'production')
}

function getProductionAppUrl() {
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  if (process.env.APP_URL) return process.env.APP_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return undefined
}

export function getTrustedAppOrigin(requestOrigin?: string) {
  const isProduction = isProductionDeployment()
  const configuredOrigin = isProduction
    ? getProductionAppUrl()
    : process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? process.env.APP_URL

  if (configuredOrigin) {
    const url = new URL(configuredOrigin)
    if (isProduction && url.protocol !== 'https:') {
      throw new Error('APP_URL must use HTTPS in production.')
    }
    return url.origin
  }

  if (!isProduction && requestOrigin) {
    const url = new URL(requestOrigin)
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      return url.origin
    }
  }

  throw new Error('Set APP_URL before generating account recovery links.')
}

export function getRecoveryRedirectUrl(origin: string) {
  const isProduction = isProductionDeployment()
  const redirectUrl = isProduction
    ? new URL('/auth/callback', origin)
    : process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL
      ? new URL(process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL)
      : new URL('/auth/callback', origin)

  if (isProduction && redirectUrl.protocol !== 'https:') {
    throw new Error('Recovery redirects must use HTTPS in production.')
  }

  if (!isProduction) redirectUrl.searchParams.set('next', RECOVERY_PATH)
  return redirectUrl.toString()
}

export function getSafeAuthCallbackPath(value: string | null, origin: string) {
  if (!value) return '/'

  try {
    const candidate = new URL(value, origin)
    if (candidate.origin === origin && candidate.pathname === RECOVERY_PATH) {
      return RECOVERY_PATH
    }
  } catch {
    return '/'
  }

  return '/'
}
