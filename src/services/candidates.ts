import type { Candidate, CandidateInput } from '@/types/candidate'

type ApiSuccess<T> = {
  ok: true
  data: T
}

type ApiFailure = {
  ok: false
  message: string
}

type ApiResponse<T> = ApiSuccess<T> | ApiFailure

const DEFAULT_CANDIDATE_API_BASE = 'https://foodtotry.giraffish.top'
const CANDIDATE_API_BASE = (
  import.meta.env.VITE_CANDIDATE_API_BASE || DEFAULT_CANDIDATE_API_BASE
).replace(/\/$/, '')

export async function fetchCandidates(): Promise<Candidate[]> {
  const response = await request<Candidate[]>('/candidates')
  return response
}

export async function createCandidate(candidate: CandidateInput): Promise<Candidate> {
  const response = await request<Candidate>('/candidates', {
    method: 'POST',
    body: JSON.stringify(candidate),
  })
  return response
}

export async function updateCandidate(
  candidateId: string,
  candidate: CandidateInput,
): Promise<Candidate> {
  const response = await request<Candidate>(`/candidates/${encodeURIComponent(candidateId)}`, {
    method: 'PATCH',
    body: JSON.stringify(candidate),
  })
  return response
}

export async function upvoteCandidate(candidateId: string): Promise<Candidate> {
  const response = await request<Candidate>(
    `/candidates/${encodeURIComponent(candidateId)}/upvote`,
    {
      method: 'POST',
    },
  )
  return response
}

export async function deleteCandidate(candidateId: string): Promise<Candidate> {
  const response = await request<Candidate>(`/candidates/${encodeURIComponent(candidateId)}`, {
    method: 'DELETE',
  })
  return response
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${CANDIDATE_API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null

  if (!response.ok || payload?.ok !== true) {
    const message = payload && payload.ok === false ? payload.message : ''
    throw new Error(message || `候选名单请求失败：${response.status}`)
  }

  return payload.data
}
