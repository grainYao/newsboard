import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react'
import { fetchSources, createSource, updateSource, deleteSource, toggleSource, fetchFromSource } from '../../api/sources'
import { fetchCategories } from '../../api/categories'
import type { Source, SourceCreate, Category } from '../../types'
import { useToast } from '../../hooks/useToast'

const emptyForm: SourceCreate = {
  name: '',
  url: '',
  category_id: 0,
  fetch_interval: 30,
}

export default function SourceManage() {
  const [sources, setSources] = useState<Source[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [editing, setEditing] = useState<{ id: number; data: SourceCreate } | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<SourceCreate>(emptyForm)
  const { toast } = useToast()

  const load = async () => {
    try {
      const [s, c] = await Promise.all([fetchSources(), fetchCategories()])
      setSources(s)
      setCategories(c)
    } catch {
      /* ignore */
    }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    try {
      await createSource(form)
      toast('数据源已创建', 'success')
      setCreating(false)
      setForm(emptyForm)
      load()
    } catch (e) {
      toast(e instanceof Error ? e.message : '创建失败', 'error')
    }
  }

  const handleUpdate = async () => {
    if (!editing) return
    try {
      await updateSource(editing.id, editing.data)
      toast('数据源已更新', 'success')
      setEditing(null)
      load()
    } catch (e) {
      toast(e instanceof Error ? e.message : '更新失败', 'error')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此数据源？')) return
    try {
      await deleteSource(id)
      toast('已删除', 'success')
      load()
    } catch (e) {
      toast(e instanceof Error ? e.message : '删除失败', 'error')
    }
  }

  const handleToggle = async (id: number) => {
    try {
      await toggleSource(id)
      load()
    } catch (e) {
      toast(e instanceof Error ? e.message : '操作失败', 'error')
    }
  }

  const handleFetch = async (id: number) => {
    try {
      await fetchFromSource(id)
      toast('抓取任务已触发', 'success')
    } catch (e) {
      toast(e instanceof Error ? e.message : '抓取失败', 'error')
    }
  }

  const currentData = creating ? form : editing?.data
  const setData = (updates: Partial<SourceCreate>) => {
    if (creating) setForm({ ...form, ...updates })
    else if (editing) setEditing({ ...editing, data: { ...editing.data, ...updates } })
  }

  const editForm = (label: string) => (
    <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl mb-3 space-y-3">
      <p className="text-sm font-medium">{label}</p>
      <div className="grid grid-cols-2 gap-3">
        <input placeholder="名称" value={currentData?.name || ''} onChange={(e) => setData({ name: e.target.value })} className="col-span-2 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
        <input placeholder="URL" value={currentData?.url || ''} onChange={(e) => setData({ url: e.target.value })} className="col-span-2 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
        <select value={currentData?.category_id || 0} onChange={(e) => setData({ category_id: Number(e.target.value) })} className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30">
          <option value={0}>选择分类</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input placeholder="抓取间隔(分钟)" type="number" value={currentData?.fetch_interval || 30} onChange={(e) => setData({ fetch_interval: Number(e.target.value) })} className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
      </div>
      <div className="flex gap-2">
        <button onClick={creating ? handleCreate : handleUpdate} className="px-4 py-1.5 text-sm rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors">保存</button>
        <button onClick={() => { setCreating(false); setEditing(null) }} className="px-4 py-1.5 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">取消</button>
      </div>
    </div>
  )

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold">数据源管理</h2>
        <button onClick={() => { setCreating(true); setEditing(null); setForm(emptyForm) }} className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors">
          <Plus size={14} /> 添加
        </button>
      </div>
      {creating && editForm('新建数据源')}
      {editing && editForm('编辑数据源')}
      <div className="space-y-2">
        {sources.map((s) => (
          <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            <button onClick={() => handleToggle(s.id)} className="flex-shrink-0">
              {s.status === 'active' ? <ToggleRight size={20} className="text-emerald-500" /> : <ToggleLeft size={20} className="text-zinc-400" />}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{s.name}</p>
              <p className="text-xs text-zinc-400 truncate">{s.url}</p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === 'active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : s.status === 'error' ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-slate-100 text-zinc-500 dark:bg-slate-800 dark:text-zinc-500'}`}>
              {s.status === 'active' ? '启用' : s.status === 'error' ? '错误' : '禁用'}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => handleFetch(s.id)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" title="立即抓取">
                <RefreshCw size={14} />
              </button>
              <button onClick={() => { setEditing({ id: s.id, data: { name: s.name, url: s.url, category_id: s.category_id, fetch_interval: s.fetch_interval } }); setCreating(false) }} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                <Pencil size={14} />
              </button>
              <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-red-500">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
