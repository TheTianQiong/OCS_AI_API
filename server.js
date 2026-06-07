require("dotenv").config();

const express = require("express");
const cors = require("cors");
const config = require("./config");
const database = require("./database");
const openaiProvider = require("./providers/openai");
const claudeProvider = require("./providers/claude");
const geminiProvider = require("./providers/gemini");

const app = express();
app.use(cors());
app.use(express.json());

/**
 * 获取启用的 AI 提供商配置
 */
function getActiveProvider() {
  const providerName = config.defaultProvider;
  const providerConfig = config.providers[providerName];

  if (!providerConfig) {
    throw new Error(`未知的 AI 提供商: ${providerName}`);
  }

  if (!providerConfig.enabled) {
    throw new Error(
      `AI 提供商 "${providerName}" 未启用，请在 config.js 中启用并配置 API Key`
    );
  }

  return { name: providerName, config: providerConfig };
}

/**
 * 调用 AI 接口
 * @returns {Object} { answer, provider }
 */
async function askAI(title, options, type) {
  const { name, config: providerConfig } = getActiveProvider();

  // 构造题目描述
  let userContent = `题目：${title}`;

  if (type) {
    const typeMap = {
      single: "单选题",
      multiple: "多选题",
      judgement: "判断题",
      completion: "填空题",
    };
    const typeText = typeMap[type] || type;
    userContent += `\n题型：${typeText}`;
  }

  if (options) {
    userContent += `\n选项：\n${options}`;
  }

  const messages = [
    { role: "system", content: config.systemPrompt },
    { role: "user", content: userContent },
  ];

  if (config.debug) {
    console.log(`[${new Date().toLocaleString()}] 请求 ${name}:`, {
      model: providerConfig.model,
      title,
      type,
    });
  }

  let answer;
  const startTime = Date.now();

  switch (name) {
    case "openai":
    case "deepseek":
    case "custom":
      answer = await openaiProvider.chat(providerConfig, messages);
      break;
    case "claude":
      answer = await claudeProvider.chat(providerConfig, messages);
      break;
    case "gemini":
      answer = await geminiProvider.chat(providerConfig, messages);
      break;
    default:
      throw new Error(`不支持的 AI 提供商: ${name}`);
  }

  if (config.debug) {
    console.log(
      `[${new Date().toLocaleString()}] 响应耗时 ${Date.now() - startTime}ms:`
    );
    console.log(`  答案: ${answer}`);
  }

  return { answer, provider: name };
}

/**
 * 将题目存档到数据库（旁路，不影响主流程）
 */
async function archiveQuestion(title, options, type, answer, provider) {
  try {
    const result = database.saveQuestion({
      type,
      title,
      options: options || "",
      answer: answer || "",
      provider: provider || "",
    });
    if (config.debug) {
      if (result.success && result.isNew) {
        console.log(`  [存档] 新题目已保存 (id=${result.id})`);
      } else if (result.success) {
        console.log(`  [存档] 题目已更新 (id=${result.id})`);
      } else {
        console.log(`  [存档] 保存失败: ${result.error}`);
      }
    }
  } catch (err) {
    // 存档失败不应影响主流程
    if (config.debug) {
      console.log(`  [存档] 异常: ${err.message}`);
    }
  }
}

/**
 * 健康检查接口
 */
app.get("/", (req, res) => {
  res.json({
    code: 1,
    msg: "OCS 本地 AI 接口服务运行中",
    provider: config.defaultProvider,
  });
});

/**
 * 获取当前配置信息（不暴露 API Key）
 */
app.get("/info", (req, res) => {
  try {
    const activeProvider = getActiveProvider();
    res.json({
      code: 1,
      provider: activeProvider.name,
      model: activeProvider.config.model,
      baseUrl: activeProvider.config.baseUrl,
    });
  } catch (err) {
    res.json({
      code: 0,
      msg: err.message,
    });
  }
});

/**
 * 解题接口 - 兼容 OCS AnswererWrapper 格式
 * 支持 GET 和 POST
 */
