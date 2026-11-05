import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

interface AuditEvent {
  actorUserId: string | null
  companyId: string
  action: string
  entityType: string
  entityId?: string | null
  metadata?: Record<string, string | number | boolean | null>
}

export async function writeAuditEvent(event: AuditEvent) {
  const admin = createAdminClient()
  const { error } = await admin.from('audit_logs').insert({
    actor_user_id: event.actorUserId,
    company_id: event.companyId,
    action: event.action,
    entity_type: event.entityType,
    entity_id: event.entityId ?? null,
    metadata: event.metadata ?? {},
  })

  if (error) {
    console.error(
      JSON.stringify({
        event: 'portal_audit_write_failed',
        action: event.action,
        entityType: event.entityType,
        errorCode: error.code,
      }),
    )
  }
}
