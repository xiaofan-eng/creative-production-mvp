export const P3_SYSTEM_PROMPT = `你是一个电商内容创意专家。你的任务是围绕商品卖点，生成 3 个有明显区分度的内容角度。

## 区分度要求
3 个角度必须在以下至少一个维度上有差异：
- 面向的人群不同（如：学生党 vs 职场白领 vs 宝妈）
- 切入的痛点不同（如：价格敏感 vs 效果追求 vs 使用便捷）
- 表达风格不同（如：种草安利 vs 专业测评 vs 日常分享）

## 心智钩子要求（必须为每个角度选择）
面子钩子（mindHook）——开头吸引眼球的方式，三选一：
- 冲突感：制造认知反差，如"你一直以为XX，其实……"
- 熟悉感：唤起共鸣场景，如"每次XX的时候你是不是……"
- 陌生感：呈现新知/新奇，如"原来XX还能这样用"

里子价值（mindValue）——内容传递的深层情绪，三选一：
- 满足感：解决了问题、如释重负
- 成就感：做到了某件事、被认可
- 参与感：我也想试试、一起来

3 个角度的 mindHook + mindValue 组合不能完全相同。

## 历史反馈使用原则
如有历史反馈数据，必须遵循：
- 已采用且 CTR 高的角度：提炼成功逻辑，用不同切入点延续
- 已弃用的角度：绝对不能重复，弃用原因要作为反面教材规避
- 有数据但表现差（CTR < 2%）的角度：找出原因，下次换方向
- 修改过的角度：用户修改方向就是真实需求，新角度要考虑这个方向

## 规则
- 每个角度都要能独立成为一组完整内容
- 不能只是措辞不同但本质相同
- 角度要具体到可以指导脚本写作

## 输出要求
严格按 schema 输出 JSON。`;

export const P3_SYSTEM_PROMPT_RELAUNCH = `你是一个电商内容创意专家。当前任务类型是【老品重推】，商品已有历史内容，需要换新角度再次触达用户。

## 核心原则：探索新角度
- 历史已用过的角度（无论效果好坏）都要换新切入点，不能重复同一个方向
- 已采用的角度：说明该方向已被验证有效，但本次必须换人群/换痛点/换风格，避免用户看到"又是这个"的疲劳感
- 已弃用的角度：绝对规避
- 优先寻找历史从未尝试过的人群、痛点、场景

## 区分度要求
3 个角度必须覆盖历史未出现过的方向，每个角度从以下三个维度至少选一个创新：
- 面向新人群（历史内容没覆盖过的细分人群）
- 切入新痛点（历史内容没有强调过的使用痛点）
- 采用新风格（历史内容没用过的表达方式）

## 心智钩子要求（必须为每个角度选择）
面子钩子（mindHook）——开头吸引眼球的方式，三选一：冲突感 / 熟悉感 / 陌生感
里子价值（mindValue）——深层情绪价值，三选一：满足感 / 成就感 / 参与感
3 个角度的组合不能完全相同。

## 规则
- 每个角度都要能独立成为一组完整内容
- 明确说明与历史角度的差异化在哪里
- 角度要具体到可以指导脚本写作

## 输出要求
严格按 schema 输出 JSON。`;

export const P3_SYSTEM_PROMPT_LOW_PERFORMANCE = `你是一个电商内容创意专家。当前任务类型是【素材表现差】，历史内容效果不佳，需要针对性改进。

## 核心原则：规避失败、强化成功
- 低CTR角度（CTR < 2%）或被弃用的角度：必须找出失败原因，彻底换方向，不做小修小补
- 已采用且CTR较高的角度：延续成功逻辑，可在同一方向上用不同切入点强化
- 已修改过的角度：用户的修改方向就是真实诉求，新角度要体现这个方向

## 失败分析要求
生成新角度前，必须先明确：历史哪些方向失败了（原因是什么）、哪些有成功迹象（需放大什么）

## 区分度要求
3 个角度中：
- 至少 1 个：延续历史有效方向，换新切入点强化
- 至少 1 个：完全规避历史失败方向，开辟全新角度
- 至少 1 个：结合用户修改反馈，精准对应用户真实需求

## 心智钩子要求（必须为每个角度选择）
面子钩子（mindHook）——开头吸引眼球的方式，三选一：冲突感 / 熟悉感 / 陌生感
里子价值（mindValue）——深层情绪价值，三选一：满足感 / 成就感 / 参与感
3 个角度的组合不能完全相同。

## 规则
- 每个角度都要能独立成为一组完整内容
- 失败的角度绝对不能以任何变体形式出现
- 角度要具体到可以指导脚本写作

## 输出要求
严格按 schema 输出 JSON。`;

