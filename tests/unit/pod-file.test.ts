import { describe, expect, it } from 'vitest'
import { hasValidPodFileSignature, validatePodFileMetadata } from '@/lib/security/pod-file'

const maxBytes = 4 * 1024 * 1024

describe('POD file validation', () => {
  it('accepts supported PDF, PNG, and JPEG metadata under the limit', () => {
    expect(validatePodFileMetadata({ name: 'delivery.pdf', type: 'application/pdf', size: 1024 }, maxBytes).valid).toBe(true)
    expect(validatePodFileMetadata({ name: 'delivery.png', type: 'image/png', size: 1024 }, maxBytes).valid).toBe(true)
    expect(validatePodFileMetadata({ name: 'delivery.jpeg', type: 'image/jpeg', size: 1024 }, maxBytes).valid).toBe(true)
  })

  it('rejects unsupported extensions and MIME mismatches', () => {
    expect(validatePodFileMetadata({ name: 'delivery.exe', type: 'application/pdf', size: 100 }, maxBytes).valid).toBe(false)
    expect(validatePodFileMetadata({ name: 'delivery.pdf', type: 'image/png', size: 100 }, maxBytes).valid).toBe(false)
  })

  it('rejects empty and oversized files', () => {
    expect(validatePodFileMetadata({ name: 'delivery.pdf', type: 'application/pdf', size: 0 }, maxBytes).valid).toBe(false)
    expect(validatePodFileMetadata({ name: 'delivery.pdf', type: 'application/pdf', size: maxBytes + 1 }, maxBytes).valid).toBe(false)
  })

  it('checks file signatures independently of filename and MIME', () => {
    expect(hasValidPodFileSignature(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]), 'application/pdf')).toBe(true)
    expect(hasValidPodFileSignature(new Uint8Array([0, 0, 0, 0, 0]), 'application/pdf')).toBe(false)
    expect(hasValidPodFileSignature(new Uint8Array([0xff, 0xd8, 0xff]), 'image/jpeg')).toBe(true)
  })
})
