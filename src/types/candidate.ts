export type CandidateStatus = 'open' | 'picked' | 'visited' | 'hidden'

export interface Candidate {
  id: string
  name: string
  city: string
  address: string
  price: number | null
  tags: string[]
  reason: string
  submitter: string
  upvotes: number
  status: CandidateStatus
  createdAt: string
  updatedAt: string
}

export interface CandidateInput {
  name: string
  city: string
  address: string
  price: number | null
  tags: string[]
  reason: string
  submitter: string
}
