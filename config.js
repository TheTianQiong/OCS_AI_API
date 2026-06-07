/**
 * OCS 本地 AI 接口配置文件
 *
 * 使用说明：
 * 1. 在下方对应位置填入你的 API Key
 * 2. 选择默认使用的 AI 提供商（defaultProvider）
 * 3. 运行 npm install 安装依赖
 * 4. 运行 npm start 启动服务
 * 5. 在 OCS 脚本中添加题库配置，指向 http://localhost:3000/search
 */

// 环境变量读取辅助函数
const env = (key, defaultValue = "") => process.env[key] || defaultValue;
const envBool = (key, defaultValue = false) =>
  process.env[key] ? process.env[key] === "true" : defaultValue;
const envNum = (key, defaultValue = 0) =>
  process.env[key] ? Number(process.env[key]) : defaultValue;

module.exports = {
  // 服务端口
  port: envNum("OCS_PORT", 3000),

  // 默认使用的 AI 提供商
  // 可选值: "openai", "claude", "gemini", "deepseek", "custom"
  defaultProvider: env("OCS_AI_PROVIDER", "deepseek"),

  // 请求超时时间（毫秒）
  timeout: envNum("OCS_TIMEOUT", 30000),

  // 是否开启详细日志
  debug: envBool("OCS_DEBUG", true),

  // 各 AI 提供商配置
  // 环境变量会覆盖这里的默认值
  // 例如 DEEPSEEK_API_KEY=xxx 会覆盖 deepseek.apiKey
  providers: {
    /**
     * OpenAI / 兼容 OpenAI 格式的服务
     * 支持 GPT-4o, GPT-4o-mini 等
     * 也支持国内转发的 OpenAI 兼容接口
     */
    openai: {
      enabled: envBool("OPENAI_ENABLED", false),
      // API Key
      apiKey: env("OPENAI_API_KEY", ""),
      // API 基础地址（国内用户可换成转发地址）
      baseUrl: env("OPENAI_BASE_URL", "https://api.openai.com/v1"),
      // 模型名称
      model: env("OPENAI_MODEL", "gpt-4o-mini"),
      // 温度参数（0-2，越小越确定）
      temperature: envNum("OPENAI_TEMPERATURE", 0.1),
    },

    /**
     * Claude (Anthropic)
     * 支持 claude-opus-4-8, claude-sonnet-4-6, claude-haiku-4-5-20251001
     */
    claude: {
      enabled: envBool("CLAUDE_ENABLED", false),
      apiKey: env("CLAUDE_API_KEY", ""),
      baseUrl: env("CLAUDE_BASE_URL", "https://api.anthropic.com/v1"),
      model: env("CLAUDE_MODEL", "claude-sonnet-4-6"),
      temperature: envNum("CLAUDE_TEMPERATURE", 0.1),
      // Claude 使用 messages API，max_tokens 必填
      maxTokens: envNum("CLAUDE_MAX_TOKENS", 1024),
    },

    /**
     * Google Gemini
     * 支持 gemini-1.5-flash, gemini-1.5-pro 等
     */
    gemini: {
      enabled: envBool("GEMINI_ENABLED", false),
      apiKey: env("GEMINI_API_KEY", ""),
      // 注意：Gemini 的 baseUrl 格式不同
      baseUrl: env(
        "GEMINI_BASE_URL",
        "https://generativelanguage.googleapis.com/v1beta"
      ),
      model: env("GEMINI_MODEL", "gemini-1.5-flash"),
      temperature: envNum("GEMINI_TEMPERATURE", 0.1),
    },

    /**
     * DeepSeek
     * 国内可用，性价比高
     * 支持 deepseek-chat, deepseek-reasoner 等
     */
    deepseek: {
      enabled: envBool("DEEPSEEK_ENABLED", false),
      apiKey: env("DEEPSEEK_API_KEY", ""),
      baseUrl: env("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1"),
      model: env("DEEPSEEK_MODEL", "deepseek-chat"),
      temperature: envNum("DEEPSEEK_TEMPERATURE", 0.1),
    },

    /**
     * 自定义 OpenAI 兼容接口
     * 用于接入其他国内中转平台或自部署模型
     */
    custom: {
      enabled: envBool("CUSTOM_ENABLED", false),
      apiKey: env("CUSTOM_API_KEY", ""),
      baseUrl: env("CUSTOM_BASE_URL", ""),
      model: env("CUSTOM_MODEL", ""),
      temperature: envNum("CUSTOM_TEMPERATURE", 0.1),
    },
  },

  /**
   * 系统提示词（System Prompt）
   * 用于指导 AI 如何回答题目
   * 你可以根据需要修改以获得更好的效果
   */
  systemPrompt: `你是一个专业的解题助手。用户会提供网课题目，请根据题目内容给出最准确的答案。

要求：
1. 直接给出答案，不要解释推理过程
2. 如果是选择题，只返回选项字母（如 A, B, C, D）或选项内容
3. 如果是判断题，只返回"正确"或"错误"
4. 如果是填空题，只返回需要填写的内容
5. 如果题目包含多个小题，用换行符分隔答案
6. 答案必须简洁准确，不要添加额外说明`,
};
