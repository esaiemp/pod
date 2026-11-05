import 'server-only'

export const MAX_DIRECT_POD_UPLOAD_BYTES = 4 * 1024 * 1024

const enabled = (value: string | undefined) => value?.trim().toLowerCase() === 'true'

/**
 * Readiness gates for a dedicated, single-company deployment.
 * Verification flags must be set only after real integration tests pass.
 */
export function getIntegrationReadiness() {
  const airtableCredentialsConfigured = Boolean(
    process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN && process.env.AIRTABLE_BASE_ID,
  )
  const airtableSchemaVerified = enabled(process.env.AIRTABLE_SCHEMA_MAPPING_VERIFIED)
  const airtableFieldMapConfigured = Boolean(process.env.AIRTABLE_FIELD_MAP_JSON)

  const makeUrlConfigured = Boolean(process.env.MAKE_POD_SUBMISSION_WEBHOOK_URL)
  const makeFormatConfigured = process.env.MAKE_POD_UPLOAD_MODE === 'multipart-file-v1'
  const makeContractVerified = enabled(process.env.MAKE_POD_CONTRACT_VERIFIED)
  const makeIdempotencyVerified = enabled(process.env.MAKE_POD_IDEMPOTENCY_VERIFIED)

  return {
    airtable: {
      credentialsConfigured: airtableCredentialsConfigured,
      fieldMapConfigured: airtableFieldMapConfigured,
      schemaVerified: airtableSchemaVerified,
      ready:
        airtableCredentialsConfigured &&
        airtableFieldMapConfigured &&
        airtableSchemaVerified,
    },
    make: {
      urlConfigured: makeUrlConfigured,
      multipartModeConfigured: makeFormatConfigured,
      contractVerified: makeContractVerified,
      idempotencyVerified: makeIdempotencyVerified,
      podUploadReady:
        makeUrlConfigured &&
        makeFormatConfigured &&
        makeContractVerified &&
        makeIdempotencyVerified,
    },
  }
}

export function getPodUploadLimitBytes() {
  const configured = Number(process.env.POD_MAX_UPLOAD_BYTES)
  if (!Number.isInteger(configured) || configured <= 0) return MAX_DIRECT_POD_UPLOAD_BYTES
  return Math.min(configured, MAX_DIRECT_POD_UPLOAD_BYTES)
}
