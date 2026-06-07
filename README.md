# OCS_AI 解题接口

基于 OCS 题库配置规范开发的本地 HTTP 服务，支持接入 OpenAI、Claude、Gemini、DeepSeek 等主流 AI API 进行解题。

**注意：该项目由AI开发，仅供学习，请勿进行任何商业行为！**

## 下一步计划

测试cloudflare workers的可行性

## 项目需求

本地（推荐，已测试）或服务器（未尝试，可以自行研究部署到cloudflare workers）

## 快速开始

### 1. 安装依赖

请下载该项目的ZIP文件

确保已安装 [Node.js](https://nodejs.org/) (建议 v18+)

```bash
npm install
```

### 2. 配置 API Key

**方式一：使用 .env 文件（推荐，更安全）**

复制示例文件：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的 API Key：

```env
OCS_AI_PROVIDER=deepseek

DEEPSEEK_ENABLED=true
DEEPSEEK_API_KEY=your-deepseek-api-key
```

**方式二：直接编辑 config.js**

编辑 `config.js`，选择你要使用的 AI 提供商并填入 API Key：

```javascript
defaultProvider: "deepseek",  // 选择默认使用的 AI

providers: {
  deepseek: {
    enabled: true,           // 启用该提供商
    apiKey: "your-api-key",  // 填入你的 API Key
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    temperature: 0.1,
  },
}
```

### 3. 启动服务

```bash
npm start
```

服务启动后，默认监听 `http://localhost:3000`

### 4. 在 OCS 中配置题库

在 OCS 脚本的题库配置中，添加以下配置：

```json
[
  {
    "name": "本地AI接口",
    "url": "http://localhost:3000/search",
    "method": "get",
    "contentType": "json",
    "data": {
      "title": "${title}",
      "type": "${type}",
      "options": "${options}"
    },
    "handler": "return (res)=> res.code === 1 ? [res.question, res.answer] : [res.msg, undefined]"
  }
]
```

> **注意**：如果 OCS 脚本在浏览器中运行，需要确保 `@connect` 元信息包含 `localhost`，或者将油猴的 `@connect 模式` 设置为宽松模式。

## API 接口说明

### GET /search - 解题接口

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | 是 | 题目标题 |
| type | string | 否 | 题目类型：single/multiple/judgement/completion |
| options | string | 否 | 题目选项，用 `\n` 分隔 |

**返回示例：**

```json
{
  "code": 1,
  "question": "中国梦是什么？",
  "answer": "实现中华民族伟大复兴"
}
```

### GET /info - 获取当前配置

```json
{
  "code": 1,
  "provider": "deepseek",
  "model": "deepseek-chat",
  "baseUrl": "https://api.deepseek.com/v1"
}
```

## 各 AI 提供商配置指南

### DeepSeek（推荐，国内可用）

```javascript
deepseek: {
  enabled: true,
  apiKey: "sk-xxxxxxxx",
  baseUrl: "https://api.deepseek.com/v1",
  model: "deepseek-chat",
}
```

官网：https://platform.deepseek.com/

### OpenAI

```javascript
openai: {
  enabled: true,
  apiKey: "sk-xxxxxxxx",
  baseUrl: "https://api.openai.com/v1",
  model: "gpt-4o-mini",
}
```

国内用户可使用 OpenAI 兼容的中转接口，修改 `baseUrl` 即可。

### Claude (Anthropic)

```javascript
claude: {
  enabled: true,
  apiKey: "sk-ant-xxxxxxxx",
  baseUrl: "https://api.anthropic.com/v1",
  model: "claude-sonnet-4-6",
}
```

### Google Gemini

```javascript
gemini: {
  enabled: true,
  apiKey: "AIzaSyxxxxxxxx",
  baseUrl: "https://generativelanguage.googleapis.com/v1beta",
  model: "gemini-1.5-flash",
}
```

### 自定义接口

```javascript
custom: {
  enabled: true,
  apiKey: "your-key",
  baseUrl: "https://your-proxy.com/v1",
  model: "gpt-4",
}
```

## 进阶配置

### 修改系统提示词

编辑 `config.js` 中的 `systemPrompt`，可以调整 AI 的答题风格：

```javascript
systemPrompt: `你是一个专业的解题助手...
要求：
1. 直接给出答案，不要解释推理过程
2. 如果是选择题，只返回选项字母...
`,
```

### 多选题处理

如果 AI 返回的多选题答案是用逗号或其他符号分隔的，可以在 `handler` 中处理：

```json
{
  "handler": "return (res)=> res.code === 1 ? [res.question, res.answer.replace(/,/g, '#')] : [res.msg, undefined]"
}
```

OCS 要求多选题答案用 `#` 分隔，例如：`A#B#C`

## 常见问题

### Q: 油猴脚本提示跨域错误？

A: 在油猴脚本头部添加 `@connect localhost`，或者将油猴的 `@connect 模式` 设置为 `宽松模式`。

### Q: 服务启动后 OCS 无法访问？

A: 检查防火墙是否放行了对应端口。如果 OCS 脚本在浏览器中运行，确保服务确实在 `localhost:3000` 启动。

### Q: 如何同时使用多个 AI？

A: 目前服务只支持单一 AI 提供商，但你可以在 OCS 中配置多个题库（指向不同端口启动的服务），OCS 会自动按顺序查询。

### Q: 题目搜索不到？

A: 检查 `config.js` 中的 API Key 是否正确，以及该 AI 提供商是否可用。可在浏览器直接访问 `http://localhost:3000/search?title=1+1=` 测试。

### Q: data文件下的db文件的作用是什么？

A: 设置了数据库，可以收集搜索过的题目（收集结果没有统一格式，可能是选项可能是选项内容，设置数据库仅作收集作用），但AI解题不会搜索数据库

