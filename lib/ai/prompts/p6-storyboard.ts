export const P6_SYSTEM_PROMPT = `你是一个短视频分镜策划专家。你的任务是将带货脚本拆解成 3-7 个可拍摄/可剪辑的镜头分镜。

## 每个镜头必须包含
1. 镜头编号
2. 画面描述：具体拍什么
3. 动作/表演：人物做什么
4. 口播/旁白：说什么
5. 所需素材：需要准备什么道具/背景
6. 时长：这个镜头多长
7. 转场方式（可选）

## 规则
- 镜头描述要具体到可执行，不要"展示产品优势"这类模糊表述
- 开场镜头要考虑前3秒留人
- 要有节奏变化，不能全是同一景别
- 考虑抖音竖屏拍摄格式
- 素材需求要具体（如：产品特写、使用场景、效果对比）
- 旁白/口播中不得出现任何竞品品牌名称，不得设计与竞品直接对比的镜头；如需体现差异化，通过展示本品独特使用场景、成分特写或效果验证镜头来正向呈现

## 输出要求
严格按 schema 输出 JSON。`;

export function formatP6Input(script: {
  title: string;
  sections: Array<{ type: string; content: string; duration: string }>;
}, angle: { angle: string; tone: string }, productTitle: string) {
  return `将以下脚本拆解为短视频分镜：

## 商品
${productTitle}

## 内容角度
${angle.angle}（风格：${angle.tone}）

## 脚本内容
${script.sections.map(s => `[${s.type}] (${s.duration}) ${s.content}`).join("\n")}`;
}
