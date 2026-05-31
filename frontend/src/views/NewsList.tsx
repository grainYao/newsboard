import { useState, useEffect, useCallback } from 'react'
import Sidebar from '../components/Sidebar'
import NewsListView from '../components/NewsListView'
import DetailPanel from '../components/DetailPanel'
import { fetchNews } from '../api/news'
import { fetchCategories } from '../api/categories'
import { fetchSources } from '../api/sources'
import type { NewsItem, Category, Source } from '../types'

interface NewsListProps {
  isMobile: boolean
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
  mobileSidebarOpen: boolean
  onMobileSidebarClose: () => void
}

export default function NewsList({
  isMobile,
  sidebarCollapsed,
  onToggleSidebar,
  mobileSidebarOpen,
  onMobileSidebarClose,
}: NewsListProps) {
  const [allItems, setAllItems] = useState<NewsItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [sources, setSources] = useState<Source[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [selectedSourceIds, setSelectedSourceIds] = useState<number[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null)

  const loadCategories = useCallback(async () => {
    try { setCategories(await fetchCategories()) } catch { /* ignore */ }
  }, [])

  const loadSources = useCallback(async () => {
    try { setSources(await fetchSources()) } catch { /* ignore */ }
  }, [])

  const hasMore = allItems.length < total

  const loadPage = useCallback(async (pageNum: number, append: boolean) => {
    if (append) setLoadingMore(true)
    else setLoading(true)

    try {
      const params: Record<string, unknown> = { page: pageNum, page_size: 20 }
      if (selectedCategoryId) params.category_id = selectedCategoryId
      if (selectedSourceIds.length === 1) params.source_id = selectedSourceIds[0]
      const data = await fetchNews(params as Parameters<typeof fetchNews>[0])

      let items = data.items
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        items = items.filter(
          (n) =>
            n.title.toLowerCase().includes(q) ||
            (n.summary && n.summary.toLowerCase().includes(q)),
        )
      }
      if (selectedSourceIds.length > 1) {
        items = items.filter((n) => selectedSourceIds.includes(n.source_id))
      }

      if (append) {
        setAllItems((prev) => [...prev, ...items])
      } else {
        setAllItems(items)
      }
      setTotal(searchQuery || selectedSourceIds.length > 1 ? items.length : data.total)
      setPage(pageNum)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [selectedCategoryId, selectedSourceIds, searchQuery])

  // Initial load + filter changes
  useEffect(() => {
    loadPage(1, false)
  }, [loadPage])

  useEffect(() => {
    loadCategories()
    loadSources()
  }, [loadCategories, loadSources])

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      loadPage(page + 1, true)
    }
  }, [loadingMore, hasMore, page, loadPage])

  const resetFilters = () => {
    setSelectedNews(null)
  }

  const handleSelectCategory = (id: number | null) => {
    setSelectedCategoryId(id)
    resetFilters()
  }

  const handleToggleSource = (id: number) => {
    setSelectedSourceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    )
    resetFilters()
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    resetFilters()
  }

  return (
    <>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={onToggleSidebar}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={onMobileSidebarClose}
        categories={categories}
        sources={sources}
        selectedCategoryId={selectedCategoryId}
        selectedSourceIds={selectedSourceIds}
        searchQuery={searchQuery}
        onSelectCategory={handleSelectCategory}
        onToggleSource={handleToggleSource}
        onSearch={handleSearch}
        isMobile={isMobile}
      />
      <div className="flex-1 flex overflow-hidden">
        <NewsListView
          items={allItems}
          hasMore={hasMore}
          loadingMore={loadingMore}
          loading={loading}
          selectedId={selectedNews?.id ?? null}
          onSelect={setSelectedNews}
          onLoadMore={handleLoadMore}
        />
        {selectedNews && <DetailPanel item={selectedNews} onClose={() => setSelectedNews(null)} isMobile={isMobile} />}
      </div>
    </>
  )
}
