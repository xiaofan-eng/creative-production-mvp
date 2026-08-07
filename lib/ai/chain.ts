import { generateObject, generateText } from "ai";
import { model } from "./provider";
import {
  productProfileSchema,
  sellingPointsSchema,
  contentAnglesSchema,
  scriptSchema,
  imageBriefSchema,
  storyboardSchema,
  riskCheckSchema,
} from "./schemas";
import type { ProductProfile, SellingPoints, ContentAngles, Script, ImageBrief, Storyboard, RiskCheck } from "./schemas";
import { P1_SYSTEM_PROMPT, formatP1Input } from "./prompts/p1-structurize";
import { P2_SYSTEM_PROMPT, formatP2Input } from "./prompts/p2-selling-points";
import { P3_SYSTEM_PROMPT, P3_SYSTEM_PROMPT_RELAUNCH, P3_SYSTEM_PROMPT_LOW_PERFORMANCE, formatP3Input } from "./prompts/p3-content-angles";
import { P4_SYSTEM_PROMPT, formatP4Input } from "./prompts/p4-script";
import { P5_SYSTEM_PROMPT, formatP5Input } from "./prompts/p5-image-brief";
import { P6_SYSTEM_PROMPT, formatP6Input } from "./prompts/p6-storyboard";
import { P7_SYSTEM_PROMPT, formatP7Input } from "./prompts/p7-risk-check";
import { P8_SYSTEM_PROMPT, P8_SYSTEM_PROMPT_RELAUNCH, P8_SYSTEM_PROMPT_LOW_PERFORMANCE, formatP8Input } from "./prompts/p8-history";

export interface ProductInput {
  title: string;
  detail: string;
  price?: string | null;
  targetAudience?: string | null;
  productImages?: string | null;
  competitorMaterials?: string | null;
}

export interface GenerationResult {
  profile: ProductProfile;
  sellingPoints: SellingPoints;
  contentAngles: ContentAngles;
  packages: Array<{
    contentAngle: string;
    mindHook: string | null;
    mindValue: string | null;
    script: Script;
    imageBrief: ImageBrief;
    storyboard: Storyboard;
    recommendReason: string;
  }>;
  riskCheck: RiskCheck;
}

export type ProgressCallback = (step: number, stepName: string, data?: unknown) => void;

