import client from './client'
import type { Source, SourceCreate, SourceUpdate } from '../types'

export function fetchSources(params?: { category_id?: number; status?: string }) {
  return client.get<Source[]>('/sources', { params }).then((r) => r.data)
}

export function createSource(data: SourceCreate) {
  return client.post<Source>('/sources', data).then((r) => r.data)
}

export function updateSource(id: number, data: SourceUpdate) {
  return client.put<Source>(`/sources/${id}`, data).then((r) => r.data)
}

export function deleteSource(id: number) {
  return client.delete(`/sources/${id}`).then((r) => r.data)
}

export function toggleSource(id: number) {
  return client.post<Source>(`/sources/${id}/toggle`).then((r) => r.data)
}

export function fetchFromSource(id: number) {
  return client.post(`/fetch/${id}`).then((r) => r.data)
}
