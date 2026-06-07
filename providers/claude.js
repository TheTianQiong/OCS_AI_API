/**
 * Claude (Anthropic) 提供商
 */

async function chat(config, messages) {
  const { apiKey, baseUrl, model, temperature, maxTokens } = config;

  if (!apiKey) {
    throw new Error("Claude 未配置 API Key");
  }

  const url = `${baseUrl.replace(/\/$/, "")}/messages`;

  // 转换 messages 格式为 Claude 格式
  const systemMessage = messages.find((m) => m.role === "system")?.content || "";
  const otherMessages = messages.filter((m) => m.role !== "system");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens || 1024,
      temperature: temperature ?? 0.1,
      system: systemMessage,
      messages: otherMessages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Claude 接口错误 (${res.status}): ${text}`);
  }

  const data = await res.json();

  // Claude 返回的内容在 content 数组中
  if (Array.isArray(data.content)) {
    return data.content.map((c) => c.text).join("").trim();
  }

  return data.content?.text?.trim() ?? "";
}

module.exports = { chat };
