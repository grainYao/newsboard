import client from './client'

export interface RssRecommendation {
  name: string
  url: string
  description?: string
  suggested_category?: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface RecommendResponse {
  text: string
  sources: RssRecommendation[]
  has_config: boolean
}

export interface BatchCreateRequest {
  sources: RssRecommendation[]
}

export interface BatchCreateResponse {
  created: number
  skipped: number
  results: { name: string; url: string; status: string; reason?: string }[]
}

export function sendChatMessage(messages: ChatMessage[]) {
  return client
    .post<RecommendResponse>('/chat/rss-sources', { messages })
    .then((r) => r.data)
}

export function batchCreateSources(sources: RssRecommendation[]) {
  return client
    .post<BatchCreateResponse>('/sources/batch', { sources })
    .then((r) => r.data)
}
