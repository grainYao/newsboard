import { Search, FolderOpen, Rss, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useState } from 'react'
import type { Category, Source } from '../types'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  mobileOpen: boolean
  onMobileClose: () => void
  categories: Category[]
  sources: Source[]
  selectedCategoryId: number | null
  selectedSourceIds: number[]
  searchQuery: string
  onSelectCategory: (id: number | null) => void
  onToggleSource: (id: number) => void
  onSearch: (query: string) => void
  isMobile: boolean
}

export default function Sidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
  categories,
  sources,
  selectedCategoryId,
  selectedSourceIds,
  searchQuery,
  onSelectCategory,
  onToggleSource,
  onSearch,
  isMobile,
}: SidebarProps) {
  const [sourceExpanded, setSourceExpanded] = useState(false)

  const content = (
    <div className="flex flex-col h-full">
      {/* Search */}
      {!collapsed && (
        <div className="p-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="搜索新闻..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition"
            />
          </div>
        </div>
      )}

      {/* Categories */}
      <div className="flex-1 overflow-y-auto px-2">
        <div className="mb-1">
          {!collapsed && <p className="px-2 py-1 text-xs font-medium text-zinc-400 uppercase tracking-wider">分类</p>}
          <button
            onClick={() => onSelectCategory(null)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              selectedCategoryId === null
                ? 'bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700 dark:from-amber-900/20 dark:to-amber-900/30 dark:text-amber-400'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            } ${collapsed ? 'justify-center' : ''}`}
          >
            <FolderOpen size={16} />
            {!collapsed && <span className="flex-1 text-left">全部</span>}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedCategoryId === cat.id
                  ? 'bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700 dark:from-amber-900/20 dark:to-amber-900/30 dark:text-amber-400'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              <FolderOpen size={16} />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left truncate">{cat.name}</span>
                  <span className="text-xs text-zinc-400">{cat.source_count}</span>
                </>
              )}
            </button>
          ))}
        </div>

        {/* Sources */}
        {!collapsed && (
          <div className="mt-2">
            <button
              onClick={() => setSourceExpanded(!sourceExpanded)}
              className="w-full flex items-center gap-2 px-2 py-1 text-xs font-medium text-zinc-400 uppercase tracking-wider"
            >
              <Rss size={12} />
              <span className="flex-1 text-left">数据源</span>
            </button>
            {sourceExpanded &&
              sources.map((src) => (
                <label
                  key={src.id}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedSourceIds.includes(src.id)}
                    onChange={() => onToggleSource(src.id)}
                    className="rounded border-slate-300 dark:border-slate-600 text-amber-500 focus:ring-amber-500/30"
                  />
                  <span className="truncate">{src.name}</span>
                </label>
              ))}
          </div>
        )}
      </div>

      {/* Collapse toggle (desktop only) */}
      {!isMobile && (
        <div className="p-2 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onToggle}
            className="w-full flex items-center justify-center p-2 rounded-lg text-zinc-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      )}
    </div>
  )

  // Mobile overlay
  if (isMobile) {
    if (!mobileOpen) return null
    return (
      <div className="fixed inset-0 z-50 flex">
        <div className="absolute inset-0 bg-black/40" onClick={onMobileClose} />
        <div className="relative w-72 bg-white dark:bg-slate-900 shadow-xl flex flex-col">
          <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-700">
            <span className="font-semibold text-sm">筛选</span>
            <button onClick={onMobileClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
              <X size={18} />
            </button>
          </div>
          {content}
        </div>
      </div>
    )
  }

  // Desktop/tablet sidebar
  return (
    <aside
      className={`h-full border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 transition-all duration-200 flex-shrink-0 ${
        collapsed ? 'w-14' : 'w-[280px]'
      }`}
    >
      {content}
    </aside>
  )
}