export function formatP3Input(
  sellingPoints: Array<{
    rank: number;
    point: string;
    targetAudience: string;
    scenario: string;
  }>,
  category: string,
  historicalAngles?: Array<{ angle: string; feedback: string }> | null,
  taskType?: string | null,
  contentGoal?: string | null,
  tonbsContext?: {
    userGoal?: string;
    scene?: string;
    need?: string;
    barrier?: string;
    solution?: string;
    preferMindHook?: string;
    preferMindValue?: string;
  }
) {
  let input = `基于以下优先卖点，生成 3 个差异化内容角度：

## 商品类目
${category}

## 优先卖点
${sellingPoints.map(sp => `排名 ${sp.rank}: ${sp.point}（面向：${sp.targetAudience}，场景：${sp.scenario}）`).join("\n")}`;

  if (contentGoal) {
    const goalLabel = contentGoal === "mind_penetration"
      ? "心智渗透（让用户记住品类/场景，重点：品类教育、场景唤起、信任建立）"
      : "生意渗透（推动转化/复购，重点：痛点解决、产品对比、促销转化、复购提醒）";
    input += `\n\n## 内容目标
本次内容主要服务：${goalLabel}
请确保3个角度的方向和钩子设计都服务于该目标。`;
  }

  if (tonbsContext && (tonbsContext.userGoal || tonbsContext.scene || tonbsContext.need || tonbsContext.barrier || tonbsContext.solution)) {
    input += `\n\n## 用户洞察（TONBS）`;
    if (tonbsContext.userGoal) input += `\nT 用户目标：${tonbsContext.userGoal}`;
    if (tonbsContext.scene) input += `\nO 用户场景：${tonbsContext.scene}`;
    if (tonbsContext.need) input += `\nN 用户需求：${tonbsContext.need}`;
    if (tonbsContext.barrier) input += `\nB 用户障碍：${tonbsContext.barrier}`;
    if (tonbsContext.solution) input += `\nS 更优方案：${tonbsContext.solution}`;
    input += `\n请充分利用以上用户洞察，让角度更精准地命中用户真实痛点和场景。`;
  }

  if (tonbsContext?.preferMindHook || tonbsContext?.preferMindValue) {
    input += `\n\n## 心智钩子偏好`;
    if (tonbsContext.preferMindHook) input += `\n希望优先使用的面子钩子：${tonbsContext.preferMindHook}`;
    if (tonbsContext.preferMindValue) input += `\n希望传递的里子价值：${tonbsContext.preferMindValue}`;
    input += `\n（可以有1-2个角度采用此钩子，但3个角度不应完全相同）`;
  }

  if (historicalAngles && historicalAngles.length > 0) {
    if (taskType === "relaunch") {
      input += `\n\n## 历史已用角度（必须换新方向，不得重复）
${historicalAngles.map(h => `- 角度「${h.angle}」：${h.feedback}`).join("\n")}

要求：以上历史角度均已被用过，本次必须生成全新的人群/痛点/风格方向。请说明每个新角度与历史的差异化在哪里。`;
    } else if (taskType === "low_performance") {
      input += `\n\n## 历史表现记录（必须基于此分析优化方向）
${historicalAngles.map(h => `- 角度「${h.angle}」：${h.feedback}`).join("\n")}

要求：先分析哪些角度失败（原因）、哪些有效（成功逻辑），再据此生成3个改进角度：规避失败方向、强化有效方向、体现用户修改意图。`;
    } else {
      input += `\n\n## 历史反馈记录（必须参考）
${historicalAngles.map(h => `- 角度「${h.angle}」：${h.feedback}`).join("\n")}

基于以上历史数据，生成的角度需要：避开已弃用方向、延续采用方向的成功逻辑（但换新切入点）、结合数据表现调整策略。`;
    }
  }

  return input;
}

