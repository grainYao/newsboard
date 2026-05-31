export type TranslationStatus = 'not_translated' | 'translating' | 'translated' | 'failed' | 'not_configured'
export type SourceStatus = 'active' | 'disabled' | 'error'
export type ProxyType = 'http' | 'socks5'

export interface NewsItem {
  id: number
  title: string
  link: string
  summary: string | null
  published_at: string | null
  source_id: number
  category_id: number
  translation_status: TranslationStatus
  translated_title: string | null
  translated_summary: string | null
  fetched_at: string
  source_name: string
  category_name: string
}

export interface NewsListResponse {
  total: number
  page: number
  page_size: number
  items: NewsItem[]
}

export interface Source {
  id: number
  name: string
  url: string
  category_id: number
  language: string
  enable_translation: boolean
  fetch_interval: number
  status: SourceStatus
  last_fetched_at: string | null
  error_message: string | null
  proxy_type: ProxyType | null
  proxy_host: string | null
  proxy_port: number | null
  created_at: string
  category_name: string
}

export interface SourceCreate {
  name: string
  url: string
  category_id: number
  language?: string
  enable_translation?: boolean
  fetch_interval?: number
  proxy_type?: ProxyType | null
  proxy_host?: string | null
  proxy_port?: number | null
  proxy_username?: string | null
  proxy_password?: string | null
}

export interface SourceUpdate extends Partial<SourceCreate> {}

export interface Category {
  id: number
  name: string
  description: string | null
  created_at: string
  source_count: number
}

export interface CategoryCreate {
  name: string
  description?: string
}

export interface CategoryUpdate {
  name?: string
  description?: string
}

export interface LLMConfig {
  id: number
  name: string
  base_url: string
  api_key: string
  model_name: string
  max_tokens: number
  is_active: boolean
  proxy_type: ProxyType | null
  proxy_host: string | null
  proxy_port: number | null
  created_at: string
}

export interface LLMConfigCreate {
  name: string
  base_url: string
  api_key: string
  model_name: string
  max_tokens?: number
  proxy_type?: ProxyType | null
  proxy_host?: string | null
  proxy_port?: number | null
  proxy_username?: string | null
  proxy_password?: string | null
}

export interface LLMConfigUpdate extends Partial<LLMConfigCreate> {
  is_active?: boolean
}

export interface ProxyConfig {
  id: number
  name: string
  proxy_type: ProxyType
  host: string
  port: number
  username: string | null
  is_global: boolean
  created_at: string
}

export interface ProxyConfigCreate {
  name: string
  proxy_type: ProxyType
  host: string
  port: number
  username?: string | null
  password?: string | null
  is_global?: boolean
}

export interface ProxyConfigUpdate extends Partial<ProxyConfigCreate> {}
