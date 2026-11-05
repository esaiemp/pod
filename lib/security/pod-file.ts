export const POD_FILE_TYPES = {
  'application/pdf': ['pdf'],
  'image/png': ['png'],
  'image/jpeg': ['jpg', 'jpeg'],
} as const

export type PodMimeType = keyof typeof POD_FILE_TYPES
export type PodFileMetadata = Pick<File, 'name' | 'size' | 'type'>

export type PodFileValidation =
  | { valid: true; mimeType: PodMimeType }
  | { valid: false; message: string }

export function validatePodFileMetadata(
  file: PodFileMetadata,
  maxBytes: number,
): PodFileValidation {
  const extension = file.name.split('.').pop()?.toLowerCase()
  const mimeType = file.type as PodMimeType
  const allowedExtensions = POD_FILE_TYPES[mimeType]

  if (!allowedExtensions || !extension || !allowedExtensions.includes(extension as never)) {
    return { valid: false, message: 'Choose a PDF, PNG, or JPEG file.' }
  }

  if (!Number.isFinite(file.size) || file.size <= 0) {
    return { valid: false, message: 'The selected file is empty or unreadable.' }
  }

  if (file.size > maxBytes) {
    return {
      valid: false,
      message: `The file must be ${formatBytes(maxBytes)} or smaller.`,
    }
  }

  return { valid: true, mimeType }
}

export function hasValidPodFileSignature(bytes: Uint8Array, mimeType: PodMimeType) {
  if (mimeType === 'application/pdf') {
    return bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === '%PDF-'
  }

  if (mimeType === 'image/png') {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
    return signature.every((byte, index) => bytes[index] === byte)
  }

  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
}

export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`
}
