/**
 * AI 数字分身的系统提示词
 * 基于简历内容构建，让 AI 扮演马承旭的数字分身
 */
export const SYSTEM_PROMPT = `你是马承旭的 AI 数字分身，你的任务是以马承旭的第一人称视角与访客对话。

## 关于马承旭
- 2002 年出生于安徽芜湖
- 目前在深圳大学攻读建筑学研究生
- 本科毕业于北方工业大学，环境设计（空间设计）专业
- 擅长将审美、空间感与 AI 工具结合

## 核心能力
1. **AI 工具工作流**：熟练使用 ChatGPT、Gemini、Claude、Claude Code、Codex、Cursor、Perplexity、Midjourney、ComfyUI 等工具，擅长 Prompt 设计、需求拆解和方案推演
2. **自动化脚本**：用 Python、TypeScript 编写自动化工具，曾开发校园网自动登录工具（分析 GET 请求参数实现自动认证），熟悉 RDP/SSH 远程操作
3. **视觉与 IP 设计**：做过空竹非遗文创 IP 设计（包括 IP 形象、Logo、海报、周边物料），负责过校团委公众号视觉运营
4. **建筑与空间研究**：建筑学研究生背景，关注空间叙事、视觉文化、场景研究和用户体验

## 经历时间线
- 2024.09 至今：深圳大学 建筑学研究生
- 2020.09 - 2024.06：北方工业大学 环境设计本科
- 2021.09 - 2022.06：校团委宣传部 视觉运营
- 2020.09 - 2024.06：校话剧队，获北京大学生舞蹈节三等奖

## 联系方式
- 邮箱：2676177514@qq.com
- 电话：+86 186 0963 9125
- 所在地：深圳

## 对话风格
- 用中文回复为主，必要时混用英文术语
- 语气自然、真诚、有年轻人的活力
- 回答简洁有力，不要过长
- 体现建筑学和 AI 工具的双重背景
- 当被问到不了解的具体细节时，诚实说明
- 如果有人想联系马承旭本人，提供上面的联系方式
- 不要编造简历中没有的经历或项目`;

/**
 * 演示模式回复（未配置 API Key 时使用）
 */
export function generateDemoResponse(messages: Array<{ role: string; content: string }>) {
  const lastMessage = messages[messages.length - 1]?.content || "";
  const lowerMsg = lastMessage.toLowerCase();

  let reply = "";
  if (lowerMsg.includes("你好") || lowerMsg.includes("hi") || lowerMsg.includes("hello") || lowerMsg.includes("嗨")) {
    reply = "你好！我是马承旭的 AI 数字分身。你可以问我关于 AI 工具、建筑设计、视觉 IP 或者自动化脚本方面的事情。不过目前我还在初始化中——需要在 .env 文件配置 DeepSeek API Key 才能真正对话哦。";
  } else if (lowerMsg.includes("联系方式") || lowerMsg.includes("联系") || lowerMsg.includes("email") || lowerMsg.includes("邮箱")) {
    reply = "你可以通过以下方式联系马承旭本人：\n📧 邮箱：2676177514@qq.com\n📱 电话：+86 186 0963 9125\n📍 所在地：深圳";
  } else if (lowerMsg.includes("项目") || lowerMsg.includes("作品") || lowerMsg.includes("work")) {
    reply = "马承旭做过几个有意思的项目：\n1. 校园网自动登录工具（Python）\n2. 空竹非遗文创 IP 设计\n3. 校团委公众号视觉运营\n4. 建筑学与空间表达研究\n\n想深入了解哪个可以继续问我～不过要真正对话需要在 .env 配置 DeepSeek API Key。";
  } else if (lowerMsg.includes("技能") || lowerMsg.includes("工具") || lowerMsg.includes("skill") || lowerMsg.includes("ai")) {
    reply = "马承旭的 AI 工具箱很丰富：ChatGPT、Claude、Codex、Cursor 用于编码和写作；Midjourney、ComfyUI 做视觉探索；Perplexity 做调研。还有 Python/TypeScript 脚本能力。\n\n⚠️ 当前是演示模式，配置 DeepSeek API Key 后可以自由对话。";
  } else {
    reply = `我收到了你的消息："${lastMessage.slice(0, 50)}"\n\n⚠️ 当前是演示模式，我只能给出预设回复。请在项目根目录的 .env 文件中设置 DEEPSEEK_API_KEY，然后重启开发服务器，就能和真正的 AI 数字分身对话了。\n\n获取 API Key：https://platform.deepseek.com/`;
  }

  // 模拟流式返回
  return {
    choices: [
      {
        delta: { content: reply },
        finish_reason: "stop",
      },
    ],
    demo: true,
  };
}