app.all("/search", async (req, res) => {
  try {
    // 支持 GET 和 POST 参数
    const title = req.query.title || req.body?.title || "";
    const options = req.query.options || req.body?.options || "";
    const type = req.query.type || req.body?.type || "";

    if (!title) {
      return res.json({
        code: 0,
        msg: "缺少题目参数 (title)",
      });
    }

    const { answer, provider } = await askAI(title, options, type);

    // 异步存档（不阻塞响应）
    archiveQuestion(title, options, type, answer, provider);

    if (!answer) {
      return res.json({
        code: 0,
        msg: "AI 未返回答案",
      });
    }

    // 返回 OCS 兼容格式
    // [题目, 答案] 或 [undefined, 答案]
    res.json({
      code: 1,
      question: title,
      answer: answer,
    });
  } catch (err) {
    console.error("[错误]", err.message);
    res.json({
      code: 0,
      msg: err.message,
    });
  }
});

/**
 * 批量解题接口 - 二维数组返回格式
 */
app.all("/search/batch", async (req, res) => {
  try {
    const titles = req.query.titles || req.body?.titles || [];
    const options = req.query.options || req.body?.options || [];
    const types = req.query.types || req.body?.types || [];

    if (!Array.isArray(titles) || titles.length === 0) {
      return res.json({
        code: 0,
        msg: "缺少题目数组参数 (titles)",
      });
    }

    const results = [];
    for (let i = 0; i < titles.length; i++) {
      try {
        const { answer, provider } = await askAI(
          titles[i],
          options[i] || "",
          types[i] || ""
        );
        results.push([titles[i], answer]);

        // 存档
        archiveQuestion(titles[i], options[i] || "", types[i] || "", answer, provider);
      } catch (e) {
        results.push([titles[i], undefined]);
      }
    }

    res.json({
      code: 1,
      results,
    });
  } catch (err) {
    console.error("[错误]", err.message);
    res.json({
      code: 0,
      msg: err.message,
    });
  }
});

/* ============================
 * 存档管理接口（仅供浏览/导出）
 * ============================ */

/**
 * GET /archive
 * 查询存档题目列表（支持分页、按题型筛选、关键词搜索）
 * 参数：
 *   - type: 题型（单项选择题/多项选择题/判断题/填空题/简答题）
 *   - keyword: 关键词模糊搜索题干
 *   - page: 页码，默认 1
 *   - pageSize: 每页条数，默认 20
 */
app.get("/archive", (req, res) => {
  try {
    const { type, keyword, page, pageSize } = req.query;
    const result = database.queryQuestions({
      type,
      keyword,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
    });
    res.json({
      code: 1,
      data: result,
    });
  } catch (err) {
    console.error("[存档查询错误]", err.message);
    res.json({ code: 0, msg: err.message });
  }
});

/**
 * GET /archive/stats
 * 获取存档统计信息（各题型数量）
 */
app.get("/archive/stats", (req, res) => {
  try {
    const result = database.getStats();
    res.json({
      code: 1,
      data: result,
    });
  } catch (err) {
    console.error("[存档统计错误]", err.message);
    res.json({ code: 0, msg: err.message });
  }
});

/**
 * GET /archive/:id
 * 获取单条题目详情
 */
app.get("/archive/:id", (req, res) => {
  try {
    const question = database.getQuestionById(Number(req.params.id));
    if (!question) {
      return res.json({ code: 0, msg: "题目不存在" });
    }
    res.json({
      code: 1,
      data: question,
    });
  } catch (err) {
    console.error("[存档查询错误]", err.message);
    res.json({ code: 0, msg: err.message });
  }
});

// 启动服务
const PORT = config.port || 3000;

(async () => {
  await database.init();
  console.log(`[数据库] 题目存档模块已就绪`);

  app.listen(PORT, () => {
    console.log(`=================================`);
    console.log(`OCS 本地 AI 接口服务已启动`);
    console.log(`访问地址: http://localhost:${PORT}`);
    console.log(`当前 AI 提供商: ${config.defaultProvider}`);
    console.log(`=================================`);
  });
})();
