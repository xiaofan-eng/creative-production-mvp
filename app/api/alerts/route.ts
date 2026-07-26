import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks, contentVersions, feedback, performance, triggers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 检查所有已完成的任务
    const completedTasks = db.select().from(tasks).where(eq(tasks.status, "completed")).all();

    const newAlerts: Array<{
      taskId: number;
      type: string;
      reason: string;
      suggestion: string;
    }> = [];

    for (const task of completedTasks) {
      const versions = db.select().from(contentVersions).where(eq(contentVersions.taskId, task.id)).all();

      // 检查 CTR 是否低于阈值
      let lowCtrCount = 0;
      let rejectCount = 0;
      let totalVersions = 0;
      let rejectedVersions = 0;

      for (const v of versions) {
        totalVersions++;
        const perfs = db.select().from(performance).where(eq(performance.contentVersionId, v.id)).all();
        const fbs = db.select().from(feedback).where(eq(feedback.contentVersionId, v.id)).all();

        for (const perf of perfs) {
          if (perf.ctr !== null && perf.ctr < 2) {
            lowCtrCount++;
          }
        }

        for (const fb of fbs) {
          if (fb.adoptionStatus === "rejected") {
            rejectedVersions++;
          }
          if (fb.rejectionReason === "selling_point_inaccurate") {
            rejectCount++;
          }
        }
      }

      // 规则1: 连续2次CTR低于2%
      if (lowCtrCount >= 2) {
        newAlerts.push({
          taskId: task.id,
          type: "low_ctr",
          reason: `该商品已有 ${lowCtrCount} 条素材点击率低于 2%`,
          suggestion: "建议换卖点角度重新生成内容包，当前卖点可能不够吸引目标人群。",
        });
      }

      // 规则2: 连续2次卖点不准
      if (rejectCount >= 2) {
        newAlerts.push({
          taskId: task.id,
          type: "selling_point_inaccurate",
          reason: `该商品已有 ${rejectCount} 次被标记"卖点不准"`,
          suggestion: "建议重新分析商品卖点，考虑换目标人群或切入角度。",
        });
      }

      // 规则3: 弃用率超过60%
      if (totalVersions > 0 && (rejectedVersions / totalVersions) > 0.6) {
        newAlerts.push({
          taskId: task.id,
          type: "high_rejection",
          reason: `该商品内容弃用率达 ${Math.round((rejectedVersions / totalVersions) * 100)}%`,
          suggestion: "建议从商品信息补充入手，检查是否有关键信息缺失导致生成质量低。",
        });
      }
    }

    // 将新的提醒存入数据库（避免重复）
    for (const alert of newAlerts) {
      const existing = db.select().from(triggers)
        .where(and(
          eq(triggers.taskId, alert.taskId),
          eq(triggers.triggerType, alert.type as "low_ctr" | "selling_point_inaccurate" | "high_rejection"),
          eq(triggers.isRead, false)
        )).all();

      if (existing.length === 0) {
        db.insert(triggers).values({
          taskId: alert.taskId,
          triggerType: alert.type as "low_ctr" | "selling_point_inaccurate" | "high_rejection",
          triggerReason: alert.reason,
          suggestion: alert.suggestion,
        }).run();
      }
    }

    // 返回未读提醒
    const unreadAlerts = db.select().from(triggers).where(eq(triggers.isRead, false)).all();
    return NextResponse.json(unreadAlerts);
  } catch (error) {
    console.error("检查提醒失败:", error);
    return NextResponse.json({ error: "检查提醒失败" }, { status: 500 });
  }
}
