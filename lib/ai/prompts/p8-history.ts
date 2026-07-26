export const P8_SYSTEM_PROMPT = `你是一个电商内容优化专家。你的任务是为每组内容方案分别写一段独立的推荐理由。

## 规则
- 如果有历史反馈，引用具体的历史记录说明为什么推荐当前方案
- 说明当前方案如何吸取了历史教训或延续了历史成功
- 如果历史有数据（CTR、曝光），数字要引用进来
- 如果历史有弃用记录，说明当前方案如何规避了那个方向
- 如果历史有修改记录，说明当前方案如何体现了用户的修改意图
- 如果没有历史记录，基于商品本身分析推荐理由
- 不夸大因果关系，只说"相关表现"而非"导致/证明"
- 推荐理由要具体，不要空话

## 输出格式
严格按以下格式输出，每个方案一段，用编号标识：

1. [第1组方案的推荐理由]

2. [第2组方案的推荐理由]

3. [第3组方案的推荐理由]

不要输出其他格式，不要有总结性前言。直接输出编号列表。`;

export function formatP8Input(
  packages: Array<{ angle: string; scriptTitle: string }>,
  historicalFeedback?: Array<{
    contentAngle: string;
    adoptionStatus: string;
    rejectionReason?: string;
    editNote?: string;
    ctr?: number;
    impression?: number;
    generateType?: string;
  }> | null
) {
  let input = `请为以下 ${packages.length} 组内容包生成推荐理由：

## 当前内容包
${packages.map((pkg, i) => `${i + 1}. 角度：${pkg.angle}，脚本：${pkg.scriptTitle}`).join("\n")}`;

  if (historicalFeedback && historicalFeedback.length > 0) {
    input += `\n\n## 历史生成记录与用户反馈
${historicalFeedback.map((fb, i) => {
  const status = fb.adoptionStatus === "adopted" ? "✅ 已采用" : fb.adoptionStatus === "rejected" ? "❌ 已弃用" : "✏️ 已修改";
  let record = `${i + 1}. 角度「${fb.contentAngle}」- ${status}`;
  if (fb.ctr !== undefined) record += `，CTR：${fb.ctr}%`;
  if (fb.impression !== undefined) record += `，曝光：${fb.impression}`;
  if (fb.rejectionReason) record += `，弃用原因：${fb.rejectionReason}`;
  if (fb.editNote) record += `，用户修改方向：${fb.editNote}`;
  return record;
}).join("\n")}

请在推荐理由中说明：当前方案如何利用历史成功经验、规避历史失败方向、满足用户真实修改需求。`;
  } else {
    input += `\n\n暂无历史反馈记录，请基于商品分析和内容角度本身给出推荐理由。`;
  }

  return input;
}
