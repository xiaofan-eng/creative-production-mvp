export const P8_SYSTEM_PROMPT = `你是一个电商内容优化专家。你的任务是为每组内容方案分别写一段独立的推荐理由。

## 规则
- 如果有历史反馈，引用具体的历史记录说明为什么推荐当前方案
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
  }> | null
) {
  let input = `请为以下 ${packages.length} 组内容包生成推荐理由：

## 当前内容包
${packages.map((pkg, i) => `${i + 1}. 角度：${pkg.angle}，脚本：${pkg.scriptTitle}`).join("\n")}`;

  if (historicalFeedback && historicalFeedback.length > 0) {
    input += `\n\n## 历史反馈记录
${historicalFeedback.map((fb, i) => {
  let record = `${i + 1}. 角度「${fb.contentAngle}」- 状态：${fb.adoptionStatus}`;
  if (fb.rejectionReason) record += `，弃用原因：${fb.rejectionReason}`;
  if (fb.editNote) record += `，修改点：${fb.editNote}`;
  if (fb.ctr !== undefined) record += `，CTR：${fb.ctr}%`;
  return record;
}).join("\n")}

请说明当前方案如何避开了历史问题或延续了成功经验。`;
  } else {
    input += `\n\n暂无历史反馈记录，请基于商品分析和内容角度本身给出推荐理由。`;
  }

  return input;
}
