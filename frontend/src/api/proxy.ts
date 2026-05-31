import client from './client'
import type { ProxyConfig, ProxyConfigCreate, ProxyConfigUpdate } from '../types'

export function fetchProxyConfigs() {
  return client.get<ProxyConfig[]>('/proxy').then((r) => r.data)
}

export function createProxyConfig(data: ProxyConfigCreate) {
  return client.post<ProxyConfig>('/proxy', data).then((r) => r.data)
}

export function updateProxyConfig(id: number, data: ProxyConfigUpdate) {
  return client.put<ProxyConfig>(`/proxy/${id}`, data).then((r) => r.data)
}

export function deleteProxyConfig(id: number) {
  return client.delete(`/proxy/${id}`).then((r) => r.data)
}

export function testProxyConnection(data: ProxyConfigCreate) {
  return client.post('/proxy/test', data).then((r) => r.data)
}
