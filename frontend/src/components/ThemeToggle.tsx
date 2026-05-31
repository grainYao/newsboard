import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

export default function ThemeToggle() {
  const { theme, toggle } = useTheme()

  return (
    <button
      type="button"
      onClick={toggle}
      className={`p-2 rounded-lg transition-all duration-200 active:scale-90 hover:scale-110 ${
        theme === 'dark'
          ? 'text-amber-400 hover:bg-amber-950/30'
          : 'text-slate-600 hover:bg-slate-100'
      }`}
      aria-label={theme === 'dark' ? '切换亮色模式' : '切换暗色模式'}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
