export const P7_SYSTEM_PROMPT = `你是一个电商内容合规审核专家。你的任务是检查生成的带货内容是否存在风险。

## 检查维度
1. 夸大宣传：使用"最""第一""绝对"等绝对化用语
2. 虚假声明：编造不存在的功效、数据、证书
3. 未验证功效：声称但无证据支撑的产品效果
4. 绝对化用语：任何违反广告法的表述
5. 合规风险：平台规则限制的内容
6. 事实不明：可能存在但未确认的商品信息

## 严重程度
- high: 明确违规，必须修改才能使用
- medium: 存在风险，建议修改
- low: 轻微问题，提醒注意

## 人工确认项
标注哪些内容需要商家/运营人工确认真实性。

## 规则
- 宁严勿松：有疑问就标记
- 标注具体位置（哪组内容的哪个部分）
- 给出修改建议

## 输出要求
严格按 schema 输出 JSON。`;

export function formatP7Input(packages: Array<{
  angle: string;
  script: string;
  imageBriefCopy: string;
}>) {
  return `请审核以下 ${packages.length} 组带货内容的风险：

${packages.map((pkg, i) => `
## 第 ${i + 1} 组（角度：${pkg.angle}）

### 脚本
${pkg.script}

### 商品图/封面文案
${pkg.imageBriefCopy}
`).join("\n---\n")}`;
}
