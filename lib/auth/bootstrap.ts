import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

export async function getBootstrapStatus() {
  if (!process.env.PORTAL_BOOTSTRAP_SECRET) {
    return { enabled: false, complete: false }
  }

  const admin = createAdminClient()
  const { count, error } = await admin
    .from('user_profiles')
    .select('user_id', { count: 'exact', head: true })

  if (error) throw new Error('Unable to check portal bootstrap status.')
  return { enabled: true, complete: (count ?? 0) > 0 }
}
