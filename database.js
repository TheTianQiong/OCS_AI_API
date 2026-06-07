/**
 * 题目存档数据库模块
 * 使用 sql.js (SQLite) 纯 JS 实现，零原生依赖
 * 数据持久化到文件 ./data/questions.db
 */

const fs = require("fs");
const path = require("path");
const initSqlJs = require("sql.js");

const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "questions.db");

let db = null;
let SQL = null;

/**
 * 题型映射：将脚本传入的 type 转为中文题型
 */
const TYPE_MAP = {
  single: "单项选择题",
  multiple: "多项选择题",
  judgement: "判断题",
  completion: "填空题",
  shortanswer: "简答题",
};

/**
 * 初始化数据库
 */
async function init() {
  if (db) return db;

  SQL = await initSqlJs();

  // 确保数据目录存在
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // 如果存在数据库文件，则加载
  if (fs.existsSync(DB_FILE)) {
    const filebuffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(filebuffer);
  } else {
    db = new SQL.Database();
  }

  // 创建表
  db.run(`
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      options TEXT,
      answer TEXT,
      provider TEXT,
      created_at INTEGER NOT NULL
    )
  `);

  // 创建索引（按题干+题型去重，避免完全相同的题目重复存档）
  db.run(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_title_type ON questions(title, type)
  `);

  // 创建时间索引方便按时间倒序查询
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_created_at ON questions(created_at DESC)
  `);

  save();
  return db;
}

/**
 * 保存数据库到文件
 */
function save() {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(DB_FILE, Buffer.from(data));
}

/**
 * 插入或更新题目
 * @param {Object} params
 * @param {string} params.type - 题目类型（single/multiple/judgement/completion/shortanswer）
 * @param {string} params.title - 题干
 * @param {string} [params.options] - 选项
 * @param {string} [params.answer] - 正确答案
 * @param {string} [params.provider] - AI 提供商
 * @returns {Object} { success, isNew, id }
 */
function saveQuestion({ type, title, options = "", answer = "", provider = "" }) {
  if (!db) throw new Error("数据库尚未初始化");
  if (!title) throw new Error("题目标题不能为空");

  const typeText = TYPE_MAP[type] || type || "未知题型";
  const now = Date.now();

  try {
    // 尝试插入，若唯一索引冲突则更新答案和时间
    const stmt = db.prepare(`
      INSERT INTO questions (type, title, options, answer, provider, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(title, type) DO UPDATE SET
        answer = excluded.answer,
        options = excluded.options,
        provider = excluded.provider,
        created_at = excluded.created_at
    `);
    stmt.run([typeText, title, options, answer, provider, now]);
    stmt.free();

    save();

    // 判断是否为新插入还是更新
    const infoStmt = db.prepare(`
      SELECT id, created_at FROM questions WHERE title = ? AND type = ?
    `);
    infoStmt.bind([title, typeText]);
    infoStmt.step();
    const id = infoStmt.getAsObject().id;
    const createdAt = infoStmt.getAsObject().created_at;
    infoStmt.free();

    return {
      success: true,
      isNew: createdAt === now,
      id,
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * 查询题目列表
 * @param {Object} filters
 * @param {string} [filters.type] - 按题型筛选
 * @param {string} [filters.keyword] - 按关键词模糊搜索题干
 * @param {number} [filters.page=1] - 页码
 * @param {number} [filters.pageSize=20] - 每页条数
 * @returns {Object} { total, page, pageSize, list }
 */
function queryQuestions({ type, keyword, page = 1, pageSize = 20 } = {}) {
  if (!db) throw new Error("数据库尚未初始化");

  const conditions = [];
  const params = [];

  if (type) {
    conditions.push("type = ?");
    params.push(type);
  }
  if (keyword) {
    conditions.push("title LIKE ?");
    params.push(`%${keyword}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  // 查询总数
  const countStmt = db.prepare(`SELECT COUNT(*) as total FROM questions ${where}`);
  if (params.length) {
    countStmt.bind(params);
  }
  countStmt.step();
  const total = countStmt.getAsObject().total;
  countStmt.free();

  // 分页查询
  const offset = (page - 1) * pageSize;
  const queryStmt = db.prepare(`
    SELECT id, type, title, options, answer, provider, created_at
    FROM questions
    ${where}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `);
  queryStmt.bind([...params, pageSize, offset]);

  const list = [];
  while (queryStmt.step()) {
    const row = queryStmt.getAsObject();
    list.push({
      id: row.id,
      type: row.type,
      title: row.title,
      options: row.options,
      answer: row.answer,
      provider: row.provider,
      createdAt: row.created_at,
      createdAtText: new Date(row.created_at).toLocaleString("zh-CN"),
    });
  }
  queryStmt.free();

  return {
    total,
    page,
    pageSize,
    list,
  };
}

/**
 * 获取各题型统计数量
 */
function getStats() {
  if (!db) throw new Error("数据库尚未初始化");

  const stmt = db.prepare(`
    SELECT type, COUNT(*) as count FROM questions GROUP BY type ORDER BY count DESC
  `);

  const stats = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    stats.push({ type: row.type, count: row.count });
  }
  stmt.free();

  // 总数
  const totalStmt = db.prepare(`SELECT COUNT(*) as total FROM questions`);
  totalStmt.step();
  const total = totalStmt.getAsObject().total;
  totalStmt.free();

  return { total, stats };
}

/**
 * 根据 ID 获取单条题目
 */
function getQuestionById(id) {
  if (!db) throw new Error("数据库尚未初始化");
  const stmt = db.prepare(`SELECT * FROM questions WHERE id = ?`);
  stmt.bind([id]);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return {
      id: row.id,
      type: row.type,
      title: row.title,
      options: row.options,
      answer: row.answer,
      provider: row.provider,
      createdAt: row.created_at,
      createdAtText: new Date(row.created_at).toLocaleString("zh-CN"),
    };
  }
  stmt.free();
  return null;
}

module.exports = {
  init,
  saveQuestion,
  queryQuestions,
  getStats,
  getQuestionById,
};
