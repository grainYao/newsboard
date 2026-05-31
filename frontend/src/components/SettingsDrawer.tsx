import { X, Rss, FolderOpen, Cpu, Globe, Sparkles } from 'lucide-react'
import { useState, useEffect } from 'react'
import SourceManage from './settings/SourceManage'
import CategoryManage from './settings/CategoryManage'
import LLMConfig from './settings/LLMConfig'
import ProxyConfig from './settings/ProxyConfig'
import AiAssistant from './settings/AiAssistant'

const tabs = [
  { id: 'sources', label: '数据源', icon: Rss },
  { id: 'categories', label: '分类', icon: FolderOpen },
  { id: 'llm', label: 'LLM 配置', icon: Cpu },
  { id: 'proxy', label: '代理配置', icon: Globe },
  { id: 'ai', label: 'AI 助手', icon: Sparkles },
] as const

type TabId = (typeof tabs)[number]['id']

interface SettingsDrawerProps {
  open: boolean
  onClose: () => void
}

export default function SettingsDrawer({ open, onClose }: SettingsDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabId>('sources')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      {activeTab === 'ai' ? (
        /* AI tab: full dark takeover */
        <div className="relative w-full max-w-2xl flex flex-col animate-in slide-in-from-right duration-200">
          {/* Minimal header for AI mode */}
          <div className="flex items-center justify-between px-4 h-12 border-b border-slate-800/60 bg-slate-950 flex-shrink-0">
            <div className="flex items-center gap-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                      : 'text-zinc-500 hover:text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <tab.icon size={14} />
                  {tab.label}
                </button>
              ))}
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300">
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <AiAssistant />
          </div>
        </div>
      ) : (
        /* Normal tabs: light/dark themed */
        <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 shadow-xl flex flex-col animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between px-4 h-12 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'text-zinc-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <tab.icon size={14} />
                  {tab.label}
                </button>
              ))}
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'sources' && <SourceManage />}
            {activeTab === 'categories' && <CategoryManage />}
            {activeTab === 'llm' && <LLMConfig />}
            {activeTab === 'proxy' && <ProxyConfig />}
          </div>
        </div>
      )}
    </div>
  )
}
