export interface StudioState {
  source: string
  theme: string
  width: number
}

const STORAGE_KEY = 'mplate-studio:draft'
const HASH_PREFIX = '#dsl='

export function encodeShare(state: StudioState): string {
  const json = JSON.stringify(state)
  const bytes = new TextEncoder().encode(json)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function isStudioState(value: unknown): value is StudioState {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return typeof candidate.source === 'string' && typeof candidate.theme === 'string' && typeof candidate.width === 'number'
}

export function decodeShare(encoded: string): StudioState | undefined {
  try {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4))
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes))
    return isStudioState(parsed) ? parsed : undefined
  } catch {
    return undefined
  }
}

export function shareUrl(state: StudioState, location: Location): string {
  return `${location.origin}${location.pathname}${HASH_PREFIX}${encodeShare(state)}`
}

export function readSharedState(location: Location): StudioState | undefined {
  return location.hash.startsWith(HASH_PREFIX) ? decodeShare(location.hash.slice(HASH_PREFIX.length)) : undefined
}

export function loadDraft(): StudioState | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return undefined
    const parsed: unknown = JSON.parse(raw)
    return isStudioState(parsed) ? parsed : undefined
  } catch {
    return undefined
  }
}

export function saveDraft(state: StudioState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    return
  }
}
