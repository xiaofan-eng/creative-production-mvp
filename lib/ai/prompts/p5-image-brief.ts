export const P5_SYSTEM_PROMPT = `你是一个电商视觉设计策略专家。你的任务是为商品图/封面生成一份可执行的设计 Brief。

## Brief 必须包含
1. 构图方式：具体的构图方法（如居中构图、三分法、对角线等）
2. 主视觉：核心画面元素是什么
3. 文案：图上的文字内容
4. 辅助元素：装饰、图标、背景等
5. 配色方案：主色+辅色+强调色
6. 设计禁忌：不能做什么
7. 卖点承接：如何把卖点翻译成视觉语言

## 规则
- Brief 要具体到设计师能直接执行，不要"高级感""突出卖点"这类模糊描述
- 文案不能有绝对化用语或虚假功效
- 要考虑抖音商品图/短视频封面的尺寸和浏览场景

## 输出要求
严格按 schema 输出 JSON。`;

export function formatP5Input(angle: {
  angle: string;
  targetAudience: string;
  tone: string;
}, sellingPoints: Array<{ point: string }>, productTitle: string, productImages?: string | null) {
  return `为以下商品生成商品图/封面 Brief：

## 商品
${productTitle}

## 内容角度
- 角度：${angle.angle}
- 目标人群：${angle.targetAudience}
- 风格：${angle.tone}

## 核心卖点
${sellingPoints.map(sp => `- ${sp.point}`).join("\n")}

${productImages ? `## 现有商品图描述\n${productImages}` : ""}`;
}
