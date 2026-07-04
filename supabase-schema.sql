-- ============================================
-- 数字分身对话记录 & 知识库 SQL Schema
-- 在 Supabase SQL Editor 中运行此文件
-- ============================================

-- 1. 对话记录表
CREATE TABLE IF NOT EXISTS chat_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  user_agent TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'important')),
  admin_note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 知识库表
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL DEFAULT '补充信息',
  content TEXT NOT NULL,
  source TEXT DEFAULT '',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 索引（加速查询）
CREATE INDEX IF NOT EXISTS idx_chat_logs_created_at ON chat_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_logs_session ON chat_logs (session_id);
CREATE INDEX IF NOT EXISTS idx_chat_logs_status ON chat_logs (status);
CREATE INDEX IF NOT EXISTS idx_knowledge_active ON knowledge_base (active);

-- 4. RLS 策略（Row Level Security）
-- 对话记录：匿名用户只能插入，不能查看（只有管理员能看）
ALTER TABLE chat_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "匿名用户可以插入对话记录"
  ON chat_logs FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "匿名用户可以查看对话记录"
  ON chat_logs FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "匿名用户可以更新对话记录"
  ON chat_logs FOR UPDATE
  TO anon
  USING (true);

-- 知识库：匿名用户只能查看活跃条目
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "匿名用户可以查看活跃知识库"
  ON knowledge_base FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "匿名用户可以插入知识库"
  ON knowledge_base FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "匿名用户可以更新知识库"
  ON knowledge_base FOR UPDATE
  TO anon
  USING (true);

CREATE POLICY "匿名用户可以删除知识库"
  ON knowledge_base FOR DELETE
  TO anon
  USING (true);

-- 5. 初始知识库示例数据（可选）
INSERT INTO knowledge_base (category, content, source, active)
VALUES
  ('示例', '这是一条示例知识库条目，AI 会读取它作为补充知识。可以删除。', '系统初始化', true)
ON CONFLICT DO NOTHING;
