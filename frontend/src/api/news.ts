import client from './client'
import type { NewsItem, NewsListResponse } from '../types'

export function fetchNews(params: {
  page?: number
  page_size?: number
  category_id?: number
  source_id?: number
}) {
  return client.get<NewsListResponse>('/news', { params }).then((r) => r.data)
}

export function fetchNewsById(id: number) {
  return client.get<NewsItem>(`/news/${id}`).then((r) => r.data)
}
