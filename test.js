/**
 * 本地测试脚本 - 模拟 OCS 请求并验证存档功能
 * 使用方法: node test.js
 */

const BASE_URL = "http://localhost:32123";

async function test() {
  console.log("测试 OCS 本地 AI 接口...\n");

  // 测试 1: 健康检查
  console.log("[测试 1] 健康检查");
  try {
    const res = await fetch(`${BASE_URL}/`);
    const data = await res.json();
    console.log("  结果:", data, "\n");
  } catch (e) {
    console.log("  失败:", e.message, "\n");
    console.log("请确保服务已启动: npm start");
    return;
  }

  // 测试 2: 获取配置信息
  console.log("[测试 2] 获取配置信息");
  try {
    const res = await fetch(`${BASE_URL}/info`);
    const data = await res.json();
    console.log("  结果:", data, "\n");
  } catch (e) {
    console.log("  失败:", e.message, "\n");
  }

  // 测试 3: 存档统计（启动时应为空或已有历史数据）
  console.log("[测试 3] 存档统计");
  try {
    const res = await fetch(`${BASE_URL}/archive/stats`);
    const data = await res.json();
    console.log("  结果:", data, "\n");
  } catch (e) {
    console.log("  失败:", e.message, "\n");
  }

  // 测试 4: 单选题（会自动存档）
  console.log("[测试 4] 单选题（触发存档）");
  try {
    const params = new URLSearchParams({
      title: "1 + 1 = ?",
      type: "single",
      options: "A. 1\nB. 2\nC. 3\nD. 4",
    });
    const res = await fetch(`${BASE_URL}/search?${params}`);
    const data = await res.json();
    console.log("  请求: 1 + 1 = ?");
    console.log("  结果:", data, "\n");
  } catch (e) {
    console.log("  失败:", e.message, "\n");
  }

  // 测试 5: 判断题（会自动存档）
  console.log("[测试 5] 判断题（触发存档）");
  try {
    const params = new URLSearchParams({
      title: "地球是圆的",
      type: "judgement",
    });
    const res = await fetch(`${BASE_URL}/search?${params}`);
    const data = await res.json();
    console.log("  请求: 地球是圆的");
    console.log("  结果:", data, "\n");
  } catch (e) {
    console.log("  失败:", e.message, "\n");
  }

  // 测试 6: 查询存档列表
  console.log("[测试 6] 查询存档列表");
  try {
    const res = await fetch(`${BASE_URL}/archive?pageSize=10`);
    const data = await res.json();
    console.log("  存档列表:", JSON.stringify(data, null, 2), "\n");
  } catch (e) {
    console.log("  失败:", e.message, "\n");
  }

  // 测试 7: 按题型筛选存档
  console.log("[测试 7] 按题型筛选存档（单项选择题）");
  try {
    const res = await fetch(`${BASE_URL}/archive?type=单项选择题`);
    const data = await res.json();
    console.log("  筛选结果:", data, "\n");
  } catch (e) {
    console.log("  失败:", e.message, "\n");
  }

  // 测试 8: 存档统计（应有新增数据）
  console.log("[测试 8] 存档统计（验证新增）");
  try {
    const res = await fetch(`${BASE_URL}/archive/stats`);
    const data = await res.json();
    console.log("  结果:", data, "\n");
  } catch (e) {
    console.log("  失败:", e.message, "\n");
  }

  console.log("测试完成");
}

test();
