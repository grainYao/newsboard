import { useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import NewsRow from './NewsRow'
import type { NewsItem } from '../types'

interface NewsListViewProps {
  items: NewsItem[]
  hasMore: boolean
  loading: boolean
  loadingMore: boolean
  selectedId: number | null
  onSelect: (item: NewsItem) => void
  onLoadMore: () => void
}

export default function NewsListView({
  items,
  hasMore,
  loading,
  loadingMore,
  selectedId,
  onSelect,
  onLoadMore,
}: NewsListViewProps) {
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loadingMore) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onLoadMore()
      },
      { rootMargin: '200px' },
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, onLoadMore])

  if (loading && items.length === 0) {
    return (
      <div className="flex-1 flex flex-col bg-stone-50 dark:bg-stone-950">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="px-4 py-3 border-b border-stone-200 dark:border-stone-800">
            <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded animate-pulse w-3/4 mb-2" />
            <div className="h-3 bg-stone-100 dark:bg-stone-800 rounded animate-pulse w-1/2 mb-2" />
            <div className="h-3 bg-stone-100 dark:bg-stone-800 rounded animate-pulse w-1/4" />
          </div>
        ))}
      </div>
    )
  }

  if (items.length === 0 && !loadingMore) {
    return (
      <div className="flex-1 flex items-center justify-center bg-stone-50 dark:bg-stone-950">
        <div className="text-center text-stone-400 text-sm">
          <p className="text-lg mb-1">暂无新闻</p>
          <p className="text-xs">尝试调整筛选条件或添加数据源</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-stone-50 dark:bg-stone-950">
      {items.map((item) => (
        <NewsRow
          key={item.id}
          item={item}
          selected={item.id === selectedId}
          onClick={() => onSelect(item)}
        />
      ))}

      {/* Bottom sentinel & loading */}
      <div ref={sentinelRef} className="py-4 flex items-center justify-center">
        {loadingMore && (
          <div className="flex items-center gap-2 text-sm text-stone-400">
            <Loader2 size={16} className="animate-spin" />
            加载中...
          </div>
        )}
        {!hasMore && items.length > 0 && (
          <span className="text-xs text-stone-400">已加载全部</span>
        )}
        {hasMore && !loadingMore && (
          <button
            onClick={onLoadMore}
            className="text-sm text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 transition-colors"
          >
            加载更多
          </button>
        )}
      </div>
    </div>
  )
}
