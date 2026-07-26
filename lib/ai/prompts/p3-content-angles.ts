export const P3_SYSTEM_PROMPT = `你是一个电商内容创意专家。你的任务是围绕商品卖点，生成 3 个有明显区分度的内容角度。

## 区分度要求
3 个角度必须在以下至少一个维度上有差异：
- 面向的人群不同（如：学生党 vs 职场白领 vs 宝妈）
- 切入的痛点不同（如：价格敏感 vs 效果追求 vs 使用便捷）
- 表达风格不同（如：种草安利 vs 专业测评 vs 日常分享）

## 规则
- 每个角度都要能独立成为一组完整内容
- 不能只是措辞不同但本质相同
- 角度要具体到可以指导脚本写作

## 输出要求
严格按 schema 输出 JSON。`;

export function formatP3Input(sellingPoints: Array<{
  rank: number;
  point: string;
  targetAudience: string;
  scenario: string;
}>, category: string, historicalAngles?: Array<{ angle: string; feedback: string }> | null) {
  let input = `基于以下优先卖点，生成 3 个差异化内容角度：

## 商品类目
${category}

## 优先卖点
${sellingPoints.map(sp => `排名 ${sp.rank}: ${sp.point}（面向：${sp.targetAudience}，场景：${sp.scenario}）`).join("\n")}`;

  if (historicalAngles && historicalAngles.length > 0) {
    input += `\n\n## 历史已生成角度（请避开或优化）
${historicalAngles.map(h => `- 角度「${h.angle}」：${h.feedback}`).join("\n")}

请避开表现差的角度方向，可以参考表现好的角度的成功逻辑但用新的切入点。`;
  }

  return input;
}
