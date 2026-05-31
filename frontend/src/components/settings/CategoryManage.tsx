import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { fetchCategories, createCategory, updateCategory, deleteCategory } from '../../api/categories'
import type { Category, CategoryCreate } from '../../types'
import { useToast } from '../../hooks/useToast'

const emptyForm: CategoryCreate = { name: '', description: '' }

export default function CategoryManage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<{ id: number; data: CategoryCreate } | null>(null)
  const [form, setForm] = useState<CategoryCreate>(emptyForm)
  const { toast } = useToast()

  const load = async () => {
    try {
      setCategories(await fetchCategories())
    } catch { /* ignore */ }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    try {
      await createCategory(form)
      toast('分类已创建', 'success')
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
      await updateCategory(editing.id, editing.data)
      toast('分类已更新', 'success')
      setEditing(null)
      load()
    } catch (e) {
      toast(e instanceof Error ? e.message : '更新失败', 'error')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此分类？')) return
    try {
      await deleteCategory(id)
      toast('已删除', 'success')
      load()
    } catch (e) {
      toast(e instanceof Error ? e.message : '删除失败', 'error')
    }
  }

  const currentData = creating ? form : editing?.data
  const setData = (updates: Partial<CategoryCreate>) => {
    if (creating) setForm({ ...form, ...updates })
    else if (editing) setEditing({ ...editing, data: { ...editing.data, ...updates } })
  }

  const categoryForm = (label: string) => (
    <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl mb-3 space-y-3">
      <p className="text-sm font-medium">{label}</p>
      <div className="space-y-3">
        <input placeholder="名称" value={currentData?.name || ''} onChange={(e) => setData({ name: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
        <input placeholder="描述" value={currentData?.description || ''} onChange={(e) => setData({ description: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
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
        <h2 className="text-base font-semibold">分类管理</h2>
        <button onClick={() => { setCreating(true); setEditing(null); setForm(emptyForm) }} className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors">
          <Plus size={14} /> 添加
        </button>
      </div>
      {creating && categoryForm('新建分类')}
      {editing && categoryForm('编辑分类')}
      <div className="space-y-2">
        {categories.map((c) => (
          <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{c.name}</p>
              {c.description && <p className="text-xs text-zinc-400 mt-0.5">{c.description}</p>}
            </div>
            <span className="text-xs text-zinc-400">{c.source_count} 个数据源</span>
            <div className="flex items-center gap-1">
              <button onClick={() => { setEditing({ id: c.id, data: { name: c.name, description: c.description || '' } }); setCreating(false) }} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                <Pencil size={14} />
              </button>
              <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-red-500">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
