import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Zap, Globe } from 'lucide-react'
import { fetchProxyConfigs, createProxyConfig, updateProxyConfig, deleteProxyConfig, testProxyConnection } from '../../api/proxy'
import type { ProxyConfig as ProxyConfigType, ProxyConfigCreate } from '../../types'
import { useToast } from '../../hooks/useToast'

const emptyForm: ProxyConfigCreate = { name: '', proxy_type: 'http', host: '', port: 1080 }

export default function ProxyConfig() {
  const [configs, setConfigs] = useState<ProxyConfigType[]>([])
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<{ id: number; data: ProxyConfigCreate } | null>(null)
  const [form, setForm] = useState<ProxyConfigCreate>(emptyForm)
  const [testing, setTesting] = useState(false)
  const { toast } = useToast()

  const load = async () => {
    try { setConfigs(await fetchProxyConfigs()) } catch { /* ignore */ }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    try {
      await createProxyConfig(form)
      toast('代理已创建', 'success')
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
      await updateProxyConfig(editing.id, editing.data)
      toast('代理已更新', 'success')
      setEditing(null)
      load()
    } catch (e) {
      toast(e instanceof Error ? e.message : '更新失败', 'error')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此代理？')) return
    try {
      await deleteProxyConfig(id)
      toast('已删除', 'success')
      load()
    } catch (e) {
      toast(e instanceof Error ? e.message : '删除失败', 'error')
    }
  }

  const handleTest = async (data: ProxyConfigCreate) => {
    setTesting(true)
    try {
      await testProxyConnection(data)
      toast('代理可用', 'success')
    } catch (e) {
      toast(e instanceof Error ? e.message : '代理不可用', 'error')
    } finally {
      setTesting(false)
    }
  }

  const handleSetGlobal = async (id: number) => {
    try {
      const config = configs.find((c) => c.id === id)
      if (!config) return
      const oldGlobal = configs.find((c) => c.is_global && c.id !== id)
      if (oldGlobal) await updateProxyConfig(oldGlobal.id, { is_global: false })
      await updateProxyConfig(id, { is_global: true })
      toast('已设为全局代理', 'success')
      load()
    } catch (e) {
      toast(e instanceof Error ? e.message : '操作失败', 'error')
    }
  }

  const currentData = creating ? form : editing?.data
  const setData = (updates: Partial<ProxyConfigCreate>) => {
    if (creating) setForm({ ...form, ...updates })
    else if (editing) setEditing({ ...editing, data: { ...editing.data, ...updates } })
  }

  const inputCls = "px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30"

  const proxyForm = (label: string) => (
    <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl mb-3 space-y-3">
      <p className="text-sm font-medium">{label}</p>
      <div className="grid grid-cols-2 gap-3">
        <input placeholder="名称" value={currentData?.name || ''} onChange={(e) => setData({ name: e.target.value })} className={`col-span-2 ${inputCls}`} />
        <select value={currentData?.proxy_type || 'http'} onChange={(e) => setData({ proxy_type: e.target.value as 'http' | 'socks5' })} className={inputCls}>
          <option value="http">HTTP</option>
          <option value="socks5">SOCKS5</option>
        </select>
        <input placeholder="端口" type="number" value={currentData?.port || 1080} onChange={(e) => setData({ port: Number(e.target.value) })} className={inputCls} />
        <input placeholder="地址" value={currentData?.host || ''} onChange={(e) => setData({ host: e.target.value })} className={`col-span-2 ${inputCls}`} />
        <input placeholder="用户名" value={currentData?.username || ''} onChange={(e) => setData({ username: e.target.value })} className={inputCls} />
        <input placeholder="密码" type="password" value={currentData?.password || ''} onChange={(e) => setData({ password: e.target.value })} className={inputCls} />
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
        <h2 className="text-base font-semibold">代理配置</h2>
        <button onClick={() => { setCreating(true); setEditing(null); setForm(emptyForm) }} className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors">
          <Plus size={14} /> 添加
        </button>
      </div>
      {creating && proxyForm('新建代理')}
      {editing && proxyForm('编辑代理')}
      <div className="space-y-2">
        {configs.map((c) => (
          <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {c.name}
                {c.is_global && <span className="ml-2 text-xs text-amber-500">全局</span>}
              </p>
              <p className="text-xs text-zinc-400 truncate">{c.proxy_type}://{c.host}:{c.port}</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => handleTest({ name: c.name, proxy_type: c.proxy_type, host: c.host, port: c.port, username: c.username })} disabled={testing} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50" title="测试">
                <Zap size={14} />
              </button>
              {!c.is_global && (
                <button onClick={() => handleSetGlobal(c.id)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" title="设为全局代理">
                  <Globe size={14} />
                </button>
              )}
              <button onClick={() => { setEditing({ id: c.id, data: { name: c.name, proxy_type: c.proxy_type, host: c.host, port: c.port, username: c.username } }); setCreating(false) }} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
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
