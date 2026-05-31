import client from './client'
import type { Category, CategoryCreate, CategoryUpdate } from '../types'

export function fetchCategories() {
  return client.get<Category[]>('/categories').then((r) => r.data)
}

export function createCategory(data: CategoryCreate) {
  return client.post<Category>('/categories', data).then((r) => r.data)
}

export function updateCategory(id: number, data: CategoryUpdate) {
  return client.put<Category>(`/categories/${id}`, data).then((r) => r.data)
}

export function deleteCategory(id: number) {
  return client.delete(`/categories/${id}`).then((r) => r.data)
}
