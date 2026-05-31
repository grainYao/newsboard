import client from './client'

export interface SearchConfigOut {
  id: number
  api_key: string
  created_at: string
}

export interface SearchConfigUpdate {
  api_key: string
}

export function getSearchConfig() {
  return client.get<SearchConfigOut>('/search-config').then((r) => r.data)
}

export function updateSearchConfig(data: SearchConfigUpdate) {
  return client.put<SearchConfigOut>('/search-config', data).then((r) => r.data)
}
