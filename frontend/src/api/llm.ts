import client from './client'
import type { LLMConfig, LLMConfigCreate, LLMConfigUpdate } from '../types'

export function fetchLLMConfigs() {
  return client.get<LLMConfig[]>('/llm').then((r) => r.data)
}

export function createLLMConfig(data: LLMConfigCreate) {
  return client.post<LLMConfig>('/llm', data).then((r) => r.data)
}

export function updateLLMConfig(id: number, data: LLMConfigUpdate) {
  return client.put<LLMConfig>(`/llm/${id}`, data).then((r) => r.data)
}

export function deleteLLMConfig(id: number) {
  return client.delete(`/llm/${id}`).then((r) => r.data)
}

export function testLLMConnection(data: LLMConfigCreate) {
  return client.post('/llm/test', data).then((r) => r.data)
}
