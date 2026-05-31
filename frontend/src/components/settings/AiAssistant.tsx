import { useState, useRef, useEffect } from 'react'
import { Send, Plus, CheckCircle, Loader2, Rss } from 'lucide-react'
import SearchConfigForm from './SearchConfigForm'
import { sendChatMessage, batchCreateSources, type ChatMessage } from '../../api/rssAssistant'
import { useToast } from '../../hooks/useToast'

interface SourceCard {
  name: string
  url: string
  description?: string
  suggested_category?: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: SourceCard[]
}

export default function AiAssistant() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [addingSources, setAddingSources] = useState<Set<string>>(new Set())
  const [addedUrls, setAddedUrls] = useState<Set<string>>(new Set())
  const bottomRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      sources: [],
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    const allMessages: ChatMessage[] = [
      ...messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: userMsg.content },
    ]

    try {
      const res = await sendChatMessage(allMessages)
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: res.text,
        sources: res.sources,
      }
      setMessages((prev) => [...prev, aiMsg])
      if (!res.has_config) {
        toast('请先配置搜索 API Key', 'info')
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : '发送失败', 'error')
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }

  const handleAddSource = async (source: SourceCard) => {
    if (addedUrls.has(source.url) || addingSources.has(source.url)) return
    setAddingSources((prev) => new Set(prev).add(source.url))
    try {
      const res = await batchCreateSources([source])
      const result = res.results?.[0]
      if (result && result.status === 'created') {
        setAddedUrls((prev) => new Set(prev).add(source.url))
        toast(`已添加「${source.name}」`, 'success')
      } else {
        const reason = result?.reason || '未知原因'
        toast(`添加失败「${source.name}」：${reason}`, 'error')
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : '添加失败', 'error')
    } finally {
      setAddingSources((prev) => {
        const next = new Set(prev)
        next.delete(source.url)
        return next
      })
    }
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 text-slate-900 dark:text-white relative overflow-hidden">

      {/* ── Ambient background (dark only) ── */}
      <div className="absolute inset-0 pointer-events-none hidden dark:block">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-64 bg-cyan-500/10 blur-[100px] rounded-full" />
        <div className="absolute bottom-32 right-8 w-48 h-48 bg-amber-500/5 blur-[80px] rounded-full" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950" />
      </div>

      {/* ── Header ── */}
      <div className="relative z-10 px-5 pt-5 pb-4 border-b border-slate-200 dark:border-slate-800/60">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-600 flex items-center justify-center shadow-[0_0_16px_rgba(34,211,238,0.35)]">
            <Rss size={14} className="text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">RSS 发现助手</h2>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">用自然语言找到想要的订阅源</p>
          </div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-900/70 backdrop-blur-sm rounded-xl p-3 border border-slate-200 dark:border-slate-700/50">
          <SearchConfigForm />
        </div>
      </div>

      {/* ── Chat area ── */}
      <div className="relative z-10 flex-1 overflow-y-auto px-5 py-4 space-y-6 scrollbar-thin">

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full space-y-4 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400/20 to-teal-600/20 border border-cyan-400/30 flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.15)]">
              <Rss size={28} className="text-cyan-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">探索 RSS 宇宙</p>
              <p className="text-xs text-slate-400 dark:text-slate-600 mt-1">试试：科技新闻 · 编程教程 · AI 前沿 · 动漫资讯</p>
            </div>
            <div className="flex gap-2 flex-wrap justify-center max-w-xs">
              {['科技新闻', '编程博客', 'AI前沿', '游戏电竞'].map((tag) => (
                <button
                  key={tag}
                  onClick={() => { setInput(tag); }}
                  className="px-3 py-1 text-xs rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-cyan-400/50 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-text"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="space-y-3 animate-message-in">

            {msg.role === 'user' ? (
              <div className="flex justify-end animate-message-in">
                <div className="max-w-[78%] px-4 py-3 rounded-2xl rounded-br-sm bg-gradient-to-br from-amber-500 to-orange-500 text-white text-sm leading-relaxed shadow-[0_4px_20px_rgba(245,158,11,0.35)]">
                  {msg.content}
                </div>
              </div>
            ) : (
              <div className="space-y-3 animate-message-in">
                {/* AI avatar + text */}
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-teal-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-[0_0_12px_rgba(34,211,238,0.4)]">
                    <Rss size={12} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>

                {/* Source cards */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="pl-0 space-y-2">
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-600 font-medium px-1">
                      · 发现的订阅源 ({msg.sources.length})
                    </p>
                    <div className="grid gap-2">
                      {msg.sources.map((s, i) => {
                        const isAdded = addedUrls.has(s.url)
                        const isAdding = addingSources.has(s.url)
                        return (
                          <div
                            key={s.url}
                            className="group relative bg-white dark:bg-slate-900/80 backdrop-blur-md rounded-xl p-4 border border-slate-200 dark:border-slate-700/60 hover:border-cyan-400/50 transition-all duration-300 animate-source-card"
                            style={{ animationDelay: `${i * 80}ms` }}
                          >
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-teal-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                            <div className="flex items-start gap-3 relative">
                              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:shadow-[0_0_12px_rgba(34,211,238,0.3)] transition-shadow">
                                <Rss size={12} className="text-cyan-400" />
                              </div>

                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate group-hover:text-cyan-600 dark:group-hover:text-cyan-200 transition-colors">{s.name}</p>
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 truncate">{s.url}</p>
                                {s.description && (
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed line-clamp-2">{s.description}</p>
                                )}
                                {s.suggested_category && (
                                  <div className="mt-2 flex items-center gap-1.5">
                                    <span className="px-2 py-0.5 text-[10px] rounded-full bg-teal-500/15 border border-teal-500/30 text-teal-600 dark:text-teal-300 font-medium">
                                      {s.suggested_category}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <button
                                onClick={() => handleAddSource(s)}
                                disabled={isAdded || isAdding}
                                className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
                                  isAdded
                                    ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-500 dark:text-emerald-400'
                                    : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-cyan-500 hover:border-cyan-400 hover:text-white group-hover:shadow-[0_0_12px_rgba(34,211,238,0.4)]'
                                }`}
                              >
                                {isAdding ? (
                                  <Loader2 size={13} className="animate-spin" />
                                ) : isAdded ? (
                                  <CheckCircle size={13} />
                                ) : (
                                  <Plus size={13} />
                                )}
                              </button>
                            </div>

                            <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 animate-message-in">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-[0_0_12px_rgba(34,211,238,0.4)]">
              <Rss size={12} className="text-white" />
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '160ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '320ms' }} />
              </div>
              <span className="text-xs">AI 正在思考...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input area ── */}
      <div className="relative z-10 px-5 pb-5">
        <div className="relative">
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-cyan-500/20 via-teal-500/10 to-cyan-500/20 opacity-50 pointer-events-none" />
          <div className="relative flex items-center gap-2 bg-white dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/80 px-4 py-2 focus-within:border-cyan-500/60 transition-colors">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="描述你想要的 RSS 源..."
              className="flex-1 bg-transparent text-sm placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none py-1"
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center text-white disabled:opacity-30 hover:shadow-[0_0_16px_rgba(34,211,238,0.5)] transition-shadow disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes message-in {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes source-card {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
        .animate-message-in { animation: message-in 0.35s ease-out forwards; }
        .animate-source-card { animation: source-card 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards; opacity: 0; }
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: #334155; border-radius: 2px; }
      `}</style>
    </div>
  )
}
