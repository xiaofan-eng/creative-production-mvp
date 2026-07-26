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
严格按以下格式输出，每个编号后直接写推荐理由正文，不要写任何标签或括号占位符：
1. 第一段推荐理由正文
2. 第二段推荐理由正文
3. 第三段推荐理由正文
直接输出编号列表，无前言，无标签。`;

export const P8_SYSTEM_PROMPT_RELAUNCH = `你是一个电商内容优化专家。当前任务类型是【老品重推】，需要为换新角度的内容方案写推荐理由。

## 核心要求：强调角度创新价值
- 说明当前方案与历史已用角度的本质差异在哪里（换了什么人群/痛点/风格）
- 引用历史已采用角度说明"该方向已被验证有一定效果，本次换了切入点继续探索"
- 如果历史某角度CTR数据高，说明本次延续了同一成功逻辑的不同表达
- 明确指出本次方案面向的是历史内容未覆盖的增量人群或场景
- 不要夸大，只说"尝试触达新受众""探索新切入角度"等客观表述

## 输出格式
严格按以下格式输出，每个编号后直接写推荐理由正文，不要写任何标签或括号占位符：
1. 第一段推荐理由正文
2. 第二段推荐理由正文
3. 第三段推荐理由正文
直接输出编号列表，无前言，无标签。`;

export const P8_SYSTEM_PROMPT_LOW_PERFORMANCE = `你是一个电商内容优化专家。当前任务类型是【素材表现差】，需要为针对性改进的内容方案写推荐理由。

## 核心要求：强调改进针对性
- 明确说明历史哪个角度表现差（引用CTR数据或弃用原因）
- 说明当前方案如何针对性解决了历史失败的根本原因
- 如有历史修改记录，说明当前方案如何精准体现了用户真实修改意图
- 如有历史高CTR角度，说明本次如何在同一成功逻辑上进一步强化
- 语气要有针对性和说服力，让用户感受到"这次是基于上次失败经验做的定向优化"

## 输出格式
严格按以下格式输出，每个编号后直接写推荐理由正文，不要写任何标签或括号占位符：
1. 第一段推荐理由正文
2. 第二段推荐理由正文
3. 第三段推荐理由正文
直接输出编号列表，无前言，无标签。`;

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
  }> | null,
  taskType?: string | null
) {
  let input = `请为以下 ${packages.length} 组内容包生成推荐理由：

## 当前内容包
${packages.map((pkg, i) => `${i + 1}. 角度：${pkg.angle}，脚本：${pkg.scriptTitle}`).join("\n")}`;

  if (historicalFeedback && historicalFeedback.length > 0) {
    if (taskType === "relaunch") {
      input += `\n\n## 历史已用角度记录
${historicalFeedback.map((fb, i) => {
  const status = fb.adoptionStatus === "adopted" ? "✅ 已采用" : fb.adoptionStatus === "rejected" ? "❌ 已弃用" : "✏️ 已修改";
  let record = `${i + 1}. 角度「${fb.contentAngle}」- ${status}`;
  if (fb.ctr !== undefined) record += `，CTR：${fb.ctr}%`;
  if (fb.impression !== undefined) record += `，曝光：${fb.impression}`;
  if (fb.rejectionReason) record += `，弃用原因：${fb.rejectionReason}`;
  if (fb.editNote) record += `，用户修改方向：${fb.editNote}`;
  return record;
}).join("\n")}

重点说明：每个新方案与历史角度的差异化在哪里，以及为什么这次探索新方向是有价值的。`;
    } else if (taskType === "low_performance") {
      input += `\n\n## 历史表现记录（包含失败原因）
${historicalFeedback.map((fb, i) => {
  const status = fb.adoptionStatus === "adopted" ? "✅ 已采用" : fb.adoptionStatus === "rejected" ? "❌ 已弃用" : "✏️ 已修改";
  let record = `${i + 1}. 角度「${fb.contentAngle}」- ${status}`;
  if (fb.ctr !== undefined) record += `，CTR：${fb.ctr}%`;
  if (fb.impression !== undefined) record += `，曝光：${fb.impression}`;
  if (fb.rejectionReason) record += `，弃用原因：${fb.rejectionReason}`;
  if (fb.editNote) record += `，用户修改方向：${fb.editNote}`;
  return record;
}).join("\n")}

重点说明：每个新方案如何针对性解决了历史失败原因，或如何强化了历史成功方向，体现本次是基于数据的定向优化。`;
    } else {
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
    }
  } else {
    input += `\n\n暂无历史反馈记录，请基于商品分析和内容角度本身给出推荐理由。`;
  }

  return input;
}

