import type { NewsItem } from '../types'
import { relativeTime, truncate, stripHtml } from '../utils/time'
import { sourceColor } from '../utils/color'
import { useTheme } from '../contexts/ThemeContext'

interface NewsRowProps {
  item: NewsItem
  selected: boolean
  onClick: () => void
}

export default function NewsRow({ item, selected, onClick }: NewsRowProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors duration-100 border-b border-stone-200 dark:border-stone-800 ${
        selected
          ? 'bg-amber-50 dark:bg-amber-900/10'
          : 'hover:bg-amber-50/30 dark:hover:bg-amber-900/5'
      }`}
    >
      {/* Selected indicator bar */}
      <div className={`w-[3px] self-stretch flex-shrink-0 rounded-full transition-colors ${
        selected ? 'bg-amber-500' : 'bg-transparent'
      }`} />

      <div className="flex-1 min-w-0">
        <h3 className={`text-sm leading-snug line-clamp-2 transition-colors ${
          selected
            ? 'text-amber-700 dark:text-amber-400 font-semibold'
            : 'text-stone-800 dark:text-stone-200 font-medium'
        }`}>
          {item.title}
        </h3>
        {item.summary && (
          <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-1 mt-1">
            {truncate(stripHtml(item.summary), 120)}
          </p>
        )}
        <div className="flex items-center gap-2 text-xs text-stone-400 dark:text-stone-500 mt-1.5">
          <span
            className="font-medium"
            style={{ color: sourceColor(item.source_name, isDark) }}
          >
            {item.source_name}
          </span>
          <span>·</span>
          <span>{relativeTime(item.published_at)}</span>
        </div>
      </div>
    </button>
  )
}
