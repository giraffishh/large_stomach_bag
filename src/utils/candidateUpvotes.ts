const CANDIDATE_UPVOTES_KEY = 'candidateUpvotes'
const CANDIDATE_UPVOTES_COOKIE_KEY = 'cu'
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365
const COOKIE_VALUE_MAX_LENGTH = 3800

export function loadCandidateUpvotedIds(): Set<string> {
  const ids = new Set<string>()

  for (const id of loadLocalStorageIds()) {
    ids.add(id)
  }

  for (const id of loadCookieIds()) {
    ids.add(id)
  }

  return ids
}

export function saveCandidateUpvotedIds(ids: Set<string>) {
  const normalizedIds = [...ids].filter(Boolean)
  window.localStorage.setItem(CANDIDATE_UPVOTES_KEY, JSON.stringify(normalizedIds))
  saveCookieIds(normalizedIds)
}

function loadLocalStorageIds() {
  try {
    const storedIds = window.localStorage.getItem(CANDIDATE_UPVOTES_KEY)
    if (!storedIds) {
      return []
    }

    const ids = JSON.parse(storedIds) as string[]
    return Array.isArray(ids) ? ids.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

function loadCookieIds() {
  const cookie = document.cookie
    .split('; ')
    .find((item) => item.startsWith(`${CANDIDATE_UPVOTES_COOKIE_KEY}=`))

  if (!cookie) {
    return []
  }

  const value = cookie.slice(CANDIDATE_UPVOTES_COOKIE_KEY.length + 1)
  if (!value) {
    return []
  }

  return value
    .split('.')
    .map(decodeCandidateId)
    .filter((id): id is string => Boolean(id))
}

function saveCookieIds(ids: string[]) {
  const parts: string[] = []

  for (const id of [...ids].reverse()) {
    const encodedId = encodeCandidateId(id)
    if (!encodedId) {
      continue
    }

    const nextValue = [encodedId, ...parts].join('.')
    if (nextValue.length > COOKIE_VALUE_MAX_LENGTH) {
      break
    }

    parts.unshift(encodedId)
  }

  const value = parts.join('.')
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${CANDIDATE_UPVOTES_COOKIE_KEY}=${value}; Max-Age=${COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`
}

function encodeCandidateId(id: string) {
  const match = id.match(/^cand_(\d+)_([0-9a-f]+)$/i)
  if (!match) {
    return ''
  }

  const timestamp = match[1]
  const suffix = match[2]
  if (!timestamp || !suffix) {
    return ''
  }

  return `${Number(timestamp).toString(36)}_${suffix}`
}

function decodeCandidateId(value: string) {
  const match = value.match(/^([0-9a-z]+)_([0-9a-f]+)$/i)
  if (!match) {
    return ''
  }

  const encodedTimestamp = match[1]
  const suffix = match[2]
  if (!encodedTimestamp || !suffix) {
    return ''
  }

  const timestamp = Number.parseInt(encodedTimestamp, 36)
  if (!Number.isFinite(timestamp)) {
    return ''
  }

  return `cand_${timestamp}_${suffix}`
}
