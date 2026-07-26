export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks, products, productProfiles, contentVersions, feedback, performance } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const id = parseInt(taskId);

    const [task] = db.select().from(tasks).where(eq(tasks.id, id)).all();
    if (!task) {
      return NextResponse.json({ error: "任务不存在" }, { status: 404 });
    }

    const [product] = db.select().from(products).where(eq(products.id, task.productId)).all();
    const [profile] = db.select().from(productProfiles).where(eq(productProfiles.productId, task.productId)).all();
    const versions = db.select().from(contentVersions).where(eq(contentVersions.taskId, id)).all();

    const versionsWithFeedback = versions.map(v => {
      const fb = db.select().from(feedback).where(eq(feedback.contentVersionId, v.id)).all();
      const perf = db.select().from(performance).where(eq(performance.contentVersionId, v.id)).all();
      return { ...v, feedback: fb, performance: perf };
    });

    // 查找同商品同类型的上一次已完成任务，生成参考案例摘要
    let previousCaseSummary: Array<{
      contentAngle: string;
      adoptionStatus: string | null;
      editNote: string | null;
      ctr: number | null;
      impression: number | null;
      performanceRating: string | null;
    }> | null = null;

    if (task.generateType) {
      const previousTasks = db.select().from(tasks)
        .where(and(eq(tasks.productId, task.productId), eq(tasks.status, "completed")))
        .all()
        .filter(t => t.generateType === task.generateType && t.id !== id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      if (previousTasks.length > 0) {
        const prevVersions = db.select().from(contentVersions)
          .where(eq(contentVersions.taskId, previousTasks[0].id))
          .all();

        previousCaseSummary = prevVersions.map(v => {
          const fbs = db.select().from(feedback).where(eq(feedback.contentVersionId, v.id)).all()
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          const finalFb = fbs.find(f => f.adoptionStatus === "adopted" || f.adoptionStatus === "rejected")
            || fbs.find(f => f.adoptionStatus === "modified")
            || fbs[0];
          const modifyNotes = fbs.filter(f => f.adoptionStatus === "modified" && f.editNote).map(f => f.editNote);

          const perfs = db.select().from(performance).where(eq(performance.contentVersionId, v.id)).all();
          const perfData = perfs.find(p => (p.impression || 0) > 0);
          const ratingData = perfs.find(p => p.humanReviewNote?.includes("数据表现评价"));
          const ratingMatch = ratingData?.humanReviewNote?.match(/数据表现评价: (.+)/);

          return {
            contentAngle: v.contentAngle,
            adoptionStatus: finalFb?.adoptionStatus || null,
            editNote: modifyNotes.length > 0 ? modifyNotes.join("；") : (finalFb?.editNote || null),
            ctr: perfData?.ctr || null,
            impression: perfData?.impression || null,
            performanceRating: ratingMatch ? ratingMatch[1] : null,
          };
        });
      }
    }

    return NextResponse.json({
      task,
      product,
      profile,
      contentVersions: versionsWithFeedback,
      previousCaseSummary,
    });
  } catch (error) {
    console.error("获取任务详情失败:", error);
    return NextResponse.json({ error: "获取任务详情失败" }, { status: 500 });
  }
}
