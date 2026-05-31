import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Zap, ToggleLeft, ToggleRight } from 'lucide-react'
import { fetchLLMConfigs, createLLMConfig, updateLLMConfig, deleteLLMConfig, testLLMConnection } from '../../api/llm'
import type { LLMConfig as LLMConfigType, LLMConfigCreate } from '../../types'
import { useToast } from '../../hooks/useToast'

const emptyForm: LLMConfigCreate = { name: '', base_url: '', api_key: '', model_name: '', max_tokens: 4096 }

export default function LLMConfig() {
  const [configs, setConfigs] = useState<LLMConfigType[]>([])
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<{ id: number; data: LLMConfigCreate & { is_active?: boolean } } | null>(null)
  const [form, setForm] = useState<LLMConfigCreate>(emptyForm)
  const [testing, setTesting] = useState(false)
  const { toast } = useToast()

  const load = async () => {
    try { setConfigs(await fetchLLMConfigs()) } catch { /* ignore */ }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    try {
      await createLLMConfig(form)
      toast('配置已创建', 'success')
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
      await updateLLMConfig(editing.id, editing.data)
      toast('配置已更新', 'success')
      setEditing(null)
      load()
    } catch (e) {
      toast(e instanceof Error ? e.message : '更新失败', 'error')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此配置？')) return
    try {
      await deleteLLMConfig(id)
      toast('已删除', 'success')
      load()
    } catch (e) {
      toast(e instanceof Error ? e.message : '删除失败', 'error')
    }
  }

  const handleTest = async (data: LLMConfigCreate) => {
    setTesting(true)
    try {
      await testLLMConnection(data)
      toast('连接成功', 'success')
    } catch (e) {
      toast(e instanceof Error ? e.message : '连接失败', 'error')
    } finally {
      setTesting(false)
    }
  }

  const handleToggleActive = async (id: number, active: boolean) => {
    try {
      await updateLLMConfig(id, { is_active: !active })
      load()
    } catch (e) {
      toast(e instanceof Error ? e.message : '操作失败', 'error')
    }
  }

  const currentData = creating ? form : editing?.data
  const setData = (updates: Partial<LLMConfigCreate>) => {
    if (creating) setForm({ ...form, ...updates })
    else if (editing) setEditing({ ...editing, data: { ...editing.data, ...updates } })
  }

  const inputCls = "px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30"

  const configForm = (label: string) => (
    <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl mb-3 space-y-3">
      <p className="text-sm font-medium">{label}</p>
      <div className="grid grid-cols-2 gap-3">
        <input placeholder="名称" value={currentData?.name || ''} onChange={(e) => setData({ name: e.target.value })} className={`col-span-2 ${inputCls}`} />
        <input placeholder="Base URL" value={currentData?.base_url || ''} onChange={(e) => setData({ base_url: e.target.value })} className={`col-span-2 ${inputCls}`} />
        <input placeholder="API Key" type="password" value={currentData?.api_key || ''} onChange={(e) => setData({ api_key: e.target.value })} className={`col-span-2 ${inputCls}`} />
        <input placeholder="模型名称" value={currentData?.model_name || ''} onChange={(e) => setData({ model_name: e.target.value })} className={inputCls} />
        <input placeholder="Max Tokens" type="number" value={currentData?.max_tokens || 4096} onChange={(e) => setData({ max_tokens: Number(e.target.value) })} className={inputCls} />
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
        <h2 className="text-base font-semibold">LLM 配置</h2>
        <button onClick={() => { setCreating(true); setEditing(null); setForm(emptyForm) }} className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors">
          <Plus size={14} /> 添加
        </button>
      </div>
      {creating && configForm('新建 LLM 配置')}
      {editing && configForm('编辑 LLM 配置')}
      <div className="space-y-2">
        {configs.map((c) => (
          <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            <button onClick={() => handleToggleActive(c.id, c.is_active)} className="flex-shrink-0">
              {c.is_active ? <ToggleRight size={20} className="text-emerald-500" /> : <ToggleLeft size={20} className="text-zinc-400" />}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{c.name}</p>
              <p className="text-xs text-zinc-400 truncate">{c.model_name} · {c.base_url}</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => handleTest({ name: c.name, base_url: c.base_url, api_key: c.api_key, model_name: c.model_name, max_tokens: c.max_tokens })} disabled={testing} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50" title="测试连接">
                <Zap size={14} />
              </button>
              <button onClick={() => { setEditing({ id: c.id, data: { name: c.name, base_url: c.base_url, api_key: c.api_key, model_name: c.model_name, max_tokens: c.max_tokens, is_active: c.is_active } }); setCreating(false) }} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
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
