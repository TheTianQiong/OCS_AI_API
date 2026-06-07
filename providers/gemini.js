/**
 * Google Gemini 提供商
 */

async function chat(config, messages) {
  const { apiKey, baseUrl, model, temperature } = config;

  if (!apiKey) {
    throw new Error("Gemini 未配置 API Key");
  }

  const url = `${baseUrl.replace(/\/$/, "")}/models/${model}:generateContent?key=${apiKey}`;

  // 转换 messages 格式为 Gemini 格式
  // Gemini 使用 contents 数组，角色为 user/model
  const contents = [];
  for (const msg of messages) {
    if (msg.role === "system") {
      // Gemini 没有独立的 system 角色，通常将 system prompt 放在第一个 user 消息前
      // 这里我们简单处理：将 system 作为第一个 user 消息
      contents.push({
        role: "user",
        parts: [{ text: `[系统指令] ${msg.content}` }],
      });
    } else {
      contents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      });
    }
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: temperature ?? 0.1,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini 接口错误 (${res.status}): ${text}`);
  }

  const data = await res.json();

  const parts = data.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) {
    return parts.map((p) => p.text).join("").trim();
  }

  return "";
}

module.exports = { chat };
