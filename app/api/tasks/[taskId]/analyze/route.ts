export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks, products, contentVersions, performance, feedback } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateObject } from "ai";
import { model } from "@/lib/ai/provider";
import { z } from "zod";

const analysisSchema = z.object({
  productProfile: z.object({
    category: z.string(),
    priceRange: z.string(),
    coreFeatures: z.array(z.string()).describe("最多4条"),
  }),
  sellingPoints: z.array(z.object({
    point: z.string(),
    evidence: z.string().describe("一句话"),
    priority: z.enum(["high", "medium", "low"]),
  })).describe("最多4条"),
  targetAudience: z.array(z.object({
    group: z.string(),
    age: z.string(),
    characteristics: z.string().describe("20字以内"),
    painPoints: z.array(z.string()).describe("最多2条"),
  })).describe("最多2组"),
  usageScenarios: z.array(z.object({
    scenario: z.string(),
    description: z.string().describe("20字以内"),
    triggerMoment: z.string().describe("10字以内"),
  })).describe("最多3条"),
  competitorComparison: z.array(z.object({
    dimension: z.string(),
    ourAdvantage: z.string().describe("20字以内"),
    competitorApproach: z.string().describe("20字以内"),
  })).describe("最多3条，无竞品信息时返回空数组"),
  recommendation: z.object({
    summary: z.string().describe("50字以内"),
    keyDirection: z.string().describe("50字以内"),
    reasons: z.array(z.string()).describe("最多3条，每条20字以内"),
  }),
  historicalAnalysis: z.object({
    hasHistory: z.boolean(),
    summary: z.string().describe("30字以内，无数据填'暂无历史数据'"),
    goodPatterns: z.array(z.string()).describe("最多2条，无数据填空数组"),
    badPatterns: z.array(z.string()).describe("最多2条，无数据填空数组"),
    iterationDirection: z.string().describe("30字以内"),
  }).describe("仅当有真实历史任务反馈数据时才填写，否则 hasHistory 必须为 false，其余字段填默认空值"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const id = parseInt(taskId);

    const [task] = db.select().from(tasks).where(eq(tasks.id, id)).all();
    if (!task) return NextResponse.json({ error: "任务不存在" }, { status: 404 });

    const [product] = db.select().from(products).where(eq(products.id, task.productId)).all();

    // 对图片信息和竞品信息做摘要压缩（超过 300 字时调用 AI 总结）
    const summarizeText = async (text: string, hint: string): Promise<string> => {
      if (!text || text.length <= 300) return text;
      const { generateText } = await import("ai");
      const { text: summary } = await generateText({
        model,
        prompt: `请将以下${hint}内容压缩为300字以内的摘要，保留最关键的信息：\n\n${text.slice(0, 3000)}`,
      });
      return summary.trim();
    };

    const [productImagesSummary, competitorSummary] = await Promise.all([
      summarizeText(product.productImages || "", "商品图片识别"),
      summarizeText(product.competitorMaterials || "", "竞品"),
    ]);

    // 获取历史数据（素材表现差 + 老品重推都查）
    let historicalDataSection = "";
    if (task.taskType === "low_performance" || task.taskType === "relaunch") {
      const sameProducts = db.select().from(products).all().filter(p => p.title === product.title);
      const sameProductIds = sameProducts.map(p => p.id);
      const histTasks = db.select().from(tasks).all()
        .filter(t => sameProductIds.includes(t.productId) && t.id !== id && t.status === "completed");

      const records: string[] = [];
      for (const ht of histTasks.slice(0, 5)) {
        const versions = db.select().from(contentVersions).where(eq(contentVersions.taskId, ht.id)).all();
        for (const v of versions) {
          const fbs = db.select().from(feedback).where(eq(feedback.contentVersionId, v.id)).all();
          const perfs = db.select().from(performance).where(eq(performance.contentVersionId, v.id)).all();
          const finalFb = fbs.find(f => f.adoptionStatus === "adopted" || f.adoptionStatus === "rejected") || fbs[0];
          const perfData = perfs.find(p => (p.impression || 0) > 0);
          if (finalFb || perfData) {
            let r = `角度：${v.contentAngle}，状态：${finalFb?.adoptionStatus || "无"}`;
            if (perfData?.ctr) r += `，CTR：${perfData.ctr}%`;
            records.push(r);
          }
        }
      }
      if (records.length > 0) {
        historicalDataSection = `\n历史记录：${records.slice(0, 6).join("；")}`;
      }
    }

    const { object: analysis } = await generateObject({
      model,
      mode: "json",
      schema: analysisSchema,
      system: "你是电商商品分析专家。根据商品信息做简洁分析，所有字段严格控制在描述的字数限制内，不要输出多余内容。重要：historicalAnalysis 字段只有在提示词中明确提供了'历史记录'数据时才能填写有效内容，否则 hasHistory 必须为 false，goodPatterns/badPatterns 必须为空数组，summary 填'暂无历史数据'，iterationDirection 填'暂无'。严禁凭商品标题或描述中的代际信息（如'第3代'）推断历史数据。\n\n【合规要求-必须遵守】recommendation 字段的 summary、keyDirection、reasons 中：\n- 不得出现量化效果承诺（如'7天瘦X斤''X天见效'等）\n- 不得使用绝对化用语（最、第一、极速、速效等）\n- 不得推荐以违规功效宣称作为内容方向\n- 对于减肥/医疗/功效类高风险商品，推荐方向只能从使用场景、成分特性、人群适配等可合规表达的角度给出，不能将违规宣称包装为'引流策略'或'用户痛点'",
      prompt: `分析商品：
标题：${product.title}
详情：${product.detail.slice(0, 800)}
${product.price ? `价格：${product.price}` : ""}
${product.targetAudience ? `人群：${product.targetAudience}` : ""}
${productImagesSummary ? `商品图片信息：${productImagesSummary}` : ""}
${competitorSummary ? `竞品信息：${competitorSummary}` : ""}${historicalDataSection}`,
    });

    return NextResponse.json(analysis);
  } catch (error) {
    console.error("分析失败:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "分析失败" }, { status: 500 });
  }
}
