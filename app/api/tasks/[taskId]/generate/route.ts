export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { tasks, products, productProfiles, contentVersions, feedback, performance } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { runPromptChain } from "@/lib/ai/chain";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  const id = parseInt(taskId);
  const generateType = req.nextUrl.searchParams.get("type"); // script | image_brief | storyboard | null (all)

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (step: number, name: string, data?: unknown) => {
        const event = JSON.stringify({ step, name, data });
        controller.enqueue(encoder.encode(`data: ${event}\n\n`));
      };

      try {
        // 获取任务和商品信息
        const [task] = db.select().from(tasks).where(eq(tasks.id, id)).all();
        if (!task) {
          sendEvent(0, "error", { message: "任务不存在" });
          controller.close();
          return;
        }

        // 更新状态为 generating，记录生成类型
        db.update(tasks).set({ status: "generating", generateType: generateType || null }).where(eq(tasks.id, id)).run();

        const [product] = db.select().from(products).where(eq(products.id, task.productId)).all();

        // 获取历史反馈（同商品的历史记录）
        const historicalTasks = db.select().from(tasks)
          .where(and(eq(tasks.productId, task.productId), eq(tasks.status, "completed")))
          .all();

        let historicalFeedback: Array<{
          contentAngle: string;
          adoptionStatus: string;
          rejectionReason?: string;
          editNote?: string;
          ctr?: number;
        }> | null = null;

        if (historicalTasks.length > 0) {
          const histTaskIds = historicalTasks.map(t => t.id);
          const histVersions = db.select().from(contentVersions)
            .where(eq(contentVersions.taskId, histTaskIds[0]))
            .all();

          historicalFeedback = [];
          for (const v of histVersions) {
            const [fb] = db.select().from(feedback).where(eq(feedback.contentVersionId, v.id)).all();
            const [perf] = db.select().from(performance).where(eq(performance.contentVersionId, v.id)).all();
            if (fb) {
              historicalFeedback.push({
                contentAngle: v.contentAngle,
                adoptionStatus: fb.adoptionStatus,
                rejectionReason: fb.rejectionReason || undefined,
                editNote: fb.editNote || undefined,
                ctr: perf?.ctr || undefined,
              });
            }
          }
        }

        // 运行 Prompt Chain
        const result = await runPromptChain(product, sendEvent, historicalFeedback, generateType);

        // 保存商品画像
        db.insert(productProfiles).values({
          productId: task.productId,
          category: result.profile.category,
          priceRange: result.profile.priceRange,
          sellingPoints: JSON.stringify(result.profile.sellingPoints),
          restrictions: JSON.stringify(result.profile.restrictions),
          missingFields: JSON.stringify(result.profile.missingFields),
        }).run();

        // 保存内容版本
        const existingVersions = db.select().from(contentVersions).where(eq(contentVersions.taskId, id)).all();

        if (existingVersions.length > 0 && generateType) {
          // 部分生成：只更新指定类型的字段到已有记录
          for (let i = 0; i < result.packages.length; i++) {
            const pkg = result.packages[i];
            const existing = existingVersions.find(ev => ev.packageIndex === i + 1);
            if (existing) {
              const updateData: Record<string, string> = {};
              if (generateType === "script") updateData.script = JSON.stringify(pkg.script);
              if (generateType === "image_brief") updateData.imageBrief = JSON.stringify(pkg.imageBrief);
              if (generateType === "storyboard") updateData.storyboard = JSON.stringify(pkg.storyboard);
              updateData.recommendReason = pkg.recommendReason;
              updateData.riskFlags = JSON.stringify(
                result.riskCheck.riskFlags.filter(r =>
                  r.location.includes(`第 ${i + 1} 组`) || r.location.includes(`第${i + 1}组`) || r.location.includes(`方案${i + 1}`) || r.location.includes(`方案 ${i + 1}`)
                ).length > 0
                  ? result.riskCheck.riskFlags.filter(r => r.location.includes(`第 ${i + 1} 组`) || r.location.includes(`第${i + 1}组`) || r.location.includes(`方案${i + 1}`) || r.location.includes(`方案 ${i + 1}`))
                  : result.riskCheck.riskFlags // 如果过滤后为空，把所有风险都分配
              );
              updateData.manualCheckItems = JSON.stringify(result.riskCheck.manualCheckItems);
              db.update(contentVersions).set(updateData).where(eq(contentVersions.id, existing.id)).run();
            } else {
              // 没有对应 packageIndex 的旧记录，插入新记录
              db.insert(contentVersions).values({
                taskId: id,
                packageIndex: i + 1,
                contentAngle: pkg.contentAngle,
                script: JSON.stringify(pkg.script),
                imageBrief: JSON.stringify(pkg.imageBrief),
                storyboard: JSON.stringify(pkg.storyboard),
                riskFlags: JSON.stringify(
                  result.riskCheck.riskFlags.filter(r =>
                    r.location.includes(`第 ${i + 1} 组`) || r.location.includes(`第${i + 1}组`) || r.location.includes(`方案${i + 1}`) || r.location.includes(`方案 ${i + 1}`)
                  ).length > 0
                    ? result.riskCheck.riskFlags.filter(r => r.location.includes(`第 ${i + 1} 组`) || r.location.includes(`第${i + 1}组`) || r.location.includes(`方案${i + 1}`) || r.location.includes(`方案 ${i + 1}`))
                    : result.riskCheck.riskFlags
                ),
                manualCheckItems: JSON.stringify(result.riskCheck.manualCheckItems),
                recommendReason: pkg.recommendReason,
              }).run();
            }
          }
        } else {
          // 全量生成：删除旧版本，插入新记录
          db.delete(contentVersions).where(eq(contentVersions.taskId, id)).run();
          for (let i = 0; i < result.packages.length; i++) {
            const pkg = result.packages[i];
            const filteredRisks = result.riskCheck.riskFlags.filter(r =>
              r.location.includes(`第 ${i + 1} 组`) || r.location.includes(`第${i + 1}组`) || r.location.includes(`方案${i + 1}`) || r.location.includes(`方案 ${i + 1}`)
            );
            db.insert(contentVersions).values({
              taskId: id,
              packageIndex: i + 1,
              contentAngle: pkg.contentAngle,
              script: JSON.stringify(pkg.script),
              imageBrief: JSON.stringify(pkg.imageBrief),
              storyboard: JSON.stringify(pkg.storyboard),
              riskFlags: JSON.stringify(filteredRisks.length > 0 ? filteredRisks : result.riskCheck.riskFlags),
              manualCheckItems: JSON.stringify(result.riskCheck.manualCheckItems),
              recommendReason: pkg.recommendReason,
            }).run();
          }
        }

        // 更新状态为 completed
        db.update(tasks).set({ status: "completed" }).where(eq(tasks.id, id)).run();
        sendEvent(7, "完成", { success: true });
      } catch (error) {
        console.error("AI 生成失败:", error);
        // 如果是部分生成（已有内容），不标记为 failed
        const existingContent = db.select().from(contentVersions).where(eq(contentVersions.taskId, id)).all();
        if (existingContent.length === 0) {
          db.update(tasks).set({ status: "failed" }).where(eq(tasks.id, id)).run();
        } else {
          db.update(tasks).set({ status: "completed" }).where(eq(tasks.id, id)).run();
        }
        sendEvent(0, "error", { message: error instanceof Error ? error.message : "生成失败" });
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
