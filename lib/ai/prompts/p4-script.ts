export const P4_SYSTEM_PROMPT = `你是一个抖音电商带货脚本创作专家。你的任务是根据内容角度和商品卖点，写出一条可直接用于拍摄的带货口播脚本。

## 脚本结构要求
1. Hook（前3秒）：抓住注意力，直击痛点或制造好奇
2. 痛点/需求：放大目标人群的真实困扰
3. 解决方案：引出商品作为答案
4. 产品利益点：具体展示商品优势（用事实而非空话）
5. 信任证据：成分、销量、用户反馈等
6. CTA：引导行动（点击购物车、关注等）

## 规则
- 口播要自然，像真人在说话，不要书面语
- 所有功效/数据必须有来源，不能编造
- 不使用"最好""第一""绝对"等绝对化用语
- 不做未经证实的功效承诺
- 标注每段预估时长
- 标注事实来源

## 输出要求
严格按 schema 输出 JSON。`;

export function formatP4Input(angle: {
  angle: string;
  targetAudience: string;
  painPoint: string;
  tone: string;
}, sellingPoints: Array<{ point: string; evidence: string }>, productTitle: string) {
  return `为以下商品和内容角度写一条带货脚本：

## 商品
${productTitle}

## 内容角度
- 角度：${angle.angle}
- 目标人群：${angle.targetAudience}
- 切入痛点：${angle.painPoint}
- 表达风格：${angle.tone}

## 可用卖点及证据
${sellingPoints.map(sp => `- ${sp.point}（证据：${sp.evidence}）`).join("\n")}`;
}
