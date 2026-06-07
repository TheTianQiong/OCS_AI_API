/**
 * OpenAI 兼容格式提供商
 * 支持 OpenAI, DeepSeek, 以及任何 OpenAI 兼容接口
 */

async function chat(config, messages) {
  const { apiKey, baseUrl, model, temperature } = config;

  if (!apiKey) {
    throw new Error("OpenAI 兼容接口未配置 API Key");
  }

  const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: temperature ?? 0.1,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI 接口错误 (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

module.exports = { chat };