export async function runPromptChain(
  product: ProductInput,
  onProgress: ProgressCallback,
  historicalFeedback?: Array<{
    contentAngle: string;
    adoptionStatus: string;
    rejectionReason?: string;
    editNote?: string;
    ctr?: number;
    impression?: number;
    generateType?: string;
  }> | null,
  generateType?: string | null, // "script" | "image_brief" | "storyboard" | null (all)
  taskType?: string | null, // "new_product" | "relaunch" | "low_performance"
  contentGoal?: string | null  // "mind_penetration" | "business_penetration" | null
): Promise<GenerationResult> {
  // Step 1: P1 商品结构化
  onProgress(1, "商品信息结构化");
  const { object: profile } = await generateObject({
    model,
    mode: "json",
    schema: productProfileSchema,
    system: P1_SYSTEM_PROMPT,
    prompt: formatP1Input(product),
  });
  onProgress(1, "商品信息结构化", profile);

  // Step 2: P2 卖点排序
  onProgress(2, "卖点排序");
  const { object: sellingPoints } = await generateObject({
    model,
    mode: "json",
    schema: sellingPointsSchema,
    system: P2_SYSTEM_PROMPT,
    prompt: formatP2Input(profile),
  });
  onProgress(2, "卖点排序", sellingPoints);

  // Step 3: P3 内容角度生成
  // 构建历史角度信息（来自 historicalFeedback）
  const historicalAngles = historicalFeedback?.map(fb => {
    const parts: string[] = [];
    parts.push(`状态：${fb.adoptionStatus === "adopted" ? "已采用" : fb.adoptionStatus === "rejected" ? "已弃用" : "已修改"}`);
    if (fb.ctr !== undefined) parts.push(`CTR ${fb.ctr}%`);
    if (fb.impression !== undefined) parts.push(`曝光 ${fb.impression}`);
    if (fb.rejectionReason) parts.push(`弃用原因：${fb.rejectionReason}`);
    if (fb.editNote) parts.push(`修改内容：${fb.editNote}`);
    return { angle: fb.contentAngle, feedback: parts.join("，") };
  }) || null;

  // 根据 taskType 选择对应的 P3 system prompt
  const p3SystemPrompt = taskType === "relaunch" ? P3_SYSTEM_PROMPT_RELAUNCH
    : taskType === "low_performance" ? P3_SYSTEM_PROMPT_LOW_PERFORMANCE
    : P3_SYSTEM_PROMPT;

  onProgress(3, "内容角度生成");
  const { object: contentAngles } = await generateObject({
    model,
    mode: "json",
    schema: contentAnglesSchema,
    system: p3SystemPrompt,
    prompt: formatP3Input(sellingPoints.rankedPoints, profile.category, historicalAngles, taskType, contentGoal),
  });
  onProgress(3, "内容角度生成", contentAngles);

  // Step 4-6: 对每个角度按选定类型生成内容
  const typeLabel = generateType === "script" ? "带货脚本" :
    generateType === "image_brief" ? "商品图/封面Brief" :
    generateType === "storyboard" ? "短视频分镜" : "内容包（脚本/图Brief/分镜）";
  onProgress(4, `生成${typeLabel}`);

  // 从 P1 提取的合规限制，注入 P4/P5/P6 prompt 作为生成约束
  const restrictions = profile.restrictions || [];

  const packages = await Promise.all(
    contentAngles.angles.map(async (angle, index) => {
      const spForPrompt = sellingPoints.rankedPoints.map(sp => ({
        point: sp.point,
        evidence: sp.evidence,
      }));

      // P4: 脚本（仅当 generateType 为 script 或 null 时生成）
      let script: Script | null = null;
      if (!generateType || generateType === "script") {
        const { object } = await generateObject({
          model,
          mode: "json",
          schema: scriptSchema,
          system: P4_SYSTEM_PROMPT,
          prompt: formatP4Input(angle, spForPrompt, product.title, restrictions),
        });
        script = object;
      }

      // P5: 图Brief（仅当 generateType 为 image_brief 或 null 时生成）
      let imageBrief: ImageBrief | null = null;
      if (!generateType || generateType === "image_brief") {
        const { object } = await generateObject({
          model,
          mode: "json",
          schema: imageBriefSchema,
          system: P5_SYSTEM_PROMPT,
          prompt: formatP5Input(
            angle,
            sellingPoints.rankedPoints.map(sp => ({ point: sp.point })),
            product.title,
            product.productImages,
            restrictions
          ),
        });
        imageBrief = object;
      }

      // P6: 分镜（仅当 generateType 为 storyboard 或 null 时生成）
      let storyboard: Storyboard | null = null;
      if (!generateType || generateType === "storyboard") {
        const { object } = await generateObject({
          model,
          mode: "json",
          schema: storyboardSchema,
          system: P6_SYSTEM_PROMPT,
          prompt: formatP6Input(
            script || { title: angle.angle, duration: "60秒", sections: [], factSources: [] },
            angle,
            product.title,
            restrictions
          ),
        });
        storyboard = object;
      }

      return {
        contentAngle: angle.angle,
        mindHook: (angle as { mindHook?: string }).mindHook || null,
        mindValue: (angle as { mindValue?: string }).mindValue || null,
        script: script || { title: "", duration: "", sections: [], factSources: [] },
        imageBrief: imageBrief || { composition: "", mainVisual: "", copywriting: "", elements: [], colorScheme: "", taboos: [], sellingPointConnection: "" },
        storyboard: storyboard || { totalDuration: "", shots: [] },
        recommendReason: "",
      };
    })
  );
  onProgress(4, "生成内容包（脚本/图Brief/分镜）", { count: packages.length });

  // Step 7: P7 风险检查
  onProgress(5, "风险检查");
  const riskInputPackages = packages.map(pkg => {
    const scriptText = pkg.script.sections?.length > 0
      ? pkg.script.sections.map(s => s.content).join("\n")
      : "";
    const briefText = pkg.imageBrief.copywriting || "";
    const storyboardText = pkg.storyboard.shots?.length > 0
      ? pkg.storyboard.shots.map((s: { voiceover?: string; scene?: string }) =>
          [s.voiceover, s.scene].filter(Boolean).join(" ")
        ).join("\n")
      : "";
    return {
      angle: pkg.contentAngle,
      script: scriptText || storyboardText || briefText || JSON.stringify(pkg.script),
      imageBriefCopy: briefText || storyboardText,
    };
  });

  const { object: riskCheck } = await generateObject({
    model,
    mode: "json",
    schema: riskCheckSchema,
    system: P7_SYSTEM_PROMPT,
    prompt: formatP7Input(riskInputPackages),
  });
  onProgress(5, "风险检查", riskCheck);

  // Step 8: P8 历史依据
  onProgress(6, "生成推荐理由");
  // 根据 taskType 选择对应的 P8 system prompt
  const p8SystemPrompt = taskType === "relaunch" ? P8_SYSTEM_PROMPT_RELAUNCH
    : taskType === "low_performance" ? P8_SYSTEM_PROMPT_LOW_PERFORMANCE
    : P8_SYSTEM_PROMPT;

  const { text: reasonsText } = await generateText({
    model,
    system: p8SystemPrompt,
    prompt: formatP8Input(
      packages.map(pkg => ({ angle: pkg.contentAngle, scriptTitle: pkg.script.title })),
      historicalFeedback,
      taskType
    ),
  });

  // 解析推荐理由（按编号分配给各方案）
  const reasons: string[] = [];

  // 先清理掉AI可能输出的占位标签 [第X组方案推荐理由]
  const cleanedText = reasonsText.replace(/\[第\d+组[^\]]*\]\s*/g, "").trim();

  // 按 "1." "2." "3." 等编号分割
  const numberedMatch = cleanedText.split(/\n*\d+[\.\、\)）]\s*/);
  const filtered = numberedMatch
    .map(r => r.trim())
    .filter(r => r.length > 10);

  if (filtered.length >= packages.length) {
    for (let i = 0; i < packages.length; i++) {
      reasons.push(filtered[i].trim());
    }
  } else {
    // fallback: 按双换行分割
    const paragraphs = cleanedText
      .split(/\n\n+/)
      .map(r => r.trim())
      .filter(r => r.length > 10);
    for (let i = 0; i < packages.length; i++) {
      reasons.push(paragraphs[i]?.trim() || "基于商品卖点和目标人群匹配度推荐此方案。");
    }
  }
  packages.forEach((pkg, i) => {
    pkg.recommendReason = reasons[i] || "基于商品卖点和目标人群匹配度推荐此方案。";
  });
  onProgress(6, "生成推荐理由", { done: true });

  return {
    profile,
    sellingPoints,
    contentAngles,
    packages,
    riskCheck,
  };
}

