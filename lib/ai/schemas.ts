import { z } from "zod";

// P1: 商品结构化画像输出
export const productProfileSchema = z.object({
  category: z.string().describe("商品类目，如：美妆/护肤、服饰/女装、食品/零食"),
  priceRange: z.string().describe("价格带定位，如：平价、中端、高端"),
  sellingPoints: z.array(z.object({
    point: z.string().describe("卖点描述"),
    evidence: z.string().describe("来自商品信息的依据"),
    confidence: z.enum(["confirmed", "inferred", "uncertain"]).describe("确认程度"),
  })).describe("候选卖点列表"),
  restrictions: z.array(z.string()).describe("限制/禁用表述，如功效承诺、绝对化用语"),
  missingFields: z.array(z.string()).describe("缺失信息提示"),
  targetAudienceAnalysis: z.string().describe("目标人群分析"),
});

// P2: 卖点排序输出
export const sellingPointsSchema = z.object({
  rankedPoints: z.array(z.object({
    rank: z.number().describe("优先级排名"),
    point: z.string().describe("卖点"),
    evidence: z.string().describe("商品证据"),
    targetAudience: z.string().describe("适合的目标人群"),
    scenario: z.string().describe("使用场景"),
    reason: z.string().describe("为什么优先表达这个卖点"),
  })).min(3).max(5).describe("3-5个优先卖点"),
});

// P3: 内容角度输出
export const contentAnglesSchema = z.object({
  angles: z.array(z.object({
    angle: z.string().describe("内容角度名称"),
    targetAudience: z.string().describe("面向的人群"),
    painPoint: z.string().describe("切入的痛点/需求"),
    tone: z.string().describe("表达语气/风格"),
    differentiator: z.string().describe("与其他角度的区分点"),
    mindHook: z.enum(["冲突感", "熟悉感", "陌生感"]).describe("面子钩子：开头吸引眼球的方式"),
    mindValue: z.enum(["满足感", "成就感", "参与感"]).describe("里子价值：内容传递的深层情绪价值"),
  })).length(3).describe("3个差异化内容角度"),
});

// P4: 带货脚本输出
export const scriptSchema = z.object({
  title: z.string().describe("脚本标题"),
  duration: z.string().describe("预估时长，如30秒、60秒"),
  sections: z.array(z.object({
    type: z.enum(["hook", "pain_point", "solution", "benefit", "proof", "cta"]).describe("段落类型"),
    content: z.string().describe("口播内容"),
    duration: z.string().describe("时长"),
    note: z.string().optional().describe("表演/语气提示"),
  })).describe("脚本段落"),
  factSources: z.array(z.string()).describe("事实来源标注"),
});

// P5: 商品图/封面 Brief 输出
export const imageBriefSchema = z.object({
  composition: z.string().describe("构图方式，如居中构图、对角线构图"),
  mainVisual: z.string().describe("主视觉元素描述"),
  copywriting: z.string().describe("图上文案"),
  elements: z.array(z.string()).describe("辅助视觉元素"),
  colorScheme: z.string().describe("配色方案"),
  taboos: z.array(z.string()).describe("设计禁忌"),
  sellingPointConnection: z.string().describe("如何承接卖点"),
});

// P6: 短视频分镜输出
export const storyboardSchema = z.object({
  totalDuration: z.string().describe("总时长"),
  shots: z.array(z.object({
    shotNumber: z.number().describe("镜头编号"),
    scene: z.string().describe("画面描述"),
    action: z.string().describe("动作/表演"),
    voiceover: z.string().describe("口播/旁白"),
    materialNeeded: z.string().describe("所需素材"),
    duration: z.string().describe("时长"),
    transition: z.string().optional().describe("转场方式"),
  })).min(3).max(7).describe("3-7个镜头"),
});

// P7: 风险检查输出
export const riskCheckSchema = z.object({
  riskFlags: z.array(z.object({
    type: z.enum(["exaggeration", "false_claim", "unverified_efficacy", "absolute_language", "compliance_risk", "other"]),
    location: z.string().describe("风险位置（哪条脚本/哪个brief的哪部分）"),
    content: z.string().describe("风险内容原文"),
    suggestion: z.string().describe("修改建议"),
    severity: z.enum(["high", "medium", "low"]),
  })).describe("风险标记列表"),
  manualCheckItems: z.array(z.object({
    item: z.string().describe("需人工确认项"),
    reason: z.string().describe("为什么需要确认"),
  })).describe("需人工确认的项目"),
  overallRiskLevel: z.enum(["safe", "caution", "high_risk"]).describe("整体风险等级"),
});

// 完整内容包输出 Schema
export const contentPackageSchema = z.object({
  contentAngle: z.string(),
  script: scriptSchema,
  imageBrief: imageBriefSchema,
  storyboard: storyboardSchema,
  recommendReason: z.string().describe("推荐理由"),
});

export type ProductProfile = z.infer<typeof productProfileSchema>;
export type SellingPoints = z.infer<typeof sellingPointsSchema>;
export type ContentAngles = z.infer<typeof contentAnglesSchema>;
export type Script = z.infer<typeof scriptSchema>;
export type ImageBrief = z.infer<typeof imageBriefSchema>;
export type Storyboard = z.infer<typeof storyboardSchema>;
export type RiskCheck = z.infer<typeof riskCheckSchema>;
export type ContentPackage = z.infer<typeof contentPackageSchema>;

