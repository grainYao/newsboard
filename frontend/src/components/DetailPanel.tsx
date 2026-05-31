import { X, ExternalLink, ArrowLeft } from 'lucide-react'
import { useState, useEffect } from 'react'
import type { NewsItem } from '../types'
import { relativeTime } from '../utils/time'

interface DetailPanelProps {
  item: NewsItem | null
  onClose: () => void
  isMobile: boolean
}

export default function DetailPanel({ item, onClose, isMobile }: DetailPanelProps) {
  const [currentItem, setCurrentItem] = useState<NewsItem | null>(null)

  useEffect(() => {
    setCurrentItem(item)
  }, [item])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (item) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [item, onClose])

  if (!currentItem) return null

  const panel = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      {/* Gradient accent bar */}
      <div className="h-[3px] bg-gradient-to-r from-amber-400 to-orange-500 flex-shrink-0" />

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
        {isMobile && (
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 mr-2">
            <ArrowLeft size={18} />
          </button>
        )}
        <div className="flex-1" />
        {!isMobile && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <h1 className="text-xl font-bold mb-3 leading-relaxed">{currentItem.title}</h1>
        <div className="flex items-center gap-3 text-xs text-zinc-400 mb-6">
          <span>{currentItem.source_name}</span>
          <span>·</span>
          <span>{currentItem.category_name}</span>
          <span>·</span>
          <span>{relativeTime(currentItem.published_at)}</span>
        </div>
        <div
          className="prose prose-sm dark:prose-invert max-w-none leading-relaxed"
          dangerouslySetInnerHTML={{ __html: currentItem.summary || '<p>暂无内容摘要</p>' }}
        />
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <a
          href={currentItem.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 transition-colors"
        >
          <ExternalLink size={14} />
          阅读原文
        </a>
      </div>
    </div>
  )

  // Mobile: full screen
  if (isMobile) {
    return <div className="fixed inset-0 z-50">{panel}</div>
  }

  // Desktop: slide panel
  return (
    <div className="w-1/2 border-l border-slate-200 dark:border-slate-800 flex-shrink-0 h-full animate-in slide-in-from-right duration-200">
      {panel}
    </div>
  )
}
