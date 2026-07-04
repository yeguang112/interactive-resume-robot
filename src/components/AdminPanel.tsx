import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  MessageSquare,
  BookOpen,
  Plus,
  Trash2,
  Star,
  Check,
  Loader2,
  ExternalLink,
} from "lucide-react";
import {
  isSupabaseConfigured,
  fetchAllChats,
  fetchAllKnowledge,
  updateChatStatus,
  addKnowledge,
  updateKnowledge,
  deleteKnowledge,
  type ChatLog,
  type KnowledgeEntry,
} from "@/lib/supabase";

interface AdminPanelProps {
  onBack: () => void;
}

export default function AdminPanel({ onBack }: AdminPanelProps) {
  const [tab, setTab] = useState<"chats" | "knowledge">("chats");
  const [chats, setChats] = useState<ChatLog[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (tab === "chats") {
        setChats(await fetchAllChats());
      } else {
        setKnowledge(await fetchAllKnowledge());
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ============ 对话记录操作 ============

  const handleChatStatus = async (id: string, status: ChatLog["status"]) => {
    try {
      await updateChatStatus(id, { status });
      setChats((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status } : c))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "更新失败");
    }
  };

  const handleChatNote = async (id: string, note: string) => {
    try {
      await updateChatStatus(id, { admin_note: note });
      setChats((prev) =>
        prev.map((c) => (c.id === id ? { ...c, admin_note: note } : c))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "更新失败");
    }
  };

  // ============ 知识库操作 ============

  const [newEntry, setNewEntry] = useState({
    category: "补充信息",
    content: "",
    source: "",
  });

  const handleAddKnowledge = async () => {
    if (!newEntry.content.trim()) return;
    try {
      await addKnowledge({
        category: newEntry.category,
        content: newEntry.content,
        source: newEntry.source || "管理员添加",
        active: true,
      });
      setNewEntry({ category: "补充信息", content: "", source: "" });
      setKnowledge(await fetchAllKnowledge());
    } catch (e) {
      setError(e instanceof Error ? e.message : "添加失败");
    }
  };

  const handleToggleKnowledge = async (id: string, active: boolean) => {
    try {
      await updateKnowledge(id, { active: !active });
      setKnowledge((prev) =>
        prev.map((k) => (k.id === id ? { ...k, active: !active } : k))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "更新失败");
    }
  };

  const handleDeleteKnowledge = async (id: string) => {
    if (!confirm("确定删除这条知识？")) return;
    try {
      await deleteKnowledge(id);
      setKnowledge((prev) => prev.filter((k) => k.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除失败");
    }
  };

  // ============ 未配置提示 ============

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="font-display text-2xl font-bold text-[var(--neon)] mb-4">
            Supabase 未配置
          </h1>
          <p className="text-white/60 text-sm leading-relaxed mb-6">
            需要配置 Supabase 才能使用管理后台。请在项目根目录的 .env 文件中添加：
          </p>
          <pre className="bg-white/5 border border-white/10 rounded-xl p-4 text-left text-xs text-white/70 overflow-x-auto">
{`VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_key`}
          </pre>
          <p className="text-white/40 text-xs mt-4">
            并在 Supabase 中运行 supabase-schema.sql 创建数据表
          </p>
          <button
            onClick={onBack}
            className="mt-6 px-6 py-2.5 rounded-xl border border-white/15 text-white/70 hover:text-white hover:border-white/30 transition-colors text-sm"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* 顶部栏 */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[rgba(5,5,5,0.9)] backdrop-blur-xl px-6 py-4">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              返回首页
            </button>
            <div className="h-4 w-px bg-white/10" />
            <h1 className="font-display text-lg font-bold">
              数字分身管理后台
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setTab("chats")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                tab === "chats"
                  ? "bg-[var(--neon)]/10 border border-[var(--neon)]/40 text-[var(--neon)]"
                  : "border border-white/10 text-white/50 hover:text-white"
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              对话记录
              {chats.length > 0 && (
                <span className="text-xs opacity-60">({chats.length})</span>
              )}
            </button>
            <button
              onClick={() => setTab("knowledge")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                tab === "knowledge"
                  ? "bg-[var(--neon)]/10 border border-[var(--neon)]/40 text-[var(--neon)]"
                  : "border border-white/10 text-white/50 hover:text-white"
              }`}
            >
              <BookOpen className="h-4 w-4" />
              知识库
              {knowledge.length > 0 && (
                <span className="text-xs opacity-60">({knowledge.length})</span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* 内容区 */}
      <main className="mx-auto max-w-6xl px-6 py-8">
        {error && (
          <div className="mb-4 rounded-lg border border-[var(--magenta)]/30 bg-[var(--magenta)]/5 px-4 py-3 text-sm text-[var(--magenta)]">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-white/30" />
          </div>
        ) : tab === "chats" ? (
          /* ===== 对话记录列表 ===== */
          <div className="space-y-3">
            {chats.length === 0 ? (
              <div className="text-center py-20 text-white/30 text-sm">
                暂无对话记录
              </div>
            ) : (
              chats.map((chat) => (
                <motion.div
                  key={chat.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden"
                >
                  <div className="p-4">
                    {/* 用户问题 */}
                    <div className="flex items-start gap-3 mb-3">
                      <span className="shrink-0 text-xs text-[var(--magenta)] mt-0.5">
                        用户
                      </span>
                      <p className="text-sm text-white/85 flex-1">
                        {chat.user_message}
                      </p>
                    </div>
                    {/* AI 回复 */}
                    <div className="flex items-start gap-3 mb-3">
                      <span className="shrink-0 text-xs text-[var(--neon)] mt-0.5">
                        AI
                      </span>
                      <p className="text-sm text-white/60 flex-1 line-clamp-4">
                        {chat.ai_response}
                      </p>
                    </div>
                    {/* 元信息 */}
                    <div className="flex items-center gap-3 text-xs text-white/30 mb-3">
                      <span>
                        {new Date(chat.created_at || "").toLocaleString("zh-CN")}
                      </span>
                      <span>{chat.session_id?.slice(0, 12)}...</span>
                      {chat.status === "important" && (
                        <span className="text-[var(--acid)]">★ 重要</span>
                      )}
                      {chat.status === "reviewed" && (
                        <span className="text-white/40">✓ 已查看</span>
                      )}
                    </div>
                    {/* 管理笔记 */}
                    <input
                      defaultValue={chat.admin_note || ""}
                      onBlur={(e) =>
                        e.target.value !== (chat.admin_note || "") &&
                        handleChatNote(chat.id!, e.target.value)
                      }
                      placeholder="添加管理笔记（失焦保存）..."
                      className="w-full rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2 text-xs text-white/70 placeholder-white/20 outline-none focus:border-[var(--neon)]/30"
                    />
                  </div>
                  {/* 操作按钮 */}
                  <div className="flex gap-1 border-t border-white/5 px-4 py-2">
                    <button
                      onClick={() => handleChatStatus(chat.id!, "important")}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs transition-colors ${
                        chat.status === "important"
                          ? "bg-[var(--acid)]/10 text-[var(--acid)]"
                          : "text-white/40 hover:text-[var(--acid)] hover:bg-[var(--acid)]/5"
                      }`}
                    >
                      <Star className="h-3 w-3" />
                      标记重要
                    </button>
                    <button
                      onClick={() => handleChatStatus(chat.id!, "reviewed")}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs transition-colors ${
                        chat.status === "reviewed"
                          ? "bg-white/10 text-white/70"
                          : "text-white/40 hover:text-white/70 hover:bg-white/5"
                      }`}
                    >
                      <Check className="h-3 w-3" />
                      标记已查看
                    </button>
                    {/* 快速添加到知识库 */}
                    <button
                      onClick={() => {
                        setTab("knowledge");
                        setNewEntry({
                          category: "用户纠正",
                          content: chat.user_message,
                          source: `来自对话 ${chat.id?.slice(0, 8)}`,
                        });
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs text-white/40 hover:text-[var(--neon)] hover:bg-[var(--neon)]/5 transition-colors ml-auto"
                    >
                      <Plus className="h-3 w-3" />
                      加入知识库
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        ) : (
          /* ===== 知识库管理 ===== */
          <div className="space-y-4">
            {/* 添加新知识 */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <h3 className="font-display text-sm font-bold text-white/80 mb-3">
                添加知识库条目
              </h3>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <input
                    value={newEntry.category}
                    onChange={(e) =>
                      setNewEntry({ ...newEntry, category: e.target.value })
                    }
                    placeholder="分类（如：用户纠正、补充信息）"
                    className="w-48 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white/80 placeholder-white/20 outline-none focus:border-[var(--neon)]/30"
                  />
                  <input
                    value={newEntry.source}
                    onChange={(e) =>
                      setNewEntry({ ...newEntry, source: e.target.value })
                    }
                    placeholder="来源（可选）"
                    className="flex-1 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white/80 placeholder-white/20 outline-none focus:border-[var(--neon)]/30"
                  />
                </div>
                <textarea
                  value={newEntry.content}
                  onChange={(e) =>
                    setNewEntry({ ...newEntry, content: e.target.value })
                  }
                  placeholder="知识内容（AI 会读取这段内容作为补充知识）"
                  rows={3}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white/80 placeholder-white/20 outline-none focus:border-[var(--neon)]/30 resize-none"
                />
                <button
                  onClick={handleAddKnowledge}
                  disabled={!newEntry.content.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--neon)]/30 bg-[var(--neon)]/5 text-[var(--neon)] text-sm transition-colors hover:bg-[var(--neon)]/10 disabled:opacity-30"
                >
                  <Plus className="h-4 w-4" />
                  添加
                </button>
              </div>
            </div>

            {/* 知识库列表 */}
            <div className="space-y-2">
              {knowledge.length === 0 ? (
                <div className="text-center py-12 text-white/30 text-sm">
                  暂无知识库条目
                </div>
              ) : (
                knowledge.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-[var(--neon)]/10 px-2 py-0.5 text-xs text-[var(--neon)]">
                          {entry.category}
                        </span>
                        {entry.source && (
                          <span className="text-xs text-white/30">
                            来源: {entry.source}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            handleToggleKnowledge(entry.id!, entry.active)
                          }
                          className={`px-2 py-1 rounded-md text-xs transition-colors ${
                            entry.active
                              ? "text-[var(--acid)] hover:bg-[var(--acid)]/5"
                              : "text-white/30 hover:bg-white/5"
                          }`}
                        >
                          {entry.active ? "已启用" : "已禁用"}
                        </button>
                        <button
                          onClick={() => handleDeleteKnowledge(entry.id!)}
                          className="p-1 rounded-md text-white/30 hover:text-[var(--magenta)] hover:bg-[var(--magenta)]/5 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-white/70 leading-relaxed">
                      {entry.content}
                    </p>
                    {entry.created_at && (
                      <p className="mt-2 text-xs text-white/20">
                        {new Date(entry.created_at).toLocaleString("zh-CN")}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
