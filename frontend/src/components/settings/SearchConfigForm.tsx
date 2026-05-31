import { useState, useEffect } from 'react'
import { Eye, EyeOff, Save } from 'lucide-react'
import { getSearchConfig, updateSearchConfig } from '../../api/searchConfig'
import { useToast } from '../../hooks/useToast'

export default function SearchConfigForm() {
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    getSearchConfig()
      .then((config) => {
        const masked = config.api_key
          ? '****' + config.api_key.slice(-4)
          : ''
        setApiKey(masked)
      })
      .catch(() => setApiKey(''))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    if (!apiKey || apiKey.startsWith('****')) return
    setSaving(true)
    try {
      await updateSearchConfig({ api_key: apiKey })
      toast('搜索配置已保存', 'success')
    } catch (e) {
      toast(e instanceof Error ? e.message : '保存失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
  }

  const isMasked = apiKey.startsWith('****')
  const inputCls =
    "px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30"

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <input
          type={showKey ? 'text' : 'password'}
          placeholder="Tavily API Key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className={`${inputCls} w-full pr-10`}
          disabled={isMasked}
        />
        <button
          onClick={() => setShowKey(!showKey)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600"
        >
          {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
      <button
        onClick={handleSave}
        disabled={saving || isMasked || !apiKey}
        className="flex items-center gap-1 px-4 py-2 text-sm rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 transition-colors"
      >
        <Save size={14} />
        {saving ? '保存中...' : '保存'}
      </button>
    </div>
  )
}
