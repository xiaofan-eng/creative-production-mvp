export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { tasks, products, contentVersions, performance, feedback } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { generateObject } from "ai";
import { model } from "@/lib/ai/provider";
import { z } from "zod";

const analysisSchema = z.object({
  productProfile: z.object({
    category: z.string().describe("商品类目"),
    priceRange: z.string().describe("价格带定位"),
    coreFeatures: z.array(z.string()).describe("核心产品特征"),
  }),
  sellingPoints: z.array(z.object({
    point: z.string().describe("卖点"),
    evidence: z.string().describe("依据"),
    priority: z.enum(["high", "medium", "low"]).describe("优先级"),
  })).describe("核心卖点提取"),
  targetAudience: z.array(z.object({
    group: z.string().describe("人群名称"),
    age: z.string().describe("年龄范围"),
    characteristics: z.string().describe("特征描述"),
    painPoints: z.array(z.string()).describe("痛点"),
  })).describe("目标人群画像"),
  usageScenarios: z.array(z.object({
    scenario: z.string().describe("场景名称"),
    description: z.string().describe("场景描述"),
    triggerMoment: z.string().describe("触发时机"),
  })).describe("使用场景识别"),
  competitorComparison: z.array(z.object({
    dimension: z.string().describe("对比维度"),
    ourAdvantage: z.string().describe("我们的优势"),
    competitorApproach: z.string().describe("竞品做法"),
  })).describe("竞品卖点对比"),
  recommendation: z.object({
    summary: z.string().describe("推荐策略总结"),
    keyDirection: z.string().describe("核心内容方向"),
    reasons: z.array(z.string()).describe("推荐理由"),
  }).describe("推荐理由"),
  historicalAnalysis: z.object({
    hasHistory: z.boolean().describe("是否有历史数据"),
    summary: z.string().describe("历史素材数据分析总结"),
    goodPatterns: z.array(z.string()).describe("表现好的特征/角度"),
    badPatterns: z.array(z.string()).describe("表现差的特征/角度，需避开"),
    iterationDirection: z.string().describe("迭代优化方向"),
  }).describe("历史素材数据分析（仅在有历史数据时填充）"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  const id = parseInt(taskId);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (step: string, data?: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ step, data })}\n\n`));
      };

      try {
        const [task] = db.select().from(tasks).where(eq(tasks.id, id)).all();
        if (!task) {
          sendEvent("error", { message: "任务不存在" });
          controller.close();
          return;
        }

        const [product] = db.select().from(products).where(eq(products.id, task.productId)).all();

        // 获取同商品历史数据（用于素材表现差场景）
        let historicalDataSection = "";
        if (task.taskType === "low_performance") {
          // 查找同标题的所有商品
          const sameProducts = db.select().from(products).all().filter(p => p.title === product.title);
          const sameProductIds = sameProducts.map(p => p.id);

          // 查找关联的所有任务
          const histTasks = db.select().from(tasks).all().filter(t => sameProductIds.includes(t.productId) && t.id !== id);

          const historyRecords: string[] = [];
          for (const ht of histTasks) {
            const versions = db.select().from(contentVersions).where(eq(contentVersions.taskId, ht.id)).all();
            for (const v of versions) {
              const perfs = db.select().from(performance).where(eq(performance.contentVersionId, v.id)).all();
              const fbs = db.select().from(feedback).where(eq(feedback.contentVersionId, v.id)).all();
              const perfData = perfs.find(p => (p.impression || 0) > 0);
              const ratingData = perfs.find(p => p.humanReviewNote?.includes("数据表现评价"));

              let record = `- 素材类型：${ht.generateType || "全部"}，角度：${v.contentAngle}`;
              if (perfData) {
                record += `，曝光：${perfData.impression}，点击：${perfData.click}，CTR：${perfData.ctr}%，转化：${perfData.conversion}`;
              }
              if (ratingData) {
                record += `，评价：${ratingData.humanReviewNote}`;
              }
              if (fbs.length > 0) {
                const fbSummary = fbs.map(f => `${f.adoptionStatus}${f.editNote ? `(${f.editNote.slice(0, 30)})` : ""}`).join("；");
                record += `，反馈：${fbSummary}`;
              }
              historyRecords.push(record);
            }
          }

          if (historyRecords.length > 0) {
            historicalDataSection = `\n\n## 历史素材生成与反馈数据
${historyRecords.join("\n")}`;
          }
        }

        sendEvent("analyzing", { message: "正在分析商品信息..." });

        const { object: analysis } = await generateObject({
          model,
          mode: "json",
          schema: analysisSchema,
          system: `你是一个电商商品分析专家。根据用户提供的商品信息，进行全面的商品分析。
分析维度包括：
1. 商品结构化解析：类目、价格带、核心特征
2. 核心卖点提取：从商品信息中找出最有说服力的卖点，标注依据和优先级
3. 目标人群画像：识别最匹配的目标人群，描述特征和痛点
4. 使用场景识别：用户会在什么场景下需要/使用这个商品
5. 竞品卖点对比：从内容营销角度分析差异化优势
6. 推荐理由：给出内容创作方向的推荐

所有分析必须基于商品信息，不编造不存在的功效或数据。
${historicalDataSection ? "如果有历史素材数据，请额外分析历史表现情况，总结哪些角度/类型表现好、哪些表现差，给出迭代优化方向。将分析融入推荐策略中。" : ""}`,
          prompt: `请分析以下商品：

商品标题：${product.title}
商品详情：${product.detail}
${product.price ? `价格：${product.price}` : ""}
${product.targetAudience ? `目标人群：${product.targetAudience}` : ""}
${product.productImages ? `商品图片描述：${product.productImages}` : ""}
${product.competitorMaterials ? `竞品信息：${product.competitorMaterials}` : ""}${historicalDataSection}`,
        });

        sendEvent("complete", analysis);
      } catch (error) {
        console.error("分析失败:", error);
        sendEvent("error", { message: error instanceof Error ? error.message : "分析失败" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
