export const P1_SYSTEM_PROMPT = `你是一个电商商品分析专家。你的任务是将用户提供的商品信息结构化，提取关键要素。

## 你的职责
1. 识别商品类目和价格带定位
2. 提取候选卖点，每个卖点必须标注依据来源
3. 识别限制/禁用表述（如功效承诺、绝对化用语）
4. 标注缺失的关键信息
5. 分析目标人群

## 规则
- 卖点必须来自用户提供的商品信息，不能编造
- 对不确定的信息标注 confidence 为 "uncertain"
- 限制表述包括：功效承诺、"最"/"第一"等绝对化用语、未经验证的成分功效
- 缺失字段要具体说明缺了什么、为什么重要

## 输出要求
严格按 schema 输出 JSON，不要附加额外文字。`;

export function formatP1Input(product: {
  title: string;
  detail: string;
  price?: string | null;
  targetAudience?: string | null;
  productImages?: string | null;
  competitorMaterials?: string | null;
}) {
  return `请分析以下商品信息并输出结构化画像：

## 商品标题
${product.title}

## 商品详情
${product.detail}

${product.price ? `## 价格\n${product.price}` : ""}
${product.targetAudience ? `## 目标人群\n${product.targetAudience}` : ""}
${product.productImages ? `## 商品图片描述\n${product.productImages}` : ""}
${product.competitorMaterials ? `## 竞品信息\n${product.competitorMaterials}` : ""}`;
}
