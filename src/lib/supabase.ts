/**
 * Supabase 客户端 — 懒加载，未配置时自动降级
 * 所有数据库操作都是非阻塞的，不会影响聊天功能
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Supabase 是否已配置 */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let client: SupabaseClient | null = null;

/** 获取 Supabase 客户端（懒加载，未配置返回 null） */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
  }
  return client;
}

// ============ 会话管理 ============

/** 生成或获取会话 ID（localStorage 持久化） */
export function getSessionId(): string {
  const KEY = "chat_session_id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(KEY, id);
  }
  return id;
}

// ============ 对话记录 ============

export interface ChatLog {
  id?: string;
  session_id: string;
  user_message: string;
  ai_response: string;
  user_agent?: string;
  created_at?: string;
  // 管理标记
  status?: "new" | "reviewed" | "important";
  admin_note?: string;
}

/**
 * 记录一条对话（非阻塞，失败只 console.warn）
 */
export async function logConversation(
  userMessage: string,
  aiResponse: string
): Promise<void> {
  try {
    const supabase = getSupabase();
    if (!supabase) return; // 未配置，静默跳过

    const { error } = await supabase.from("chat_logs").insert({
      session_id: getSessionId(),
      user_message: userMessage,
      ai_response: aiResponse,
      user_agent: navigator.userAgent.slice(0, 200),
    });

    if (error) {
      console.warn("[Supabase] 记录对话失败:", error.message);
    }
  } catch (e) {
    console.warn("[Supabase] 记录对话异常:", e);
  }
}

// ============ 知识库 ============

export interface KnowledgeEntry {
  id?: string;
  category: string;
  content: string;
  source?: string;
  active: boolean;
  created_at?: string;
}

/**
 * 获取所有活跃的知识库条目（非阻塞，失败返回空数组）
 */
export async function fetchActiveKnowledge(): Promise<KnowledgeEntry[]> {
  try {
    const supabase = getSupabase();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from("knowledge_base")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: true });

    if (error) {
      console.warn("[Supabase] 获取知识库失败:", error.message);
      return [];
    }

    return data || [];
  } catch (e) {
    console.warn("[Supabase] 获取知识库异常:", e);
    return [];
  }
}

// ============ 管理后台 API ============

/** 获取所有对话记录 */
export async function fetchAllChats(): Promise<ChatLog[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("chat_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;
  return data || [];
}

/** 更新对话状态 */
export async function updateChatStatus(
  id: string,
  updates: Partial<ChatLog>
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase.from("chat_logs").update(updates).eq("id", id);
  if (error) throw error;
}

/** 获取所有知识库条目 */
export async function fetchAllKnowledge(): Promise<KnowledgeEntry[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("knowledge_base")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

/** 添加知识库条目 */
export async function addKnowledge(
  entry: Omit<KnowledgeEntry, "id" | "created_at">
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase.from("knowledge_base").insert(entry);
  if (error) throw error;
}

/** 更新知识库条目 */
export async function updateKnowledge(
  id: string,
  updates: Partial<KnowledgeEntry>
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase.from("knowledge_base").update(updates).eq("id", id);
  if (error) throw error;
}

/** 删除知识库条目 */
export async function deleteKnowledge(id: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase.from("knowledge_base").delete().eq("id", id);
  if (error) throw error;
}
