import { useState } from 'react'
import { Menu, Settings } from 'lucide-react'
import { Routes, Route } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'
import NewsList from '../views/NewsList'
import SettingsDrawer from './SettingsDrawer'
import { useBreakpoint } from '../hooks/useBreakpoint'

export default function AppLayout() {
  const { isMobile, isTablet } = useBreakpoint()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(isTablet)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="h-12 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0">
        <div className="flex items-center gap-2">
          {isMobile && (
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Menu size={18} />
            </button>
          )}
          <h1 className="text-sm font-bold tracking-tight text-amber-600 dark:text-amber-400">NewsBoard</h1>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        <Routes>
          <Route
            path="/"
            element={
              <NewsList
                isMobile={isMobile}
                sidebarCollapsed={sidebarCollapsed}
                onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
                mobileSidebarOpen={mobileSidebarOpen}
                onMobileSidebarClose={() => setMobileSidebarOpen(false)}
              />
            }
          />
        </Routes>
      </div>

      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
