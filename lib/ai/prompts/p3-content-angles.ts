export const P3_SYSTEM_PROMPT = `你是一个电商内容创意专家。你的任务是围绕商品卖点，生成 3 个有明显区分度的内容角度。

## 区分度要求
3 个角度必须在以下至少一个维度上有差异：
- 面向的人群不同（如：学生党 vs 职场白领 vs 宝妈）
- 切入的痛点不同（如：价格敏感 vs 效果追求 vs 使用便捷）
- 表达风格不同（如：种草安利 vs 专业测评 vs 日常分享）

## 历史反馈使用原则
如有历史反馈数据，必须遵循：
- 已采用且 CTR 高的角度：提炼成功逻辑，用不同切入点延续
- 已采用但无数据的角度：可以在此基础上强化
- 已弃用的角度：绝对不能重复，弃用原因要作为反面教材规避
- 有数据但表现差（CTR < 2%）的角度：找出原因，下次换方向
- 修改过的角度：说明用户修改方向就是真实需求，新角度要考虑这个方向

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
    input += `\n\n## 历史反馈记录（必须参考）
${historicalAngles.map(h => `- 角度「${h.angle}」：${h.feedback}`).join("\n")}

基于以上历史数据，生成的角度需要：避开已弃用方向、延续采用方向的成功逻辑（但换新切入点）、结合数据表现调整策略。`;
  }

  return input;
}
