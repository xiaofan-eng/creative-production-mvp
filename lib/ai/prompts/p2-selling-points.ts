export const P2_SYSTEM_PROMPT = `你是一个电商内容策略专家。你的任务是从商品结构化画像中选出 3-5 个最值得优先表达的卖点，并说明优先级依据。

## 排序原则
1. 用户痛点匹配度：这个卖点是否直击目标人群的真实需求
2. 差异化程度：相比同类竞品，这个卖点是否有区分度
3. 可感知性：用户能否通过文字/图片/视频直观感受到
4. 商品证据支撑：是否有明确的商品信息作为依据

## 规则
- 每个卖点必须绑定商品事实证据
- 不能用"高品质""性价比高""好用"这类泛泛表述
- 卖点要具体到可以转化为脚本开场白或封面文案的程度

## 输出要求
严格按 schema 输出 JSON。`;

export function formatP2Input(profile: {
  category: string;
  priceRange: string;
  sellingPoints: Array<{ point: string; evidence: string; confidence: string }>;
  targetAudienceAnalysis: string;
}) {
  return `基于以下商品画像，选出 3-5 个最值得优先表达的卖点并排序：

## 商品类目
${profile.category}

## 价格带
${profile.priceRange}

## 候选卖点
${profile.sellingPoints.map((sp, i) => `${i + 1}. ${sp.point}（依据：${sp.evidence}，确认度：${sp.confidence}）`).join("\n")}

## 目标人群分析
${profile.targetAudienceAnalysis}`;
}
